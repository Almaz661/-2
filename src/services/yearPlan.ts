// План до конца года: все дела из чек-листов и месячного цикла раскладываются по дням календаря.
// Правила: в будни не больше 3 важных и 5 обычных дел (выходные легче: 1 и 2), считая уже назначенные;
// дело ставится в «свой» день недели (ванная — вт, стирка и спальни — ср, кухня и комнаты — пт, документы — пн, авто и покупки — чт),
// дела одного чек-листа и одной комнаты — по возможности в один день; нагрузка распределяется равномерно.
import type { HouseholdZone, PriorityLevel, TaskItem, TaskPack } from '../types';
import { MONTH } from '../data/homeRoutine';
import { PERIOD_DAYS, TECH_SYSTEMS } from '../data/techCheck';
import { applies, HomeProfile } from '../utils/homeProfile';
import { formatLocalDate } from '../utils/dateUtils';

export const PLAN_PACK = 'План до конца года';

// Эти пункты чек-листов уже стоят в «Карте уборки» на свои точные даты — второй раз их не ставим
const COVERED_BY_MAP = new Set([
  'Стиральная машина: фильтр и пустая стирка на 90°',
  'Посудомойка: почистить фильтр, добавить соль',
  'Вытяжка: помыть или заменить фильтр',
  'Чайник и кофемашина: удалить накипь',
  'Холодильник: протереть уплотнители, проверить сток',
]);

export interface Caps {
  important: number;
  regular: number;
  weekendImportant: number;
  weekendRegular: number;
}
export const DEFAULT_CAPS: Caps = { important: 3, regular: 5, weekendImportant: 1, weekendRegular: 2 };

export interface PlanItem {
  title: string;
  zone: HouseholdZone;
  priority: PriorityLevel;
  source: string;
  subtasks?: string[];
  from: string; // самая ранняя дата
  to: string; // самая поздняя дата
  week?: number; // неделя месяца из расписания v2
  /** Повторяется каждый месяц или по сроку — если не поместилось, не переносится: будет в следующий раз */
  repeating?: boolean;
}

const ymd = (d: Date) => formatLocalDate(d);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const isImportant = (p: PriorityLevel) => p === 'high';

const preferredDay = (zone: HouseholdZone, title: string): number[] => {
  if (/документ|договор|счёт|счет|бюджет|страхов|архив|гаранти|платеж/i.test(title)) return [1];
  if (zone === 'Ванная') return [2];
  if (zone === 'Спальня' || /стирк|одежд|гардероб|обув|штор|ковр/i.test(title)) return [3];
  if (zone === 'Авто' || /покуп|закуп|запас|шин|машин/i.test(title)) return [4];
  if (zone === 'Кухня' || zone === 'Гостиная') return [5];
  if (zone === 'Участок/Дача') return [6];
  return [2, 3, 5];
};

/** Что нужно разложить: сезонные и ежемесячные чек-листы, месячный цикл v2 — с сегодняшнего дня до конца года */
export function collectItems(packs: TaskPack[], today: Date, profile?: HomeProfile, techLast: Record<string, string | undefined> = {}): PlanItem[] {
  const out: PlanItem[] = [];
  const endYear = new Date(today.getFullYear(), 11, 31);
  const months: { start: Date; end: Date; m: number }[] = [];
  for (let m = today.getMonth(); m <= 11; m++) {
    const start = m === today.getMonth() ? today : new Date(today.getFullYear(), m, 1);
    months.push({ start, end: new Date(today.getFullYear(), m + 1, 0), m });
  }
  const ok = (needs?: TaskPack['needs']) => applies(needs, profile);
  const push = (p: TaskPack, from: Date, to: Date, suffix = '') =>
    p.tasks
      .filter((t) => ok(t.needs) && !COVERED_BY_MAP.has(t.title))
      .forEach((t) =>
        out.push({ title: t.title + suffix, zone: t.zone, priority: t.priority, source: p.title, subtasks: t.subtasks, from: ymd(from), to: ymd(to) })
      );
  const seasonMonths: Record<string, number[]> = { spring: [2, 3, 4], summer: [5, 6, 7], autumn: [8, 9, 10], winter: [11, 0, 1] };
  for (const p of packs) {
    if (p.trigger || !ok(p.needs) || p.id === 'pack-cleaning-rules') continue;
    const s = p.season || 'all';
    if (p.id === 'pack-appliance-service' || p.id === 'pack-gadgets') {
      // Ежемесячные — в каждом оставшемся месяце
      const before = out.length;
      months.forEach(({ start, end }) => push(p, start, end));
      for (let k = before; k < out.length; k++) out[k].repeating = true;
    } else if (p.id === 'pack-deep-cleaning') {
      push(p, today, new Date(today.getFullYear(), 11, 20)); // генеральная — до праздников
    } else if (s !== 'all') {
      const mm = seasonMonths[s] || [];
      const inYear = months.filter((x) => mm.includes(x.m));
      if (inYear.length) push(p, inYear[0].start, inYear[inYear.length - 1].end);
    }
  }
  // Месячный цикл v2: каждая неделя месяца — своя тема
  for (const { m } of months) {
    for (const w of MONTH) {
      const from = new Date(today.getFullYear(), m, (w.week - 1) * 7 + 1);
      const to = new Date(today.getFullYear(), m, Math.min(w.week * 7, new Date(today.getFullYear(), m + 1, 0).getDate()));
      if (to < today) continue;
      w.items
        .filter((i) => ok(i.needs))
        .forEach((i) =>
          out.push({ title: `${w.title}: ${i.title}`, zone: 'Весь дом', priority: 'low', source: 'Месячный цикл', from: ymd(from < today ? today : from), to: ymd(to), week: w.week, repeating: true })
        );
    }
  }
  // Техосмотр дома: каждая система — когда подойдёт её срок (раз в месяц / 3 месяца / весной и осенью)
  for (const sys of TECH_SYSTEMS.filter((x) => ok(x.needs))) {
    const period = PERIOD_DAYS[sys.period];
    const last = techLast[sys.id];
    let due = last ? addDays(new Date(last), period) : today;
    if (due < today) due = today;
    while (due <= endYear) {
      const to = addDays(due, sys.period === 'month' ? 6 : 13);
      out.push({
        title: `Техосмотр: ${sys.title}`,
        zone: 'Весь дом',
        priority: sys.id === 'safety' ? 'high' : 'medium',
        source: 'Техосмотр',
        subtasks: sys.items.filter((i) => ok(i.needs)).map((i) => i.text),
        from: ymd(due),
        to: ymd(to < endYear ? to : endYear),
        repeating: true,
      });
      due = addDays(due, period);
    }
  }
  return out.filter((i) => i.from <= ymd(endYear));
}

export interface PlannedTask {
  item: PlanItem;
  date: string;
}

/** Разложить по дням с учётом лимитов и уже назначенных дел */
/** Минут на одно дело из чек-листа — ориентир */
export const TASK_MINUTES = 10;

/**
 * Разложить по дням. Ограничения: лимит важных и обычных дел в день и (если задано) свободные минуты дня —
 * то, что остаётся от 2 часов после ежедневного графика и уборки этого дня.
 */
export function buildPlan(
  items: PlanItem[],
  existing: Pick<TaskItem, 'dueDate' | 'priority' | 'completed'>[],
  caps: Caps = DEFAULT_CAPS,
  freeMinutes?: (d: Date) => number
): { planned: PlannedTask[]; unplaced: PlanItem[] } {
  const load = new Map<string, { imp: number; reg: number }>();
  const get = (d: string) => load.get(d) || { imp: 0, reg: 0 };
  for (const t of existing) {
    if (t.completed || !t.dueDate) continue;
    const l = get(t.dueDate);
    if (isImportant(t.priority)) l.imp++;
    else l.reg++;
    load.set(t.dueDate, l);
  }
  const capFor = (d: Date) => {
    const we = d.getDay() === 0 || d.getDay() === 6;
    return { imp: we ? caps.weekendImportant : caps.important, reg: we ? caps.weekendRegular : caps.regular };
  };

  // Сначала важное и самые «узкие» окна; группы одного чек-листа и комнаты — вместе
  const groups = new Map<string, PlanItem[]>();
  for (const i of items) {
    const k = `${i.source}|${i.zone}|${i.from}|${i.to}`;
    groups.set(k, [...(groups.get(k) || []), i]);
  }
  const ordered = [...groups.values()].sort((a, b) => {
    const wa = new Date(a[0].to).getTime() - new Date(a[0].from).getTime();
    const wb = new Date(b[0].to).getTime() - new Date(b[0].from).getTime();
    return wa - wb || Number(b.some((x) => isImportant(x.priority))) - Number(a.some((x) => isImportant(x.priority)));
  });

  const planned: PlannedTask[] = [];
  const unplaced: PlanItem[] = [];
  for (const group of ordered) {
    for (const item of group) {
      const imp = isImportant(item.priority);
      const pref = preferredDay(item.zone, item.title);
      let best: { d: string; score: number } | null = null;
      // Не помещается в своё окно — продлеваем на 2 недели (но не дальше 31 декабря), как в расписании: «на свободный будний день»
      const yearEnd = `${item.to.slice(0, 4)}-12-31`;
      const ext = ymd(addDays(new Date(item.to + 'T12:00:00'), 14));
      const windows = item.repeating ? [item.to] : [item.to, ext < yearEnd ? ext : yearEnd];
      for (const to of windows) {
      if (best) break;
      for (let d = new Date(item.from + 'T12:00:00'); ymd(d) <= to; d = addDays(d, 1)) {
        const key = ymd(d);
        const l = get(key);
        const c = capFor(d);
        if (imp ? l.imp >= c.imp : l.reg >= c.reg) continue;
        if (freeMinutes && (l.imp + l.reg + 1) * TASK_MINUTES > freeMinutes(d)) continue;
        // Равномерно: меньше занятый день лучше; «свой» день недели и день, где уже есть дела этой группы, — в приоритете
        if (planned.some((p) => p.item.title === item.title && p.date.slice(0, 7) === key.slice(0, 7))) continue;
        const sameGroup = planned.some((p) => p.date === key && p.item.source === item.source && p.item.zone === item.zone);
        const score = l.imp + l.reg + (pref.includes(d.getDay()) ? 0 : 2.5) - (sameGroup ? 3 : 0) + (d.getDay() === 0 || d.getDay() === 6 ? 2 : 0);
        if (!best || score < best.score) best = { d: key, score };
      }
      }
      if (!best) {
        // Повторяющееся дело, которому не нашлось места, — просто будет в свой следующий срок
        if (!item.repeating) unplaced.push(item);
        continue;
      }
      const l = get(best.d);
      if (imp) l.imp++;
      else l.reg++;
      load.set(best.d, l);
      planned.push({ item, date: best.d });
    }
  }
  return { planned: planned.sort((a, b) => a.date.localeCompare(b.date)), unplaced };
}
