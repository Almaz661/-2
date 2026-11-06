export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'EUR', symbol: '€', name: 'Евро', label: 'EUR (€) — Евро (ЕС, Кипр, Греция, Черногория)' },
  { code: 'USD', symbol: '$', name: 'Доллар США', label: 'USD ($) — Доллар США' },
  { code: 'RUB', symbol: '₽', name: 'Российский рубль', label: 'RUB (₽) — Рубль (Россия)' },
  { code: 'AED', symbol: 'AED', name: 'Дирхам ОАЭ', label: 'AED (AED) — Дирхам (ОАЭ, Дубай)' },
  { code: 'TRY', symbol: '₺', name: 'Турецкая лира', label: 'TRY (₺) — Лира (Турция)' },
  { code: 'GEL', symbol: '₾', name: 'Грузинский лари', label: 'GEL (₾) — Лари (Грузия)' },
  { code: 'THB', symbol: '฿', name: 'Тайский бат', label: 'THB (฿) — Бат (Таиланд)' },
  { code: 'GBP', symbol: '£', name: 'Британский фунт', label: 'GBP (£) — Фунт (Великобритания)' },
  { code: 'KZT', symbol: '₸', name: 'Казахстанский тенге', label: 'KZT (₸) — Тенге (Казахстан)' },
  { code: 'AMD', symbol: '֏', name: 'Армянский драм', label: 'AMD (֏) — Драм (Армения)' },
  { code: 'RSD', symbol: 'дин.', name: 'Сербский динар', label: 'RSD (дин.) — Динар (Сербия)' },
  { code: 'ILS', symbol: '₪', name: 'Израильский шекель', label: 'ILS (₪) — Шекель (Израиль)' },
  { code: 'CHF', symbol: 'CHF', name: 'Швейцарский франк', label: 'CHF — Франк (Швейцария)' },
  { code: 'PLN', symbol: 'zł', name: 'Польский злотый', label: 'PLN (zł) — Злотый (Польша)' },
  { code: 'CAD', symbol: 'C$', name: 'Канадский доллар', label: 'CAD (C$) — Доллар (Канада)' },
  { code: 'AUD', symbol: 'A$', name: 'Австралийский доллар', label: 'AUD (A$) — Доллар (Австралия)' },
  { code: 'UAH', symbol: '₴', name: 'Украинская гривна', label: 'UAH (₴) — Гривна' },
  { code: 'BYN', symbol: 'Br', name: 'Белорусский рубль', label: 'BYN (Br) — Белорусский рубль' },
  { code: 'CZK', symbol: 'Kč', name: 'Чешская крона', label: 'CZK (Kč) — Чешская крона' },
  { code: 'HUF', symbol: 'Ft', name: 'Венгерский форинт', label: 'HUF (Ft) — Форинт' },
  { code: 'SEK', symbol: 'kr', name: 'Шведская крона', label: 'SEK (kr) — Шведская крона' },
  { code: 'NOK', symbol: 'kr', name: 'Норвежская крона', label: 'NOK (kr) — Норвежская крона' },
  { code: 'IDR', symbol: 'Rp', name: 'Индонезийская рупия', label: 'IDR (Rp) — Рупия (Бали, Индонезия)' },
  { code: 'VND', symbol: '₫', name: 'Вьетнамский донг', label: 'VND (₫) — Донг (Вьетнам)' },
];

export const getCurrencySymbol = (code: string | undefined): string => {
  if (!code) return '€';
  const found = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found ? found.symbol : code;
};

export const formatCurrencyLabel = (code: string | undefined): string => {
  if (!code) return 'EUR (€)';
  const found = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found ? `${found.code} (${found.symbol})` : code;
};
