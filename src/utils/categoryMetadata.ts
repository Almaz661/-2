import { ShoppingCategory, ReceiptItemLine, ScannedReceipt } from '../types';

export interface CategoryMeta {
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  barColor: string;
  badgeClass: string;
  bgSoft: string;
  borderClass: string;
}

export const CATEGORY_METADATA: Record<ShoppingCategory, CategoryMeta> = {
  dairy: {
    label: 'Молочные продукты и яйца',
    shortLabel: 'Молочные',
    icon: '🥛',
    color: '#3B82F6',
    barColor: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    bgSoft: 'bg-blue-50/70',
    borderClass: 'border-blue-200',
  },
  meat: {
    label: 'Мясо, птица и рыба',
    shortLabel: 'Мясо',
    icon: '🥩',
    color: '#E11D48',
    barColor: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    bgSoft: 'bg-rose-50/70',
    borderClass: 'border-rose-200',
  },
  produce: {
    label: 'Овощи, фрукты и зелень',
    shortLabel: 'Овощи и фрукты',
    icon: '🥦',
    color: '#10B981',
    barColor: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bgSoft: 'bg-emerald-50/70',
    borderClass: 'border-emerald-200',
  },
  bakery: {
    label: 'Хлеб и свежая выпечка',
    shortLabel: 'Выпечка',
    icon: '🥖',
    color: '#F59E0B',
    barColor: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    bgSoft: 'bg-amber-50/70',
    borderClass: 'border-amber-200',
  },
  sweets: {
    label: 'Сладости, шоколад и десерты',
    shortLabel: 'Сладости',
    icon: '🍫',
    color: '#EC4899',
    barColor: 'bg-pink-500',
    badgeClass: 'bg-pink-50 text-pink-700 border-pink-200',
    bgSoft: 'bg-pink-50/70',
    borderClass: 'border-pink-200',
  },
  drinks: {
    label: 'Напитки, соки и вода',
    shortLabel: 'Напитки',
    icon: '🧃',
    color: '#06B6D4',
    barColor: 'bg-cyan-500',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    bgSoft: 'bg-cyan-50/70',
    borderClass: 'border-cyan-200',
  },
  pantry: {
    label: 'Бакалея, масло и крупы',
    shortLabel: 'Бакалея',
    icon: '🌾',
    color: '#EA580C',
    barColor: 'bg-orange-500',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    bgSoft: 'bg-orange-50/70',
    borderClass: 'border-orange-200',
  },
  household: {
    label: 'Товары для дома и уборки',
    shortLabel: 'Дом и быт',
    icon: '🧺',
    color: '#8B5CF6',
    barColor: 'bg-purple-500',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    bgSoft: 'bg-purple-50/70',
    borderClass: 'border-purple-200',
  },
  pharmacy: {
    label: 'Аптека и здоровье',
    shortLabel: 'Аптека',
    icon: '💊',
    color: '#0D9488',
    barColor: 'bg-teal-500',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    bgSoft: 'bg-teal-50/70',
    borderClass: 'border-teal-200',
  },
  other: {
    label: 'Прочие покупки',
    shortLabel: 'Прочее',
    icon: '📦',
    color: '#78716C',
    barColor: 'bg-stone-500',
    badgeClass: 'bg-stone-50 text-stone-700 border-stone-200',
    bgSoft: 'bg-stone-50/70',
    borderClass: 'border-stone-200',
  },
};

export interface CategoryDistributionItem {
  category: ShoppingCategory;
  meta: CategoryMeta;
  totalAmount: number;
  itemCount: number;
  percentage: number;
}

/**
 * Вычисляет распределение по категориям для списка товарных позиций чека
 */
export function calculateCategoryBreakdown(
  items: ReceiptItemLine[],
  fallbackTotal?: number
): CategoryDistributionItem[] {
  if (!items || items.length === 0) return [];

  const totalsMap: Partial<Record<ShoppingCategory, { amount: number; count: number }>> = {};

  let sum = 0;
  for (const it of items) {
    const cat = it.category || 'other';
    const price = typeof it.totalPrice === 'number' && !isNaN(it.totalPrice) ? it.totalPrice : 0;
    sum += price;
    if (!totalsMap[cat]) {
      totalsMap[cat] = { amount: 0, count: 0 };
    }
    totalsMap[cat]!.amount += price;
    totalsMap[cat]!.count += 1;
  }

  const denominator = fallbackTotal && fallbackTotal > 0 ? fallbackTotal : sum > 0 ? sum : 1;

  const results: CategoryDistributionItem[] = [];

  for (const [catKey, data] of Object.entries(totalsMap) as [ShoppingCategory, { amount: number; count: number }][]) {
    const meta = CATEGORY_METADATA[catKey] || CATEGORY_METADATA.other;
    const roundedAmount = Math.round(data.amount * 100) / 100;
    const percentage = Math.round((roundedAmount / denominator) * 1000) / 10; // 1 decimal place

    results.push({
      category: catKey,
      meta,
      totalAmount: roundedAmount,
      itemCount: data.count,
      percentage: Math.min(100, Math.max(0, percentage)),
    });
  }

  // Сортировка: сначала самые затратные категории
  return results.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Вычисляет суммарное распределение расходов по категориям для массива чеков
 */
export function calculateReceiptsCategoryBreakdown(
  receipts: ScannedReceipt[],
  currencyFilter?: string
): {
  breakdown: CategoryDistributionItem[];
  totalSpent: number;
  totalItems: number;
  currency: string;
} {
  const filtered = currencyFilter && currencyFilter !== 'all'
    ? receipts.filter((r) => (r.currency || 'EUR') === currencyFilter)
    : receipts;

  const allItems: ReceiptItemLine[] = [];
  let detectedCurrency = 'EUR';

  for (const r of filtered) {
    if (r.currency) detectedCurrency = r.currency;
    if (r.items && Array.isArray(r.items)) {
      allItems.push(...r.items);
    }
  }

  const breakdown = calculateCategoryBreakdown(allItems);
  const totalSpent = Math.round(breakdown.reduce((acc, c) => acc + c.totalAmount, 0) * 100) / 100;

  return {
    breakdown,
    totalSpent,
    totalItems: allItems.length,
    currency: detectedCurrency,
  };
}
