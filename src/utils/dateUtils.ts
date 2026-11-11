/**
 * Утилиты для точной работы с локальными календарными датами без искажений часовых поясов (UTC/GMT)
 */

export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
}

export function getTodayDateStr(): string {
  return formatLocalDate(new Date());
}

/**
 * Разница в днях между двумя датами (targetDate - baseDate)
 * Положительное значение означает будущее, 0 - сегодня, отрицательное - прошлое
 */
export function getDiffDays(targetDateStr: string, baseDate: Date = new Date()): number {
  const target = parseLocalDate(targetDateStr);
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const diffMs = target.getTime() - base.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Происходит ли событие в этот день с учётом ежегодного повтора
 * (дни рождения, годовщины, праздники).
 */
export function occursOn(ev: { date: string; recurringYearly?: boolean }, dateStr: string): boolean {
  if (ev.date === dateStr) return true;
  return !!ev.recurringYearly && dateStr > ev.date && ev.date.slice(5) === dateStr.slice(5);
}

/** Ближайшая дата события с учётом ежегодного повтора (для списков «что впереди»). */
export function nextOccurrence(ev: { date: string; recurringYearly?: boolean }, from: string = getTodayDateStr()): string {
  if (!ev.recurringYearly || ev.date >= from) return ev.date;
  const year = Number(from.slice(0, 4));
  const thisYear = `${year}-${ev.date.slice(5)}`;
  return thisYear >= from ? thisYear : `${year + 1}-${ev.date.slice(5)}`;
}
