import { describe, expect, it } from 'vitest';
import { seasonOf, sekkiOf } from '../src/utils/season';
describe('сезоны', () => {
  it('ноябрь — осень, 4 ноября — «Выпадает иней», 7 ноября — «Начало зимы»', () => {
    expect(seasonOf(new Date(2026, 10, 4)).id).toBe('autumn');
    expect(sekkiOf(new Date(2026, 10, 4)).ru).toBe('Выпадает иней');
    expect(sekkiOf(new Date(2026, 10, 7)).ru).toBe('Начало зимы');
  });
  it('1 января — «Зимнее солнцестояние» с прошлого года, 5 января — «Малый холод»', () => {
    expect(sekkiOf(new Date(2027, 0, 1)).ru).toBe('Зимнее солнцестояние');
    expect(sekkiOf(new Date(2027, 0, 5)).ru).toBe('Малый холод');
  });
});
