import { ShoppingCategory } from '../types';

export interface ParsedShoppingItem {
  title: string;
  quantity?: string;
  category: ShoppingCategory;
}

/**
 * Словарь сопоставления ключевых слов с категориями покупок
 */
const CATEGORY_KEYWORDS: Record<ShoppingCategory, string[]> = {
  produce: [
    'базилик', 'черри', 'помидор', 'томат', 'огур', 'салат', 'зелень', 'укроп', 'петрушк',
    'кинз', 'мята', 'руккол', 'шпинат', 'лук', 'чеснок', 'яблок', 'груш', 'банан', 'апельсин',
    'мандарин', 'лимон', 'лайм', 'авокадо', 'морков', 'картоф', 'картошк', 'свекл', 'свёкл',
    'капуст', 'брокколи', 'кабачок', 'баклажан', 'перец', 'ягод', 'клубник', 'малин', 'черник',
    'голубик', 'виноград', 'гриб', 'шампиньон', 'спарж', 'сельдерей', 'редис', 'тыква', 'ананас',
    'манго', 'арбуз', 'дыня', 'персик', 'нектарин', 'слива', 'гранат', 'имбирь',
    // греческий / английский
    'ντομάτ', 'αγγούρ', 'κρεμμύδ', 'σκόρδο', 'μπανάνα', 'μήλο', 'λεμόνι', 'σαλάτα',
    'tomato', 'cucumber', 'onion', 'garlic', 'apple', 'banana', 'lemon', 'salad', 'basil',
  ],
  dairy: [
    'молок', 'сыр', 'творог', 'сметан', 'сливк', 'йогурт', 'кефир', 'масло сливочн',
    'яйц', 'яйцо', 'ряженк', 'простокваш', 'брынз', 'фета', 'моцарелл', 'сулугуни',
    'пармезан', 'чеддер', 'гауда', 'маскарпоне', 'рикотта', 'плавлен', 'творож',
    // греческий / английский
    'γάλα', 'φέτα', 'τυρί', 'γιαούρτι', 'αυγά', 'βούτυρο',
    'milk', 'cheese', 'butter', 'egg', 'eggs', 'yogurt', 'cream',
  ],
  meat: [
    'мясо', 'говядин', 'свинин', 'куриц', 'курин', 'индейк', 'фарш', 'филе', 'стейк',
    'сосиск', 'колбас', 'ветчин', 'бекон', 'грудинк', 'буженинк', 'лосос', 'рыб',
    'форел', 'семг', 'судак', 'треск', 'тунец', 'минтай', 'креветк', 'кальмар', 'мидии',
    'морепродукт', 'котлет', 'паштет', 'окорок', 'печень', 'сердце', 'баранин',
    // греческий / английский
    'κρέας', 'κοτόπουλο', 'ψάρι', 'μοσχάρι', 'χοιρινό', 'γαρίδες',
    'meat', 'chicken', 'fish', 'beef', 'pork', 'salmon', 'shrimp', 'sausage',
  ],
  bakery: [
    'хлеб', 'батон', 'багет', 'лаваш', 'булоч', 'круассан', 'пита', 'тост', 'лепешк',
    'сухари', 'булка', 'сдоба', 'пирог', 'чиабатт', 'фокачч', 'кекс', 'пряник',
    // греческий / английский
    'ψωμί', 'πίτα', 'κουλούρι', 'κρουασάν',
    'bread', 'baguette', 'croissant', 'pita', 'buns',
  ],
  pantry: [
    'соль', 'сахар', 'мук', 'макарон', 'спагетти', 'паст', 'пенне', 'фузилли', 'рис',
    'гречк', 'овсянк', 'крупа', 'хлопья', 'масло оливк', 'масло растит', 'масло подсолн',
    'соус', 'кетчуп', 'майонез', 'горчиц', 'специ', 'приправ', 'прованск', 'перец черн',
    'ореган', 'паприк', 'кориц', 'орех', 'фундук', 'миндал', 'кешью', 'грецк', 'фасол',
    'горох', 'чечевиц', 'консерв', 'оливк', 'маслин', 'томатная паста', 'уксус', 'сода',
    'дрожжи', 'мед', 'мёд', 'джем', 'варень', 'хлопья', 'семечки',
    // греческий / английский
    'λάδι', 'ελαιόλαδο', 'αλάτι', 'ζάχαρη', 'μακαρόνια', 'ρύζι', 'αλεύρι',
    'oil', 'olive oil', 'salt', 'sugar', 'pasta', 'spaghetti', 'rice', 'flour', 'spices',
  ],
  drinks: [
    'вод', 'сок', 'морс', 'компот', 'чай', 'кофе', 'кола', 'пепси', 'лимонад',
    'квас', 'вино', 'пиво', 'напиток', 'сироп', 'энергетик', 'молоко овсян',
    'молоко миндальн', 'молоко кокосов', 'газировк', 'минералк',
    // греческий / английский
    'νερό', 'χυμός', 'καφές', 'τσάι', 'κρασί', 'μπύρα',
    'water', 'juice', 'coffee', 'tea', 'wine', 'beer', 'soda',
  ],
  household: [
    'бумага туалетн', 'салфетк', 'губк', 'тряпк', 'порошок стиральн', 'гель для стирк',
    'таблетки для посудомойк', 'мыло', 'шампунь', 'бальзам', 'зубная паста', 'зубная щетк',
    'пакеты для мусора', 'мешки для мусора', 'фольга', 'пергамент', 'средство', 'освежитель',
    'батарейк', 'лампочк', 'белизн', 'кондиционер для белья', 'капсулы', 'зубочистк',
    // греческий / английский
    'χαρτί', 'απορρυπαντικό', 'σαπούνι', 'οδοντόκρεμα',
    'soap', 'shampoo', 'tissue', 'paper', 'detergent', 'cleaner',
  ],
  pharmacy: [
    'аспирин', 'парацетамол', 'ибупрофен', 'бинт', 'пластыр', 'витамин', 'капли',
    'спрей', 'лекарств', 'таблетк', 'мазь', 'градусник', 'термометр', 'хлоргексидин',
    'антисептик', 'd3', 'd-3', 'омега',
    // греческий / английский
    'φάρμακο', 'βιταμίνη', 'παυσίπονο',
    'vitamin', 'medicine', 'pill', 'plaster', 'drops',
  ],
  sweets: [
    'шоколад', 'конфет', 'печень', 'торт', 'пирожн', 'мармелад', 'зефир', 'пастил',
    'чипс', 'снек', 'вафл', 'халв', 'морожен', 'сухар', 'леденц', 'батончик',
    // греческий / английский
    'σοκολάτα', 'μπισκότα', 'γλυκό', 'παγωτό',
    'chocolate', 'cookies', 'candy', 'cake', 'ice cream', 'sweets', 'snack', 'chips',
  ],
  other: [],
};

/**
 * Словарь для красивой нормализации частых названий
 */
const CANONICAL_NAMES: Array<{ pattern: RegExp; canonical: string; defaultQty?: string }> = [
  { pattern: /^(?:помидоры\s+)?черри$/iu, canonical: 'Помидоры черри', defaultQty: '250 г' },
  { pattern: /^(?:свежий\s+)?базилик$/iu, canonical: 'Свежий базилик', defaultQty: '1 пучок' },
  { pattern: /^(?:свежий\s+)?укроп$/iu, canonical: 'Свежий укроп', defaultQty: '1 пучок' },
  { pattern: /^(?:свежая\s+)?петрушка$/iu, canonical: 'Свежая петрушка', defaultQty: '1 пучок' },
  { pattern: /^(?:свежая\s+)?кинза$/iu, canonical: 'Свежая кинза', defaultQty: '1 пучок' },
  { pattern: /^(?:свежая\s+)?мята$/iu, canonical: 'Свежая мята', defaultQty: '1 пучок' },
  { pattern: /^(?:свежая\s+)?руккола$/iu, canonical: 'Руккола', defaultQty: '100 г' },
  { pattern: /^(?:свежий\s+)?шпинат$/iu, canonical: 'Шпинат свежий', defaultQty: '125 г' },
  { pattern: /^прованские\s+травы$/iu, canonical: 'Прованские травы', defaultQty: '1 ч. л.' },
  { pattern: /^морская\s+соль$/iu, canonical: 'Морская соль', defaultQty: 'по вкусу' },
  { pattern: /^соль$/iu, canonical: 'Соль поваренная', defaultQty: '1 пачка' },
  { pattern: /^(?:ч[её]рный\s+)?перец$/iu, canonical: 'Чёрный перец', defaultQty: '1 уп.' },
  { pattern: /^(?:оливковое\s+масло|масло\s+оливковое)$/iu, canonical: 'Оливковое масло Extra Virgin', defaultQty: '1 бут.' },
  { pattern: /^хлеб$/iu, canonical: 'Хлеб', defaultQty: '1 шт.' },
  { pattern: /^молоко$/iu, canonical: 'Молоко', defaultQty: '1 л' },
  { pattern: /^яйца$/iu, canonical: 'Яйца куриные C1', defaultQty: '10 шт.' },
  { pattern: /^творог$/iu, canonical: 'Творог 5%', defaultQty: '1 уп.' },
  { pattern: /^сметана$/iu, canonical: 'Сметана 15-20%', defaultQty: '1 бан.' },
  { pattern: /^сливочное\s+масло$/iu, canonical: 'Сливочное масло 82.5%', defaultQty: '1 пачка' },
];

/**
 * Словарь нормализации родительного падежа в именительный после числительных
 * (например, «2 пачки творога» -> «Творог»)
 */
const GENITIVE_NORMALIZER: Record<string, string> = {
  творога: 'Творог 5%',
  молока: 'Молоко',
  хлеба: 'Хлеб',
  яиц: 'Яйца куриные',
  сыра: 'Сыр',
  масла: 'Сливочное масло',
  сметаны: 'Сметана',
  сливок: 'Сливки 20%',
  яблок: 'Яблоки',
  бананов: 'Бананы',
  помидоров: 'Помидоры',
  помидор: 'Помидоры',
  огурцов: 'Огурцы',
  картофеля: 'Картофель',
  картошки: 'Картофель',
  моркови: 'Морковь',
  чеснока: 'Чеснок',
  лука: 'Лук репчатый',
  фарша: 'Фарш мясной',
  мяса: 'Мясо',
  курицы: 'Куриное филе',
  куриного: 'Куриное филе',
  рыбы: 'Рыба',
  лосося: 'Филе лосося',
  муки: 'Мука',
  сахара: 'Сахар',
  соли: 'Соль',
  чая: 'Чай',
  кофе: 'Кофе',
};

/**
 * Определяет категорию товара по его названию
 */
export function detectShoppingCategory(
  name: string,
  fallback: ShoppingCategory = 'produce'
): ShoppingCategory {
  const lower = name.toLowerCase().trim();

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [ShoppingCategory, string[]][]) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return cat;
      }
    }
  }

  return fallback;
}

/**
 * Извлекает количество и очищенное название товара из подстроки.
 */
export function extractQuantityAndTitle(raw: string): { title: string; quantity?: string } {
  let clean = raw.trim();

  // Удаление начальных маркеров списков: "1.", "1)", "-", "•", "*"
  clean = clean.replace(/^[\d]+[\.\)]\s*/u, '').replace(/^[-•*–—]\s*/u, '').trim();

  // 1. Поиск количества в скобках в конце: "Товар (2 шт)", "Сыр (200 г)"
  const bracketMatch = clean.match(/^(.+?)\s*\(([\d\.,\/\s]+(?:\s*[а-яёa-z%]+)?)\)$/iu);
  if (bracketMatch) {
    return {
      title: cleanTitle(bracketMatch[1]),
      quantity: bracketMatch[2].trim(),
    };
  }

  // 2. Поиск количества через дефис/тире: "Товар - 1 кг", "Молоко — 2 л"
  const dashMatch = clean.match(/^(.+?)\s*[-—–]\s*([\d\.,\/\s]+(?:\s*[а-яёa-z%]+)?)$/iu);
  if (dashMatch && /\d/.test(dashMatch[2])) {
    return {
      title: cleanTitle(dashMatch[1]),
      quantity: dashMatch[2].trim(),
    };
  }

  // 3. Поиск количества в начале строки:
  // "2 пачки творога", "1 кг яблок", "3 шт авокадо", "2л молока", "500г фарша"
  const leadingQtyMatch = clean.match(
    /^(\d+(?:[.,]\d+)?\s*(?:кг|г|гр|л|мл|шт|уп|пачк[а-яёa-z]*|бутыл[а-яёa-z]*|бут|бан[а-яёa-z]*|пуч[а-яёa-z]*|дес[а-яёa-z]*|kg|g|l|ml|pcs|pack)?)\s+(?:из\s+)?(.+)$/iu
  );
  if (leadingQtyMatch && leadingQtyMatch[1] && /\d/.test(leadingQtyMatch[1])) {
    const qtyCandidate = leadingQtyMatch[1].trim();
    const restTitle = leadingQtyMatch[2].trim();

    if (restTitle.length > 1) {
      return {
        title: cleanTitle(restTitle),
        quantity: qtyCandidate,
      };
    }
  }

  // 4. Поиск количества в конце строки:
  // "Творог 5% 2 пачки", "Яблоки 1.5 кг", "Базилик 1 пучок", "Черри 250г", "Молоко 2л"
  const trailingQtyMatch = clean.match(
    /^(.+?)\s+(\d+(?:[.,]\d+)?\s*(?:кг|г|гр|л|мл|шт|уп|пачк[а-яёa-z]*|бутыл[а-яёa-z]*|бут|бан[а-яёa-z]*|пуч[а-яёa-z]*|дес[а-яёa-z]*|kg|g|l|ml|pcs|pack))$/iu
  );
  if (trailingQtyMatch && trailingQtyMatch[1] && trailingQtyMatch[2]) {
    return {
      title: cleanTitle(trailingQtyMatch[1]),
      quantity: trailingQtyMatch[2].trim(),
    };
  }

  return { title: cleanTitle(clean) };
}

/**
 * Очищает и форматирует название товара (заглавная буква, канонизация, нормализация падежа)
 */
function cleanTitle(s: string): string {
  let res = s.trim().replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '');
  if (!res) return '';

  const lower = res.toLowerCase();

  // Нормализация родительного падежа
  if (GENITIVE_NORMALIZER[lower]) {
    res = GENITIVE_NORMALIZER[lower];
  }

  // Проверка по словарю канонических названий
  for (const item of CANONICAL_NAMES) {
    if (item.pattern.test(res)) {
      return item.canonical;
    }
  }

  // Делаем первую букву заглавной
  return res.charAt(0).toUpperCase() + res.slice(1);
}

/**
 * Проверяет, является ли фраза неделимой (содержит «и» как часть блюда или бренда)
 */
function isUndividablePhrase(str: string): boolean {
  const s = str.toLowerCase().trim();
  const exceptions = [
    'макароны по-флотски',
    'по-флотски',
    'рыба и чипсы',
    'fish and chips',
    'мак энд чиз',
    'mac and cheese',
    'соус барбекю',
    'head & shoulders',
    'м&мс',
    'm&m',
  ];
  return exceptions.some((e) => s.includes(e));
}

/**
 * Основная функция: разбивает входную строку на отдельные элементы списка покупок.
 * 
 * Обрабатывает:
 * - Переносы строк (\n)
 * - Точки с запятой (;)
 * - Запятые (,)
 * - Союзы (« и », « да », « плюс », « + », « & », « and », « και », « κι »)
 * 
 * Пример работы:
 * "свежий базилик и черри" ->
 * [
 *   { title: "Свежий базилик", quantity: "1 пучок", category: "produce" },
 *   { title: "Помидоры черри", quantity: "250 г", category: "produce" }
 * ]
 */
/**
 * Разбивает строку по разделителю, игнорируя символы внутри круглых скобок (...)
 */
export function splitOutsideBrackets(str: string, delimiter: RegExp = /[,;\n]+/): string[] {
  const result: string[] = [];
  let current = '';
  let bracketDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(') bracketDepth++;
    else if (char === ')' && bracketDepth > 0) bracketDepth--;

    if (bracketDepth === 0) {
      const rest = str.slice(i);
      const match = rest.match(delimiter);
      if (match && rest.startsWith(match[0])) {
        if (current.trim()) result.push(current.trim());
        current = '';
        i += match[0].length - 1;
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

export function parseShoppingInput(
  rawInput: string,
  options?: {
    defaultCategory?: ShoppingCategory;
    defaultQuantity?: string;
  }
): ParsedShoppingItem[] {
  if (!rawInput || typeof rawInput !== 'string') return [];

  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  // 1. Первичный сплит по переносам строк (\n) и точкам с запятой (;)
  const rawLines = trimmed
    .split(/[\r\n;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsedItems: ParsedShoppingItem[] = [];

  for (const line of rawLines) {
    // 2. Сплит по запятым вне скобок (чтобы "Нурофен (Ибупрофен, 100 мг)" не разрывался)
    const commaParts = splitOutsideBrackets(line, /,/);

    for (const part of commaParts) {
      if (isUndividablePhrase(part)) {
        const { title, quantity } = extractQuantityAndTitle(part);
        if (title) {
          parsedItems.push({
            title,
            quantity: quantity || options?.defaultQuantity,
            category: options?.defaultCategory || detectShoppingCategory(title),
          });
        }
        continue;
      }

      // 3. Сплит по союзам вне скобок: « и », « да », « плюс », « + », « & », « and », « και », « κι »
      const subParts = splitOutsideBrackets(
        part,
        /(?<=[^\d\s])\s+(?:и|да|плюс|\+|&|and|και|κι)\s+(?=[^\d\s])/iu
      );

      for (const subPart of subParts) {
        if (!subPart) continue;

        const { title, quantity } = extractQuantityAndTitle(subPart);
        if (!title) continue;

        // Автоподстановка канонического количества, если не указано
        let finalQty = quantity || options?.defaultQuantity;
        if (!finalQty) {
          for (const item of CANONICAL_NAMES) {
            if (item.pattern.test(subPart.trim()) && item.defaultQty) {
              finalQty = item.defaultQty;
              break;
            }
          }
        }

        // Автоопределение категории
        const detectedCat = detectShoppingCategory(title, options?.defaultCategory || 'produce');

        parsedItems.push({
          title,
          quantity: finalQty,
          category:
            options?.defaultCategory && options.defaultCategory !== 'produce'
              ? options.defaultCategory
              : detectedCat,
        });
      }
    }
  }

  // Дедупликация идентичных строк в одном вводе
  const uniqueItems: ParsedShoppingItem[] = [];
  const seen = new Set<string>();

  for (const it of parsedItems) {
    const key = `${it.title.toLowerCase()}::${(it.quantity || '').toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(it);
    }
  }

  return uniqueItems;
}
