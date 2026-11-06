import React from 'react';
import { PieChart, Filter, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { ShoppingCategory } from '../../types';
import {
  CategoryDistributionItem,
  CATEGORY_METADATA,
} from '../../utils/categoryMetadata';

interface CategoryDistributionWidgetProps {
  breakdown: CategoryDistributionItem[];
  totalAmount?: number;
  currency?: string;
  selectedCategory?: ShoppingCategory | 'all';
  onSelectCategory?: (category: ShoppingCategory | 'all') => void;
  title?: string;
  subtitle?: string;
  variant?: 'full' | 'compact' | 'modal';
}

export const CategoryDistributionWidget: React.FC<CategoryDistributionWidgetProps> = ({
  breakdown,
  totalAmount,
  currency = 'EUR',
  selectedCategory = 'all',
  onSelectCategory,
  title = 'Распределение расходов по категориям',
  subtitle,
  variant = 'full',
}) => {
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="bg-white p-4 rounded-2xl border border-[#E8E4DA] shadow-xs text-center py-6">
        <PieChart className="w-8 h-8 text-[#8C867D] mx-auto mb-2 opacity-50" />
        <p className="text-xs text-[#7A746B]">
          Нет данных о товарах для построения распределения по категориям
        </p>
      </div>
    );
  }

  const computedTotal =
    typeof totalAmount === 'number' && totalAmount > 0
      ? totalAmount
      : Math.round(breakdown.reduce((s, it) => s + it.totalAmount, 0) * 100) / 100;

  return (
    <div
      className={`bg-white rounded-2xl border border-[#E8E4DA] shadow-xs transition-all ${
        variant === 'modal' ? 'p-4' : 'p-5'
      }`}
    >
      {/* Заголовок с общей статистикой */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3.5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#E15A42] flex items-center justify-center shrink-0">
              <PieChart className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm md:text-base text-[#1F1E1C] flex items-center gap-1.5">
              <span>{title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#FAF9F5] border border-[#DDD8CD] text-[#7A746B] font-medium">
                {breakdown.length} {breakdown.length === 1 ? 'категория' : breakdown.length < 5 ? 'категории' : 'категорий'}
              </span>
            </h3>
          </div>
          {subtitle && (
            <p className="text-xs text-[#8C867D] mt-0.5 ml-9">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] text-[#8C867D] uppercase tracking-wider block font-medium">
              Итого по чеку
            </span>
            <span className="text-base font-extrabold text-[#1F1E1C]">
              {computedTotal.toFixed(2)} {currency}
            </span>
          </div>

          {onSelectCategory && selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className="text-[11px] font-semibold text-[#E15A42] hover:text-[#C84933] px-2 py-1 rounded-lg hover:bg-orange-50 border border-orange-200 transition-colors cursor-pointer"
            >
              Сбросить фильтр
            </button>
          )}
        </div>
      </div>

      {/* Горизонтальный сегментированный прогресс-бар распределения */}
      <div className="space-y-1.5 mb-4">
        <div className="w-full h-3 rounded-full bg-[#EBE7DF] overflow-hidden flex shadow-inner">
          {breakdown.map((item) => {
            const isSelected = selectedCategory === item.category;
            const isFaded = selectedCategory !== 'all' && !isSelected;
            return (
              <div
                key={item.category}
                style={{
                  width: `${Math.max(item.percentage, 2)}%`,
                  backgroundColor: item.meta.color,
                }}
                className={`h-full transition-all duration-300 relative group cursor-pointer ${
                  isFaded ? 'opacity-30' : 'opacity-100'
                } ${isSelected ? 'ring-2 ring-black ring-offset-1 z-10' : ''}`}
                onClick={() => onSelectCategory && onSelectCategory(item.category)}
                title={`${item.meta.label}: ${item.totalAmount.toFixed(2)} ${currency} (${item.percentage}%)`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#8C867D] px-0.5">
          <span>0%</span>
          <span className="font-medium text-[#5A554D]">
            {breakdown[0] ? `Лидер расходов: ${breakdown[0].meta.icon} ${breakdown[0].meta.shortLabel} (${breakdown[0].percentage}%)` : ''}
          </span>
          <span>100%</span>
        </div>
      </div>

      {/* Сетка карточек по каждой категории */}
      <div
        className={`grid gap-2 ${
          variant === 'modal'
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
        }`}
      >
        {onSelectCategory && (
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedCategory === 'all'
                ? 'bg-[#1E1C1A] text-white border-[#1E1C1A] shadow-sm'
                : 'bg-[#FAF9F5] hover:bg-[#F2EFE9] border-[#E5E0D5] text-[#1F1E1C]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">📋</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  selectedCategory === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-[#7A746B] border border-[#DDD8CD]'
                }`}
              >
                100%
              </span>
            </div>
            <div>
              <div className="font-bold text-xs truncate">Все категории</div>
              <div
                className={`text-[11px] font-extrabold mt-0.5 ${
                  selectedCategory === 'all' ? 'text-orange-200' : 'text-[#1F1E1C]'
                }`}
              >
                {computedTotal.toFixed(2)} {currency}
              </div>
            </div>
          </button>
        )}

        {breakdown.map((item) => {
          const isSelected = selectedCategory === item.category;
          const isFaded = selectedCategory !== 'all' && !isSelected;

          const CardTag = onSelectCategory ? 'button' : 'div';
          return (
            <CardTag
              key={item.category}
              {...(onSelectCategory ? { type: 'button' as const, onClick: () => onSelectCategory(item.category) } : {})}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                onSelectCategory ? 'cursor-pointer hover:shadow-sm' : ''
              } flex flex-col justify-between ${
                isSelected
                  ? 'border-[#E15A42] bg-orange-50/70 ring-2 ring-[#E15A42]/30 shadow-sm'
                  : isFaded
                  ? 'border-[#EBE7DF] bg-[#FAF9F5]/60 opacity-60'
                  : 'border-[#EAE6DD] bg-[#FAF9F5] hover:bg-white hover:border-[#DDD8CD]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-lg leading-none">{item.meta.icon}</span>
                <span
                  className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md text-white shadow-2xs"
                  style={{ backgroundColor: item.meta.color }}
                >
                  {item.percentage}%
                </span>
              </div>

              <div>
                <div className="font-semibold text-xs text-[#1F1E1C] truncate" title={item.meta.label}>
                  {item.meta.shortLabel}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs font-extrabold text-[#1F1E1C]">
                    {item.totalAmount.toFixed(2)} {currency}
                  </span>
                  <span className="text-[10px] text-[#8C867D]">
                    {item.itemCount} поз.
                  </span>
                </div>
              </div>
            </CardTag>
          );
        })}
      </div>
    </div>
  );
};
