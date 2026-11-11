// «Дом по зонам»: состояние каждой зоны дома по её делам — как индикаторы чистоты в Tody.
// Не «какого числа», а «насколько пора»: 0 — только что сделано, 1 — пора, больше 1 — запущено.

import type { HouseholdZone, RecurrenceType, TaskItem } from '../types';
import { formatLocalDate } from '../utils/dateUtils';

export const INTERVAL_DAYS: Record<RecurrenceType, number> = {
  none: 7,
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

export type ZoneLevel = 'fresh' | 'soon' | 'due';

export interface ZoneTask {
  task: TaskItem;
  /** 0…1+ — насколько пора (1 = срок) */
  need: number;
  level: ZoneLevel;
  /** «через 3 дн.», «пора», «просрочено на 2 дн.» */
  hint: string;
}

export interface ZoneStatus {
  zone: HouseholdZone;
  /** Худшее состояние в зоне — по нему цвет полосы */
  need: number;
  level: ZoneLevel;
  dueCount: number;
  tasks: ZoneTask[];
}

const DAY = 86400000;
const ymdToTime = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};
const levelOf = (need: number): ZoneLevel => (need >= 1 ? 'due' : need >= 0.6 ? 'soon' : 'fresh');

/** Следующий срок повторяющейся задачи после выполнения. */
export function nextDueAfter(task: TaskItem): string | null {
  if (task.recurrence === 'none' || !task.completedAt) return null;
  const d = new Date(task.completedAt);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + INTERVAL_DAYS[task.recurrence]);
  return formatLocalDate(d);
}

export function taskNeed(task: TaskItem, today: Date = new Date()): ZoneTask | null {
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const interval = INTERVAL_DAYS[task.recurrence] || 7;
  const recurring = task.recurrence !== 'none';
  let need: number;

  if (task.completed) {
    if (!recurring || !task.completedAt) return null; // разовая и сделана — в зоне не учитываем
    const done = new Date(task.completedAt);
    const doneDay = new Date(done.getFullYear(), done.getMonth(), done.getDate()).getTime();
    need = (now - doneDay) / DAY / interval;
  } else {
    const due = ymdToTime(task.dueDate);
    const daysLeft = (due - now) / DAY;
    need = daysLeft <= 0 ? 1 + -daysLeft / interval : Math.max(0, 1 - daysLeft / interval);
  }

  const level = levelOf(need);
  const daysToDue = Math.round((1 - need) * interval);
  const hint =
    need >= 1.05 && !task.completed
      ? `пора, ${Math.max(1, Math.round((need - 1) * interval))} дн.`
      : need >= 1
      ? 'пора'
      : daysToDue <= 0
      ? 'пора'
      : daysToDue === 1
      ? 'завтра'
      : `через ${daysToDue} дн.`;
  return { task, need, level, hint };
}

export function computeZones(tasks: TaskItem[], today: Date = new Date()): ZoneStatus[] {
  const byZone = new Map<HouseholdZone, ZoneTask[]>();
  for (const t of tasks) {
    const zt = taskNeed(t, today);
    if (!zt) continue;
    byZone.set(t.zone, [...(byZone.get(t.zone) || []), zt]);
  }
  return Array.from(byZone.entries())
    .map(([zone, list]) => {
      const sorted = list.sort((a, b) => b.need - a.need);
      const need = sorted[0]?.need ?? 0;
      return { zone, need, level: levelOf(need), dueCount: sorted.filter((x) => x.need >= 1).length, tasks: sorted };
    })
    .sort((a, b) => b.need - a.need);
}

/** Повторяющиеся задачи, которым снова пора: их нужно вернуть в работу с новым сроком. */
export function tasksToReopen(tasks: TaskItem[], today: Date = new Date()): { id: string; dueDate: string }[] {
  const todayStr = formatLocalDate(today);
  return tasks
    .filter((t) => t.completed && t.recurrence !== 'none')
    .map((t) => ({ id: t.id, dueDate: nextDueAfter(t) }))
    .filter((x): x is { id: string; dueDate: string } => !!x.dueDate && x.dueDate <= todayStr);
}

/** Типовые повторяющиеся дела для быстрого старта «Дома по зонам». */
export const STARTER_ZONE_TASKS: { title: string; zone: HouseholdZone; recurrence: RecurrenceType; inDays: number }[] = [
  { title: 'Помыть плиту и столешницу', zone: 'Кухня', recurrence: 'weekly', inDays: 0 },
  { title: 'Протереть холодильник внутри', zone: 'Кухня', recurrence: 'monthly', inDays: 5 },
  { title: 'Помыть раковину и ванну', zone: 'Ванная', recurrence: 'weekly', inDays: 1 },
  { title: 'Сменить полотенца', zone: 'Ванная', recurrence: 'weekly', inDays: 3 },
  { title: 'Пропылесосить и протереть пыль', zone: 'Гостиная', recurrence: 'weekly', inDays: 2 },
  { title: 'Сменить постельное бельё', zone: 'Спальня', recurrence: 'biweekly', inDays: 4 },
  { title: 'Помыть пол в прихожей', zone: 'Прихожая', recurrence: 'weekly', inDays: 1 },
  { title: 'Вынести мусор', zone: 'Весь дом', recurrence: 'daily', inDays: 0 },
];
