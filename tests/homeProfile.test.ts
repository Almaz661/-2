import { beforeEach, describe, expect, it } from 'vitest';
import { applies, saveHomeProfile, getHomeProfile } from '../src/utils/homeProfile';
import { planForDate } from '../src/services/cleaningPlan';

const store: Record<string, string> = {};
beforeEach(() => {
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => (store[k] = v),
    removeItem: (k: string) => delete store[k],
  };
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  for (const k of Object.keys(store)) delete store[k];
});

describe('профиль дома', () => {
  it('пока анкета не заполнена — показываем всё', () => {
    expect(applies(['dishwasher'])).toBe(true);
  });
  it('квартира без посудомойки и дачи: лишнее скрыто из плана на год', () => {
    const p = getHomeProfile();
    saveHomeProfile({ completed: true, type: 'apartment', flags: { ...p.flags, dishwasher: false, dacha: false }, custom: [] });
    expect(applies(['dishwasher'])).toBe(false);
    expect(applies(['house'])).toBe(false);
    const titles = new Set<string>();
    for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
      const pl = planForDate(new Date(d));
      [...pl.detailed, ...pl.rare].forEach((i) => titles.add(i.title));
      pl.seasonal.forEach((s) => titles.add(s.title));
    }
    expect(titles.has('Посудомойка — фильтр и соль')).toBe(false);
    expect(titles.has('Дача — закрыть сезон')).toBe(false);
    expect(titles.has('Фильтр вытяжки')).toBe(true);
  });
});
