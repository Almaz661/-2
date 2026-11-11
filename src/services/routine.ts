// Отметки ежедневных рутин: хранятся по дням, поэтому каждый новый день начинается с чистого листа.
import { useEffect, useState } from 'react';
import { formatLocalDate } from '../utils/dateUtils';

const key = (date: string) => `dbh_routine_${date}`;
const EVT = 'dbh:routine-changed';

export const readDay = (date: string): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(key(date)) || '{}');
  } catch {
    return {};
  }
};

export const toggleItem = (date: string, id: string) => {
  const d = readDay(date);
  d[id] = !d[id];
  try {
    localStorage.setItem(key(date), JSON.stringify(d));
  } catch {
    /* нет хранилища */
  }
  window.dispatchEvent(new Event(EVT));
};

/** Отметки за сегодня и за последние 7 дней (для трекера недели). */
export function useRoutine() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener(EVT, on);
    const timer = window.setInterval(on, 60_000); // в полночь день сменится сам
    return () => {
      window.removeEventListener(EVT, on);
      window.clearInterval(timer);
    };
  }, []);
  const today = formatLocalDate(new Date());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ymd = formatLocalDate(d);
    return { date: ymd, weekday: d.getDay(), checks: readDay(ymd) };
  });
  return { today, checks: readDay(today), week, tick, toggle: (id: string) => toggleItem(today, id) };
}

// Месячный цикл: отметки за текущий месяц (сбрасываются 1-го числа)
export const monthKey = (d = new Date()) => `m-${formatLocalDate(d).slice(0, 7)}`;
export const weekOfMonth = (d = new Date()) => Math.min(4, Math.ceil(d.getDate() / 7));
