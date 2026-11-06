import React, { useState, useMemo, useEffect } from 'react';
import {
  Gauge,
  Droplets,
  Zap,
  Flame,
  Plus,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  TrendingUp,
  Calendar,
  History,
  Trash2,
  Edit2,
  X,
  FileSpreadsheet,
  ArrowUpRight,
  Calculator,
  Info,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { useHousehold } from '../../context/HouseholdContext';
import { UtilityMeter, UtilityMeterType, UtilityReading } from '../../types';
import { getPreviousReadingForMeter } from '../../utils/utilityCalculations';

const METER_ICONS: Record<UtilityMeterType, { icon: any; color: string; bg: string }> = {
  cold_water: { icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  hot_water: { icon: Droplets, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  electricity_day: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  electricity_night: { icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  electricity_single: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  gas: { icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  heating: { icon: Flame, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

const METER_TYPE_LABELS: Record<UtilityMeterType, string> = {
  cold_water: 'Холодная вода',
  hot_water: 'Горячая вода',
  electricity_day: 'Электричество День (Т1)',
  electricity_night: 'Электричество Ночь (Т2)',
  electricity_single: 'Электричество (одноставочный)',
  gas: 'Газ',
  heating: 'Отопление / Теплосчётчик',
};

// Реалистичные типичные тарифы по регионам (ЕС, РФ, США) для быстрого предзаполнения
const TYPICAL_TARIFFS: Record<'₽' | '€' | '$', Record<UtilityMeterType, number>> = {
  '€': {
    cold_water: 1.45,
    hot_water: 4.8,
    electricity_day: 0.22,
    electricity_night: 0.14,
    electricity_single: 0.2,
    gas: 0.85,
    heating: 35.0,
  },
  '₽': {
    cold_water: 50.93,
    hot_water: 243.16,
    electricity_day: 7.85,
    electricity_night: 2.98,
    electricity_single: 6.43,
    gas: 7.2,
    heating: 2650.0,
  },
  '$': {
    cold_water: 1.6,
    hot_water: 5.1,
    electricity_day: 0.18,
    electricity_night: 0.11,
    electricity_single: 0.16,
    gas: 0.95,
    heating: 38.0,
  },
};

export const UtilitiesView: React.FC = () => {
  const {
    meters,
    addMeter,
    updateMeter,
    deleteMeter,
    addMeterReading,
    deleteMeterReading,
    updateMeterReading,
    toggleReadingSubmitted,
    clearMeterReadings,
    showToast,
  } = useHousehold();

  // Текущий календарный месяц в формате YYYY-MM и выбранный месяц просмотра/ввода
  const currentMonth = new Date().toISOString().substring(0, 7); // '2026-10'
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().substring(0, 7));

  // Временные значения инпутов для быстрой подачи показаний
  const [readingInputs, setReadingInputs] = useState<Record<string, string>>({});
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'current' | 'analytics' | 'meters'>('current');
  const [isAddMeterModalOpen, setIsAddMeterModalOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<UtilityMeter | null>(null);
  const [historyMeter, setHistoryMeter] = useState<UtilityMeter | null>(null);
  const [showBaselineHelp, setShowBaselineHelp] = useState(false);

  // Валюта расчёта коммунальных услуг (₽ / € / $)
  const [currencySymbol, setCurrencySymbol] = useState<'₽' | '€' | '$'>(() => {
    try {
      const saved = localStorage.getItem('onehaus_utility_currency');
      if (saved === '€' || saved === '$' || saved === '₽') return saved;
    } catch (_) {}
    return '₽';
  });

  // Вспомогательные функции для форматирования и сдвига месяцев
  const formatMonthTitle = (mStr: string) => {
    try {
      const [y, m] = mStr.split('-').map(Number);
      const date = new Date(y, m - 1, 1);
      return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    } catch (_) {
      return mStr;
    }
  };

  const shiftMonthStr = (mStr: string, delta: number) => {
    try {
      const [y, m] = mStr.split('-').map(Number);
      const date = new Date(y, m - 1 + delta, 1);
      const ny = date.getFullYear();
      const nm = String(date.getMonth() + 1).padStart(2, '0');
      return `${ny}-${nm}`;
    } catch (_) {
      return mStr;
    }
  };

  // Применение пресетов тарифов для выбранной валюты
  const applyTariffPreset = (targetCurrency: '₽' | '€' | '$', showToastMsg = true) => {
    meters.forEach((m) => {
      const presetRate = TYPICAL_TARIFFS[targetCurrency][m.type];
      if (presetRate !== undefined) {
        updateMeter(m.id, { tariffRate: presetRate });
      }
    });
    if (showToastMsg) {
      showToast(
        targetCurrency === '€'
          ? 'Применены европейские тарифы (€): вода 1.45 €, свет 0.22 €'
          : targetCurrency === '₽'
          ? 'Применены российские тарифы (₽): вода 50.93 ₽, свет 7.85 ₽'
          : 'Применены стандартные тарифы ($)',
        'success'
      );
    }
  };

  const handleCurrencyChange = (sym: '₽' | '€' | '$') => {
    setCurrencySymbol(sym);
    try {
      localStorage.setItem('onehaus_utility_currency', sym);
    } catch (_) {}

    // Авто-адаптация при переключении: если перешли на €, а тарифы были рублёвыми (>10)
    const coldWater = meters.find((m) => m.type === 'cold_water');
    if (sym === '€' && coldWater && coldWater.tariffRate > 10) {
      applyTariffPreset('€', false);
      showToast('Валюта переключена на Евро (€). Применены европейские тарифы (вода 1.45 €, свет 0.22 €).', 'info');
    } else if (sym === '₽' && coldWater && coldWater.tariffRate < 10) {
      applyTariffPreset('₽', false);
      showToast('Валюта переключена на Рубли (₽). Применены российские тарифы.', 'info');
    } else if (sym === '$' && coldWater && coldWater.tariffRate > 10) {
      applyTariffPreset('$', false);
      showToast('Валюта переключена на Доллары ($). Применены стандартные тарифы.', 'info');
    }
  };

  // Проверка статуса подачи показаний за выбранный месяц
  const selectedMonthStatus = useMemo(() => {
    let unsubmittedCount = 0;
    let totalCostThisMonth = 0;

    meters.forEach((meter) => {
      const curReading = meter.readings.find((r) => r.month === selectedMonth);
      if (!curReading || !curReading.submitted) {
        unsubmittedCount++;
      }
      if (curReading && curReading.cost) {
        totalCostThisMonth += curReading.cost;
      }
    });

    return {
      unsubmittedCount,
      isAllSubmitted: unsubmittedCount === 0 && meters.length > 0,
      totalCostThisMonth: Math.round(totalCostThisMonth * 100) / 100,
    };
  }, [meters, selectedMonth]);

  // Данные для сравнительного графика расхода за последние 6 месяцев
  const chartData = useMemo(() => {
    // Получаем последние 6 месяцев
    const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const monthNames: Record<string, string> = {
      '2026-05': 'Май',
      '2026-06': 'Июнь',
      '2026-07': 'Июль',
      '2026-08': 'Авг',
      '2026-09': 'Сен',
      '2026-10': 'Окт',
    };

    return months.map((m) => {
      const row: any = { month: monthNames[m] || m, totalCost: 0 };
      meters.forEach((meter) => {
        const reading = meter.readings.find((r) => r.month === m);
        const diff = reading ? reading.difference : 0;
        const cost = reading ? reading.cost || 0 : 0;
        row[meter.id] = diff;
        row.totalCost += cost;
      });
      row.totalCost = Math.round(row.totalCost);
      return row;
    });
  }, [meters]);

  // Обработка записи показания за выбранный месяц
  const handleSaveReading = (meterId: string, monthToSave = selectedMonth) => {
    const rawVal = readingInputs[meterId];
    if (!rawVal) return;
    const num = parseFloat(rawVal);
    if (isNaN(num) || num < 0) {
      showToast('Введите корректное числовое значение показаний', 'error');
      return;
    }

    const isCurrent = monthToSave === currentMonth;
    const dateStr = isCurrent ? todayStr : `${monthToSave}-25`;

    addMeterReading(meterId, num, dateStr);
    setReadingInputs((prev) => ({ ...prev, [meterId]: '' }));
  };

  // Запись показания как следующий месяц (с автоматическим переходом на следующий месяц)
  const handleSaveToNextMonth = (meterId: string) => {
    const rawVal = readingInputs[meterId];
    if (!rawVal) return;
    const num = parseFloat(rawVal);
    if (isNaN(num) || num < 0) {
      showToast('Введите корректное числовое значение показаний', 'error');
      return;
    }

    const nextMonth = shiftMonthStr(selectedMonth, 1);
    const dateStr = `${nextMonth}-25`;

    addMeterReading(meterId, num, dateStr);
    setReadingInputs((prev) => ({ ...prev, [meterId]: '' }));
    setSelectedMonth(nextMonth);
    showToast(
      `Показание ${num} записано как следующий период (${formatMonthTitle(nextMonth)})!`,
      'success'
    );
  };

  // Копирование сводки показаний для отправки в УК или чат-бот
  const handleCopySummary = () => {
    const lines: string[] = [];
    lines.push(`Показания счётчиков за ${formatMonthTitle(selectedMonth)}:`);

    meters.forEach((m) => {
      const reading = m.readings.find((r) => r.month === selectedMonth);
      const val = reading ? reading.value : (readingInputs[m.id] ? readingInputs[m.id] : '—');
      lines.push(`• ${m.name}${m.serialNumber ? ` (${m.serialNumber})` : ''}: ${val} ${m.unit}`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSuccess(true);
    showToast('Показания скопированы в буфер обмена для отправки в УК', 'success');
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Верхний информационный дашборд */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Статус подачи показаний */}
        <div
          className={`rounded-3xl p-5 border shadow-xs transition-all flex items-center justify-between ${
            selectedMonthStatus.isAllSubmitted
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8C867D]">
              Период подачи: 15–25 число
            </span>
            <h3 className="text-xl font-bold">
              {selectedMonthStatus.isAllSubmitted
                ? 'Все показания переданы ✓'
                : `Осталось передать: ${selectedMonthStatus.unsubmittedCount} счётчика`}
            </h3>
            <p className="text-xs text-[#6B655B] capitalize">
              {formatMonthTitle(selectedMonth)} • Управляющая компания и ТСЖ
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              selectedMonthStatus.isAllSubmitted
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {selectedMonthStatus.isAllSubmitted ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6 animate-pulse" />
            )}
          </div>
        </div>

        {/* Сумма коммуналки по счётчикам */}
        <div className="bg-white rounded-3xl p-5 border border-[#E8E2D4] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#8C867D] capitalize">
              Расход по тарифам ({formatMonthTitle(selectedMonth)})
            </span>
            <div className="text-2xl font-black text-[#1F1E1C]">
              {selectedMonthStatus.totalCostThisMonth.toLocaleString('ru-RU')} {currencySymbol}
            </div>
            <p className="text-[11px] text-[#8C867D]">
              Вода, электричество Т1/Т2 и тепло
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#E15A42] flex items-center justify-center shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
        </div>

        {/* Сроки поверок счётчиков */}
        <div className="bg-white rounded-3xl p-5 border border-[#E8E2D4] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#8C867D]">Очередная поверка</span>
            <div className="text-lg font-bold text-[#1F1E1C]">ГВ: Апрель 2027</div>
            <p className="text-[11px] text-emerald-600 font-medium">
              Все приборы учёта сертифицированы
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Баннер предупреждения, если при переключении на Евро остались рублёвые демо-ставки */}
      {currencySymbol === '€' && meters.some((m) => m.type === 'cold_water' && m.tariffRate > 10) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="text-xl">💶</span>
            <div>
              <strong className="block font-bold text-sm">Тарифы в евро пока не скорректированы ({meters.find((m) => m.type === 'cold_water')?.tariffRate} €/м³)</strong>
              <span className="text-amber-800">
                Здесь остались исходные рублёвые цифры (из-за чего набежало 5 023 €). Нажмите кнопку, чтобы применить реальные ставки ЕС (~1.45 € за воду, ~0.22 € за свет), или отредактируйте каждый счётчик вручную.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => applyTariffPreset('€', true)}
            className="px-4 py-2 bg-[#E15A42] hover:bg-[#D04E37] text-white font-bold rounded-xl shrink-0 transition-colors cursor-pointer shadow-xs"
          >
            Применить тарифы ЕС (€)
          </button>
        </div>
      )}

      {/* 2. Навигационные вкладки режима: Текущие показания / Графики / Настройка счётчиков */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E8E2D4]">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <button
              type="button"
              onClick={() => setSelectedTab('current')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTab === 'current'
                  ? 'bg-[#E15A42] text-white shadow-xs'
                  : 'text-[#5C564B] hover:bg-[#F2EFE9]'
              }`}
            >
              Показания ({formatMonthTitle(selectedMonth)})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTab === 'analytics'
                  ? 'bg-[#E15A42] text-white shadow-xs'
                  : 'text-[#5C564B] hover:bg-[#F2EFE9]'
              }`}
            >
              Графики расхода (6 мес.)
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('meters')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTab === 'meters'
                  ? 'bg-[#E15A42] text-white shadow-xs'
                  : 'text-[#5C564B] hover:bg-[#F2EFE9]'
              }`}
            >
              Мои счётчики и тарифы ({meters.length})
            </button>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Переключатель валюты коммуналки */}
            <div className="flex items-center bg-[#FAF7F2] p-1 rounded-xl border border-[#DDD7CB]">
              {(['₽', '€', '$'] as const).map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleCurrencyChange(sym)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    currencySymbol === sym
                      ? 'bg-[#E15A42] text-white shadow-2xs'
                      : 'text-[#6B6456] hover:text-[#1F1E1C]'
                  }`}
                  title={`Установить валюту тарифов: ${sym}`}
                >
                  {sym}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EFEAE0] border border-[#DDD7CB] text-[#1F1E1C] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Скопировать текст показаний для отправки в УК или бот"
            >
              {copiedSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#E15A42]" />
              )}
              <span>{copiedSuccess ? 'Скопировано!' : 'Скопировать для УК'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingMeter(null);
                setIsAddMeterModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#1F1E1C] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Счётчик</span>
            </button>
          </div>
        </div>

        {/* Подсказка о тарифах */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#FAF7F2] rounded-xl border border-[#EDE7DB] text-[11px] text-[#6B6456]">
          <div className="flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-[#E15A42] shrink-0" />
            <span>
              <strong>Как работают тарифы:</strong> Каждая семья вводит ставки из своей квитанции (ΔΕΗ/ΕΥΔΑΠ в Греции, Мосэнерго в РФ). Нажмите на плашку тарифа ✏️ на карточке для ввода своих цифр.
            </span>
          </div>
          <button
            type="button"
            onClick={() => applyTariffPreset(currencySymbol, true)}
            className="text-[#E15A42] hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Типичные тарифы {currencySymbol === '€' ? 'ЕС (€)' : currencySymbol === '₽' ? 'РФ (₽)' : '($)'}</span>
          </button>
        </div>
      </div>

      {/* 3. ВКЛАДКА 1: ТЕКУЩИЕ ПОКАЗАНИЯ ЗА МЕСЯЦ */}
      {selectedTab === 'current' && (
        <div className="space-y-4">
          {/* Панель выбора месяца и периода */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E8E2D4] shadow-xs">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => shiftMonthStr(prev, -1))}
                className="p-2 rounded-xl border border-[#DDD7CB] hover:bg-[#F2ECE1] text-[#4A453C] transition-all cursor-pointer"
                title="Предыдущий месяц"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-[#FAF7F2] rounded-xl border border-[#EDE7DB]">
                <Calendar className="w-4 h-4 text-[#E15A42]" />
                <span className="font-bold text-sm text-[#1F1E1C] capitalize">
                  {formatMonthTitle(selectedMonth)}
                </span>
                {selectedMonth === currentMonth ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                    Текущий месяц
                  </span>
                ) : selectedMonth > currentMonth ? (
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                    Будущий период
                  </span>
                ) : (
                  <span className="text-[10px] bg-stone-100 text-stone-700 font-semibold px-2 py-0.5 rounded-md">
                    Архивный период
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => shiftMonthStr(prev, 1))}
                className="p-2 rounded-xl border border-[#DDD7CB] hover:bg-[#F2ECE1] text-[#4A453C] transition-all cursor-pointer"
                title="Следующий месяц"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {selectedMonth !== currentMonth && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth(currentMonth)}
                  className="flex items-center space-x-1 text-xs text-[#E15A42] hover:underline font-semibold ml-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Вернуться к текущему</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedMonth((prev) => shiftMonthStr(prev, 1))}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#EFEAE0] border border-[#DDD7CB] text-[#1F1E1C] font-semibold rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Перейти к следующему расчётному месяцу"
              >
                <span>+ Следующий период</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#E15A42]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meters.map((meter) => {
              const iconCfg = METER_ICONS[meter.type] || METER_ICONS.cold_water;
              const Icon = iconCfg.icon;

              // Текущее показание за выбранный месяц
              const curReading = meter.readings.find((r) => r.month === selectedMonth);

              // Предыдущее базовое показание перед выбранным месяцем
              const prevInfo = getPreviousReadingForMeter(meter, selectedMonth);
              const prevVal = prevInfo.previousValue;

              // Расчёт предпросмотра при живом вводе пользователем
              const liveInputStr = readingInputs[meter.id];
              const liveNum = liveInputStr !== undefined && liveInputStr.trim() !== '' ? parseFloat(liveInputStr) : null;
              const isLiveNumValid = liveNum !== null && !isNaN(liveNum);
              const liveDelta = isLiveNumValid ? Math.max(0, Math.round((liveNum - prevVal) * 1000) / 1000) : null;
              const liveCost = liveDelta !== null ? Math.round(liveDelta * meter.tariffRate * 100) / 100 : null;

              return (
                <div
                  key={meter.id}
                  className={`bg-white rounded-3xl p-5 border shadow-xs transition-all space-y-4 relative ${
                    curReading?.submitted
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-[#E8E2D4]'
                  }`}
                >
                  {/* Верхняя строка: Название, номер, журнал и тариф */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${iconCfg.bg}`}>
                        <Icon className={`w-5 h-5 ${iconCfg.color}`} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1F1E1C]">{meter.name}</h4>
                        <div className="flex items-center space-x-2 text-[11px] text-[#8C867D]">
                          <span>{meter.serialNumber || 'Без номера'}</span>
                          <span>•</span>
                          <span>{meter.location || 'Дом'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setHistoryMeter(meter)}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-xl bg-[#FAF7F2] hover:bg-[#EDE7DB] border border-[#DDD7CB] text-[#5C564B] transition-all cursor-pointer shadow-2xs"
                        title="Открыть полный журнал и историю показаний"
                      >
                        <History className="w-3.5 h-3.5 text-[#E15A42]" />
                        <span>Журнал</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMeter(meter);
                          setIsAddMeterModalOpen(true);
                        }}
                        className="flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-xl bg-[#FAF7F2] hover:bg-[#E15A42]/10 hover:text-[#E15A42] text-[#4A453C] border border-[#DDD7CB] transition-all cursor-pointer shadow-2xs group shrink-0"
                        title="Нажмите, чтобы ввести свой тариф для этого счётчика"
                      >
                        <span className="text-[10px] text-[#8C867D] group-hover:text-[#E15A42]">Тариф:</span>
                        <span>{meter.tariffRate} {currencySymbol}/{meter.unit}</span>
                        <Edit2 className="w-3 h-3 text-[#E15A42] shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Блок значений: Прошлое (база), Текущее, Расход */}
                  <div className="grid grid-cols-3 gap-2 bg-[#FAF7F2] p-3 rounded-2xl border border-[#EDE7DB] text-center">
                    <div>
                      <div className="flex items-center justify-center space-x-1">
                        <span className="text-[10px] text-[#8C867D] block">Прошлое (база)</span>
                        <button
                          type="button"
                          onClick={() => setShowBaselineHelp(true)}
                          className="text-stone-400 hover:text-[#E15A42] cursor-pointer"
                          title="Как устроена база показаний? Нажмите для справки"
                        >
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </div>
                      <strong className="text-sm font-bold text-[#4A453C] block">
                        {prevVal} {meter.unit}
                      </strong>
                      <span className="text-[9px] text-[#8C867D] block truncate mt-0.5">
                        {prevInfo.previousReading ? `за ${formatMonthTitle(prevInfo.previousReading.month)}` : 'нач. база'}
                      </span>
                    </div>

                    <div className="border-x border-[#EDE7DB]">
                      <span className="text-[10px] text-[#8C867D] block">Показание</span>
                      <strong className="text-sm font-black text-[#1F1E1C]">
                        {curReading ? `${curReading.value} ${meter.unit}` : 'Не введено'}
                      </strong>
                      <span className="text-[9px] text-[#8C867D] block truncate mt-0.5">
                        {curReading ? `за ${formatMonthTitle(selectedMonth)}` : 'ожидает ввода'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#8C867D] block">Расход (дельта)</span>
                      <strong className="text-sm font-bold text-[#E15A42]">
                        {curReading ? `+${curReading.difference} ${meter.unit}` : '—'}
                      </strong>
                      <span className="text-[9px] text-[#8C867D] block truncate mt-0.5">
                        {curReading ? `${curReading.cost} ${currencySymbol}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Прозрачная формула расчёта */}
                  <div className="text-[11px] bg-stone-100/70 border border-stone-200/60 rounded-xl px-3 py-1.5 text-stone-600 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 truncate">
                      <Calculator className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      {curReading ? (
                        <span>
                          Формула: <strong>{curReading.value}</strong> − <strong>{prevVal}</strong> = <strong className="text-[#E15A42]">+{curReading.difference} {meter.unit}</strong> × {meter.tariffRate} {currencySymbol} = <strong>{curReading.cost} {currencySymbol}</strong>
                        </span>
                      ) : (
                        <span>
                          Базовое прошлое: <strong>{prevVal} {meter.unit}</strong>. Введите новое значение ниже.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Живой предпросмотр при вводе показаний */}
                  {isLiveNumValid && (
                    <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-2.5 text-xs text-amber-950 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Предпросмотр для {liveNum} {meter.unit}:</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-amber-200/60">
                        <div className="p-1.5 rounded-lg bg-white/80 border border-amber-200/70">
                          <span className="text-[#8C867D] block font-medium">Обновить за {formatMonthTitle(selectedMonth)}:</span>
                          <div className="mt-0.5">
                            {liveNum} − {prevVal} = <strong className="text-[#E15A42]">+{liveDelta} {meter.unit}</strong> (≈ {liveCost?.toLocaleString('ru-RU')} {currencySymbol})
                          </div>
                        </div>
                        {curReading && (
                          <div className="p-1.5 rounded-lg bg-emerald-50/90 border border-emerald-300">
                            <span className="text-emerald-800 font-semibold block">Записать в {formatMonthTitle(shiftMonthStr(selectedMonth, 1))} (след. месяц):</span>
                            <div className="mt-0.5 text-emerald-950">
                              {liveNum} − {curReading.value} = <strong className="text-emerald-700 font-bold">+{Math.max(0, Math.round((liveNum - curReading.value) * 1000) / 1000)} {meter.unit}</strong> (≈ {Math.round(Math.max(0, liveNum - curReading.value) * meter.tariffRate * 100) / 100} {currencySymbol})
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Блок стоимости и кнопка отправки / подтверждения */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-[#8C867D] block">Начисление по тарифу:</span>
                      <strong className="text-sm font-bold text-[#1F1E1C]">
                        {curReading?.cost ? `${curReading.cost.toLocaleString('ru-RU')} ${currencySymbol}` : `0 ${currencySymbol}`}
                      </strong>
                    </div>

                    {curReading ? (
                      <button
                        type="button"
                        onClick={() => toggleReadingSubmitted(meter.id, curReading.id)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          curReading.submitted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-emerald-50'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{curReading.submitted ? 'Передано в УК' : 'Отметить переданным'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-lg">
                        Ожидает ввода за {formatMonthTitle(selectedMonth)}
                      </span>
                    )}
                  </div>

                  {/* Инпут быстрого обновления показания */}
                  <div className="pt-2 border-t border-[#F0ECE1] space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        step="any"
                        placeholder={`Новое показание (${meter.unit})...`}
                        value={readingInputs[meter.id] || ''}
                        onChange={(e) =>
                          setReadingInputs({ ...readingInputs, [meter.id]: e.target.value })
                        }
                        className="flex-1 px-3 py-2 text-xs bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
                      />
                      {curReading ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveReading(meter.id, selectedMonth)}
                            className="px-3 py-2 bg-[#FAF7F2] hover:bg-[#EFEAE0] text-[#1F1E1C] border border-[#DDD7CB] text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                            title={`Обновить показание за ${formatMonthTitle(selectedMonth)} (база останется ${prevVal})`}
                          >
                            Обновить
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveToNextMonth(meter.id)}
                            className="px-3.5 py-2 bg-[#E15A42] hover:bg-[#D04E37] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center space-x-1"
                            title={`Записать в следующий месяц (${formatMonthTitle(shiftMonthStr(selectedMonth, 1))}). Базой станет ${curReading.value}!`}
                          >
                            <span>В след. месяц</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSaveReading(meter.id, selectedMonth)}
                          className="px-3.5 py-2 bg-[#E15A42] hover:bg-[#D04E37] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          Записать
                        </button>
                      )}
                    </div>
                    {curReading && (
                      <div className="flex items-center justify-between text-[11px] text-[#7A746B] px-1">
                        <span>За {formatMonthTitle(selectedMonth)} зафиксировано: <strong>{curReading.value} {meter.unit}</strong></span>
                        <span className="text-[#E15A42] font-semibold text-[10px]">
                          Кнопка «В след. месяц» сделает {curReading.value} базой
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ВКЛАДКА 2: ГРАФИКИ И АНАЛИТИКА ПОТРЕБЛЕНИЯ */}
      {selectedTab === 'analytics' && (
        <div className="space-y-6">
          {/* График общей суммы коммунальных расходов по месяцам */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D4] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-[#1F1E1C]">
                  Динамика расходов на ресурсы ({currencySymbol} в месяц)
                </h4>
                <p className="text-xs text-[#8C867D]">
                  Суммарная стоимость воды, электроэнергии и тепла за последние полгода
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-[#8C867D]">
                <span className="w-3 h-3 rounded-full bg-[#E15A42]" />
                <span>Итоговая сумма по тарифам</span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E15A42" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#E15A42" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE1" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C867D' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8C867D' }} unit={` ${currencySymbol}`} />
                  <Tooltip
                    formatter={(val: any) => [`${val.toLocaleString('ru-RU')} ${currencySymbol}`, 'Начислено']}
                    contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '1rem', border: '1px solid #E5DFD3' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalCost"
                    stroke="#E15A42"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#costGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* График потребления воды (Холодная vs Горячая в м³) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-6 border border-[#E8E2D4] shadow-xs space-y-4">
              <div className="flex items-center space-x-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-sm text-[#1F1E1C]">Потребление воды (м³ / месяц)</h4>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE1" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C867D' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8C867D' }} unit=" м³" />
                    <Tooltip contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '1rem', border: '1px solid #E5DFD3' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="meter-water-cold" name="Холодная вода" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="meter-water-hot" name="Горячая вода" fill="#EF4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* График потребления электроэнергии (День vs Ночь в кВт⋅ч) */}
            <div className="bg-white rounded-3xl p-6 border border-[#E8E2D4] shadow-xs space-y-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-sm text-[#1F1E1C]">Электроэнергия Т1 / Т2 (кВт⋅ч)</h4>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE1" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8C867D' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8C867D' }} unit=" кВт" />
                    <Tooltip contentStyle={{ backgroundColor: '#FAF7F2', borderRadius: '1rem', border: '1px solid #E5DFD3' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="meter-elec-day" name="День (Т1)" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="meter-elec-night" name="Ночь (Т2)" fill="#6366F1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ВКЛАДКА 3: МОИ СЧЁТЧИКИ, ТАРИФЫ И ИСТОРИЯ */}
      {selectedTab === 'meters' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meters.map((meter) => {
              const iconCfg = METER_ICONS[meter.type] || METER_ICONS.cold_water;
              const Icon = iconCfg.icon;

              return (
                <div
                  key={meter.id}
                  className="bg-white rounded-3xl p-5 border border-[#E8E2D4] shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${iconCfg.bg}`}>
                        <Icon className={`w-5 h-5 ${iconCfg.color}`} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#1F1E1C]">{meter.name}</h4>
                        <span className="text-[11px] text-[#8C867D]">{meter.serialNumber || 'Без номера'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMeter(meter);
                          setIsAddMeterModalOpen(true);
                        }}
                        className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMeter(meter.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#5C564B] bg-[#FAF7F2] p-3 rounded-2xl border border-[#EFECE4]">
                    <div>
                      <span className="text-[#8C867D] block text-[10px]">Тариф:</span>
                      <strong className="text-[#1F1E1C]">
                        {meter.tariffRate} {currencySymbol} / {meter.unit}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8C867D] block text-[10px]">Дата поверки:</span>
                      <strong className="text-[#1F1E1C]">
                        {meter.verificationDate
                          ? new Date(meter.verificationDate).toLocaleDateString('ru-RU')
                          : 'Не указана'}
                      </strong>
                    </div>
                  </div>

                  {/* История последних 4 показаний */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#8C867D] uppercase">
                        История записей ({meter.readings.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setHistoryMeter(meter)}
                        className="text-[11px] text-[#E15A42] hover:underline font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <History className="w-3 h-3" />
                        <span>Полный журнал</span>
                      </button>
                    </div>

                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {meter.readings.slice(-4).reverse().map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-stone-50 text-xs text-[#4A453C]"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold">{r.month}:</span>
                            <span>{r.value} {meter.unit}</span>
                            <span className="text-[11px] text-[#E15A42] font-medium">
                              (+{r.difference})
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#1F1E1C]">{r.cost || 0} {currencySymbol}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                r.submitted ? 'bg-emerald-500' : 'bg-amber-400'
                              }`}
                              title={r.submitted ? 'Передано' : 'Не передано'}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Модальное окно добавления/редактирования счётчика */}
      {isAddMeterModalOpen && (
        <MeterModal
          isOpen={isAddMeterModalOpen}
          meter={editingMeter}
          currencySymbol={currencySymbol}
          onClose={() => setIsAddMeterModalOpen(false)}
          onSave={(data) => {
            if (editingMeter) {
              updateMeter(editingMeter.id, data);
            } else {
              addMeter(data);
            }
            setIsAddMeterModalOpen(false);
          }}
        />
      )}

      {/* Модальное окно журнала истории и цепочки показаний */}
      {historyMeter && (
        <MeterHistoryModal
          isOpen={!!historyMeter}
          meter={meters.find((m) => m.id === historyMeter.id) || historyMeter}
          currencySymbol={currencySymbol}
          onClose={() => setHistoryMeter(null)}
          onDeleteReading={(readingId) => deleteMeterReading(historyMeter.id, readingId)}
          onUpdateReading={(readingId, updates) => updateMeterReading(historyMeter.id, readingId, updates)}
          onToggleSubmitted={(readingId) => toggleReadingSubmitted(historyMeter.id, readingId)}
          onAddReading={(val, dateStr, notes) => addMeterReading(historyMeter.id, val, dateStr, notes)}
          onClearReadings={() => clearMeterReadings(historyMeter.id)}
        />
      )}

      {/* Модальное окно с пояснением: как устроена база показаний */}
      {showBaselineHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-[#F0ECE1]">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F1E1C]">Как устроена база показаний?</h3>
                  <p className="text-xs text-[#8C867D]">Почему «Прошлое (база)» остаётся прежним</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBaselineHelp(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#5C564B] leading-relaxed">
              <div className="p-3 bg-[#FAF8F3] rounded-2xl border border-[#EDE7DB] space-y-1.5">
                <span className="font-bold text-[#1F1E1C] block">1. База привязана к расчётному месяцу:</span>
                <p>
                  Каждый месяц имеет <strong>одно итоговое показание</strong>. Базой для Октября является показание за <em>Сентябрь</em> (186). Поэтому, пока вы находитесь во вкладке Октября, база всегда будет 186.
                </p>
              </div>

              <div className="p-3 bg-[#FAF8F3] rounded-2xl border border-[#EDE7DB] space-y-1.5">
                <span className="font-bold text-[#1F1E1C] block">2. Ввод нового значения в том же месяце:</span>
                <p>
                  Когда вы ввели 200, Октябрь стал равен 200 (расход 200 − 186 = 14). Если затем в том же Октябре ввести 203 и нажать «Обновить», вы просто заменяете число 200 на 203 (расход станет 203 − 186 = 17).
                </p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 space-y-1.5">
                <span className="font-bold text-emerald-900 block">3. Как получить расход 3 (203 − 200)?</span>
                <p>
                  Чтобы 200 стало «прошлой базой», новое показание 203 должно быть записано за <strong>следующий расчётный месяц (Ноябрь)</strong>.
                </p>
                <p className="font-semibold text-emerald-800">
                  Для этого используйте кнопку <em>«В след. месяц →»</em> прямо рядом с полем ввода!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBaselineHelp(false)}
              className="w-full py-2.5 rounded-xl bg-[#1F1E1C] hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              Понятно, спасибо!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ СЧЁТЧИКА
// ==========================================

interface MeterModalProps {
  isOpen: boolean;
  meter: UtilityMeter | null;
  currencySymbol?: string;
  onClose: () => void;
  onSave: (data: Omit<UtilityMeter, 'id' | 'readings'>) => void;
}

const MeterModal: React.FC<MeterModalProps> = ({ isOpen, meter, currencySymbol = '₽', onClose, onSave }) => {
  const [name, setName] = useState(meter?.name || '');
  const [type, setType] = useState<UtilityMeterType>(meter?.type || 'cold_water');
  const [serialNumber, setSerialNumber] = useState(meter?.serialNumber || '');
  const [location, setLocation] = useState(meter?.location || 'Санузел');
  const [unit, setUnit] = useState(meter?.unit || 'м³');
  const [tariffRate, setTariffRate] = useState(meter?.tariffRate ? String(meter.tariffRate) : '50.93');
  const [verificationDate, setVerificationDate] = useState(meter?.verificationDate || '2028-12-31');
  const [initialValue, setInitialValue] = useState(meter?.initialValue ? String(meter.initialValue) : '0');

  // Синхронизация состояния полей при открытии или смене счётчика
  useEffect(() => {
    if (isOpen) {
      if (meter) {
        setName(meter.name || '');
        setType(meter.type || 'cold_water');
        setSerialNumber(meter.serialNumber || '');
        setLocation(meter.location || 'Санузел');
        setUnit(meter.unit || 'м³');
        setTariffRate(meter.tariffRate ? String(meter.tariffRate) : '50.93');
        setVerificationDate(meter.verificationDate || '2028-12-31');
        setInitialValue(meter.initialValue ? String(meter.initialValue) : '0');
      } else {
        setName('');
        setType('cold_water');
        setSerialNumber('');
        setLocation('Санузел');
        setUnit('м³');
        setTariffRate('50.93');
        setVerificationDate('2028-12-31');
        setInitialValue('0');
      }
    }
  }, [isOpen, meter]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      type,
      serialNumber: serialNumber.trim() || undefined,
      location: location.trim() || undefined,
      unit: unit.trim() || 'м³',
      tariffRate: parseFloat(tariffRate) || 0,
      verificationDate: verificationDate || undefined,
      initialValue: parseFloat(initialValue) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full border border-[#E5DFD3] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D4]">
          <div className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-[#E15A42]" />
            <h3 className="font-bold text-base text-[#1F1E1C]">
              {meter ? 'Редактировать счётчик' : 'Добавить счётчик ресурса'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#EDE8DC] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-[#1F1E1C]">Название счётчика</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Холодная вода (Санузел)..."
              className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Тип ресурса</label>
              <select
                value={type}
                onChange={(e) => {
                  const t = e.target.value as UtilityMeterType;
                  setType(t);
                  if (t.includes('water')) setUnit('м³');
                  else if (t.includes('elec')) setUnit('кВт⋅ч');
                  else if (t === 'heating') setUnit('Гкал');
                  else if (t === 'gas') setUnit('м³');
                }}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              >
                {Object.entries(METER_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Единица измерения</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Тариф ({currencySymbol} за {unit || 'ед.'})</label>
              <input
                type="number"
                step="any"
                required
                value={tariffRate}
                onChange={(e) => setTariffRate(e.target.value)}
                placeholder={currencySymbol === '€' ? '1.45' : '50.93'}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
              <p className="text-[10px] text-[#8C867D]">Ставка из квитанции за 1 {unit}</p>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Заводской номер</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="№ 1234567"
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Дата очередной поверки</label>
              <input
                type="date"
                value={verificationDate}
                onChange={(e) => setVerificationDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Расположение</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Сантехнический шкаф, Кухня..."
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-3 border-t border-[#E8E2D4]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#DDD7CB] hover:bg-[#F2ECE1] text-[#5C564B] font-semibold transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#E15A42] hover:bg-[#D04E37] text-white font-bold transition-all shadow-xs cursor-pointer"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// МОДАЛЬНОЕ ОКНО ЖУРНАЛА И ИСТОРИИ ПОКАЗАНИЙ
// ==========================================

interface MeterHistoryModalProps {
  isOpen: boolean;
  meter: UtilityMeter;
  currencySymbol: string;
  onClose: () => void;
  onDeleteReading: (readingId: string) => void;
  onUpdateReading: (readingId: string, updates: Partial<UtilityReading>) => void;
  onToggleSubmitted: (readingId: string) => void;
  onAddReading: (val: number, dateStr?: string, notes?: string) => void;
  onClearReadings?: () => void;
}

const MeterHistoryModal: React.FC<MeterHistoryModalProps> = ({
  isOpen,
  meter,
  currencySymbol,
  onClose,
  onDeleteReading,
  onUpdateReading,
  onToggleSubmitted,
  onAddReading,
  onClearReadings,
}) => {
  const [editingReadingId, setEditingReadingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [newReadingDate, setNewReadingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newReadingVal, setNewReadingVal] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  if (!isOpen) return null;

  // Сортировка записей от новых к старым для удобного просмотра журнала
  const sorted = [...meter.readings].sort((a, b) => b.date.localeCompare(a.date));

  const startEdit = (reading: UtilityReading) => {
    setEditingReadingId(reading.id);
    setEditValue(String(reading.value));
  };

  const handleSaveEdit = (readingId: string) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) return;
    onUpdateReading(readingId, { value: val });
    setEditingReadingId(null);
  };

  const handleCreateReading = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newReadingVal);
    if (isNaN(val) || val < 0) return;
    onAddReading(val, newReadingDate);
    setNewReadingVal('');
    setIsAddingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-2xl w-full border border-[#E5DFD3] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Заголовок */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E8E2D4] shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-[#E15A42]" />
              <h3 className="font-bold text-base text-[#1F1E1C]">Журнал и история показаний</h3>
            </div>
            <p className="text-xs text-[#7A746B] mt-0.5">
              {meter.name} • {meter.serialNumber || 'Без номера'} • Тариф: {meter.tariffRate} {currencySymbol}/{meter.unit}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#EDE8DC] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Подсказка о цепочке перерасчёта */}
        <div className="bg-[#F0ECE1] rounded-2xl p-3 text-xs text-[#5C564B] flex items-center justify-between gap-3 shrink-0">
          <span>
            💡 <strong>Автоматическая цепочка:</strong> Расход вычисляется как <em>(Текущее − Предыдущее)</em>. Любое изменение показания мгновенно и корректно пересчитывает расход во всех последующих периодах.
          </span>
          <button
            type="button"
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="px-3 py-1.5 bg-[#E15A42] hover:bg-[#D04E37] text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-2xs transition-colors"
          >
            {isAddingNew ? 'Отмена' : '+ Внести запись'}
          </button>
        </div>

        {/* Форма добавления нового архивного или текущего показания */}
        {isAddingNew && (
          <form onSubmit={handleCreateReading} className="bg-white p-3.5 rounded-2xl border border-[#DDD7CB] space-y-3 shrink-0 shadow-xs">
            <span className="font-bold text-xs text-[#1F1E1C] block">Добавление показания в расчётную цепочку</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#6B655B] block mb-1">Дата фиксации</label>
                <input
                  type="date"
                  required
                  value={newReadingDate}
                  onChange={(e) => setNewReadingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B655B] block mb-1">Показание счётчика ({meter.unit})</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={`Например, 200`}
                  value={newReadingVal}
                  onChange={(e) => setNewReadingVal(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 rounded-xl border border-[#DDD7CB] text-[#5C564B] text-xs font-semibold cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#E15A42] hover:bg-[#D04E37] text-white text-xs font-bold cursor-pointer shadow-2xs"
              >
                Сохранить в журнал
              </button>
            </div>
          </form>
        )}

        {/* Список записей */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#8C867D]">
              В журнале пока нет сохранённых показаний.
            </div>
          ) : (
            sorted.map((r) => {
              const isEditing = editingReadingId === r.id;
              const prev = r.previousValue !== undefined ? r.previousValue : meter.initialValue;

              return (
                <div
                  key={r.id}
                  className="bg-white p-3.5 rounded-2xl border border-[#E8E2D4] shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-[#1F1E1C]">
                        {r.month}
                      </span>
                      <span className="text-[11px] text-[#8C867D]">
                        ({new Date(r.date).toLocaleDateString('ru-RU')})
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleSubmitted(r.id)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center space-x-1 cursor-pointer transition-colors ${
                          r.submitted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{r.submitted ? 'Передано' : 'Не передано'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="p-1.5 text-stone-500 hover:text-[#E15A42] hover:bg-stone-100 rounded-lg cursor-pointer"
                        title="Редактировать показание"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteReading(r.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Удалить запись"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center space-x-2 pt-1 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E15A42]/30">
                      <div className="flex-1">
                        <label className="text-[10px] text-[#8C867D] block mb-0.5">Исправить показание ({meter.unit}):</label>
                        <input
                          type="number"
                          step="any"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#E15A42] rounded-xl focus:outline-none font-bold"
                        />
                      </div>
                      <div className="flex items-end space-x-1.5 pt-4">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(r.id)}
                          className="px-3.5 py-1.5 bg-[#E15A42] hover:bg-[#D04E37] text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReadingId(null)}
                          className="px-2.5 py-1.5 border border-[#DDD7CB] text-[#5C564B] text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EDE7DB]">
                      <div>
                        <span className="text-[10px] text-[#8C867D] block">Прошлое (база)</span>
                        <span className="font-semibold text-[#4A453C]">{prev} {meter.unit}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8C867D] block">Показание</span>
                        <span className="font-black text-[#1F1E1C]">{r.value} {meter.unit}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8C867D] block">Расход</span>
                        <span className="font-bold text-[#E15A42]">+{r.difference} {meter.unit}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8C867D] block">Начислено</span>
                        <span className="font-bold text-[#1F1E1C]">{r.cost || 0} {currencySymbol}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-[#8C867D] flex items-center space-x-1">
                    <Calculator className="w-3 h-3 text-stone-400 shrink-0" />
                    <span>
                      Формула: <strong>{r.value}</strong> − <strong>{prev}</strong> = <strong className="text-[#E15A42]">+{r.difference} {meter.unit}</strong> × {meter.tariffRate} {currencySymbol} = <strong>{r.cost || 0} {currencySymbol}</strong>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Футер */}
        <div className="pt-2 border-t border-[#E8E2D4] flex items-center justify-between text-xs text-[#8C867D] shrink-0">
          <div className="flex items-center space-x-3">
            <span>Всего записей в цепочке: {meter.readings.length}</span>
            {onClearReadings && meter.readings.length > 0 && !showClearConfirm && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1 cursor-pointer hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистить историю</span>
              </button>
            )}
            {showClearConfirm && (
              <div className="flex items-center space-x-2 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                <span className="text-[11px] text-rose-800 font-medium">Очистить все замеры?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearReadings?.();
                    setShowClearConfirm(false);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                >
                  Да, очистить
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-0.5 rounded-lg text-stone-500 hover:bg-stone-100 text-[11px] cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1F1E1C] hover:bg-black text-white font-bold transition-all cursor-pointer shadow-xs"
          >
            Закрыть журнал
          </button>
        </div>
      </div>
    </div>
  );
};
