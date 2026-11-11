// Единый «план дня»: всё, что приходится на дату, из всех источников — без повторов.
// Источники: события; уборка по «Карте уборки» (точные даты); тема дня v2 — только в дни без уборки
// (в дни уборки её заменяют конкретные пункты карты); задачи с датой; повторяющиеся задачи — на каждую свою дату;
// ежедневные повторяющиеся задачи — в блок «каждый день», а не в список дня.
import type { CalendarEvent, TaskItem } from '../types';
import { WEEK, RoutineItem } from '../data/homeRoutine';
import type { MapItem } from '../data/cleaningMap';
import { planForDate } from './cleaningPlan';
import { formatLocalDate, occursOn } from '../utils/dateUtils';

export interface DayItems {
  date: Date;
  ymd: string;
  events: CalendarEvent[];
  themeTitle: string;
  themeIcon: string;
  light: boolean;
  /** Пункты темы дня — только когда в этот день нет уборки по карте */
  themeItems: RoutineItem[];
  cleaning: MapItem[];
  /** Задачи на этот день, включая повторы повторяющихся задач */
  tasks: (TaskItem & { virtual?: boolean })[];
  /** Ежедневные повторяющиеся задачи — показываются вместе с ежедневным графиком */
  dailyTasks: TaskItem[];
  /** Сколько дел (без ежедневного графика) */
  count: number;
  important: number;
}

const stepDays: Record<string, number> = { weekly: 7, biweekly: 14 };

/** Приходится ли повторяющаяся задача на дату (после её даты начала) */
export function recursOn(t: TaskItem, ymd: string): boolean {
  if (!t.dueDate || t.completed || !t.recurrence || t.recurrence === 'none' || t.recurrence === 'daily') return false;
  if (ymd <= t.dueDate) return false;
  const a = new Date(t.dueDate + 'T12:00:00');
  const b = new Date(ymd + 'T12:00:00');
  if (t.recurrence === 'monthly') return a.getDate() === b.getDate();
  const step = stepDays[t.recurrence];
  if (!step) return false;
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diff % step === 0;
}

export function dayItems(date: Date, tasks: TaskItem[], events: CalendarEvent[]): DayItems {
  const ymd = formatLocalDate(date);
  const plan = planForDate(date);
  const theme = WEEK.find((w) => w.day === date.getDay())!;
  const cleaning = [...plan.detailed, ...plan.rare];
  const dated = tasks.filter((t) => t.dueDate === ymd && t.recurrence !== 'daily');
  const repeats = tasks.filter((t) => recursOn(t, ymd)).map((t) => ({ ...t, virtual: true, completed: false }));
  const all = [...dated, ...repeats];
  const themeItems = cleaning.length ? [] : theme.items;
  const open = all.filter((t) => !t.completed);
  return {
    date,
    ymd,
    events: events.filter((e) => occursOn(e, ymd)).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
    themeTitle: theme.title,
    themeIcon: theme.icon,
    light: !!theme.light,
    themeItems,
    cleaning,
    tasks: all,
    dailyTasks: tasks.filter((t) => t.recurrence === 'daily' && !t.completed),
    count: themeItems.length + cleaning.length + open.length,
    important: open.filter((t) => t.priority === 'high').length,
  };
}
