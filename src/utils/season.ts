// Кисэцукан — чувство сезона. Время года (для чек-листов) и японские 24 сезона «сэкки» (для настроения).

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonInfo {
  id: SeasonId;
  title: string;
  icon: string;
  /** Сезонный оттенок: сакура, молодая листва, клён момидзи, зимнее серебро */
  color: string;
  colorName: string;
  phrase: string;
}

export const SEASONS: Record<SeasonId, SeasonInfo> = {
  spring: { id: 'spring', title: 'Весна', icon: '🌸', color: '#C27A8C', colorName: 'сакура', phrase: 'Время открыть окна, дачу и сезон.' },
  summer: { id: 'summer', title: 'Лето', icon: '🌿', color: '#5B8C5A', colorName: 'молодая листва', phrase: 'Сад, поездки и лёгкий дом.' },
  autumn: { id: 'autumn', title: 'Осень', icon: '🍁', color: '#B0562F', colorName: 'клён момидзи', phrase: 'Время уюта и подготовки дома к зиме.' },
  winter: { id: 'winter', title: 'Зима', icon: '❄️', color: '#6E86A3', colorName: 'зимнее серебро', phrase: 'Тепло, свет и семейные праздники.' },
};

export const seasonOf = (d = new Date()): SeasonInfo => {
  const m = d.getMonth();
  return SEASONS[m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'];
};

export interface Sekki {
  romaji: string;
  ru: string;
  /** [месяц 0–11, день] начала */
  start: [number, number];
}

// 24 сезона японского календаря (даты начала — приблизительные, ±1 день)
export const SEKKI: Sekki[] = [
  { romaji: 'Сёкан', ru: 'Малый холод', start: [0, 5] },
  { romaji: 'Дайкан', ru: 'Большой холод', start: [0, 20] },
  { romaji: 'Риссюн', ru: 'Начало весны', start: [1, 4] },
  { romaji: 'Усуй', ru: 'Дождевая вода', start: [1, 19] },
  { romaji: 'Кэйтицу', ru: 'Пробуждение насекомых', start: [2, 6] },
  { romaji: 'Сюмбун', ru: 'Весеннее равноденствие', start: [2, 21] },
  { romaji: 'Сэймэй', ru: 'Чистый свет', start: [3, 5] },
  { romaji: 'Коку', ru: 'Дождь для злаков', start: [3, 20] },
  { romaji: 'Рикка', ru: 'Начало лета', start: [4, 6] },
  { romaji: 'Сёман', ru: 'Малое изобилие', start: [4, 21] },
  { romaji: 'Бо:сю', ru: 'Колос в зерне', start: [5, 6] },
  { romaji: 'Гэси', ru: 'Летнее солнцестояние', start: [5, 21] },
  { romaji: 'Сёсё', ru: 'Малая жара', start: [6, 7] },
  { romaji: 'Тайсё', ru: 'Большая жара', start: [6, 23] },
  { romaji: 'Риссю', ru: 'Начало осени', start: [7, 8] },
  { romaji: 'Сёсё', ru: 'Жара уходит', start: [7, 23] },
  { romaji: 'Хакуро', ru: 'Белая роса', start: [8, 8] },
  { romaji: 'Сюбун', ru: 'Осеннее равноденствие', start: [8, 23] },
  { romaji: 'Канро', ru: 'Холодная роса', start: [9, 8] },
  { romaji: 'Со:ко:', ru: 'Выпадает иней', start: [9, 23] },
  { romaji: 'Ритто', ru: 'Начало зимы', start: [10, 7] },
  { romaji: 'Сёсэцу', ru: 'Малый снег', start: [10, 22] },
  { romaji: 'Тайсэцу', ru: 'Большой снег', start: [11, 7] },
  { romaji: 'То:дзи', ru: 'Зимнее солнцестояние', start: [11, 22] },
];

export const sekkiOf = (d = new Date()): Sekki => {
  const key = d.getMonth() * 100 + d.getDate();
  let cur = SEKKI[SEKKI.length - 1];
  for (const s of SEKKI) if (s.start[0] * 100 + s.start[1] <= key) cur = s;
  return cur;
};

/** Сезонный оттенок в CSS (--season) и атрибут data-season на <html>. */
export const applySeason = (d = new Date()) => {
  const s = seasonOf(d);
  document.documentElement.style.setProperty('--season', s.color);
  document.documentElement.dataset.season = s.id;
};
