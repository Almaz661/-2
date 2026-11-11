import React, { useState } from 'react';
import { applies } from '../../utils/homeProfile';
import { Check, ChevronDown } from 'lucide-react';
import {
  CLEANING_KIT,
  DAILY_BLOCKS,
  MAIN_RULE,
  MONTH,
  MONTH_RULE,
  ROUTINE_MEANING,
  RoutineItem,
  SELF_CHECK,
  TRACKER_NOTE,
  WEEK,
  WEEK_RULE,
} from '../../data/homeRoutine';
import { monthKey, readDay, toggleItem, useRoutine, weekOfMonth } from '../../services/routine';
import { Card } from '../ui/mercury';

const CheckRow: React.FC<{ item: RoutineItem; checked: boolean; onToggle?: () => void; auto?: boolean }> = ({
  item,
  checked,
  onToggle,
  auto,
}) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={!onToggle}
    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[var(--surface-3)] disabled:hover:bg-transparent disabled:cursor-default transition-colors"
  >
    <span
      className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border grid place-items-center transition-colors ${
        checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--line-strong)] text-transparent'
      }`}
    >
      <Check className="w-3.5 h-3.5" />
    </span>
    <span className="min-w-0">
      <span className={`block text-sm ${checked ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'}`}>
        {item.icon && <span className="mr-1.5 no-underline">{item.icon}</span>}
        <span className="font-medium">{item.title}</span>
        {item.hint && <span className="text-[var(--muted)]"> — {item.hint}</span>}
      </span>
      {auto && <span className="block text-xs text-[var(--muted)] mt-0.5">отмечается само</span>}
    </span>
  </button>
);

const Progress: React.FC<{ done: number; total: number }> = ({ done, total }) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-24 rounded-full bg-[var(--surface-3)] overflow-hidden">
      <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} />
    </div>
    <span className="text-xs tabular-nums text-[var(--muted)]">
      {done} из {total}
    </span>
  </div>
);

/** «Ежедневные рутины» и «Недельный цикл по зонам» — по системе порядка дома. */
// Свои настройки графика: скрытые пункты и свои пункты по блокам (на устройстве)
const CUSTOM_KEY = 'dbh_routine_custom';
type Custom = { hidden: string[]; extra: Record<string, RoutineItem[]> };
const loadCustom = (): Custom => {
  try {
    return { hidden: [], extra: {}, ...JSON.parse(localStorage.getItem(CUSTOM_KEY) || '{}') };
  } catch {
    return { hidden: [], extra: {} };
  }
};

export const RoutineBoard: React.FC = () => {
  const [custom, setCustomState] = useState<Custom>(loadCustom);
  const [editing, setEditing] = useState(false);
  const [newText, setNewText] = useState<Record<string, string>>({});
  const setCustom = (c: Custom) => {
    setCustomState(c);
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(c));
    } catch {
      /* нет хранилища */
    }
  };
  const withCustom = (key: string, items: RoutineItem[]) => [...items, ...(custom.extra[key] || [])].filter((i) => editing || !custom.hidden.includes(i.id));
  const { checks, week, toggle } = useRoutine();
  const [openDay, setOpenDay] = useState<number | null>(null);
  const todayWd = new Date().getDay();
  const fit = (items: RoutineItem[]) => items.filter((i) => applies(i.needs));
  const zoneToday = WEEK.find((d) => d.day === todayWd)!;
  const blocks = DAILY_BLOCKS.map((b) => ({ ...b, items: fit(b.items) }));
  const morningItems = [...blocks[0].items, ...blocks[1].items];
  const eveningItems = blocks[3].items;

  const count = (items: RoutineItem[], c: Record<string, boolean>) => items.filter((i) => c[i.id]).length;
  const eveningDone = count(eveningItems, checks) === eveningItems.length;
  const zoneDone = count(zoneToday.items, checks) === zoneToday.items.length;
  const morningDone = count(morningItems, checks) === morningItems.length;
  const autoChecks: Record<string, boolean> = { 'c-morning': morningDone, 'c-evening': eveningDone, 'c-zone': zoneDone };
  const mKey = monthKey();
  const monthChecks = readDay(mKey);
  const thisWeek = weekOfMonth();
  const [openMonth, setOpenMonth] = useState<number | null>(thisWeek);

  const block = (title: string, sub: string, baseItems: RoutineItem[], key: string) => {
    const items = withCustom(key, baseItems);
    const visible = items.filter((i) => !custom.hidden.includes(i.id));
    return (
    <Card className="p-2 sm:p-3 flex flex-col">
      <div className="px-3 pt-2 pb-3">
        <h3 className="text-[16px] font-semibold text-[var(--text)]">{title}</h3>
        <div className="flex items-center justify-between gap-3 mt-1">
          <p className="text-[14px] text-[var(--muted)]">{sub}</p>
          <Progress done={count(visible, checks)} total={Math.max(visible.length, 1)} />
        </div>
      </div>
      <div className="border-t border-[var(--line)] pt-1">
        {items.map((i) => {
          const hidden = custom.hidden.includes(i.id);
          const own = (custom.extra[key] || []).some((x) => x.id === i.id);
          return editing ? (
            <div key={i.id} className="flex items-center gap-3 px-3 py-2">
              <span className={`flex-1 text-sm ${hidden ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'}`}>{i.title}</span>
              <button
                type="button"
                onClick={() =>
                  own
                    ? setCustom({ ...custom, extra: { ...custom.extra, [key]: (custom.extra[key] || []).filter((x) => x.id !== i.id) } })
                    : setCustom({ ...custom, hidden: hidden ? custom.hidden.filter((h) => h !== i.id) : [...custom.hidden, i.id] })
                }
                className="text-xs px-2.5 py-1 rounded-full border border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--surface-3)]"
              >
                {own ? 'Удалить' : hidden ? 'Вернуть' : 'Убрать'}
              </button>
            </div>
          ) : (
            <CheckRow key={i.id} item={i} checked={!!checks[i.id]} onToggle={() => toggle(i.id)} />
          );
        })}
        {editing && (
          <div className="flex gap-2 px-3 py-2">
            <input
              value={newText[key] || ''}
              onChange={(e) => setNewText({ ...newText, [key]: e.target.value })}
              placeholder="Свой пункт"
              className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)]"
            />
            <button
              type="button"
              onClick={() => {
                const t = (newText[key] || '').trim();
                if (!t) return;
                setCustom({ ...custom, extra: { ...custom.extra, [key]: [...(custom.extra[key] || []), { id: `own-${key}-${Date.now().toString(36)}`, icon: '', title: t }] } });
                setNewText({ ...newText, [key]: '' });
              }}
              className="px-3 py-1.5 rounded-lg text-sm bg-[var(--accent)] text-white"
            >
              Добавить
            </button>
          </div>
        )}
      </div>
    </Card>
    );
  };

  // Недельный трекер: порядок Пн → Вс, отметки за последние 7 дней
  const weekOrdered = [1, 2, 3, 4, 5, 6, 0].map((wd) => WEEK.find((d) => d.day === wd)!);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-baseline gap-x-3 mb-3 px-1">
          <h2 className="text-lg font-semibold text-[var(--text)]">🔄 Ежедневный график</h2>
          <span className="text-[14px] text-[var(--muted)]">{ROUTINE_MEANING} Отметки сбрасываются каждый день.</span>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`ml-auto px-3.5 py-1.5 rounded-full text-[14px] border transition ${editing ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--surface-3)]'}`}
          >
            {editing ? 'Готово' : 'Настроить свой график'}
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {block(`${blocks[0].icon} ${blocks[0].title}`, `≈ ${blocks[0].minutes} мин`, blocks[0].items, 'morning')}
          {block(`${blocks[1].icon} ${blocks[1].title}`, `≈ ${blocks[1].minutes} мин`, blocks[1].items, 'breakfast')}
          {block(
            `${zoneToday.icon} Днём — задача дня: ${zoneToday.title}`,
            `${zoneToday.name}${zoneToday.light ? ' · облегчённый день' : ' · ≈ 40–80 мин'}`,
            zoneToday.items,
            `day-${zoneToday.day}`
          )}
          {block(`${blocks[2].icon} ${blocks[2].title}`, `≈ ${blocks[2].minutes} мин`, blocks[2].items, 'afternoon')}
          {block(`${blocks[3].icon} ${blocks[3].title}`, `≈ ${blocks[3].minutes} мин`, blocks[3].items, 'evening')}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-2 sm:p-3 lg:col-span-2">
          <div className="px-3 pt-2 pb-3">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">🗓️ Недельный цикл по зонам</h2>
            <p className="text-[14px] text-[var(--muted)]">{WEEK_RULE}</p>
          </div>
          {weekOrdered.map((d) => {
            const rec = week.find((w) => w.weekday === d.day);
            const done = rec ? count(d.items, rec.checks) : 0;
            const isToday = d.day === todayWd;
            const isOpen = openDay === d.day;
            return (
              <div key={d.day} className="border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setOpenDay(isOpen ? null : d.day)}
                  aria-expanded={isOpen}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                    isToday ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-3)]'
                  }`}
                >
                  <span className="text-lg w-7 text-center">{d.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[var(--text)]">
                      {d.name} — {d.title}
                      {isToday && <span className="ml-2 text-[14px] font-medium text-[var(--accent)]">сегодня</span>}
                    </span>
                  </span>
                  <span
                    className={`text-xs tabular-nums ${
                      done === d.items.length && done > 0 ? 'text-emerald-600 font-medium' : 'text-[var(--muted)]'
                    }`}
                  >
                    {done === d.items.length && done > 0 ? 'готово' : `${done} из ${d.items.length}`}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="pb-2">
                    {d.items.map((i) => (
                      <CheckRow
                        key={i.id}
                        item={i}
                        checked={!!rec?.checks[i.id]}
                        onToggle={isToday ? () => toggle(i.id) : undefined}
                      />
                    ))}
                    {!isToday && <p className="px-3 text-xs text-[var(--muted)]">Отмечать можно только сегодняшнюю зону.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        <div className="space-y-4">
          <Card className="p-2 sm:p-3">
            <div className="px-3 pt-2 pb-3">
              <h2 className="text-[16px] font-semibold text-[var(--text)]">📊 Самопроверка</h2>
              <p className="text-[14px] text-[var(--muted)]">{TRACKER_NOTE}</p>
            </div>
            <div className="border-t border-[var(--line)] pt-1">
              {SELF_CHECK.map((i) =>
                i.id in autoChecks ? (
                  <CheckRow key={i.id} item={i} checked={autoChecks[i.id]} auto />
                ) : (
                  <CheckRow key={i.id} item={i} checked={!!checks[i.id]} onToggle={() => toggle(i.id)} />
                )
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-[16px] font-semibold text-[var(--text)] mb-3">🛠️ Инвентарь (минимализм)</h2>
            <div className="space-y-3">
              {CLEANING_KIT.map((k) => (
                <div key={k.type} className="text-sm">
                  <div className="font-medium text-[var(--text)]">{k.type}</div>
                  <div className="text-[var(--text-2)]">{k.what}</div>
                  <div className="text-[14px] text-[var(--muted)]">{k.where}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section>
        <Card className="p-2 sm:p-3">
          <div className="px-3 pt-2 pb-3">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">📅 Месячный цикл</h2>
            <p className="text-[14px] text-[var(--muted)]">{MONTH_RULE} Отметки сбрасываются 1-го числа.</p>
          </div>
          {MONTH.map((w0) => {
            const w = { ...w0, items: fit(w0.items) };
            const done = count(w.items, monthChecks);
            const isNow = w.week === thisWeek;
            const isOpen = openMonth === w.week;
            return (
              <div key={w.week} className="border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setOpenMonth(isOpen ? null : w.week)}
                  aria-expanded={isOpen}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                    isNow ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-3)]'
                  }`}
                >
                  <span className="text-lg w-7 text-center">{w.icon}</span>
                  <span className="flex-1 text-sm font-medium text-[var(--text)]">
                    {w.week}-я неделя — {w.title}
                    {isNow && <span className="ml-2 text-[14px] font-medium text-[var(--accent)]">эта неделя</span>}
                  </span>
                  <span className={`text-xs tabular-nums ${done === w.items.length ? 'text-emerald-600 font-medium' : 'text-[var(--muted)]'}`}>
                    {done === w.items.length ? 'готово' : `${done} из ${w.items.length}`}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="pb-2 grid grid-cols-1 md:grid-cols-2">
                    {w.items.map((i) => (
                      <CheckRow key={i.id} item={i} checked={!!monthChecks[i.id]} onToggle={() => toggleItem(mKey, i.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </section>

      <p className="text-center text-sm text-[var(--text-2)] max-w-2xl mx-auto">
        ☀️ <span className="font-medium">Главное правило:</span> {MAIN_RULE}
      </p>
    </div>
  );
};
