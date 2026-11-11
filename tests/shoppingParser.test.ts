import { describe, expect, it } from 'vitest';
import { parseShoppingInput } from '../src/utils/shoppingParser';

describe('список покупок', () => {
  it('делит обычный список', () => {
    expect(parseShoppingInput('молоко, 2 пачки творога и яйца').map((x) => x.title)).toHaveLength(3);
  });
  it('не режет позицию со скобками', () => {
    expect(parseShoppingInput('Нурофен для детей (Ибупрофен, 100 мг / 5 мл)')).toHaveLength(1);
  });
});

import { detectShoppingCategory } from '../src/utils/shoppingParser';
describe('отделы магазина', () => {
  const cases: [string, string][] = [
    ['Туалетная бумага', 'household'], ['Стиральный порошок', 'household'], ['Зубная паста', 'household'],
    ['Сливочное масло', 'dairy'], ['Овсяное молоко', 'drinks'], ['Печенье', 'sweets'], ['Печень куриная', 'meat'],
    ['Шоколад', 'sweets'], ['Сок апельсиновый', 'drinks'], ['Томатная паста', 'pantry'], ['Перец болгарский', 'produce'],
    ['Чёрный перец молотый', 'pantry'], ['Пельмени', 'meat'], ['Корм для кота', 'other'],
  ];
  it.each(cases)('%s → %s', (t, c) => expect(detectShoppingCategory(t)).toBe(c));
  it('список целиком без выбранного отдела раскладывается сам', () => {
    const r = parseShoppingInput('молоко, хлеб, туалетная бумага, яблоки, шоколад').map((x) => x.category);
    expect(r).toEqual(['dairy', 'bakery', 'household', 'produce', 'sweets']);
  });
});
