// «Профиль дома» — для КАЖДОГО объекта свой (квартира, дача, дом родственников).
// Один раз отвечаем, что есть в этом жилье, — и приложение показывает только подходящее.
// Пункты чек-листов, карты уборки, техосмотра и библиотеки помечены «нужно: …» (needs); без нужного — скрываются.

export type HomeType = 'apartment' | 'house';
export type ProfileFlag =
  // где и какое жильё
  | 'dacha'
  // части дома
  | 'balcony'
  | 'garden'
  | 'basement'
  | 'attic'
  | 'garage'
  | 'storage'
  | 'stairs'
  // техника
  | 'washer'
  | 'dishwasher'
  | 'dryer'
  | 'robot'
  | 'oven'
  | 'microwave'
  | 'coffee'
  | 'freezer'
  // отопление, вода, энергия
  | 'boiler'
  | 'gas'
  | 'waterheater'
  | 'underfloor'
  | 'fireplace'
  | 'aircon'
  | 'ventilation'
  | 'humidifier'
  | 'waterfilter'
  | 'well'
  | 'septic'
  | 'irrigation'
  | 'solar'
  | 'evcharger'
  // безопасность
  | 'smoke'
  | 'co'
  | 'leak'
  | 'extinguisher'
  | 'alarm'
  | 'intercom'
  // гаджеты и интернет
  | 'laptop'
  | 'phone'
  | 'tablet'
  | 'watch'
  | 'router'
  | 'printer'
  | 'smarthome'
  | 'console'
  // семья и хозяйство
  | 'kids'
  | 'elderly'
  | 'pets'
  | 'plants'
  | 'car'
  | 'bikes';

/** Требование пункта: флаг профиля или тип «house» (частный дом или дача) */
export type Need = ProfileFlag | 'house';

export interface HomeProfile {
  completed: boolean;
  type: HomeType;
  flags: Record<ProfileFlag, boolean>;
  /** Своё: то, чего нет в списке (например «бассейн», «аквариум») */
  custom: string[];
}

export type FlagGroup = 'where' | 'rooms' | 'tech' | 'gadgets' | 'energy' | 'safety' | 'family';
export const FLAG_LABELS: { id: ProfileFlag; label: string; hint?: string; group: FlagGroup }[] = [
  { id: 'dacha', label: 'Есть дача или второй дом', group: 'where' },

  { id: 'balcony', label: 'Балкон или лоджия', group: 'rooms' },
  { id: 'garden', label: 'Сад, участок или терраса', group: 'rooms' },
  { id: 'basement', label: 'Подвал или погреб', group: 'rooms' },
  { id: 'attic', label: 'Чердак', group: 'rooms' },
  { id: 'garage', label: 'Гараж или сарай', group: 'rooms' },
  { id: 'storage', label: 'Кладовая', group: 'rooms' },
  { id: 'stairs', label: 'Лестница, второй этаж', group: 'rooms' },

  { id: 'washer', label: 'Стиральная машина', group: 'tech' },
  { id: 'dryer', label: 'Сушильная машина', group: 'tech' },
  { id: 'dishwasher', label: 'Посудомоечная машина', group: 'tech' },
  { id: 'freezer', label: 'Отдельная морозилка', group: 'tech' },
  { id: 'oven', label: 'Духовка', group: 'tech' },
  { id: 'microwave', label: 'Микроволновка', group: 'tech' },
  { id: 'coffee', label: 'Кофемашина', group: 'tech' },
  { id: 'robot', label: 'Робот-пылесос', group: 'tech' },

  { id: 'laptop', label: 'Ноутбуки или компьютер', group: 'gadgets' },
  { id: 'phone', label: 'Смартфоны', group: 'gadgets' },
  { id: 'tablet', label: 'Планшеты', group: 'gadgets' },
  { id: 'watch', label: 'Умные часы или браслеты', group: 'gadgets' },
  { id: 'router', label: 'Wi-Fi роутер', group: 'gadgets' },
  { id: 'printer', label: 'Принтер', group: 'gadgets' },
  { id: 'smarthome', label: 'Умный дом: колонка, лампы, датчики', group: 'gadgets' },
  { id: 'console', label: 'Телевизор-приставка или игровая приставка', group: 'gadgets' },

  { id: 'boiler', label: 'Свой котёл отопления', hint: 'CV-ketel, газовый или электрический', group: 'energy' },
  { id: 'gas', label: 'Газовая плита', group: 'energy' },
  { id: 'waterheater', label: 'Бойлер, водонагреватель', group: 'energy' },
  { id: 'underfloor', label: 'Тёплый пол', group: 'energy' },
  { id: 'fireplace', label: 'Камин или печь', group: 'energy' },
  { id: 'aircon', label: 'Кондиционер', group: 'energy' },
  { id: 'ventilation', label: 'Механическая вентиляция, рекуператор', group: 'energy' },
  { id: 'humidifier', label: 'Увлажнитель или осушитель', group: 'energy' },
  { id: 'waterfilter', label: 'Фильтр для воды', group: 'energy' },
  { id: 'well', label: 'Скважина или колодец', group: 'energy' },
  { id: 'septic', label: 'Септик', group: 'energy' },
  { id: 'irrigation', label: 'Полив, дождевая бочка', group: 'energy' },
  { id: 'solar', label: 'Солнечные панели', group: 'energy' },
  { id: 'evcharger', label: 'Зарядка электромобиля', group: 'energy' },

  { id: 'smoke', label: 'Датчики дыма', group: 'safety' },
  { id: 'co', label: 'Датчик угарного газа', group: 'safety' },
  { id: 'leak', label: 'Датчики протечки', group: 'safety' },
  { id: 'extinguisher', label: 'Огнетушитель', group: 'safety' },
  { id: 'alarm', label: 'Сигнализация или камеры', group: 'safety' },
  { id: 'intercom', label: 'Домофон', group: 'safety' },

  { id: 'kids', label: 'Дети', group: 'family' },
  { id: 'elderly', label: 'Пожилые родственники', group: 'family' },
  { id: 'pets', label: 'Домашние животные', group: 'family' },
  { id: 'plants', label: 'Комнатные растения', group: 'family' },
  { id: 'car', label: 'Автомобиль', group: 'family' },
  { id: 'bikes', label: 'Велосипеды', group: 'family' },
];
export const GROUP_TITLES: Record<FlagGroup, string> = {
  where: 'Какое это жильё',
  rooms: 'Что есть у жилья',
  tech: 'Бытовая техника',
  gadgets: 'Гаджеты и интернет',
  energy: 'Отопление, вода и энергия',
  safety: 'Безопасность',
  family: 'Кто живёт и что ещё есть',
};

const KEY = 'dbh_home_profile';
const EVT = 'dbh:home-profile';
const ALL_FLAGS = FLAG_LABELS.map((f) => f.id);

// Пока анкета не заполнена — показываем всё, как раньше (ничего не прячем без спроса)
const DEFAULT = (): HomeProfile => ({
  completed: false,
  type: 'apartment',
  flags: Object.fromEntries(ALL_FLAGS.map((f) => [f, true])) as HomeProfile['flags'],
  custom: [],
});

/** Текущий объект — тот, что выбран в шапке приложения */
export const activePropertyId = (): string => {
  try {
    const v = JSON.parse(localStorage.getItem('onehaus_v4_active_property_id') || '"apartment"');
    return v && v !== 'all' ? v : 'apartment';
  } catch {
    return 'apartment';
  }
};

const loadAll = (): Record<string, Partial<HomeProfile>> => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw) return {};
    // Старый формат: один профиль на всё — переносим на текущий объект
    if ('completed' in raw || 'flags' in raw) return { [activePropertyId()]: raw };
    return raw;
  } catch {
    return {};
  }
};

const normalize = (v?: Partial<HomeProfile>): HomeProfile => {
  const d = DEFAULT();
  if (!v) return d;
  // Новые вопросы, на которые ещё не отвечали, считаем «есть», чтобы ничего не пропало без спроса
  return { ...d, ...v, flags: { ...d.flags, ...(v.flags || {}) }, custom: v.custom || [] };
};

export const getHomeProfile = (propId: string = activePropertyId()): HomeProfile => normalize(loadAll()[propId]);

export const saveHomeProfile = (p: HomeProfile, propId: string = activePropertyId()) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadAll(), [propId]: p }));
  } catch {
    /* нет хранилища */
  }
  window.dispatchEvent(new Event(EVT));
};

export const subscribeHomeProfile = (fn: () => void) => {
  window.addEventListener(EVT, fn);
  return () => window.removeEventListener(EVT, fn);
};

/** Подходит ли пункт текущему объекту */
export const applies = (needs: Need[] | undefined, p: HomeProfile = getHomeProfile()) =>
  !needs || needs.every((n) => (n === 'house' ? p.type === 'house' || p.flags.dacha : p.flags[n] !== false));
