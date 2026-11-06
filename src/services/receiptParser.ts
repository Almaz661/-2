import {
  ReceiptItemLine,
  ReceiptLanguage,
} from '../types';
import {
  normalizeProductTitle,
  extractUnitOfMeasure,
} from '../utils/receiptNormalizer';

export interface ParsedReceiptData {
  storeName?: string;
  rawStoreName?: string;
  date?: string;
  time?: string;
  totalAmount: number;
  taxAmount?: number;
  discountTotal?: number;
  currency: string;
  items: ReceiptItemLine[];
  rawText: string;
  matchedSumDiff: number;
  detectedLanguage?: ReceiptLanguage;
}

// Известные торговые сети с гибкими регулярными выражениями
interface KnownStore {
  name: string;
  regex: RegExp;
  currency: string;
  language: ReceiptLanguage;
  formatName?: (matchText: string) => string;
}

const KNOWN_STORES: KnownStore[] = [
  // Нидерланды
  {
    name: 'Albert Heijn',
    regex: /(?:www\.)?ah\.(?:nl|be)|(?:^|[\s:;.,!?\-_/\\()])(albert\s*heijn|albert\s*he[ij]n|albertheijn|albert\s*heun|albert\s*helm|ah\s*to\s*go|ah\s*xl|\bah\b)(?:$|[\s:;.,!?\-_/\\()])/i,
    currency: 'EUR',
    language: 'nld',
    formatName: (text) => {
      if (/to\s*go/i.test(text)) return 'AH to go';
      if (/\bxl\b/i.test(text)) return 'Albert Heijn XL';
      return 'Albert Heijn';
    },
  },
  {
    name: 'ALDI',
    regex: /(?:www\.)?aldi\.(?:nl|de|be|pl|com)|(?:^|[\s:;.,!?\-_/\\()])(aldi|a\s*l\s*d\s*i)(\s*s[uü]d|\s*nord|\s*markt|\s*inkoop|\s*markt\s*gmbh|\s*nederland|\s*belgi[eë])?(?:$|[\s:;.,!?\-_/\\()])/i,
    currency: 'EUR',
    language: 'nld',
    formatName: (text) => {
      if (/s[uü]d/i.test(text)) return 'ALDI Süd';
      if (/nord/i.test(text)) return 'ALDI Nord';
      return 'ALDI';
    },
  },
  {
    name: 'Jumbo',
    regex: /(?:www\.)?jumbo\.(?:com|nl)|(?:^|[\s:;.,!?\-_/\\()#*])(hallo\s*jumbo|jumbo\s*supermarkten|jumbo\s*foodmarkt|jumbo\s*city|jumbo)(?:$|[\s:;.,!?\-_/\\()#*])/i,
    currency: 'EUR',
    language: 'nld',
    formatName: () => 'Jumbo',
  },
  { name: 'Plus Supermarkt', regex: /(?:^|[\s:;.,!?\-_/\\()])plus\s*(supermarkt)?(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'nld' },
  { name: 'Dirk', regex: /(?:^|[\s:;.,!?\-_/\\()])dirk(\s*van\s*den\s*broek)?(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'nld' },
  { name: 'Kruidvat', regex: /(?:^|[\s:;.,!?\-_/\\()])kruidvat(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'nld' },
  { name: 'Action', regex: /(?:^|[\s:;.,!?\-_/\\()])action(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'nld' },
  { name: 'HEMA', regex: /(?:^|[\s:;.,!?\-_/\\()])hema(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'nld' },

  // Германия / Австрия
  { name: 'REWE', regex: /(?:www\.)?rewe\.de|(?:^|[\s:;.,!?\-_/\\()])rewe(\s*markt|\s*city|\s*center)?(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'deu' },
  { name: 'EDEKA', regex: /(?:www\.)?edeka\.de|(?:^|[\s:;.,!?\-_/\\()])edeka(\s*markt|\s*center)?(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'deu' },
  { name: 'LIDL', regex: /(?:www\.)?lidl\.(?:de|nl|pl)|(?:^|[\s:;.,!?\-_/\\()])lidl(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'deu' },
  { name: 'PENNY', regex: /(?:^|[\s:;.,!?\-_/\\()*])penny(?:[\s\-]*markt)?(?:$|[\s:;.,!?\-_/\\()*])/i, currency: 'EUR', language: 'deu' },
  { name: 'Kaufland', regex: /(?:^|[\s:;.,!?\-_/\\()])kaufland(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'deu' },
  { name: 'Netto', regex: /(?:^|[\s:;.,!?\-_/\\()])netto(\s*marken-discount)?(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'deu' },
  { name: 'dm-drogerie', regex: /(?:^|[\s:;.,!?\-_/\\()])dm(\s*drogerie)?(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'deu' },
  { name: 'Rossmann', regex: /(?:^|[\s:;.,!?\-_/\\()])rossmann(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'deu' },

  // Польша
  { name: 'Biedronka', regex: /biedronka|jeronimo\s*martins/i, currency: 'PLN', language: 'pol' },
  { name: 'Dino', regex: /(?:^|[\s:;.,!?\-_/\\()])dino\s*(polska)?(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'PLN', language: 'pol' },
  { name: 'Żabka', regex: /(?:^|[\s:;.,!?\-_/\\()])(zabka|żabka)(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'PLN', language: 'pol' },
  { name: 'Auchan', regex: /(?:^|[\s:;.,!?\-_/\\()])auchan(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'pol' },
  { name: 'Carrefour', regex: /(?:^|[\s:;.,!?\-_/\\()])carrefour(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'pol' },

  // Греция
  { name: 'Σκλαβενίτης (Sklavenitis)', regex: /σκλαβενιτ|sklavenitis/i, currency: 'EUR', language: 'ell' },
  { name: 'ΑΒ Βασιλόπουλος', regex: /βασιλοπουλ|ab\s*vassilopoulos/i, currency: 'EUR', language: 'ell' },
  { name: 'Μασούτης', regex: /μασουτης|masoutis/i, currency: 'EUR', language: 'ell' },
  { name: 'Γαλαξίας', regex: /γαλαξια|galaxias/i, currency: 'EUR', language: 'ell' },
  { name: 'My Market', regex: /my\s*market/i, currency: 'EUR', language: 'ell' },

  // Россия
  { name: 'ВкусВилл', regex: /вкусвилл|изб[её]нка/i, currency: 'RUB', language: 'rus' },
  { name: 'Пятёрочка', regex: /пят[её]рочка|х5\s*retail|агроторг/i, currency: 'RUB', language: 'rus' },
  { name: 'Перекрёсток', regex: /перекр[её]сток/i, currency: 'RUB', language: 'rus' },
  { name: 'Магнит', regex: /магнит|ао\s*тендер/i, currency: 'RUB', language: 'rus' },
  { name: 'Лента', regex: /лента/i, currency: 'RUB', language: 'rus' },
  { name: 'Ашан', regex: /ашан|auchan/i, currency: 'RUB', language: 'rus' },
  { name: 'Чижик', regex: /чижик/i, currency: 'RUB', language: 'rus' },
  { name: 'SPAR', regex: /(?:^|[\s:;.,!?\-_/\\()])spar(?:$|[\s:;.,!?\-_/\\()])/i, currency: 'EUR', language: 'nld' },
];

/**
 * Автоопределение языка чека по характерным лексическим маркерам
 */
export function detectReceiptLanguage(rawText: string): ReceiptLanguage {
  const scores: Record<ReceiptLanguage, number> = {
    nld: 0,
    deu: 0,
    pol: 0,
    rus: 0,
    ell: 0,
    eng: 0,
  };

  // Нидерландский
  if (/(?:^|[\s:;.,!?\-_/\\()])(totaal|subtotaal|kassa|btw|bedrag|korting|te\s*betalen|filiaal|statiegeld|bon|bonus|dank|gepind|pinautomaat|heijn|jumbo|halfvolle|melk|brood|eieren|kaas)(?:$|[\s:;.,!?\-_/\\()])/i.test(rawText)) scores.nld += 4;
  if (/albert\s*heijn|albert\s*he[ij]n|\bah\b|jumbo|kruidvat/i.test(rawText)) scores.nld += 3;
  if (/(?:^|[\s:;.,!?\-_/\\()])(van|voor|met|naar|op|bij|uw|een|het|geen)(?:$|[\s:;.,!?\-_/\\()])/i.test(rawText)) scores.nld += 2;

  // Немецкий
  if (/(?:^|[\s:;.,!?\-_/\\()])(summe|gesamt|gesamtbetrag|mwst|steuern?|kasse|beleg|r[uü]ckgeld|rabatt|pfand|danke|geg|bar|kartenzahlung|vollmilch)(?:$|[\s:;.,!?\-_/\\()])/i.test(rawText)) scores.deu += 4;
  if (/rewe|edeka|penny|kaufland|dm-drogerie/i.test(rawText)) scores.deu += 3;
  if (/(?:^|[\s:;.,!?\-_/\\()])(der|die|das|und|f[uü]r|mit|ihr|einkauf)(?:$|[\s:;.,!?\-_/\\()])/i.test(rawText)) scores.deu += 2;

  // Польский
  if (/(?:^|[\s:;.,!?\-_/\\()])(razem|do\s*zap[lł]aty|paragon|ptu|vat|rabat|kaucja|dzi[eę]kujemy|kasa|sprzeda[zż]|zł|grosz)(?:$|[\s:;.,!?\-_/\\()])/i.test(rawText)) scores.pol += 4;
  if (/biedronka|dino|żabka|zabka/i.test(rawText)) scores.pol += 3;
  if (/[ąćęłńóśźż]/i.test(rawText)) scores.pol += 3;

  // Русский
  if (/[А-Яа-яЁё]/.test(rawText)) {
    scores.rus += 5;
    if (/(?:^|[\s:;.,!?\-_/\\()])(итог[оа]?|к\s*оплате|ндс|скидк[аи]|касса|чек|приход|руб|вкусвилл|пят[её]рочка|перекр[её]сток|магнит)(?:$|[\s:;.,!?\-_/\\()])/i.test(rawText)) scores.rus += 5;
  }

  // Греческий
  if (/[Α-Ωα-ωΆ-ώ]/.test(rawText)) {
    scores.ell += 6;
    if (/(σύνολο|συνολο|φπα|ευρώ|απόδειξη|αποδειξη|εκπτωση|τελικό|πληρωτέο)/i.test(rawText)) scores.ell += 5;
  }

  // Английский
  if (/(?:^|[\s:;.,!?\-_/\\()])(subtotal|balance\s*due|amount\s*due|change\s*due|cash|thank\s*you|customer\s*copy)(?:$|[\s:;.,!?\-_/\\()])/i.test(rawText)) scores.eng += 3;

  let bestLang: ReceiptLanguage = 'eng';
  let maxScore = 0;
  for (const [lang, score] of Object.entries(scores) as [ReceiptLanguage, number][]) {
    if (score > maxScore) {
      maxScore = score;
      bestLang = lang;
    }
  }

  return maxScore >= 2 ? bestLang : 'nld'; // default fallback for EU tickets
}

/**
 * Извлечение цен из строки чека с максимальной устойчивостью к артефактам OCR.
 * Обрабатывает:
 * - Форматы: "1.15 B", "1,89 A", "1:15 B", "1'15 B", "1 . 15 B", "1 , 15 B", "1 15 B"
 * - Круглые суммы с тире: "2.- B", "2,- A"
 * - Налоговые коды: A, B, C, D, 1, 2, *, _А, _Б, [А], (А), |, ]
 * - Отрицательные скидки: "-0.50 B", "0.50- B"
 * - Валюты: EUR, €, $, £, ₽, руб, zł, PLN
 */
export interface ParsedPriceResult {
  price: number;
  cleanTitle: string;
  isNegative: boolean;
  taxCode?: string;
}

export function parsePriceFromLine(line: string): ParsedPriceResult | null {
  const trimmed = line.trim();
  if (trimmed.length < 1) return null;

  // 1. Поиск цены в конце строки
  // Поддерживает:
  // - 1 или 2 знака минус в начале/конце
  // - Число с десятичным разделителем (. , : ; ' пробел) и 2 цифрами
  // - Число с тире для круглых сумм (. - или , -)
  // - Целое число, если явно указана валюта (например 15 EUR)
  // - Завершающие символы валют и налогов
  const endRegex = /([-–—]?\s*(?:\d{1,4}\s*[.,:;'\s]\s*\d{1,2}|\d{1,4}\s*[.,]\s*[-–—]|\d{1,4}\s*(?:EUR|€|[$₽£]|zł|zl|PLN|руб\.?|rub\.?))\s*[-–—]?)\s*(EUR|€|[$₽£]|zł|zl|PLN|руб\.?|rub\.?)?(?:\s*[_\(\[\*|\\\/]*\s*([A-Za-zА-Яа-яΆ-ώ0-9*|\]\)])\s*[_\)\]\*|\\\/]*)?\s*$/i;

  const match = trimmed.match(endRegex);
  if (!match) {
    // 2. Запасной вариант: поиск цены в начале строки (например "1.15 AH HALFVOLLE MELK" или "1x 1.15 MELK")
    const startRegex = /^(?:(\d+)\s*[x*х]\s*)?([-–—]?\s*(?:\d{1,4}\s*[.,:;'\s]\s*\d{1,2}|\d{1,4}\s*[.,]\s*[-–—]))\s*(EUR|€|[$₽£]|zł|zl|PLN|руб\.?|rub\.?)?(?:\s*([A-Za-zА-Яа-яΆ-ώ0-9*]))?\s+(.+)$/i;
    const startMatch = trimmed.match(startRegex);
    if (startMatch) {
      let rawAmount = startMatch[2].replace(/\s+/g, '');
      let isNegative = false;
      if (/^[-–—]/.test(rawAmount) || /[-–—]$/.test(rawAmount)) {
        isNegative = true;
        rawAmount = rawAmount.replace(/[-–—]/g, '');
      }
      if (/[.,][-–—]$/.test(rawAmount)) {
        rawAmount = rawAmount.replace(/[.,][-–—]$/, '.00');
      } else {
        rawAmount = rawAmount.replace(/[:;'\s,]/g, '.');
      }
      const val = parseFloat(rawAmount);
      if (!isNaN(val) && val > 0) {
        return {
          price: isNegative ? -val : val,
          cleanTitle: startMatch[5].trim(),
          isNegative,
          taxCode: startMatch[4] ? startMatch[4].toUpperCase() : undefined,
        };
      }
    }
    return null;
  }

  let rawAmount = match[1].replace(/\s+/g, '');
  let isNegative = false;

  // Определение знака минус
  if (/^[-–—]/.test(rawAmount)) {
    isNegative = true;
    rawAmount = rawAmount.replace(/^[-–—]+/, '');
  } else if (/[-–—]$/.test(rawAmount) && !/[.,][-–—]$/.test(rawAmount)) {
    isNegative = true;
    rawAmount = rawAmount.replace(/[-–—]+$/, '');
  }

  // Очистка от валюты
  rawAmount = rawAmount.replace(/(?:EUR|€|[$₽£]|zł|zl|PLN|руб\.?|rub\.?)/gi, '');

  // Европейские 2.- или 2,- -> 2.00
  if (/[.,][-–—]$/.test(rawAmount)) {
    rawAmount = rawAmount.replace(/[.,][-–—]$/, '.00');
  } else {
    rawAmount = rawAmount.replace(/[:;'\s,]/g, '.');
  }

  const val = parseFloat(rawAmount);
  if (isNaN(val)) return null;

  // Название позиции до совпадения цены
  const titlePart = trimmed.substring(0, trimmed.lastIndexOf(match[0])).replace(/[\s\t._\-|:=+]+$/, '').trim();

  // Код налога (A, B, C, D, 1, 2, _А, [A], etc.)
  let taxCode = match[3] ? match[3].replace(/[\]\)|]/g, '').toUpperCase() : undefined;
  if (!taxCode && match[2] && /^[ABCD12]$/i.test(match[2])) {
    taxCode = match[2].toUpperCase();
  }

  return {
    price: isNegative ? -val : val,
    cleanTitle: titlePart,
    isNegative,
    taxCode: taxCode || undefined,
  };
}

/**
 * Проверка на строку Итого / Оплаты
 */
function isTotalOrPaymentKeyword(line: string): boolean {
  return /(?:^|[\s:;.,!?\-_/\\()])(totaal|subtotaal|te\s*betalen|summe|gesamt|gesamtbetrag|endbetrag|zu\s*zahlen|betrag\b|razem|do\s*zap[lł]aty|suma|σύνολο|συνολο|πληρωτέο|πληρωτεο|τελικό|τελικο|итог[оа]?|к\s*оплате|всего|total|pin\b|betaald|betaalwijze|contant|bar\b|kartenzahlung|gegeven|wisselgeld|teruggave|r[uü]ckgeld|сдача|change\b|μετρητά|μετρητα|κάρτα|καρτα)(?:$|[\s:;.,!?\-_/\\()])/i.test(
    line
  );
}

/**
 * Проверка, является ли строка служебной или заголовком
 */
function isServiceOrHeaderLine(line: string): boolean {
  return (
    /(?:^|[\s:;.,!?\-_/\\()*])(кассов[а-я]*|приход|фискал[а-я]*|инн|ккт|фн|фд|фп|смена|кассир|чек\s*№|kassabon|paragon|kassenbon|bon\s*nr|enthaltene\s*mwst|mwst|steuersatz|steuerbetrag|steuer\b|btw\b|ptu\b|ндс|vat\b|card|visa|mastercard|pinautomaat|терминал|спасибо|dank\b|dzięk|bedankt|ευχαριστ|tel:|тел:|сайт:|www\.|filiaal|bedrag\s*excl|excl\s*btw|kundenbeleg|netto\b|brutto\b|uid\s*nr|tse-|tse\b|trace-nr|beleg-nr|as-proc|capt\.-ref|pos-info|terminal-id|approved)(?:$|[\s:;.,!?\-_/\\()*])/i.test(
      line
    ) || /^[A-Za-z]\s*=\s*\d+[.,]?\d*%/i.test(line)
  );
}

/**
 * Главный парсер текста кассового чека
 */
export function parseReceiptText(
  rawText: string,
  userSelectedLanguage?: ReceiptLanguage
): ParsedReceiptData {
  const detectedLanguage = detectReceiptLanguage(rawText);
  let language = userSelectedLanguage || detectedLanguage;

  // Авто-корректировка языка при явном несовпадении:
  // Если выбран русский, но в чеке нет ни одной буквы кириллицы, переключаемся на автоопределенный европейский
  if (userSelectedLanguage === 'rus' && !/[А-Яа-яЁё]/.test(rawText) && detectedLanguage !== 'rus') {
    language = detectedLanguage;
  }
  // Если выбран европейский язык, но в чеке обнаружен явный русский текст:
  else if (userSelectedLanguage && userSelectedLanguage !== 'rus' && /[А-Яа-яЁё]{4,}/.test(rawText)) {
    language = 'rus';
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Определение валюты
  let currency = getDefaultCurrencyForLanguage(language);
  if (/[€]|\beur\b/i.test(rawText)) {
    currency = 'EUR';
  } else if (/[₽]|\bруб\b|\brub\b/i.test(rawText)) {
    currency = 'RUB';
  } else if (/\b(zł|zlot|pln)\b/i.test(rawText)) {
    currency = 'PLN';
  } else if (/[$]|\busd\b/i.test(rawText)) {
    currency = 'USD';
  } else if (/[£]|\bgbp\b/i.test(rawText)) {
    currency = 'GBP';
  }

  // 2. Распознавание магазина (Known stores + Unknown fallback)
  const { storeName, rawStoreName, storeCurrency } = extractStoreName(lines, rawText, language);
  if (storeCurrency && currency === getDefaultCurrencyForLanguage(language)) {
    currency = storeCurrency;
  }

  // 3. Определение даты и времени
  const { date, time } = extractDateTime(rawText, lines);

  // 4. Поиск Итоговой суммы (Total), налогов (VAT) и скидок
  const { totalAmount, taxAmount, discountTotal } = extractTotals(lines, currency);

  // 5. Поиск и извлечение отдельных товарных строк с поддержкой многострочных и колоночных чеков
  const items = extractLineItems(lines, currency, language, storeName, totalAmount);

  // 6. Проверка сходимости суммы
  const sumOfItems = Math.round(items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) * 100) / 100;
  
  // Если totalAmount не найден через ключевые слова, но есть товары:
  let finalTotal = totalAmount;
  if (finalTotal === 0 && sumOfItems > 0) {
    finalTotal = sumOfItems;
  }

  const matchedSumDiff =
    finalTotal > 0 ? Math.round(Math.abs(sumOfItems - finalTotal) * 100) / 100 : 0;

  return {
    storeName,
    rawStoreName,
    date,
    time,
    totalAmount: finalTotal,
    taxAmount,
    discountTotal,
    currency,
    items,
    rawText,
    matchedSumDiff,
    detectedLanguage,
  };
}

/**
 * Валюта по умолчанию
 */
function getDefaultCurrencyForLanguage(lang: ReceiptLanguage): string {
  switch (lang) {
    case 'rus':
      return 'RUB';
    case 'pol':
      return 'PLN';
    case 'deu':
    case 'nld':
    case 'ell':
      return 'EUR';
    default:
      return 'EUR';
  }
}

/**
 * Извлечение названия магазина
 */
function extractStoreName(
  lines: string[],
  rawText: string,
  _lang: ReceiptLanguage
): { storeName?: string; rawStoreName?: string; storeCurrency?: string } {
  // 1. Поиск по известным сетям в шапке чека (первые 8 строк имеют наивысший приоритет)
  const headerText = lines.slice(0, 8).join('\n');
  for (const store of KNOWN_STORES) {
    const match = headerText.match(store.regex);
    if (match) {
      const formatted = store.formatName ? store.formatName(match[0]) : store.name;
      return {
        storeName: formatted,
        rawStoreName: match[0].trim(),
        storeCurrency: store.currency,
      };
    }
  }

  // 2. Поиск по известным сетям во всем чеке
  for (const store of KNOWN_STORES) {
    const match = rawText.match(store.regex);
    if (match) {
      const formatted = store.formatName ? store.formatName(match[0]) : store.name;
      return {
        storeName: formatted,
        rawStoreName: match[0].trim(),
        storeCurrency: store.currency,
      };
    }
  }

  // 2. Поиск по веб-сайту магазина (например, www.spar.nl, www.dirk.nl)
  const webMatch = rawText.match(/(?:www\.)([a-zA-Z0-9\-]+)\.(?:nl|de|be|pl|com|ru|gr|eu)\b/i);
  if (webMatch && !/google|tesseract|naptha|apple|android|pin/i.test(webMatch[1])) {
    const brand = webMatch[1].charAt(0).toUpperCase() + webMatch[1].slice(1).toLowerCase();
    return {
      storeName: brand,
      rawStoreName: webMatch[0],
    };
  }

  // 3. Поиск по юридическому названию (B.V., GmbH, Sp. z o.o., ООО, АО, Α.Ε., Ι.Κ.Ε.)
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i];
    const legalMatch = line.match(/^([A-Za-zА-Яа-яΆ-ώΑ-Ωα-ω0-9\s&]{3,35})\s+(?:B\.V\.|GmbH|Sp\.\s*z\s*o\.o\.|LLC|ООО|АО|A\.E\.|Α\.Ε\.|Ι\.Κ\.Ε\.|Ε\.Π\.Ε\.)/i);
    if (legalMatch) {
      return {
        storeName: legalMatch[1].trim(),
        rawStoreName: line,
      };
    }
  }

  // 4. Поиск в заголовке чека (первые 5 строк)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();

    if (line.length < 3 || line.length > 45) continue;
    if (/^[=\-*#_~.\s]{3,}$/.test(line)) continue;

    const letterCount = (line.match(/[A-Za-zА-Яа-яΆ-ώ]/g) || []).length;
    if (letterCount < 3 || letterCount / line.length < 0.45) continue;

    if (/^\d+[\s\d\-./]*$/.test(line)) continue;

    if (
      /(?:^|[\s:;.,!?\-_/\\()])(welkom|welcome|добро пожаловать|kassabon|paragon|kassenbon|bon|receipt|чек|приход|кассов|фискал|kassa|kasse|filiaal|kassier|datum|tijd|zeit|uhr|date|time|tel:|fax:|kvk|btw|mwst|ptu|iban|terminal|transactie)(?:$|[\s:;.,!?\-_/\\()])/i.test(
        line
      )
    ) {
      continue;
    }

    const cleanStore = line.replace(/^[#*–—\s]+|[#*–—\s]+$/g, '');
    return {
      storeName: cleanStore,
      rawStoreName: line,
    };
  }

  return {};
}

/**
 * Извлечение даты и времени
 */
function extractDateTime(text: string, lines: string[]): { date?: string; time?: string } {
  let date: string | undefined = undefined;
  let time: string | undefined = undefined;

  for (const line of lines) {
    const prefixedMatch = line.match(
      /(?:datum|date|дата|zeit|data|ημερομην[ιί]α|ημ\/?νια|ημερ)[\s:]*([0-3]?\d)[./\-](\d{1,2})[./\-](\d{2,4})\b/i
    );
    if (prefixedMatch) {
      date = normalizeDateParts(prefixedMatch[1], prefixedMatch[2], prefixedMatch[3]);
      break;
    }
  }

  if (!date) {
    const dateMatch = text.match(/\b([0-3]?\d)[./\-]([01]?\d)[./\-](\d{2,4})\b/);
    if (dateMatch) {
      const p1 = parseInt(dateMatch[1], 10);
      const p2 = parseInt(dateMatch[2], 10);
      if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
        date = normalizeDateParts(dateMatch[1], dateMatch[2], dateMatch[3]);
      }
    }
  }

  if (!date) {
    const isoMatch = text.match(/\b(20\d{2})[./\-](\d{2})[./\-](\d{2})\b/);
    if (isoMatch) {
      date = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
  }

  if (!date) {
    const textMonthMatch = text.match(
      /\b(\d{1,2})\.?\s*(jan|feb|mar|mrt|apr|mei|mai|may|jun|jul|aug|sep|okt|oct|nov|dec|янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)[a-z]*\.?\s*(20\d{2}|\d{2})\b/i
    );
    if (textMonthMatch) {
      const monthNum = parseMonthNameToNumber(textMonthMatch[2]);
      if (monthNum) {
        date = normalizeDateParts(textMonthMatch[1], monthNum, textMonthMatch[3]);
      }
    }
  }

  const prefixedTime = text.match(/(?:tijd|zeit|время|time|uhr|ωρα|ώρα)[\s:]*([01]?\d|2[0-3])[:.]([0-5]\d)(?:[:.]([0-5]\d))?\b/i);
  if (prefixedTime) {
    time = `${prefixedTime[1].padStart(2, '0')}:${prefixedTime[2]}`;
  } else {
    const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/);
    if (timeMatch) {
      time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }
  }

  return { date, time };
}

function normalizeDateParts(d: string, m: string, y: string): string {
  const day = d.padStart(2, '0');
  const month = m.padStart(2, '0');
  let year = y;
  if (year.length === 2) {
    const yrNum = parseInt(year, 10);
    year = yrNum > 70 ? `19${year}` : `20${year}`;
  }
  return `${year}-${month}-${day}`;
}

function parseMonthNameToNumber(m: string): string | null {
  const lower = m.toLowerCase();
  if (/jan|янв/i.test(lower)) return '01';
  if (/feb|фев/i.test(lower)) return '02';
  if (/mar|mrt|мар/i.test(lower)) return '03';
  if (/apr|апр/i.test(lower)) return '04';
  if (/mei|mai|may|май/i.test(lower)) return '05';
  if (/jun|июн/i.test(lower)) return '06';
  if (/jul|июл/i.test(lower)) return '07';
  if (/aug|авг/i.test(lower)) return '08';
  if (/sep|сен/i.test(lower)) return '09';
  if (/okt|oct|окт/i.test(lower)) return '10';
  if (/nov|ноя/i.test(lower)) return '11';
  if (/dec|dez|дек/i.test(lower)) return '12';
  return null;
}

/**
 * Извлечение итоговых сумм, налогов и скидок (с поддержкой смежных строк)
 */
function extractTotals(
  lines: string[],
  _currency: string
): { totalAmount: number; taxAmount?: number; discountTotal?: number } {
  let totalAmount = 0;
  let subtotalAmount = 0;
  let paymentAmount = 0;
  let taxAmount: number | undefined = undefined;
  let discountTotal: number | undefined = undefined;

  // Строгие финальные ключевые слова итоговой суммы (исключая subtotaal и промежуточные расчеты)
  const strictTotalKeywords =
    /(?:^|[\s:;.,!?\-_/\\()#*])(totaal|te\s*betalen|summe|gesamt|gesamtbetrag|endbetrag|zu\s*zahlen|razem|do\s*zap[lł]aty|suma|σύνολο|συνολο|πληρωτέο|πληρωτεο|τελικό|τελικο|итог[оа]?|к\s*оплате|всего)(?:$|[\s:;.,!?\-_/\\()#*])/i;
  
  // Ключевые слова подтверждения фактической оплаты картой/наличными
  const paymentKeywords =
    /(?:^|[\s:;.,!?\-_/\\()#*])(betaald|pin\b|pinpas|pinautomaat|kartenzahlung|bar\b|contant|gepind|transactiebedrag|μετρητά|μετρητα|κάρτα|καρτα)(?:$|[\s:;.,!?\-_/\\()#*])/i;
  
  // Промежуточный подытог (до учета скидок)
  const subtotalKeywords =
    /(?:^|[\s:;.,!?\-_/\\()#*])(subtotaal|subtotal|zwischensumme|netto|подытог)(?:$|[\s:;.,!?\-_/\\()#*])/i;

  const taxKeywords =
    /(?:^|[\s:;.,!?\-_/\\()#*])(btw|mwst|steuer|ptu|ндс|vat|φπα|φ\.π\.α\.)(?:$|[\s:;.,!?\-_/\\()#*])/i;
  const discountKeywords =
    /(?:^|[\s:;.,!?\-_/\\()#*])(скидк[аи]|korting|bonus|rabatt|rabat|έκπτωση|εκπτωση|discount|voordeel)(?:$|[\s:;.,!?\-_/\\()#*])/i;

  // Вспомогательная функция извлечения цены из строки или следующей строки
  const findAmountAtOrNext = (idx: number): number | null => {
    const cur = parsePriceFromLine(lines[idx]);
    if (cur && cur.price > 0) return cur.price;
    if (idx + 1 < lines.length) {
      const next = parsePriceFromLine(lines[idx + 1]);
      if (next && next.price > 0 && !strictTotalKeywords.test(lines[idx + 1]) && !paymentKeywords.test(lines[idx + 1])) {
        return next.price;
      }
    }
    return null;
  };

  // Проходим с конца чека (где всегда располагается кассовый расчет)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];

    // Игнорируем строки с количеством товаров (Aantal artikelen: 5, Anzahl Artikel: 3)
    if (/aantal\s*(artikelen|stuks|items)|anzahl\s*artikel|кол(?:ичеств)?о?\s*товар/i.test(line)) {
      continue;
    }

    // 1. Поиск строгого финального TOTAAL / ИТОГО
    if (totalAmount === 0 && strictTotalKeywords.test(line) && !subtotalKeywords.test(line) && !/excl|btw/i.test(line)) {
      const val = findAmountAtOrNext(i);
      if (val !== null && val > 0) {
        totalAmount = val;
      }
    }

    // 2. Поиск строки оплаты (PIN / Betaald)
    if (paymentAmount === 0 && paymentKeywords.test(line) && !/terminal|kassa/i.test(line)) {
      const val = findAmountAtOrNext(i);
      if (val !== null && val > 0) {
        paymentAmount = val;
      }
    }

    // 3. Поиск промежуточного Subtotaal
    if (subtotalAmount === 0 && subtotalKeywords.test(line)) {
      const val = findAmountAtOrNext(i);
      if (val !== null && val > 0) {
        subtotalAmount = val;
      }
    }

    // 4. Налоги (VAT / BTW / MwSt / Steuer)
    if (taxAmount === undefined) {
      const taxLineMatch = line.match(
        /(?:[A-Za-z]\s*=\s*\d+(?:[.,]\d+)?%\s+)(?:(?:netto\s*)?(\d+[.,]\d{2}))\s+(?:(?:steuer|mwst|btw)\s*)?(\d+[.,]\d{2})\s*(?:(?:brutto\s*)?(\d+[.,]\d{2}))?/i
      );
      if (taxLineMatch && taxLineMatch[2]) {
        const val = parseFloat(taxLineMatch[2].replace(',', '.'));
        if (!isNaN(val) && val > 0) {
          taxAmount = val;
        }
      } else if (taxKeywords.test(line)) {
        const parsed = parsePriceFromLine(line);
        if (parsed && parsed.price > 0) {
          taxAmount = parsed.price;
        }
      }
    }

    // 5. Скидки
    if (discountTotal === undefined && discountKeywords.test(line)) {
      const parsed = parsePriceFromLine(line);
      if (parsed && parsed.price !== 0) {
        discountTotal = Math.abs(parsed.price);
      }
    }
  }

  // Определение наиболее точного финального итога:
  // Если найден TOTAAL — используем его
  // Если TOTAAL не был распознан, но есть строка PIN / Betaald — берем сумму оплаты
  // Если нет ни того, ни другого — берем subtotalAmount
  let finalTotal = totalAmount;
  if (finalTotal === 0 && paymentAmount > 0) {
    finalTotal = paymentAmount;
  } else if (finalTotal === 0 && subtotalAmount > 0) {
    finalTotal = subtotalAmount;
  }

  // Если был определен и TOTAAL, и PIN — они обычно равны или PIN точнее
  if (totalAmount > 0 && paymentAmount > 0 && Math.abs(totalAmount - paymentAmount) < 0.01) {
    finalTotal = totalAmount;
  }

  return { totalAmount: finalTotal, taxAmount, discountTotal };
}

interface MultiplierInfo {
  quantity: number;
  unit: string;
  unitPrice?: number;
}

function parseQuantityMultiplier(line: string): MultiplierInfo | null {
  const trimmed = line.trim();
  // "2 Stk x 1,39" or "2 x 0,65" or "0,520 kg x 3,99" or "2 шт x 150.00"
  const multiRegex =
    /^\s*(\d+(?:[.,]\d+)?)\s*(stk\.?|st\.?|шт\.?|kg|g|кг|г|l|л)?\s*[x*х@]\s*(\d+[.,]\d{2})\b/i;
  const match = trimmed.match(multiRegex);
  if (match) {
    const qty = parseFloat(match[1].replace(',', '.'));
    const unitPrice = parseFloat(match[3].replace(',', '.'));
    let unit = 'шт';
    if (match[2]) {
      const u = match[2].toLowerCase();
      if (/kg|кг/.test(u)) unit = 'кг';
      else if (/g|г/.test(u)) unit = 'г';
      else if (/l|л/.test(u)) unit = 'л';
    }
    return { quantity: isNaN(qty) || qty <= 0 ? 1 : qty, unitPrice, unit };
  }

  // "2 Stk x" or "2 x" or "2 шт"
  const simpleRegex =
    /^\s*(\d+(?:[.,]\d+)?)\s*(stk\.?|st\.?|шт\.?|[x*х])(?:\s*[x*х])?\s*$/i;
  const simpleMatch = trimmed.match(simpleRegex);
  if (simpleMatch) {
    const qty = parseFloat(simpleMatch[1].replace(',', '.'));
    let unit = 'шт';
    if (simpleMatch[2] && /kg|кг/.test(simpleMatch[2])) unit = 'кг';
    return { quantity: isNaN(qty) || qty <= 0 ? 1 : qty, unit };
  }

  return null;
}

/**
 * Проверка, является ли строка служебной строкой итогов или оплаты,
 * которую КАТЕГОРИЧЕСКИ НЕЛЬЗЯ добавлять в список товаров
 */
function isSummaryOrPaymentLine(line: string): boolean {
  return /(?:^|[\s:;.,!?\-_/\\()#*])(totaal|subtotaal|te\s*betalen|summe|gesamt|gesamtbetrag|endbetrag|zu\s*zahlen|razem|do\s*zap[lł]aty|suma|σύνολο|итог[оа]?|к\s*оплате|всего|pin\b|pinpas|betaald|contant|kartenzahlung|bar\b|gepind|wisselgeld|teruggave|r[uü]ckgeld|aantal\s*artikelen|anzahl\s*artikel|kassabon|paragon|kassenbon|bon\s*nr|btw\b|mwst\b|steuer\b|ptu\b|ндс\b|vat\b)(?:$|[\s:;.,!?\-_/\\()#*])/i.test(
    line
  );
}

/**
 * Извлечение товарных позиций из кассового чека с построчной привязкой
 */
function extractLineItems(
  lines: string[],
  currency: string,
  lang: ReceiptLanguage,
  storeName?: string,
  totalAmount?: number
): ReceiptItemLine[] {
  interface RawCandidate {
    title: string;
    originalLine: string;
    price: number;
    taxCode?: string;
    quantity?: number;
    unitPrice?: number;
    unit?: string;
    discount?: number;
  }

  const isStoreOrAddressHeader = (lineText: string) => {
    const lower = lineText.toLowerCase();
    if (storeName && lower.includes(storeName.toLowerCase()) && !parsePriceFromLine(lineText)) return true;
    if (
      !parsePriceFromLine(lineText) &&
      /(?:^|[\s:;.,!?\-_/\\()#*])(albert\s*heijn|aldi|rewe|edeka|lidl|jumbo|plus|dirk|пят[её]рочка|магнит|вкусвилл|перекр[её]сток|hallo\s*jumbo|supermarkten)(?:$|[\s:;.,!?\-_/\\()#*])/i.test(
        lineText
      )
    ) {
      return true;
    }
    if (
      !parsePriceFromLine(lineText) &&
      /(?:^|[\s:;.,!?\-_/\\()#*])(straat|street|strasse|straße|str\.|laan|weg|plein|doorman|rotterdam|amsterdam|berlin|moscow|москва|kvk|filiaal|bedankt|tot\s*ziens|dank\s*u|welkom|klantenservice)(?:$|[\s:;.,!?\-_/\\()#*])/i.test(
        lineText
      )
    ) {
      return true;
    }
    if (/\b\d{4}\s*[A-Z]{2}\b/i.test(lineText) && !parsePriceFromLine(lineText)) return true;
    return false;
  };

  const candidates: RawCandidate[] = [];
  let pendingMultiplier: MultiplierInfo | null = null;
  let hasReachedSummary = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    // Как только чек доходит до секции итогов (SUBTOTAAL, TOTAAL, PIN, ИТОГО, ΣΥΝΟΛΟ),
    // все последующие строки относятся к расчету, налогам и чековому подвалу
    if (
      /(?:^|[\s:;.,!?\-_/\\()#*])(subtotaal|subtotal|zwischensumme|totaal|te\s*betalen|summe|gesamt|gesamtbetrag|endbetrag|zu\s*zahlen|razem|do\s*zap[lł]aty|suma|σύνολο|συνολο|πληρωτέο|πληρωτεο|τελικό|τελικο|итог[оа]?|к\s*оплате|всего|pin\b|pinpas|betaald|kartenzahlung|contant|μετρητά|μετρητα|κάρτα|καρτα)\b/i.test(
        line
      )
    ) {
      hasReachedSummary = true;
    }

    if (hasReachedSummary) {
      continue;
    }

    // 0. Строка множителя / количества ("2 x 1,25" или "2 Stk x 0,65")
    const mult = parseQuantityMultiplier(line);
    if (mult) {
      // Определяем, относится ли множитель к предыдущему или следующему товару:
      const expectedTotal = Math.round(mult.quantity * (mult.unitPrice || 0) * 100) / 100;
      let nextHasPrice = false;
      let matchesNext = false;

      if (i + 1 < lines.length) {
        const nextPrice = parsePriceFromLine(lines[i + 1]);
        if (nextPrice && nextPrice.price > 0 && nextPrice.cleanTitle.length >= 2) {
          nextHasPrice = true;
          if (expectedTotal > 0 && Math.abs(nextPrice.price - expectedTotal) < 0.02) {
            matchesNext = true;
          }
        }
      }

      if (matchesNext) {
        // Множитель расположен ПЕРЕД товаром (например "2 x 0.95" перед "JUMBO CROISSANT 1.90")
        pendingMultiplier = mult;
      } else if (candidates.length > 0) {
        const last = candidates[candidates.length - 1];
        const matchesPrev =
          expectedTotal > 0 && Math.abs(last.price - expectedTotal) < 0.02;
        if (matchesPrev || !nextHasPrice) {
          last.quantity = mult.quantity;
          if (mult.unitPrice) last.unitPrice = mult.unitPrice;
          if (mult.unit) last.unit = mult.unit;
          last.originalLine += `\n  ${line}`;
        } else {
          pendingMultiplier = mult;
        }
      } else {
        pendingMultiplier = mult;
      }
      continue;
    }

    // Пропускаем служебные строки заголовка, адресов, магазина
    if (isServiceOrHeaderLine(line) || isStoreOrAddressHeader(line)) {
      continue;
    }

    // Пропускаем строки даты, времени, кассы, номеров чеков и транзакций
    if (
      /\b\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}\b/.test(line) ||
      /\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/.test(line) ||
      /(?:datum|date|дата|zeit|tijd|время|kassa|kasse|касса|filiaal|kassier|bon\s*nr|transactie)\b/i.test(
        line
      )
    ) {
      continue;
    }

    // Проверяем, есть ли цена в строке
    const priceRes = parsePriceFromLine(line);

    if (priceRes) {
      // Исключаем служебные строки с суммами итогов и оплат
      if (isSummaryOrPaymentLine(priceRes.cleanTitle || line)) {
        continue;
      }

      // Если цена совпадает с итогом чека и строка находится в самом низу без нормального названия
      if (
        totalAmount &&
        Math.abs(priceRes.price - totalAmount) < 0.001 &&
        priceRes.cleanTitle.length < 2 &&
        i >= lines.length - 4
      ) {
        continue;
      }

      // Строка со скидкой (Korting, Actie, Bonus)
      if (
        priceRes.isNegative ||
        priceRes.price < 0 ||
        /(?:^|[\s:;.,!?\-_/\\()#*])(korting|bonus|actie|rabatt|rabat|скидк|voordeel)(?:$|[\s:;.,!?\-_/\\()#*])/i.test(
          priceRes.cleanTitle || line
        )
      ) {
        if (candidates.length > 0) {
          const last = candidates[candidates.length - 1];
          const disc = Math.abs(priceRes.price);
          last.discount = (last.discount || 0) + disc;
          last.originalLine += `\n  ${line}`;
        }
        continue;
      }

      // Если есть валидное название и цена — полноценный товар
      if (priceRes.cleanTitle.length >= 2) {
        const candidate: RawCandidate = {
          title: priceRes.cleanTitle,
          originalLine: line,
          price: priceRes.price,
          taxCode: priceRes.taxCode,
        };

        if (pendingMultiplier) {
          candidate.quantity = pendingMultiplier.quantity;
          if (pendingMultiplier.unitPrice) candidate.unitPrice = pendingMultiplier.unitPrice;
          if (pendingMultiplier.unit) candidate.unit = pendingMultiplier.unit;
          pendingMultiplier = null;
        }

        candidates.push(candidate);
        continue;
      }
    }

    // Если строка чисто текстовая (без цены) — проверяем, не идет ли цена на СЛЕДУЮЩЕЙ строке
    if (line.length >= 2 && !isSummaryOrPaymentLine(line) && !isStoreOrAddressHeader(line)) {
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nextPrice = parsePriceFromLine(nextLine);
        if (nextPrice && nextPrice.cleanTitle.length < 2 && !isSummaryOrPaymentLine(nextLine)) {
          const candidate: RawCandidate = {
            title: line,
            originalLine: `${line} ${nextLine}`,
            price: nextPrice.price,
            taxCode: nextPrice.taxCode,
          };
          if (pendingMultiplier) {
            candidate.quantity = pendingMultiplier.quantity;
            if (pendingMultiplier.unitPrice) candidate.unitPrice = pendingMultiplier.unitPrice;
            if (pendingMultiplier.unit) candidate.unit = pendingMultiplier.unit;
            pendingMultiplier = null;
          }
          candidates.push(candidate);
          i++; // Пропускаем строку цены
          continue;
        }
      }
    }
  }

  // Преобразуем кандидаты в строгие ReceiptItemLine с нормализацией на русском
  const items: ReceiptItemLine[] = [];

  for (let idx = 0; idx < candidates.length; idx++) {
    const cand = candidates[idx];
    let rawTitle = cand.title;
    const price = cand.price;

    // Очищаем артикулы и PLU коды в начале строки (например "0123 Milsani..." -> "Milsani...")
    rawTitle = rawTitle.replace(/^[\d]{3,8}\s+/, '').trim();

    // Пропускаем пустые или служебные остатки
    if (rawTitle.length < 2) continue;
    if (isSummaryOrPaymentLine(rawTitle)) continue;

    let quantity = cand.quantity || 1;
    let unitPrice = cand.unitPrice || price;
    const discount = cand.discount;

    const inlineMultiplier = rawTitle.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|кг|st|stk|шт|x|х|\*)\s*[x*х]\s*(\d+[.,]\d+)/i);
    if (inlineMultiplier) {
      quantity = parseFloat(inlineMultiplier[1].replace(',', '.'));
      unitPrice = parseFloat(inlineMultiplier[2].replace(',', '.'));
      rawTitle = rawTitle.replace(inlineMultiplier[0], '').trim();
    }

    const unit = cand.unit || extractUnitOfMeasure(rawTitle) || (quantity !== 1 && inlineMultiplier ? 'кг' : 'шт');

    // Нормализация наименования и категории на русском
    const { normalizedTitle, category } = normalizeProductTitle(rawTitle, lang);

    let confidence = 92;
    if (rawTitle.length < 4) confidence -= 15;
    if (/[^\w\sА-Яа-яΆ-ώЁё.,\-%/€₽zł]/i.test(rawTitle)) confidence -= 15;
    if (price <= 0 || price > 5000) confidence -= 25;
    confidence = Math.max(40, Math.min(99, confidence));

    const isDoubtful = confidence < 70;

    items.push({
      id: `line-${Date.now()}-${items.length}-${Math.random().toString(36).substring(2, 6)}`,
      originalText: cand.originalLine,
      normalizedTitle,
      quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity,
      unit,
      unitPrice: isNaN(unitPrice) ? price : unitPrice,
      totalPrice: price,
      discount,
      currency,
      confidence,
      status: isDoubtful ? 'needs_review' : 'verified',
      category,
      isDoubtful,
    });
  }

  return items;
}

