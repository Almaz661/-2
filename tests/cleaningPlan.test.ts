import { describe, expect, it } from 'vitest';
import { planForDate, MINUTES, weekdayFor } from '../src/services/cleaningPlan';
import { MAP_ITEMS } from '../src/data/cleaningMap';

const year = () => {
  const out: ReturnType<typeof planForDate>[] = [];
  for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) out.push(planForDate(new Date(d)));
  return out;
};

describe('план по расписанию v2 и по месту в доме', () => {
  it('темы дней недели', () => {
    expect(planForDate(new Date(2026, 10, 2)).zoneTitle).toBe('Планирование и семейная организация');
    expect(planForDate(new Date(2026, 10, 3)).zoneTitle).toBe('Ванная и санитарные зоны');
    expect(planForDate(new Date(2026, 10, 6)).zoneTitle).toBe('Кухня и общие комнаты');
  });
  it('еженедельная уборка только во вторник, среду и пятницу', () => {
    for (const p of year()) {
      const wd = p.date.getDay();
      if (![2, 3, 5].includes(wd)) expect(p.detailed.length).toBe(0);
    }
  });
  it('точные даты: раз в месяц — то же число каждый месяц (10 ноября → 10 декабря)', () => {
    const it = MAP_ITEMS.find((i) => i.title.startsWith('Слив и сифон'))!;
    const days = year().filter((p) => p.rare.some((x) => x.id === it.id)).map((p) => p.date.getDate());
    expect(days.length).toBe(12);
    expect(new Set(days).size).toBe(1);
  });
  it('один день — одна часть дома: вся кухонная техника в пятницу, стиральная машина в среду', () => {
    for (const i of MAP_ITEMS.filter((x) => x.sector === 'kitchen')) expect(weekdayFor(i)).toBe(5);
    expect(weekdayFor(MAP_ITEMS.find((i) => i.title.startsWith('Стиральная машина'))!)).toBe(3);
  });
  it('редкие дела разложены равномерно: не больше 4 в день, каждый месяц примерно одинаково', () => {
    const perMonth = Array(12).fill(0);
    for (const p of year()) {
      expect(p.rare.length).toBeLessThanOrEqual(4);
      perMonth[p.date.getMonth()] += p.rare.length;
    }
    expect(Math.max(...perMonth) - Math.min(...perMonth)).toBeLessThanOrEqual(12);
  });
  it('уборка зон никогда не больше 2 часов в день', () => {
    for (const p of year()) expect(p.detailed.length * MINUTES.detailed + p.rare.length * MINUTES.rare).toBeLessThanOrEqual(120);
  });
  it('за год каждый пункт карты встречается хотя бы раз', () => {
    const seen = new Set<string>();
    for (const p of year()) [...p.daily, ...p.detailed, ...p.rare].forEach((i) => seen.add(i.id));
    expect(MAP_ITEMS.filter((i) => !seen.has(i.id)).map((i) => i.title)).toEqual([]);
  });
});

import { groupOf, orderItems } from '../src/utils/cleaningOrder';
describe('порядок внутри дня', () => {
  it('один прибор целиком, полы в конце: дела идут группами без возврата', () => {
    for (const p of year()) {
      const keys = orderItems([...p.detailed, ...p.rare]).map((i) => groupOf(i.title).key);
      // группа не должна встречаться снова после того, как сменилась (нет «стиралка → холодильник → стиралка»)
      const seen = new Set<string>();
      let prev = '';
      for (const k of keys) {
        if (k !== prev) {
          expect(seen.has(k)).toBe(false);
          seen.add(k);
          prev = k;
        }
      }
      if (keys.includes('floor')) expect(keys[keys.length - 1]).toBe('floor');
    }
  });
});
