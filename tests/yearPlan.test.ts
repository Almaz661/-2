import { describe, expect, it } from 'vitest';
import { INITIAL_TASK_PACKS } from '../src/data/initialData';
import { buildPlan, collectItems, DEFAULT_CAPS } from '../src/services/yearPlan';

const today = new Date(2026, 10, 7);
describe('план до конца года', () => {
  const items = collectItems(INITIAL_TASK_PACKS, today);
  const { planned, unplaced } = buildPlan(items, []);
  it('все дела разложены, ничего не потерялось', () => {
    expect(items.length).toBeGreaterThan(50);
    expect(unplaced).toEqual([]);
    expect(planned.length).toBeGreaterThan(items.length * 0.9);
  });
  it('в день не больше 3 важных и 5 обычных (выходные — 1 и 2)', () => {
    const by = new Map<string, { imp: number; reg: number }>();
    for (const p of planned) {
      const l = by.get(p.date) || { imp: 0, reg: 0 };
      if (p.item.priority === 'high') l.imp++;
      else l.reg++;
      by.set(p.date, l);
    }
    for (const [d, l] of by) {
      const we = [0, 6].includes(new Date(d + 'T12:00:00').getDay());
      expect(l.imp).toBeLessThanOrEqual(we ? DEFAULT_CAPS.weekendImportant : DEFAULT_CAPS.important);
      expect(l.reg).toBeLessThanOrEqual(we ? DEFAULT_CAPS.weekendRegular : DEFAULT_CAPS.regular);
    }
  });
  it('всё в пределах до 31 декабря и не раньше сегодня', () => {
    for (const p of planned) {
      expect(p.date >= '2026-11-07').toBe(true);
      expect(p.date <= '2026-12-31').toBe(true);
      expect(p.date >= p.item.from).toBe(true);
    }
  });
  it('уже назначенные дела учитываются в лимите', () => {
    const busy = Array.from({ length: 3 }, () => ({ dueDate: '2026-11-10', priority: 'high' as const, completed: false }));
    const r = buildPlan(items, busy);
    expect(r.planned.filter((p) => p.date === '2026-11-10' && p.item.priority === 'high')).toHaveLength(0);
  });
});

import { planForDate, MINUTES } from '../src/services/cleaningPlan';
describe('план в пределах 2 часов', () => {
  it('с ограничением по времени основная задача дня не больше 80 минут и всё помещается', () => {
    const memo = new Map<string, number>();
    const free = (d: Date) => {
      const k = d.toDateString();
      if (!memo.has(k)) {
        const p = planForDate(d);
        memo.set(k, p.isRestDay ? 20 : Math.max(0, 80 - (p.detailed.length * MINUTES.detailed + p.rare.length * MINUTES.rare)));
      }
      return memo.get(k)!;
    };
    const items = collectItems(INITIAL_TASK_PACKS, today);
    const { planned, unplaced } = buildPlan(items, [], DEFAULT_CAPS, free);
    expect(unplaced).toEqual([]);
    // Одно и то же дело — не больше раза в месяц
    const seen = new Set<string>();
    for (const p of planned) {
      const k = p.item.title + '|' + p.date.slice(0, 7);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
    const by = new Map<string, number>();
    planned.forEach((p) => by.set(p.date, (by.get(p.date) || 0) + 1));
    for (const [d, n] of by) expect(n * 10).toBeLessThanOrEqual(free(new Date(d + 'T12:00:00')));
  });
});
