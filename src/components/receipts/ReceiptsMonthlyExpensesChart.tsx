import React, { useState, useMemo, useEffect } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  TrendingUp,
  Sparkles,
  DollarSign,
  Filter,
  CheckCircle2,
  Activity,
  ShoppingBag,
} from 'lucide-react';
import { ScannedReceipt, ShoppingCategory } from '../../types';
import {
  CategoryDistributionItem,
  calculateCategoryBreakdown,
} from '../../utils/categoryMetadata';
import { getCurrencySymbol } from '../../utils/currencyConstants';

interface ReceiptsMonthlyExpensesChartProps {
  receipts: ScannedReceipt[];
  selectedCategory?: ShoppingCategory | 'all';
  onSelectCategory?: (category: ShoppingCategory | 'all') => void;
  currency?: string;
  onLoadSamples?: () => void;
}

const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

function formatMonthLabel(yearMonth: string): string {
  if (!yearMonth || yearMonth === 'all') return 'Все месяцы';
  const parts = yearMonth.split('-');
  if (parts.length < 2) return yearMonth;
  const mIndex = parseInt(parts[1], 10) - 1;
  return `${MONTH_NAMES[mIndex] || parts[1]} ${parts[0]}`;
}

// Макро-группы для быстрого сравнения «Продукты» vs «Бытовая химия» vs «Прочее»
const FOOD_CATEGORIES: ShoppingCategory[] = [
  'produce',
  'dairy',
  'meat',
  'bakery',
  'pantry',
  'sweets',
  'drinks',
];

export const ReceiptsMonthlyExpensesChart: React.FC<ReceiptsMonthlyExpensesChartProps> = ({
  receipts,
  selectedCategory = 'all',
  onSelectCategory,
  currency = 'EUR',
  onLoadSamples,
}) => {
  const currencySymbol = getCurrencySymbol(currency);

  // Вычисляем текущий календарный месяц по умолчанию (например "2026-10")
  const currentCalendarMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  // Доступные месяцы из чеков
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    // Всегда включаем текущий месяц
    monthsSet.add(currentCalendarMonth);
    receipts.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        monthsSet.add(r.date.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [receipts, currentCalendarMonth]);

  // Умный поиск месяца с данными (если в текущем месяце нет чеков, переключаем на ближайший месяц с чеками)
  const latestMonthWithData = useMemo(() => {
    if (receipts.length === 0) return currentCalendarMonth;
    // Проверяем сначала текущий месяц
    const hasCurrent = receipts.some(
      (r) => r.date && r.date.startsWith(currentCalendarMonth)
    );
    if (hasCurrent) return currentCalendarMonth;

    // Иначе берем самый свежий месяц из имеющихся чеков
    const sorted = [...receipts]
      .filter((r) => r.date && r.date.length >= 7)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (sorted.length > 0 && sorted[0].date) {
      return sorted[0].date.slice(0, 7);
    }
    return currentCalendarMonth;
  }, [receipts, currentCalendarMonth]);

  // Выбранный месяц
  const [selectedMonth, setSelectedMonth] = useState<string>(latestMonthWithData);

  // Автосинхронизация при обновлении списка чеков
  useEffect(() => {
    if (receipts.length > 0 && selectedMonth !== 'all') {
      const hasReceiptsInSelected = receipts.some(
        (r) => r.date && r.date.startsWith(selectedMonth)
      );
      if (!hasReceiptsInSelected) {
        setSelectedMonth(latestMonthWithData);
      }
    }
  }, [receipts, latestMonthWithData]);

  // Режим отображения: 'both' | 'donut' | 'bar' | 'timeline'
  const [chartMode, setChartMode] = useState<'both' | 'donut' | 'bar' | 'timeline'>('both');

  // Фильтрация чеков по выбранному месяцу
  const monthReceipts = useMemo(() => {
    if (selectedMonth === 'all') return receipts;
    return receipts.filter((r) => r.date && r.date.startsWith(selectedMonth));
  }, [receipts, selectedMonth]);

  // Все товарные позиции за выбранный месяц
  const monthItems = useMemo(() => {
    const items = [];
    for (const r of monthReceipts) {
      if (r.items && Array.isArray(r.items)) {
        items.push(...r.items);
      }
    }
    return items;
  }, [monthReceipts]);

  // Распределение по категориям
  const breakdown: CategoryDistributionItem[] = useMemo(() => {
    return calculateCategoryBreakdown(monthItems);
  }, [monthItems]);

  // Суммарные траты за выбранный месяц
  const totalMonthSpent = useMemo(() => {
    return Math.round(breakdown.reduce((sum, it) => sum + it.totalAmount, 0) * 100) / 100;
  }, [breakdown]);

  // Данные для Recharts круговой диаграммы (Donut)
  const pieData = useMemo(() => {
    return breakdown.map((item) => ({
      name: item.meta.label,
      shortLabel: item.meta.shortLabel,
      icon: item.meta.icon,
      value: item.totalAmount,
      percentage: item.percentage,
      itemCount: item.itemCount,
      color: item.meta.color,
      category: item.category,
    }));
  }, [breakdown]);

  // Данные для Recharts столбчатой диаграммы (Bar chart по убыванию суммы)
  const barData = useMemo(() => {
    return breakdown.map((item) => ({
      name: `${item.meta.icon} ${item.meta.shortLabel}`,
      fullName: item.meta.label,
      amount: item.totalAmount,
      percentage: item.percentage,
      count: item.itemCount,
      color: item.meta.color,
      category: item.category,
    }));
  }, [breakdown]);

  // Данные для Recharts динамики трат по дням (Timeline AreaChart)
  const timelineData = useMemo(() => {
    if (selectedMonth === 'all') {
      const monthlyMap: Record<string, { month: string; amount: number; count: number }> = {};
      monthReceipts.forEach((r) => {
        const mKey = r.date ? r.date.slice(0, 7) : 'Без даты';
        if (!monthlyMap[mKey]) {
          monthlyMap[mKey] = { month: formatMonthLabel(mKey), amount: 0, count: 0 };
        }
        monthlyMap[mKey].amount += r.totalAmount || 0;
        monthlyMap[mKey].count += 1;
      });
      return Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_, val]) => ({
          label: val.month,
          amount: Math.round(val.amount * 100) / 100,
          count: val.count,
        }));
    }

    const daysMap: Record<
      string,
      { dayLabel: string; date: string; amount: number; count: number; itemsCount: number }
    > = {};

    monthReceipts.forEach((r) => {
      if (!r.date) return;
      const dayStr = r.date;
      const parts = dayStr.split('-');
      const dayNum = parseInt(parts[2], 10);
      const dayLabel = `${dayNum}-е`;

      if (!daysMap[dayStr]) {
        daysMap[dayStr] = {
          dayLabel,
          date: dayStr,
          amount: 0,
          count: 0,
          itemsCount: 0,
        };
      }
      daysMap[dayStr].amount += r.totalAmount || 0;
      daysMap[dayStr].count += 1;
      daysMap[dayStr].itemsCount += r.items?.length || 0;
    });

    return Object.entries(daysMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, val]) => ({
        label: val.dayLabel,
        date: val.date,
        amount: Math.round(val.amount * 100) / 100,
        count: val.count,
        itemsCount: val.itemsCount,
      }));
  }, [monthReceipts, selectedMonth]);

  // Вычисление макро-распределения: Продукты, Бытовая химия, Прочее
  const macroStats = useMemo(() => {
    let foodSum = 0;
    let foodCount = 0;
    let householdSum = 0;
    let householdCount = 0;
    let otherSum = 0;
    let otherCount = 0;

    for (const it of breakdown) {
      if (FOOD_CATEGORIES.includes(it.category)) {
        foodSum += it.totalAmount;
        foodCount += it.itemCount;
      } else if (it.category === 'household') {
        householdSum += it.totalAmount;
        householdCount += it.itemCount;
      } else {
        otherSum += it.totalAmount;
        otherCount += it.itemCount;
      }
    }

    const total = totalMonthSpent > 0 ? totalMonthSpent : 1;
    return {
      food: {
        amount: Math.round(foodSum * 100) / 100,
        count: foodCount,
        percent: Math.round((foodSum / total) * 1000) / 10,
      },
      household: {
        amount: Math.round(householdSum * 100) / 100,
        count: householdCount,
        percent: Math.round((householdSum / total) * 1000) / 10,
      },
      other: {
        amount: Math.round(otherSum * 100) / 100,
        count: otherCount,
        percent: Math.round((otherSum / total) * 1000) / 10,
      },
    };
  }, [breakdown, totalMonthSpent]);

  // Кастомный тултип для круговой диаграммы (Pie)
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1F1E1C] text-white p-3 rounded-xl shadow-xl border border-white/10 text-xs space-y-1.5 backdrop-blur-md">
          <div className="flex items-center space-x-1.5 font-bold">
            <span className="text-base">{data.icon}</span>
            <span>{data.name}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 pt-1 border-t border-white/10">
            <span className="text-white/70">Сумма расходов:</span>
            <span className="font-extrabold text-sm text-emerald-400">
              {data.value.toFixed(2)} {currencySymbol}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] text-white/60">
            <span>Доля в месяце:</span>
            <span className="font-semibold text-white/90">{data.percentage}%</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] text-white/60">
            <span>Куплено товаров:</span>
            <span>{data.itemCount} шт.</span>
          </div>
          {onSelectCategory && (
            <div className="text-[10px] text-orange-300 pt-1 border-t border-white/10 italic">
              Нажмите для фильтрации чеков по этой категории
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Кастомный тултип для столбчатой диаграммы (Bar)
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1F1E1C] text-white p-3 rounded-xl shadow-xl border border-white/10 text-xs space-y-1.5">
          <div className="font-bold text-sm flex items-center space-x-1.5">
            <span>{data.name}</span>
          </div>
          <div className="text-[11px] text-white/70">{data.fullName}</div>
          <div className="flex items-baseline justify-between gap-4 pt-1 border-t border-white/10">
            <span className="text-white/70">Сумма расходов:</span>
            <span className="font-extrabold text-emerald-400">
              {data.amount.toFixed(2)} {currencySymbol}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/60">
            <span>Доля в месяце:</span>
            <span className="font-semibold text-white/90">{data.percentage}%</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/60">
            <span>Куплено товаров:</span>
            <span>{data.count} шт.</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Кастомный тултип для графика динамики (Timeline Area)
  const CustomTimelineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1F1E1C] text-white p-3 rounded-xl shadow-xl border border-white/10 text-xs space-y-1.5">
          <div className="font-bold flex items-center justify-between gap-4 text-sm">
            <span>{data.date || data.label}</span>
            <span className="text-orange-300 text-[11px] font-medium">
              {data.count} {data.count === 1 ? 'чек' : 'чека'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4 pt-1 border-t border-white/10">
            <span className="text-white/70">Траты в этот день:</span>
            <span className="font-extrabold text-emerald-400">
              {data.amount.toFixed(2)} {currencySymbol}
            </span>
          </div>
          {data.itemsCount !== undefined && (
            <div className="text-[11px] text-white/60">
              Товаров в чеках: <strong className="text-white">{data.itemsCount} шт</strong>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8E4DA] shadow-xs p-5 md:p-6 space-y-6">
      {/* Верхняя шапка: Заголовок + Селектор месяца + Переключатель диаграмм */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F2EFE9]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E15A42] to-[#F28C38] text-white flex items-center justify-center shadow-xs">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-[#1F1E1C] flex items-center space-x-2">
                <span>Расходы по чекам за месяц</span>
                {selectedMonth === currentCalendarMonth && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-[#E15A42]">
                    Текущий месяц
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#7A746B]">
                Визуализация Recharts: категории, рейтинг трат и динамика за{' '}
                {formatMonthLabel(selectedMonth).toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Управление: Селектор периода и переключение вида диаграмм */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Селектор месяца */}
          <div className="flex items-center space-x-1.5 bg-[#FAF9F5] border border-[#DDD8CD] px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-[#E15A42]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-[#1F1E1C] bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value={currentCalendarMonth}>
                Текущий месяц ({formatMonthLabel(currentCalendarMonth)})
              </option>
              {availableMonths
                .filter((m) => m !== currentCalendarMonth)
                .map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              <option value="all">Все месяцы (Всё время)</option>
            </select>
          </div>

          {/* Переключатель вида: Сводка / Круг / Столбцы / Динамика */}
          <div className="flex items-center bg-[#FAF9F5] border border-[#DDD8CD] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setChartMode('both')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                chartMode === 'both'
                  ? 'bg-white text-[#E15A42] shadow-2xs font-bold'
                  : 'text-[#6D675E] hover:text-[#1F1E1C]'
              }`}
              title="Комплексная сводка (Круг + Рейтинг)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сводка</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('donut')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                chartMode === 'donut'
                  ? 'bg-white text-[#E15A42] shadow-2xs font-bold'
                  : 'text-[#6D675E] hover:text-[#1F1E1C]'
              }`}
              title="Круговая диаграмма долей"
            >
              <PieChart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Круг</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                chartMode === 'bar'
                  ? 'bg-white text-[#E15A42] shadow-2xs font-bold'
                  : 'text-[#6D675E] hover:text-[#1F1E1C]'
              }`}
              title="Столбчатый рейтинг категорий"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Рейтинг</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('timeline')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer ${
                chartMode === 'timeline'
                  ? 'bg-white text-[#E15A42] shadow-2xs font-bold'
                  : 'text-[#6D675E] hover:text-[#1F1E1C]'
              }`}
              title="Динамика трат по дням"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Динамика</span>
            </button>
          </div>
        </div>
      </div>

      {/* Карточки макро-распределения: Продукты vs Бытовая химия vs Прочее */}
      {breakdown.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E8E4DA] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🍏</span>
              <div>
                <span className="text-[11px] font-bold text-[#7A746B] uppercase block">
                  Продукты питания
                </span>
                <span className="text-base font-extrabold text-[#1F1E1C]">
                  {macroStats.food.amount.toFixed(2)} {currencySymbol}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-[#E15A42] px-2 py-0.5 rounded-md bg-orange-100 block">
                {macroStats.food.percent}%
              </span>
              <span className="text-[10px] text-[#8C867D] mt-0.5 block">
                {macroStats.food.count} тов.
              </span>
            </div>
          </div>

          <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E8E4DA] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🧼</span>
              <div>
                <span className="text-[11px] font-bold text-[#7A746B] uppercase block">
                  Бытовая химия и дом
                </span>
                <span className="text-base font-extrabold text-[#1F1E1C]">
                  {macroStats.household.amount.toFixed(2)} {currencySymbol}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-indigo-600 px-2 py-0.5 rounded-md bg-indigo-50 block">
                {macroStats.household.percent}%
              </span>
              <span className="text-[10px] text-[#8C867D] mt-0.5 block">
                {macroStats.household.count} тов.
              </span>
            </div>
          </div>

          <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#E8E4DA] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📦</span>
              <div>
                <span className="text-[11px] font-bold text-[#7A746B] uppercase block">
                  Прочее и аптека
                </span>
                <span className="text-base font-extrabold text-[#1F1E1C]">
                  {macroStats.other.amount.toFixed(2)} {currencySymbol}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-amber-600 px-2 py-0.5 rounded-md bg-amber-50 block">
                {macroStats.other.percent}%
              </span>
              <span className="text-[10px] text-[#8C867D] mt-0.5 block">
                {macroStats.other.count} тов.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Основная секция визуализации Recharts */}
      {breakdown.length === 0 ? (
        <div className="bg-[#FAF9F5] rounded-2xl p-8 text-center border border-[#E8E4DA] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#E15A42] flex items-center justify-center mx-auto">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#1F1E1C]">
              Нет данных по чекам за {formatMonthLabel(selectedMonth).toLowerCase()}
            </h4>
            <p className="text-xs text-[#7A746B] max-w-sm mx-auto mt-1">
              {receipts.length > 0
                ? 'В этом месяце покупок пока нет. Выберите другой период выше или нажмите «Все месяцы».'
                : 'Загрузите свой чек или нажмите кнопку ниже, чтобы загрузить примеры чеков и протестировать графики.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {receipts.length > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#E15A42] font-bold text-xs border border-orange-200 transition-colors cursor-pointer"
              >
                Показать все месяцы ({receipts.length} чеков)
              </button>
            ) : (
              onLoadSamples && (
                <button
                  type="button"
                  onClick={onLoadSamples}
                  className="px-4 py-2 rounded-xl bg-[#E15A42] hover:bg-[#D04A33] text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Загрузить примеры чеков (Jumbo, REWE, dm)</span>
                </button>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Сетка круговой и столбчатой диаграмм */}
          {(chartMode === 'both' || chartMode === 'donut' || chartMode === 'bar') && (
            <div
              className={`grid gap-6 ${
                chartMode === 'both' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
              }`}
            >
              {/* Круговая диаграмма (Recharts PieChart / Donut) */}
              {(chartMode === 'donut' || chartMode === 'both') && (
                <div
                  className={`${
                    chartMode === 'both' ? 'lg:col-span-5' : 'w-full'
                  } flex flex-col items-center justify-between bg-[#FAF9F5] rounded-2xl p-4 border border-[#E8E4DA] relative`}
                >
                  <div className="w-full text-center mb-1">
                    <span className="text-xs font-bold text-[#555047] uppercase tracking-wider">
                      Доли категорий в расходах
                    </span>
                  </div>

                  <div className="relative w-full h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <RechartsTooltip content={<CustomPieTooltip />} />
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                          onClick={(entry: any) => {
                            const cat = entry?.category || entry?.payload?.category;
                            if (onSelectCategory && cat) {
                              onSelectCategory(selectedCategory === cat ? 'all' : cat);
                            }
                          }}
                          cursor="pointer"
                        >
                          {pieData.map((entry, index) => {
                            const isSelected = selectedCategory === entry.category;
                            const isFaded = selectedCategory !== 'all' && !isSelected;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                opacity={isFaded ? 0.35 : 1}
                                stroke={isSelected ? '#1F1E1C' : '#FFFFFF'}
                                strokeWidth={isSelected ? 3 : 2}
                                style={{ outline: 'none' }}
                              />
                            );
                          })}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>

                    {/* Центральный бейдж с суммой и месяцем */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] text-[#8C867D] font-medium uppercase tracking-wider">
                        {formatMonthLabel(selectedMonth).slice(0, 7)}
                      </span>
                      <span className="text-xl font-black text-[#1F1E1C]">
                        {totalMonthSpent.toFixed(2)}
                      </span>
                      <span className="text-[11px] font-bold text-[#E15A42]">
                        {currencySymbol}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#8C867D] text-center mt-1">
                    Нажмите на срез диаграммы для фильтрации чеков
                  </div>
                </div>
              )}

              {/* Столбчатая диаграмма (Recharts BarChart) */}
              {(chartMode === 'bar' || chartMode === 'both') && (
                <div
                  className={`${
                    chartMode === 'both' ? 'lg:col-span-7' : 'w-full'
                  } bg-[#FAF9F5] rounded-2xl p-4 border border-[#E8E4DA] flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#555047] uppercase tracking-wider">
                      Рейтинг трат по категориям ({currencySymbol})
                    </span>
                    <span className="text-[11px] text-[#8C867D] font-medium">
                      {breakdown.length} категорий
                    </span>
                  </div>

                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barData}
                        layout="vertical"
                        margin={{ top: 5, right: 25, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EBE7DF" />
                        <XAxis
                          type="number"
                          domain={[0, 'auto']}
                          tick={{ fontSize: 11, fill: '#7A746B' }}
                          tickFormatter={(val) => `${val} ${currencySymbol}`}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={110}
                          tick={{ fontSize: 11, fill: '#3D3A36', fontWeight: 600 }}
                        />
                        <RechartsTooltip content={<CustomBarTooltip />} />
                        <Bar
                          dataKey="amount"
                          radius={[0, 8, 8, 0]}
                          onClick={(entry: any) => {
                            if (onSelectCategory && entry && entry.category) {
                              onSelectCategory(
                                selectedCategory === entry.category ? 'all' : entry.category
                              );
                            }
                          }}
                          cursor="pointer"
                        >
                          {barData.map((entry, index) => {
                            const isSelected = selectedCategory === entry.category;
                            const isFaded = selectedCategory !== 'all' && !isSelected;
                            return (
                              <Cell
                                key={`bar-${index}`}
                                fill={entry.color}
                                opacity={isFaded ? 0.35 : 1}
                                stroke={isSelected ? '#1F1E1C' : 'none'}
                                strokeWidth={isSelected ? 2 : 0}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="text-[11px] text-[#8C867D] text-right mt-1">
                    Всего за период:{' '}
                    <strong className="text-[#1F1E1C]">
                      {totalMonthSpent.toFixed(2)} {currencySymbol}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. График динамики трат по дням месяца (Recharts AreaChart) */}
          {(chartMode === 'timeline' || (chartMode === 'both' && timelineData.length > 1)) && (
            <div className="bg-[#FAF9F5] rounded-2xl p-4 border border-[#E8E4DA] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#E15A42]" />
                  <span className="text-xs font-bold text-[#555047] uppercase tracking-wider">
                    Динамика трат по дням ({currencySymbol})
                  </span>
                </div>
                <span className="text-[11px] text-[#8C867D]">
                  {timelineData.length} {timelineData.length === 1 ? 'день с покупками' : 'дней с покупками'}
                </span>
              </div>

              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timelineData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E15A42" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#E15A42" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE7DF" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#7A746B' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#7A746B' }}
                      tickFormatter={(val) => `${val} ${currencySymbol}`}
                    />
                    <RechartsTooltip content={<CustomTimelineTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#E15A42"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorAmount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Интерактивные чипы категорий для быстрой фильтрации */}
      {breakdown.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#F2EFE9]">
          <div className="flex items-center justify-between text-xs text-[#7A746B]">
            <span className="font-bold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-[#E15A42]" />
              <span>Категории расходов (нажмите на карточку для фильтра чеков):</span>
            </span>
            {selectedCategory !== 'all' && onSelectCategory && (
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className="text-[11px] text-[#E15A42] font-bold hover:underline cursor-pointer"
              >
                Сбросить фильтр категории ({breakdown.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {breakdown.map((item) => {
              const isSelected = selectedCategory === item.category;
              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() =>
                    onSelectCategory &&
                    onSelectCategory(isSelected ? 'all' : item.category)
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#E15A42] bg-[#FFF5F2] ring-2 ring-[#E15A42]/20 shadow-xs'
                      : 'border-[#E8E4DA] bg-white hover:border-[#D5D0C5] hover:bg-[#FAF9F5]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">{item.meta.icon}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FAF9F5] border border-[#DDD8CD] text-[#555047]">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="font-bold text-xs text-[#1F1E1C] truncate">
                    {item.meta.shortLabel}
                  </div>
                  <div className="flex items-baseline justify-between mt-1 text-[11px]">
                    <span className="font-extrabold text-[#1F1E1C]">
                      {item.totalAmount.toFixed(2)} {currencySymbol}
                    </span>
                    <span className="text-[10px] text-[#8C867D]">
                      {item.itemCount} шт
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
