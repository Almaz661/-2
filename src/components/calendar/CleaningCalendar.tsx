import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { DayPlan, MINUTES, planForDate } from '../../services/cleaningPlan';
import { YEAR } from '../../data/homeRoutine';
import { groupItems, groupByRoom } from '../../utils/cleaningOrder';
import { useHousehold } from '../../context/HouseholdContext';
import { buildPlan, collectItems, DEFAULT_CAPS, PLAN_PACK, Caps } from '../../services/yearPlan';

import { markCleanItem, readCleanMap, subscribeCleanMap, markDay } from '../../services/cleanMapStore';
import { formatLocalDate } from '../../utils/dateUtils';
import { Btn, Card } from '../ui/mercury';
import { DayAgenda } from './DayAgenda';
import { dayItems } from '../../services/dayItems';

const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/** План уборки в календаре: месяц по дням и обзор года. */
export const CleaningCalendar: React.FC<{ currentDate: Date }> = ({ currentDate }) => {
  const [marks, setMarks] = useState(readCleanMap);
  const { tasks, taskPacks, addTasksBulk, removeTasksByPack, toggleTaskCompletion, showToast } = useHousehold();
  // План до конца года: лимиты на день — 3 важных и 5 обычных (выходные легче), можно поменять
  const [caps, setCaps] = useState<Caps>(() => {
    try {
      return { ...DEFAULT_CAPS, ...JSON.parse(localStorage.getItem('dbh_plan_caps') || '{}') };
    } catch {
      return DEFAULT_CAPS;
    }
  });
  const saveCaps = (c: Caps) => {
    setCaps(c);
    try {
      localStorage.setItem('dbh_plan_caps', JSON.stringify(c));
    } catch {
      /* нет места */
    }
  };
  const planTasks = tasks.filter((t) => t.packName === PLAN_PACK);
  const [within2h, setWithin2h] = useState(() => localStorage.getItem('dbh_plan_2h') !== '0');
  const applyPlan = () => {
    const keep = tasks.filter((t) => t.packName !== PLAN_PACK);
    // Не больше 2 часов в день (расписание v2): основная задача дня — до 80 мин, это уборка дня и дела из чек-листов;
    // остальное время — ежедневный порядок. В выходные — до 20 мин дел.
    const memo = new Map<string, number>();
    const free = (d: Date) => {
      if (!within2h) return 999;
      const k = d.toDateString();
      if (!memo.has(k)) {
        const p = planForDate(d);
        memo.set(k, p.isRestDay ? 20 : Math.max(0, 80 - (p.detailed.length * MINUTES.detailed + p.rare.length * MINUTES.rare)));
      }
      return memo.get(k)!;
    };
    // Даты последнего техосмотра — чтобы ставить следующий в свой срок
    let techLast: Record<string, string | undefined> = {};
    try {
      const st = JSON.parse(localStorage.getItem('dbh_techcheck') || '{}') as Record<string, { last?: string }>;
      techLast = Object.fromEntries(Object.entries(st).map(([k, v]) => [k, v.last]));
    } catch {
      /* нет данных */
    }
    // Уже сделанное из прошлой раскладки второй раз не ставим (то же дело в том же месяце)
    const doneKey = new Set(tasks.filter((t) => t.packName === PLAN_PACK && t.completed).map((t) => `${t.title}|${t.dueDate.slice(0, 7)}`));
    const items = collectItems(taskPacks, new Date(), undefined, techLast).filter(
      (i) => !doneKey.has(`${i.title}|${i.from.slice(0, 7)}`) && !doneKey.has(`${i.title}|${i.to.slice(0, 7)}`)
    );
    const { planned, unplaced } = buildPlan(items, keep, caps, free);
    removeTasksByPack(PLAN_PACK);
    addTasksBulk(
      planned.map(({ item, date }) => ({
        title: item.title,
        description: `Из чек-листа: ${item.source}`,
        zone: item.zone,
        assigneeId: null,
        isRotation: false,
        recurrence: 'none' as const,
        dueDate: date,
        priority: item.priority,
        completed: false,
        packName: PLAN_PACK,
        subtasks: item.subtasks?.map((t, i) => ({ id: `st${i}`, title: t, completed: false })),
      }))
    );
    showToast(`Разложено по календарю: ${planned.length} дел до 31 декабря${unplaced.length ? `, не поместилось: ${unplaced.length}` : ''}`, 'success');
  };
  const tasksOn = (d: string) => tasks.filter((t) => t.dueDate === d && !t.completed);
  useEffect(() => subscribeCleanMap(() => setMarks(readCleanMap())), []);
  const today = formatLocalDate(new Date());
  const [selected, setSelected] = useState<string>(() => {
    try {
      const v = localStorage.getItem('dbh_plan_day');
      localStorage.removeItem('dbh_plan_day');
      return v || today;
    } catch {
      return today;
    }
  });

  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const cells = useMemo(() => {
    const first = new Date(y, m, 1);
    const shift = (first.getDay() + 6) % 7;
    const out: (DayPlan | null)[] = Array(shift).fill(null);
    for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) out.push(planForDate(new Date(y, m, d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [y, m]);

  const selPlan = planForDate(new Date(selected + 'T12:00:00'));
  const doneOn = (id: string, ymd: string) => markDay(marks[id]) === ymd;

  // Обзор года: что редкое и сезонное приходится на каждый месяц
  const year = useMemo(
    () =>
      Array.from({ length: 12 }, (_, mi) => {
        const rare = new Map<string, string>();
        const seasonal = new Set<string>();
        for (let d = 1; d <= new Date(y, mi + 1, 0).getDate(); d++) {
          const p = planForDate(new Date(y, mi, d));
          p.rare.filter((i) => i.intervalDays > 31).forEach((i) => rare.set(i.id, i.title));
          p.seasonal.forEach((s) => seasonal.add(s.title));
        }
        return { mi, rare: [...rare.values()], seasonal: [...seasonal] };
      }),
    [y]
  );

  return (
    <div className="space-y-6">
      {/* План до конца года */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h3 className="text-[16px] font-semibold text-[var(--text)]">План до конца года</h3>
            <p className="text-[14px] text-[var(--muted)] mt-1">
              Все дела из чек-листов (сезонные, обслуживание техники, гаджеты, генеральная уборка), месячного цикла и техосмотра дома — по дням до 31 декабря.
              В свой день недели и по комнатам; уже назначенные дела учитываются.
            </p>
            <label className="flex items-center gap-2 mt-3 text-sm text-[var(--text)]">
              <input
                type="checkbox"
                checked={within2h}
                onChange={(e) => {
                  setWithin2h(e.target.checked);
                  try {
                    localStorage.setItem('dbh_plan_2h', e.target.checked ? '1' : '0');
                  } catch {
                    /* нет места */
                  }
                }}
                className="w-4 h-4 accent-[var(--accent)]"
              />
              Не больше 2 часов в день (расписание v2): уборка и дела из чек-листов — до 80 мин, остальное — ежедневный порядок
            </label>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-[var(--text-2)]">
              {(
                [
                  ['important', 'Важных в будни'],
                  ['regular', 'Обычных в будни'],
                  ['weekendImportant', 'Важных в выходные'],
                  ['weekendRegular', 'Обычных в выходные'],
                ] as [keyof Caps, string][]
              ).map(([k, label]) => (
                <label key={k} className="inline-flex items-center gap-2">
                  {label}
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={caps[k]}
                    onChange={(e) => saveCaps({ ...caps, [k]: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
                    className="w-14 px-2 py-1 rounded-lg text-sm bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)] tabular-nums"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Btn variant="primary" onClick={applyPlan}>
              {planTasks.length ? 'Разложить заново' : 'Разложить по календарю'}
            </Btn>
            {planTasks.length > 0 && (
              <>
                <span className="text-xs text-[var(--muted)]">В плане: {planTasks.filter((t) => !t.completed).length} дел</span>
                <button
                  type="button"
                  onClick={() => showToast(`Убрано из календаря: ${removeTasksByPack(PLAN_PACK)} дел`, 'info')}
                  className="text-xs text-[var(--muted)] hover:text-red-600 underline-offset-4 hover:underline"
                >
                  Убрать план
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      <p className="text-[14px] text-[var(--muted)] px-1">
        По «Расписанию домашних дел, версия 2»: до 2 часов в день без готовки, выходные облегчённые. У каждого дня своя тема,
        подробная уборка — в день своей зоны, редкая — в свою неделю месяца (техника — 2-я, текстиль и хранение — 3-я, жильё — 4-я).
        Если день перегружен, дела сами переезжают на более свободный будний день.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--line)]">
            {WD.map((w, i) => (
              <div key={w} className={`py-2.5 px-2 text-xs font-medium ${i >= 5 ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((p, idx) => {
              if (!p) return <div key={idx} className="min-h-[96px] border-b border-r border-[var(--line)] bg-[var(--surface-2)]" />;
              const ymd = formatLocalDate(p.date);
              const items = [...p.detailed, ...p.rare];
              const done = items.filter((i) => doneOn(i.id, ymd)).length;
              const isToday = ymd === today;
              const isSel = ymd === selected;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelected(ymd)}
                  className={`min-h-[96px] p-2 text-left border-b border-r border-[var(--line)] transition-colors ${
                    isSel ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-3)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[14px] w-6 h-6 grid place-items-center rounded-full tabular-nums ${
                        isToday ? 'bg-[var(--accent)] text-white font-semibold' : 'text-[var(--text)]'
                      }`}
                    >
                      {p.date.getDate()}
                    </span>
                    {items.length > 0 && (
                      <span className={`text-[12px] tabular-nums ${done === items.length ? 'text-emerald-600' : 'text-[var(--muted)]'}`}>
                        ≈{p.detailed.length * MINUTES.detailed + p.rare.length * MINUTES.rare} мин
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[13px] leading-tight text-[var(--text-2)] truncate">
                    {p.zoneIcon} {p.zoneTitle}
                  </div>
                  {(() => {
                    const di = dayItems(p.date, tasks, []);
                    return di.count ? (
                      <div className="mt-1 text-[12px] text-[var(--text-2)] tabular-nums" title="Дел на этот день (важные — со звёздочкой)">
                        {di.important > 0 && <span className="text-amber-700">★{di.important} </span>}
                        дел: {di.count}
                      </div>
                    ) : null;
                  })()}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.rare.length > 0 && (
                      <span className="text-[12px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">редкое {p.rare.length}</span>
                    )}
                    {p.seasonal.length > 0 && <span className="text-[12px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">🍂 сезон</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Полный план выбранного дня */}
        <DayAgenda ymd={selected} />
      </div>

      {/* Год */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text)] mb-3 px-1">План на {y} год</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {year.map((mo) => (
            <Card key={mo.mi} className={`p-4 ${mo.mi === new Date().getMonth() && y === new Date().getFullYear() ? 'ring-2 ring-[var(--accent)]' : ''}`}>
              <div className="text-[16px] font-semibold text-[var(--text)] mb-1">{MONTHS[mo.mi]}</div>
              <div className="text-[14px] text-[var(--text-2)] mb-2">{YEAR[mo.mi]}</div>
              {mo.seasonal.length > 0 && (
                <div className="text-[14px] text-amber-700 mb-1.5">🍂 {mo.seasonal.join(', ')}</div>
              )}
              <ul className="text-[14px] text-[var(--text-2)] space-y-1">
                {mo.rare.map((t) => (
                  <li key={t}>• {t}</li>
                ))}
                <li className="text-[var(--muted)]">• каждый месяц: документы (1-я неделя), техника (2-я), текстиль (3-я), жильё (4-я)</li>
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
