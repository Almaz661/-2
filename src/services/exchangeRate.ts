import { formatLocalDate } from '../utils/dateUtils';
// Курс валют для пересчёта расходов (например, EUR → RUB). Бесплатные источники без ключа:
// 1) open.er-api.com (ExchangeRate-API, обновляется раз в сутки), 2) cbr-xml-daily.ru (курс ЦБ РФ).
// Кэш на сутки на устройстве; без интернета — последний сохранённый курс с датой.

export interface Rate {
  from: string;
  to: string;
  value: number;
  date: string;
  source: string;
}
const KEY = (from: string, to: string) => `dbh_rate_${from}_${to}`;

export const cachedRate = (from: string, to: string): Rate | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY(from, to)) || 'null');
  } catch {
    return null;
  }
};

export async function getRate(from: string, to: string): Promise<Rate | null> {
  if (from === to) return { from, to, value: 1, date: formatLocalDate(new Date()), source: '—' };
  const cached = cachedRate(from, to);
  const today = formatLocalDate(new Date());
  if (cached && cached.date === today) return cached;
  const save = (r: Rate) => {
    try {
      localStorage.setItem(KEY(from, to), JSON.stringify(r));
    } catch {
      /* нет места */
    }
    return r;
  };
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    const j = await res.json();
    if (j?.rates?.[to]) return save({ from, to, value: j.rates[to], date: today, source: 'ExchangeRate-API' });
  } catch {
    /* следующий источник */
  }
  if (to === 'RUB') {
    try {
      const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
      const j = await res.json();
      const v = j?.Valute?.[from];
      if (v) return save({ from, to, value: v.Value / v.Nominal, date: today, source: 'ЦБ РФ' });
    } catch {
      /* без интернета */
    }
  }
  return cached;
}
