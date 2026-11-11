import React, { useState } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';

// Короткие памятки на аварии в доме. Только безопасные действия; всё остальное — специалистам.
// Нидерланды: национальный аварийный номер газа и электричества 0800-9009 (бесплатно, круглосуточно).

interface Guide {
  id: string;
  icon: string;
  title: string;
  steps: string[];
  calls: ('112' | 'grid' | 'plumber' | 'electrician')[];
  warn?: string;
}

const GUIDES: Guide[] = [
  {
    id: 'gas',
    icon: '🔥',
    title: 'Пахнет газом',
    steps: [
      'Не включайте и не выключайте свет и приборы, не звоните в дверной звонок.',
      'Не зажигайте огонь и не курите.',
      'Откройте окна и двери.',
      'Если можно сделать это быстро — перекройте главный газовый кран.',
      'Выйдите на улицу, предупредите соседей.',
      'Звоните уже с улицы.',
    ],
    calls: ['grid', '112'],
  },
  {
    id: 'co',
    icon: '🫁',
    title: 'Сработал датчик угарного газа',
    steps: [
      'Сразу выведите всех на свежий воздух, включая животных.',
      'По пути, если это не задерживает, откройте окна и двери.',
      'Не возвращайтесь в дом до проверки.',
      'Головная боль, тошнота или головокружение — звоните 112.',
      'Котёл, колонку и плиту не включать, пока их не проверит мастер.',
    ],
    calls: ['112', 'grid'],
  },
  {
    id: 'water',
    icon: '💧',
    title: 'Протечка или затопление',
    steps: [
      'Перекройте главный кран воды — где он, написано в карточке дома ниже.',
      'Если вода рядом с розетками или техникой — обесточьте квартиру на щитке. Если вода уже у щитка — не трогайте его, звоните.',
      'Уберите вещи и технику, соберите воду.',
      'Предупредите соседей снизу.',
      'Сфотографируйте следы — для страховой.',
      'Вызовите сантехника.',
    ],
    calls: ['plumber', '112'],
  },
  {
    id: 'power',
    icon: '⚡',
    title: 'Пропало электричество',
    steps: [
      'Посмотрите, есть ли свет у соседей и на улице.',
      'Только у вас — откройте щиток: найдите выключенный автомат или УЗО.',
      'Выключите мощные приборы и включите автомат обратно. Если снова выбивает — не включайте, вызовите электрика.',
      'Нет света у всех — сообщите аварийной службе.',
      'Не открывайте лишний раз холодильник и морозилку.',
      'Выньте из розеток компьютер и другую чувствительную технику.',
    ],
    calls: ['grid', 'electrician'],
  },
  {
    id: 'spark',
    icon: '🔌',
    title: 'Искрит розетка или пахнет гарью',
    steps: [
      'Не трогайте розетку и прибор.',
      'Обесточьте квартиру или эту линию на щитке.',
      'Если есть огонь или дым — все выходят, звоните 112.',
      'Не тушите водой то, что под напряжением.',
      'Включать обратно — только после проверки электриком.',
    ],
    calls: ['112', 'electrician'],
    warn: 'Щиток и проводку чинит только электрик.',
  },
  {
    id: 'heat',
    icon: '🌡️',
    title: 'Зимой нет отопления',
    steps: [
      'Посмотрите на котёл: есть ли сообщение об ошибке, какое давление (обычно 1–2 бар).',
      'Перезапустите котёл так, как написано в его инструкции.',
      'Не помогло — звоните в сервис котла.',
      'Сохраняйте тепло: закройте окна, двери в пустые комнаты, шторы.',
      'Если дом надолго останется без тепла — защитите трубы от замерзания.',
    ],
    calls: ['grid'],
  },
];

/** «Что делать, если…» — памятки на аварии с кнопками звонка. */
export const EmergencyGuides: React.FC<{ plumberPhone?: string; electricianPhone?: string }> = (props) => {
  const { householdRegion, activePropertyId, properties } = useHousehold();
  // Телефоны мастеров: из «Паспорта дома», если там записаны, иначе из карточки объекта
  const passportPhone = (role: string) => {
    try {
      const id = activePropertyId === 'all' ? properties[0]?.id : activePropertyId;
      return JSON.parse(localStorage.getItem(`dbh_passport_${id}`) || '{}')?.contacts?.[role]?.phone || undefined;
    } catch {
      return undefined;
    }
  };
  const plumberPhone = passportPhone('plumber') || props.plumberPhone;
  const electricianPhone = passportPhone('electrician') || props.electricianPhone;
  const [open, setOpen] = useState<string | null>(null);
  const nl = householdRegion === 'NL';

  const callBtn = (kind: Guide['calls'][number]) => {
    const map: Record<string, { label: string; tel?: string; note?: string }> = {
      '112': { label: '112 — экстренная помощь', tel: '112' },
      grid: nl
        ? { label: '0800-9009 — газ и свет, авария', tel: '08009009' }
        : { label: 'Аварийная служба газа и электричества', note: 'номер вашей страны впишите в карточке дома' },
      plumber: plumberPhone ? { label: 'Сантехник', tel: plumberPhone } : { label: 'Сантехник', note: 'телефон можно добавить в карточке дома' },
      electrician: electricianPhone ? { label: 'Электрик', tel: electricianPhone } : { label: 'Электрик', note: 'телефон можно добавить в карточке дома' },
    };
    const c = map[kind];
    return c.tel ? (
      <a
        key={kind}
        href={`tel:${c.tel}`}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition active:scale-95 ${
          kind === '112' ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-[var(--accent)] text-white hover:brightness-110'
        }`}
      >
        <Phone className="w-4 h-4" /> {c.label}
      </a>
    ) : (
      <span key={kind} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border border-[var(--line)] text-[var(--text-2)]">
        <Phone className="w-4 h-4" /> {c.label}
        <span className="text-xs text-[var(--muted)]">— {c.note}</span>
      </span>
    );
  };

  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-lg text-white">Что делать, если…</h2>
        <p className="text-[14px] text-white/60">Короткие памятки на аварии дома. Только безопасные шаги — остальное делают специалисты.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {GUIDES.map((g) => {
          const isOpen = open === g.id;
          return (
            <div key={g.id} className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : g.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[var(--surface-3)] transition-colors"
              >
                <span className="text-2xl leading-none">{g.icon}</span>
                <span className="flex-1 text-[17px] font-medium text-[var(--text)]">{g.title}</span>
                <ChevronDown className={`w-5 h-5 text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-[var(--line)]">
                  <ol className="mt-3 space-y-2">
                    {g.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-[16px] leading-snug text-[var(--text)]">
                        <span className="w-6 h-6 shrink-0 rounded-full bg-[var(--surface-3)] text-[14px] grid place-items-center tabular-nums">{i + 1}</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                  {g.warn && <p className="mt-3 text-[14px] text-amber-700">{g.warn}</p>}
                  <div className="flex flex-wrap gap-2 mt-4">{g.calls.map(callBtn)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
