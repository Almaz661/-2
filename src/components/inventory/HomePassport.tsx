import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Phone, Plus, Trash2 } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { applies, Need } from '../../utils/homeProfile';
import { formatLocalDate } from '../../utils/dateUtils';
import { Btn, Card } from '../ui/mercury';

// «Паспорт дома» — по разделу 6 документа «Дом и домашние дела»: что записать один раз,
// чтобы в аварии, при ремонте и для страховой всё было под рукой. Хранится на устройстве, отдельно для каждого объекта.

type Field = { id: string; label: string; hint?: string; needs?: Need[] };
const FORGOTTEN: Field[] = [
  { id: 'water_main', label: 'Где главный кран воды и как к нему добраться' },
  { id: 'power_main', label: 'Где отключается электричество' },
  { id: 'gas_main', label: 'Где отключается газ', needs: ['gas'] },
  { id: 'heat_stop', label: 'Как аварийно остановить отопление или насос', needs: ['boiler'] },
  { id: 'gate_manual', label: 'Как вручную открыть ворота', needs: ['house'] },
  { id: 'hidden_pipes', label: 'Где проходят скрытые трубы и кабели', hint: 'особенно после ремонта' },
  { id: 'revisions', label: 'Где ревизии, фильтры и дренажные колодцы' },
  { id: 'consumables', label: 'Какие батарейки, лампы и расходники нужны и где лежат' },
  { id: 'wifi', label: 'Где роутер, имя и пароль Wi-Fi, кто провайдер интернета' },
  { id: 'gadgets_access', label: 'Где коды и запасные ключи от аккаунтов гаджетов (не сами пароли)' },
  { id: 'spare_keys', label: 'Где запасные ключи и инструкции' },
  { id: 'replaced', label: 'Когда менялись важные узлы и детали' },
  { id: 'who_repaired', label: 'Кто делал ремонт и какие материалы использовал' },
];
const TECH: Field[] = [
  { id: 'address', label: 'Полный адрес' },
  { id: 'built', label: 'Год постройки и крупных реконструкций' },
  { id: 'area', label: 'Площадь дома и помещений' },
  { id: 'floors', label: 'Этажи и назначение помещений' },
  { id: 'materials', label: 'Материалы стен, фундамента, перекрытий и кровли', needs: ['house'] },
  { id: 'insulation', label: 'Утепление и фасадная отделка', needs: ['house'] },
  { id: 'energy', label: 'Энергетический сертификат (energielabel), если есть' },
];
const DOCS: Field[] = [
  { id: 'ownership', label: 'Право собственности или договор аренды' },
  { id: 'plans', label: 'Планы этажей и проект дома' },
  { id: 'insurance', label: 'Страховой полис дома и имущества', hint: 'номер, срок, франшиза, как сообщить о случае' },
  { id: 'liability', label: 'Страхование ответственности' },
  { id: 'utilities', label: 'Договоры: свет, газ, вода, интернет' },
  { id: 'schemes', label: 'Схемы электрощита, водопровода и канализации' },
  { id: 'boiler_docs', label: 'Паспорт котла и акты обслуживания котла и дымохода', needs: ['boiler'] },
  { id: 'warranties', label: 'Чеки и гарантии на технику и работы' },
  { id: 'septic', label: 'Документы на колодец, скважину, септик', needs: ['house'] },
];
const CONTACTS: Field[] = [
  { id: 'plumber', label: 'Сантехник' },
  { id: 'electrician', label: 'Электрик' },
  { id: 'heating', label: 'Котёл и дымоход', needs: ['boiler'] },
  { id: 'roofer', label: 'Кровельщик, строитель', needs: ['house'] },
  { id: 'windows', label: 'Окна, двери, ворота' },
  { id: 'appliances', label: 'Сервис бытовой техники' },
  { id: 'gadgets', label: 'Ремонт телефонов и компьютеров' },
  { id: 'internet', label: 'Интернет-провайдер' },
  { id: 'insurer', label: 'Страховая компания' },
  { id: 'landlord', label: 'Управляющая компания или арендодатель' },
];

interface Passport {
  fields: Record<string, string>;
  docs: Record<string, { have: boolean; where: string }>;
  contacts: Record<string, { name: string; phone: string; last: string }>;
  history: { id: string; date: string; what: string; who: string; cost: string; warranty: string }[];
}
const empty = (): Passport => ({ fields: {}, docs: {}, contacts: {}, history: [] });
const keyFor = (propId: string) => `dbh_passport_${propId}`;

const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]';

const Section: React.FC<{ title: string; sub: string; done: number; total: number; open: boolean; onToggle: () => void; children: React.ReactNode; countLabel?: string }> = ({
  title,
  sub,
  done,
  total,
  open,
  onToggle,
  children,
  countLabel,
}) => (
  <Card className="p-2 sm:p-3">
    <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 px-3 py-2 text-left">
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] font-medium text-[var(--text)]">{title}</span>
        <span className="block text-xs text-[var(--muted)] mt-0.5">{sub}</span>
      </span>
      <span className={`text-xs tabular-nums ${done === total ? 'text-emerald-600' : 'text-[var(--muted)]'}`}>
        {countLabel ?? `${done} из ${total}`}
      </span>
      <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="border-t border-[var(--line)] px-3 py-3 space-y-3">{children}</div>}
  </Card>
);

/** «Паспорт дома»: заполняется по мере возможности, всё сохраняется само. */
export const HomePassport: React.FC = () => {
  const { activePropertyId, properties } = useHousehold();
  const propId = activePropertyId === 'all' ? properties[0]?.id || 'home' : activePropertyId;
  const propName = properties.find((p) => p.id === propId)?.name || 'Дом';
  const [p, setP] = useState<Passport>(empty);
  const [open, setOpen] = useState<string | null>('forgotten');

  useEffect(() => {
    try {
      setP({ ...empty(), ...JSON.parse(localStorage.getItem(keyFor(propId)) || '{}') });
    } catch {
      setP(empty());
    }
  }, [propId]);
  const save = (next: Passport) => {
    setP(next);
    try {
      localStorage.setItem(keyFor(propId), JSON.stringify(next));
    } catch {
      /* нет места */
    }
  };

  const fit = (list: Field[]) => list.filter((f) => applies(f.needs));
  const forgotten = fit(FORGOTTEN);
  const tech = fit(TECH);
  const docs = fit(DOCS);
  const contacts = fit(CONTACTS);

  // Нерешённые неисправности — сами из «Техосмотра»
  const openIssues = useMemo(() => {
    try {
      const st = JSON.parse(localStorage.getItem('dbh_techcheck') || '{}') as Record<string, { issues: Record<string, { note: string }> }>;
      return Object.values(st).flatMap((x) => Object.values(x.issues || {}).map((i) => i.note || 'замечание без описания'));
    } catch {
      return [];
    }
  }, [open]);

  const filled = (list: Field[]) => list.filter((f) => (p.fields[f.id] || '').trim()).length;
  const docsDone = docs.filter((d) => p.docs[d.id]?.have).length;
  const contactsDone = contacts.filter((c) => (p.contacts[c.id]?.phone || '').trim()).length;
  const total = forgotten.length + tech.length + docs.length + contacts.length;
  const done = filled(forgotten) + filled(tech) + docsDone + contactsDone;

  const textField = (f: Field) => (
    <label key={f.id} className="block">
      <span className="block text-[14px] text-[var(--text-2)] mb-1">
        {f.label}
        {f.hint && <span className="text-[var(--muted)]"> — {f.hint}</span>}
      </span>
      <textarea
        rows={1}
        value={p.fields[f.id] || ''}
        onChange={(e) => save({ ...p, fields: { ...p.fields, [f.id]: e.target.value } })}
        className={`${inputCls} resize-y min-h-[40px]`}
      />
    </label>
  );

  const [hist, setHist] = useState({ date: formatLocalDate(new Date()), what: '', who: '', cost: '', warranty: '' });

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg text-[var(--text)]">Паспорт дома · {propName}</h2>
        <p className="text-[14px] text-[var(--muted)] max-w-3xl">
          Записать один раз — и в аварии, при ремонте и для страховой всё под рукой. Заполняйте понемногу, всё сохраняется само.
          Заполнено {done} из {total}.
        </p>
        <div className="mt-2 h-1.5 max-w-sm rounded-full bg-[var(--surface-3)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>

      <Section
        title="Что особенно часто забывают записать"
        sub="Краны, отключения, ключи, скрытые трубы, кто и когда ремонтировал"
        done={filled(forgotten)}
        total={forgotten.length}
        open={open === 'forgotten'}
        onToggle={() => setOpen(open === 'forgotten' ? null : 'forgotten')}
      >
        {forgotten.map(textField)}
        <div>
          <span className="block text-[14px] text-[var(--text-2)] mb-1">Какие неисправности остались нерешёнными</span>
          {openIssues.length ? (
            <ul className="text-sm text-amber-700 list-disc pl-5 space-y-0.5">
              {openIssues.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">Нет — заполняется само из «Техосмотра».</p>
          )}
        </div>
      </Section>

      <Section title="Технический паспорт" sub="Адрес, год, площадь, материалы" done={filled(tech)} total={tech.length} open={open === 'tech'} onToggle={() => setOpen(open === 'tech' ? null : 'tech')}>
        {tech.map(textField)}
      </Section>

      <Section title="Документы" sub="Есть ли и где лежит: бумага, папка или файл" done={docsDone} total={docs.length} open={open === 'docs'} onToggle={() => setOpen(open === 'docs' ? null : 'docs')}>
        {docs.map((d) => {
          const v = p.docs[d.id] || { have: false, where: '' };
          return (
            <div key={d.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="flex items-center gap-2 sm:w-1/2 text-sm text-[var(--text)]">
                <input type="checkbox" checked={v.have} onChange={(e) => save({ ...p, docs: { ...p.docs, [d.id]: { ...v, have: e.target.checked } } })} className="w-4 h-4 accent-[var(--accent)]" />
                <span>
                  {d.label}
                  {d.hint && <span className="block text-xs text-[var(--muted)]">{d.hint}</span>}
                </span>
              </label>
              <input
                value={v.where}
                placeholder="Где лежит"
                onChange={(e) => save({ ...p, docs: { ...p.docs, [d.id]: { ...v, where: e.target.value } } })}
                className={`${inputCls} sm:flex-1`}
              />
            </div>
          );
        })}
      </Section>

      <Section title="Контакты специалистов" sub="Имя, телефон, когда работал последний раз" done={contactsDone} total={contacts.length} open={open === 'contacts'} onToggle={() => setOpen(open === 'contacts' ? null : 'contacts')}>
        {contacts.map((c) => {
          const v = p.contacts[c.id] || { name: '', phone: '', last: '' };
          const set = (patch: Partial<typeof v>) => save({ ...p, contacts: { ...p.contacts, [c.id]: { ...v, ...patch } } });
          return (
            <div key={c.id} className="grid grid-cols-1 sm:grid-cols-[150px_1fr_1fr_140px_auto] gap-2 items-center">
              <span className="text-sm font-medium text-[var(--text)]">{c.label}</span>
              <input value={v.name} placeholder="Имя или фирма" onChange={(e) => set({ name: e.target.value })} className={inputCls} />
              <input value={v.phone} placeholder="Телефон" inputMode="tel" onChange={(e) => set({ phone: e.target.value })} className={inputCls} />
              <input type="date" value={v.last} onChange={(e) => set({ last: e.target.value })} className={inputCls} title="Последняя работа" />
              {v.phone ? (
                <a href={`tel:${v.phone}`} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent)] text-white" aria-label={`Позвонить: ${c.label}`}>
                  <Phone className="w-4 h-4" />
                </a>
              ) : (
                <span className="w-10" />
              )}
            </div>
          );
        })}
      </Section>

      <Section
        title="История дома"
        sub="Ремонты, замены, протечки, страховые случаи"
        done={0}
        total={1}
        countLabel={p.history.length ? `записей: ${p.history.length}` : 'пока пусто'}
        open={open === 'history'}
        onToggle={() => setOpen(open === 'history' ? null : 'history')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-2">
          <input type="date" value={hist.date} onChange={(e) => setHist({ ...hist, date: e.target.value })} className={inputCls} />
          <input value={hist.what} placeholder="Что сделано или что случилось" onChange={(e) => setHist({ ...hist, what: e.target.value })} className={inputCls} />
          <input value={hist.who} placeholder="Кто делал" onChange={(e) => setHist({ ...hist, who: e.target.value })} className={inputCls} />
          <input value={hist.cost} placeholder="Сколько стоило" onChange={(e) => setHist({ ...hist, cost: e.target.value })} className={inputCls} />
          <input value={hist.warranty} placeholder="Гарантия до" onChange={(e) => setHist({ ...hist, warranty: e.target.value })} className={inputCls} />
          <Btn
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (!hist.what.trim()) return;
              save({ ...p, history: [{ id: Date.now().toString(36), ...hist }, ...p.history] });
              setHist({ ...hist, what: '', who: '', cost: '', warranty: '' });
            }}
          >
            Записать
          </Btn>
        </div>
        {p.history.length > 0 && (
          <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)] mt-2">
            {p.history.map((h) => (
              <li key={h.id} className="flex items-start gap-3 py-2.5 text-sm">
                <span className="w-24 shrink-0 tabular-nums text-[var(--muted)]">{h.date}</span>
                <span className="flex-1 min-w-0 text-[var(--text)]">
                  {h.what}
                  <span className="block text-xs text-[var(--muted)]">{[h.who, h.cost, h.warranty && `гарантия до ${h.warranty}`].filter(Boolean).join(' · ')}</span>
                </span>
                <button type="button" aria-label="Удалить запись" onClick={() => save({ ...p, history: p.history.filter((x) => x.id !== h.id) })} className="text-[var(--muted)] hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};
