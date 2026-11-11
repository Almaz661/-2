import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { ScannedReceipt } from '../../types';
import { formatLocalDate } from '../../utils/dateUtils';
import { cachedRate, getRate, Rate } from '../../services/exchangeRate';
import { Card } from '../ui/mercury';

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const money = (v: number, cur: string) => `${v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur === 'EUR' ? '€' : cur === 'RUB' ? '₽' : cur}`;

/** Расходы по каждому товару за месяц: сколько раз, сколько потрачено, последняя цена и её изменение; пересчёт в рубли по курсу. */
export const ItemSpending: React.FC<{ receipts: ScannedReceipt[] }> = ({ receipts }) => {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [showAll, setShowAll] = useState(false);
  const key = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`;
  const mainCurrency = receipts.find((r) => r.currency)?.currency || 'EUR';
  const [rate, setRate] = useState<Rate | null>(() => cachedRate(mainCurrency, 'RUB'));
  useEffect(() => {
    if (mainCurrency === 'RUB') return;
    getRate(mainCurrency, 'RUB').then((r) => r && setRate(r));
  }, [mainCurrency]);

  const rows = useMemo(() => {
    const all = receipts
      .flatMap((r) => (r.items || []).map((it) => ({ it, date: r.date || formatLocalDate(new Date(r.scannedAt)), store: r.storeName || r.rawStoreName || '' })))
      .filter((x) => x.it.normalizedTitle && x.it.totalPrice > 0);
    const byName = new Map<string, { title: string; total: number; count: number; qty: number; last?: number; prev?: number; lastDate: string; currency: string }>();
    // По датам — чтобы знать последнюю и предыдущую цену
    all.sort((a, b) => a.date.localeCompare(b.date));
    for (const x of all) {
      const k = x.it.normalizedTitle.toLowerCase().trim();
      const unit = x.it.unitPrice ?? x.it.totalPrice / Math.max(1, x.it.quantity || 1);
      const cur = byName.get(k) || { title: x.it.normalizedTitle, total: 0, count: 0, qty: 0, lastDate: '', currency: x.it.currency || mainCurrency };
      if (x.date.startsWith(key)) {
        cur.total += x.it.totalPrice;
        cur.count += 1;
        cur.qty += x.it.quantity || 1;
      }
      if (x.date <= `${key}-31`) {
        cur.prev = cur.last;
        cur.last = unit;
        cur.lastDate = x.date;
      }
      byName.set(k, cur);
    }
    return [...byName.values()].filter((r) => r.count > 0).sort((a, b) => b.total - a.total);
  }, [receipts, key, mainCurrency]);

  const total = rows.reduce((n, r) => n + r.total, 0);
  const shown = showAll ? rows : rows.slice(0, 12);
  const shift = (d: number) => setYm(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--text)]">Расходы по товарам</h3>
          <p className="text-[14px] text-[var(--muted)]">
            Всего: {money(total, mainCurrency)}
            {rate && mainCurrency !== 'RUB' && ` ≈ ${money(total * rate.value, 'RUB')}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Предыдущий месяц" onClick={() => shift(-1)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-[var(--surface-3)]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[var(--text)] min-w-[110px] text-center">
            {MONTHS[ym.m]} {ym.y}
          </span>
          <button type="button" aria-label="Следующий месяц" onClick={() => shift(1)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-[var(--surface-3)]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      {rate && mainCurrency !== 'RUB' && (
        <p className="text-xs text-[var(--muted)] mb-3">
          Курс: 1 {mainCurrency} = {rate.value.toFixed(2)} ₽ · {rate.source}, {rate.date}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted)] py-4">За этот месяц чеков с товарами нет.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--muted)] border-b border-[var(--line)]">
                <th className="py-2 pr-3 font-medium">Товар</th>
                <th className="py-2 px-2 font-medium text-right">Раз</th>
                <th className="py-2 px-2 font-medium text-right">Потрачено</th>
                <th className="py-2 pl-2 font-medium text-right">Последняя цена</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const diff = r.prev && r.last ? r.last - r.prev : 0;
                return (
                  <tr key={r.title} className="border-b border-[var(--line)] last:border-b-0">
                    <td className="py-2 pr-3 text-[var(--text)]">{r.title}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-[var(--text-2)]">{r.count}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-[var(--text)]">{money(r.total, r.currency)}</td>
                    <td className="py-2 pl-2 text-right tabular-nums text-[var(--text-2)] whitespace-nowrap">
                      {r.last ? money(r.last, r.currency) : '—'}
                      {Math.abs(diff) >= 0.01 && (
                        <span className={`ml-1 inline-flex items-center ${diff > 0 ? 'text-amber-700' : 'text-emerald-600'}`} title="Изменение к прошлой покупке">
                          {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 12 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-sm text-[var(--accent)] hover:underline">
          {showAll ? 'Свернуть' : `Показать все (${rows.length})`}
        </button>
      )}
    </Card>
  );
};
