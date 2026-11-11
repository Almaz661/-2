// Порядок уборки внутри дня — по правилам дома: одно место или прибор целиком, затем следующее;
// сверху вниз, сначала сухая уборка, потом влажная, полы — в самом конце.
import type { MapItem } from '../data/cleaningMap';

export interface OrderGroup {
  key: string;
  label: string;
  icon: string;
  order: number;
  re: RegExp;
}

// Сначала техника — каждый прибор целиком (все дела по нему подряд), потом сверху вниз, полы в конце
export const GROUPS: OrderGroup[] = [
  { key: 'washer', label: 'Стиральная машина', icon: '🧺', order: 10, re: /стиральн/i },
  { key: 'vacuum', label: 'Пылесос и робот', icon: '🤖', order: 12, re: /пылесос|робот/i },
  { key: 'dryer', label: 'Сушильная машина', icon: '🌀', order: 11, re: /сушильн/i },
  { key: 'fridge', label: 'Холодильник и морозильник', icon: '🧊', order: 20, re: /холодильник|морозил/i },
  { key: 'dishwasher', label: 'Посудомойка', icon: '🍽️', order: 21, re: /посудомо/i },
  { key: 'oven', label: 'Духовка, микроволновка, плита', icon: '🔥', order: 22, re: /духовк|микроволн|плит|фартук/i },
  { key: 'hood', label: 'Вытяжка', icon: '💨', order: 23, re: /вытяжк/i },
  { key: 'kettle', label: 'Вода: чайник, кофемашина, фильтр', icon: '☕', order: 24, re: /чайник|кофемашин|накип|фильтр для воды/i },
  { key: 'high', label: 'Наверху: потолок, светильники, шкафы сверху', icon: '⬆️', order: 30, re: /потол|люстр|светильник|выше 180|карниз|стены|решётк|вентиляц/i },
  { key: 'windows', label: 'Окна и шторы', icon: '🪟', order: 31, re: /окн|штор|подоконник/i },
  { key: 'textile', label: 'Кровать и текстиль', icon: '🛏️', order: 32, re: /матрас|постел|полотенц|коврик в ванной|мягкая мебель/i },
  { key: 'furniture', label: 'Шкафы и мебель', icon: '🗄️', order: 33, re: /шкаф|ручки|двери|наличник|тумб|полки|дозатор|стаканчик|пульт/i },
  { key: 'surfaces', label: 'Поверхности и пыль', icon: '🧽', order: 34, re: /пыль|зеркал|горизонтал|выключател|стол|раковин|кран|столешниц/i },
  { key: 'plumbing', label: 'Сантехника и сливы', icon: '🚿', order: 40, re: /унитаз|ванн|душ|слив|сифон|сантехник|швы плитки|герметик|плитк/i },
  { key: 'waste', label: 'Мусор, губки, ревизия', icon: '🗑️', order: 50, re: /мусор|губк|тряпк|ревизи|крупы|аптечк/i },
  { key: 'floor', label: 'Полы — в конце', icon: '🧹', order: 90, re: /пол\b|пола|полу|ковр|мебел|под кроват|под диван|плинтус|за техникой/i },
];

// Точное место каждого пункта «Карты уборки» (для своих пунктов — по словам в названии)
const BY_TITLE: Record<string, string> = {
  'Стиральная машина: фильтр и стирка на 90°': 'washer',
  'Холодильник — ревизия продуктов, протереть полки': 'fridge',
  'Холодильник полностью': 'fridge',
  'Морозилка — разморозить': 'fridge',
  'Посудомойка — фильтр и соль': 'dishwasher',
  'Техника внутри: микроволновка, духовка-гриль': 'oven',
  'Духовка внутри и решётки': 'oven',
  'Фартук над плитой': 'oven',
  'Плита, фасады — локально сразу': 'oven',
  'Фильтр вытяжки': 'hood',
  'Чайник и кофемашина — накипь': 'kettle',
  'Всё выше 180 см — шкафы сверху, карнизы': 'high',
  'Люстры и светильники': 'high',
  'Вентиляционные решётки': 'high',
  'Стены — пятна и следы': 'high',
  'Стены, потолок, внутри шкафчика': 'high',
  'Вентиляционная решётка': 'high',
  'Потолок': 'high',
  'Окна изнутри и рамы': 'windows',
  'Шторы постирать или пропылесосить': 'windows',
  'Подоконники': 'windows',
  'Шкафчики и фасады внутри, шторы, окно': 'windows',
  'Матрас — пропылесосить, перевернуть': 'textile',
  'Полотенца сменить': 'textile',
  'Коврик в ванной постирать': 'textile',
  'Мягкая мебель — пропылесосить': 'textile',
  'Шкафы с одеждой внутри — разобрать': 'furniture',
  'Двери целиком, наличники': 'furniture',
  'Ручки шкафов и техники': 'furniture',
  'Входная дверь изнутри и обувная полка': 'furniture',
  'Пульты, телефоны, клавиатуры': 'furniture',
  'Дозаторы, стаканчики': 'furniture',
  'Под раковиной, под стеллажом': 'furniture',
  'Всё до 180 см — пыль': 'surfaces',
  'Батареи, экраны': 'surfaces',
  'Батарея, экран': 'surfaces',
  'Зеркала и стеклянные двери в комнатах': 'surfaces',
  'Сантехника с химией': 'plumbing',
  'Душевая лейка и шторка': 'plumbing',
  'Слив и сифон прочистить': 'plumbing',
  'Накипь на лейке и смесителях': 'plumbing',
  'Швы плитки отбелить': 'plumbing',
  'Герметик (кит) — проверить, нет ли плесени': 'plumbing',
  'Под ванной, под шкафчиком': 'plumbing',
  'Мусорное ведро и корзина для белья': 'waste',
  'Мусорное ведро помыть': 'waste',
  'Губки и тряпки — заменить или прокипятить': 'waste',
  'Аптечка и косметика — просроченное': 'waste',
  'Крупы и специи — ревизия': 'waste',
  'Влажная уборка': 'floor',
  'Под кроватью, под диваном, за лёгкой мебелью': 'floor',
  'Ковры и коврики пропылесосить': 'floor',
  'Плинтусы протереть': 'floor',
  'Пол в ванной и туалете — влажно с моющим': 'floor',
  'За тяжёлой мебелью': 'floor',
  'Швы плитки на полу': 'floor',
  'Уход за паркетом или ламинатом — средство по уходу': 'floor',
  'Глубокая чистка ковров': 'floor',
  'Под холодильником и плитой': 'floor',
  'Коврик в прихожей': 'floor',
  'За техникой, за мебелью': 'floor',
};

const OTHER: OrderGroup = { key: 'other', label: 'Прочее', icon: '•', order: 80, re: /$^/ };

export const groupOf = (title: string): OrderGroup =>
  (BY_TITLE[title] && GROUPS.find((g) => g.key === BY_TITLE[title])) || GROUPS.find((g) => g.re.test(title)) || OTHER;

/** Отсортировать по месту и прибору; внутри группы — сначала сухое (пыль), потом влажное */
export function orderItems<T extends Pick<MapItem, 'title'>>(items: T[]): T[] {
  const wet = (t: string) => (/помыть|мыть|влажн|с химией|отбелить|прочистить|постирать/i.test(t) ? 1 : 0);
  return [...items].sort((a, b) => groupOf(a.title).order - groupOf(b.title).order || wet(a.title) - wet(b.title));
}

/** Разбить на группы для показа с заголовками */
export function groupItems<T extends Pick<MapItem, 'title'>>(items: T[]): { group: OrderGroup; items: T[] }[] {
  const out: { group: OrderGroup; items: T[] }[] = [];
  for (const i of orderItems(items)) {
    const g = groupOf(i.title);
    const last = out[out.length - 1];
    if (last && last.group.key === g.key) last.items.push(i);
    else out.push({ group: g, items: [i] });
  }
  return out;
}

// Порядок комнат: закончили одну — перешли в следующую, без возвратов
export const ROOM_ORDER = ['Ванная', 'Кухня', 'Гостиная', 'Спальня', 'Детская', 'Прихожая', 'Весь дом', 'Авто', 'Участок/Дача'] as const;
export const ROOM_ICON: Record<string, string> = {
  Ванная: '🛁',
  Кухня: '🍳',
  Гостиная: '🛋️',
  Спальня: '🛏️',
  Детская: '🧸',
  Прихожая: '🚪',
  'Весь дом': '🏠',
  Авто: '🚗',
  'Участок/Дача': '🌳',
};
const roomIdx = (z?: string) => {
  const i = ROOM_ORDER.indexOf((z || 'Весь дом') as (typeof ROOM_ORDER)[number]);
  return i < 0 ? ROOM_ORDER.length : i;
};

/** Сгруппировать дела по комнатам, а внутри комнаты — по прибору или месту (всё по одной стиральной машине подряд) */
export function groupByRoom<T extends { title: string; zone?: string }>(items: T[]): { room: string; icon: string; items: T[] }[] {
  const sorted = items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => roomIdx(a.it.zone) - roomIdx(b.it.zone) || groupOf(a.it.title).order - groupOf(b.it.title).order || a.i - b.i)
    .map((x) => x.it);
  const out: { room: string; icon: string; items: T[] }[] = [];
  for (const it of sorted) {
    const room = it.zone || 'Весь дом';
    const last = out[out.length - 1];
    if (last && last.room === room) last.items.push(it);
    else out.push({ room, icon: ROOM_ICON[room] || '•', items: [it] });
  }
  return out;
}
