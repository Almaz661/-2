import React, { useState, useRef } from 'react';
import {
  Camera,
  Search,
  Calendar,
  Store,
  DollarSign,
  TrendingUp,
  Filter,
  Plus,
  Trash2,
  Eye,
  ShoppingCart,
  Sparkles,
  FileText,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Upload,
  Loader2,
  Coins,
  X,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { ScannedReceipt, ShoppingCategory } from '../../types';
import { ReceiptScannerModal } from './ReceiptScannerModal';
import { ReceiptReviewModal } from './ReceiptReviewModal';
import { ReceiptDetailModal } from './ReceiptDetailModal';
import { CategoryDistributionWidget } from './CategoryDistributionWidget';
import { ReceiptsMonthlyExpensesChart } from './ReceiptsMonthlyExpensesChart';
import {
  calculateReceiptsCategoryBreakdown,
  calculateCategoryBreakdown,
  CATEGORY_METADATA,
} from '../../utils/categoryMetadata';
import { parseReceiptWithGemini } from '../../services/geminiReceiptService';
import {
  SUPPORTED_CURRENCIES,
  formatCurrencyLabel,
  getCurrencySymbol,
} from '../../utils/currencyConstants';

export const ReceiptsView: React.FC = () => {
  const {
    receipts,
    saveReceipt,
    deleteReceipt,
    clearAllReceipts,
    loadSampleReceipts,
    importReceiptItemsToShopping,
    showToast,
  } = useHousehold();

  // Состояния модалок
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState<ScannedReceipt | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<ScannedReceipt | null>(null);

  // Подтверждения удаления
  const [receiptToDelete, setReceiptToDelete] = useState<ScannedReceipt | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);

  // Gemini AI обработка загрузки
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStatusText, setAiStatusText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<ShoppingCategory | 'all'>('all');

  // Уникальные магазины и валюты
  const uniqueStores = Array.from(
    new Set(receipts.map((r) => r.storeName).filter(Boolean))
  ) as string[];
  const uniqueCurrencies = Array.from(
    new Set(receipts.map((r) => r.currency).filter(Boolean))
  ) as string[];

  // Фильтрованный список чеков
  const filteredReceipts = receipts.filter((r) => {
    if (storeFilter !== 'all' && r.storeName !== storeFilter) return false;
    if (currencyFilter !== 'all' && r.currency !== currencyFilter) return false;
    if (categoryFilter !== 'all') {
      const hasCategory = r.items.some((it) => (it.category || 'other') === categoryFilter);
      if (!hasCategory) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchStore = r.storeName?.toLowerCase().includes(q);
      const matchItem = r.items.some(
        (it) =>
          it.normalizedTitle.toLowerCase().includes(q) ||
          it.originalText.toLowerCase().includes(q)
      );
      if (!matchStore && !matchItem) return false;
    }
    return true;
  });

  // Суммарное распределение расходов по категориям для домохозяйства
  const { breakdown: overallCategoryBreakdown, totalSpent: categoryTotalSpent } =
    calculateReceiptsCategoryBreakdown(receipts, currencyFilter);

  // Подсчет суммы по валютам
  const relevantReceiptsForTotals =
    currencyFilter === 'all'
      ? receipts
      : receipts.filter((r) => (r.currency || 'EUR') === currencyFilter);

  const totalsByCurrency: Record<string, number> = {};
  relevantReceiptsForTotals.forEach((r) => {
    const curr = r.currency || 'EUR';
    totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + (r.totalAmount || 0);
  });

  // Обработка результата сканирования -> открываем экран проверки
  const handleReceiptParsed = (parsed: ScannedReceipt) => {
    setPendingReceipt(parsed);
    setIsReviewOpen(true);
  };

  // Сохранение проверенного чека
  const handleSaveToHistory = (verified: ScannedReceipt) => {
    saveReceipt(verified);
    setPendingReceipt(null);
  };

  // Прямая загрузка живого чека с вызовом Gemini API
  const handleDirectReceiptUpload = async (file: File) => {
    if (!file) return;
    setIsAiProcessing(true);
    setAiStatusText('Загрузка и оптимизация изображения чека...');

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      const parsed = await parseReceiptWithGemini(
        dataUrl,
        undefined,
        undefined,
        (p) => setAiStatusText(p.status)
      );

      setPendingReceipt(parsed);
      setIsReviewOpen(true);
      showToast(
        `Распознано: ${parsed.items.length} товаров на сумму ${parsed.totalAmount.toFixed(2)} ${parsed.currency}`,
        'success'
      );
    } catch (err: any) {
      console.error('Ошибка разбора чека:', err);
      showToast('Не удалось разобрать чек: ' + (err?.message || 'ошибка сети'), 'error');
    } finally {
      setIsAiProcessing(false);
      setAiStatusText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleDirectReceiptUpload(e.target.files[0]);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Скрытый input для выбора файлов */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      {/* Прямой доступ к камере мобильного устройства */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Оверлей загрузки Gemini AI */}
      {isAiProcessing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-orange-200 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#E15A42] to-[#F28C38] flex items-center justify-center text-white mx-auto shadow-lg shadow-orange-500/30 animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-[#1F1E1C]">
                Gemini AI анализирует живой чек
              </h3>
              <p className="text-xs text-[#7A746B]">
                {aiStatusText || 'Автоматическая категоризация на продукты, бытовую химию и прочее...'}
              </p>
            </div>
            <div className="w-full bg-[#EBE7DF] h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#E15A42] to-[#F28C38] h-full w-2/3 animate-pulse" />
            </div>
            <span className="text-[11px] text-[#8C867D] block">
              Без жестких шаблонов • Точное распознавание позиций и цен
            </span>
          </div>
        </div>
      )}

      {/* Главный промо-баннер с кнопкой «Сканировать чек» */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1C1A] via-[#2D2825] to-[#1C1816] text-white p-6 md:p-8 shadow-xl border border-[#3D3733]">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold text-orange-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Интеллектуальный разбор Gemini API • Без жестких шаблонов</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Сканер кассовых чеков
            </h1>
            <p className="text-xs md:text-sm text-[#D4CFC7] leading-relaxed">
              Загружайте реальные фото чеков с камеры или галереи. Gemini API автоматически извлекает все товары, сверяет суммы и распределяет позиции по категориям: продукты, бытовая химия, выпечка, напитки и прочее.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAiProcessing}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#E15A42] to-[#F28C38] hover:from-[#D14B33] hover:to-[#E07925] text-white font-bold text-sm shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2.5 transition-all transform active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-5 h-5" />
              <span>Загрузить фото чека</span>
            </button>
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              disabled={isAiProcessing}
              className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Camera className="w-5 h-5 text-orange-200" />
              <span>Камера</span>
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isAiProcessing}
              className="hidden sm:flex px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/15 text-orange-200 font-semibold text-xs border border-white/10 items-center justify-center space-x-1.5 transition-all cursor-pointer"
              title="Быстрый снимок чека камерой телефона или планшета"
            >
              <span>Быстрый снимок</span>
            </button>
          </div>
        </div>

        {/* Фоновые декоративные элементы */}
        <div className="absolute -right-12 -bottom-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Зона загрузки живого чека Drag & Drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleDirectReceiptUpload(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-[#E15A42] bg-orange-50/80 scale-[1.01]'
            : 'border-[#DDD8CD] bg-white hover:border-[#E15A42] hover:bg-[#FAF9F5]'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
          <div className="flex items-center space-x-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#E15A42] flex items-center justify-center shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#1F1E1C]">
                Перетащите фото реального чека сюда или нажмите для выбора
              </h4>
              <p className="text-xs text-[#8C867D] mt-0.5">
                Gemini API автоматически распознает все строки, цены и категоризирует покупки без шаблонов
              </p>
            </div>
          </div>
          <span className="px-4 py-2 rounded-xl bg-orange-50 text-[#E15A42] text-xs font-bold shrink-0 border border-orange-200">
            Выбрать файл
          </span>
        </div>
      </div>

      {/* Статистика расходов и истории */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E4DA] shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#E15A42] flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#8C867D] font-medium">Отсканировано чеков</span>
            <div className="text-2xl font-bold text-[#1F1E1C]">{receipts.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E4DA] shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#8C867D] font-medium">Сумма покупок</span>
            <div className="text-xl font-bold text-[#1F1E1C] truncate">
              {Object.entries(totalsByCurrency).length > 0
                ? Object.entries(totalsByCurrency)
                    .map(([c, val]) => `${val.toFixed(2)} ${c}`)
                    .join(' / ')
                : '0.00 €'}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E4DA] shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#8C867D] font-medium">Магазинов в базе</span>
            <div className="text-2xl font-bold text-[#1F1E1C]">{uniqueStores.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E4DA] shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-[#8C867D] font-medium">Распознано товаров</span>
            <div className="text-2xl font-bold text-[#1F1E1C]">
              {receipts.reduce((acc, r) => acc + (r.items?.length || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Интерактивная визуализация расходов Recharts по категориям за текущий месяц */}
      <ReceiptsMonthlyExpensesChart
        receipts={
          currencyFilter === 'all'
            ? receipts
            : receipts.filter((r) => (r.currency || 'EUR') === currencyFilter)
        }
        selectedCategory={categoryFilter}
        onSelectCategory={setCategoryFilter}
        currency={
          currencyFilter !== 'all'
            ? currencyFilter
            : uniqueCurrencies[0] || 'EUR'
        }
        onLoadSamples={loadSampleReceipts}
      />

      {/* Панель поиска и фильтрации */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E4DA] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Поиск */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8C867D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по магазину или товарам..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF9F5] border border-[#DDD8CD] rounded-xl focus:outline-none focus:border-[#E15A42]"
          />
        </div>

        {/* Фильтры по категории, магазину и валюте */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Фильтр по категории */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="text-xs bg-[#FAF9F5] border border-[#DDD8CD] rounded-xl px-3 py-2 text-[#3D3A36] focus:outline-none font-medium"
          >
            <option value="all">Все категории ({receipts.length})</option>
            {Object.entries(CATEGORY_METADATA).map(([catKey, meta]) => (
              <option key={catKey} value={catKey}>
                {meta.icon} {meta.shortLabel}
              </option>
            ))}
          </select>

          {uniqueStores.length > 0 && (
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="text-xs bg-[#FAF9F5] border border-[#DDD8CD] rounded-xl px-3 py-2 text-[#3D3A36] focus:outline-none"
            >
              <option value="all">Все магазины</option>
              {uniqueStores.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          )}

          {/* Переключатель / фильтр валюты с поддержкой всех мировых валют */}
          <div className="flex items-center space-x-1">
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className={`text-xs rounded-xl px-3 py-2 focus:outline-none font-medium border transition-colors ${
                currencyFilter !== 'all'
                  ? 'bg-orange-50 border-[#E15A42] text-[#E15A42] font-semibold'
                  : 'bg-[#FAF9F5] border-[#DDD8CD] text-[#3D3A36]'
              }`}
              title="Переключатель валюты для фильтрации чеков и аналитики"
            >
              <option value="all">
                Все валюты {receipts.length > 0 ? `(${receipts.length})` : ''}
              </option>

              {uniqueCurrencies.length > 0 && (
                <optgroup label="Валюты из ваших чеков">
                  {uniqueCurrencies.map((c) => {
                    const count = receipts.filter((r) => (r.currency || 'EUR') === c).length;
                    return (
                      <option key={c} value={c}>
                        {formatCurrencyLabel(c)} — {count} {count === 1 ? 'чек' : count < 5 ? 'чека' : 'чеков'}
                      </option>
                    );
                  })}
                </optgroup>
              )}

              <optgroup label="Все мировые валюты">
                {SUPPORTED_CURRENCIES.filter(
                  (c) => !uniqueCurrencies.includes(c.code)
                ).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} (0 чеков)
                  </option>
                ))}
              </optgroup>
            </select>

            {currencyFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setCurrencyFilter('all')}
                className="p-1.5 text-xs text-[#8C867D] hover:text-[#E15A42] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                title="Сбросить фильтр валюты (показать все)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {receipts.length > 0 && (
            <button
              type="button"
              onClick={() => setIsConfirmingClearAll(true)}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/90 rounded-xl px-3 py-2 font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Удалить все сохраненные чеки"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Очистить все чеки ({receipts.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Список сохраненных чеков */}
      {filteredReceipts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E4DA] p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#FAF9F5] text-[#8C867D] flex items-center justify-center mx-auto border border-[#EBE7DF]">
            <Camera className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#1F1E1C]">
              {receipts.length === 0
                ? 'История чеков пока пуста'
                : currencyFilter !== 'all' && receipts.every((r) => (r.currency || 'EUR') !== currencyFilter)
                ? `Чеков в валюте ${formatCurrencyLabel(currencyFilter)} пока нет`
                : 'По выбранным фильтрам ничего не найдено'}
            </h3>
            <p className="text-xs text-[#7A746B] max-w-sm mx-auto">
              {receipts.length === 0
                ? 'Загрузите фото чека или сделайте снимок на камеру — Gemini AI автоматически извлечет товары и распределит их по категориям.'
                : currencyFilter !== 'all' && receipts.every((r) => (r.currency || 'EUR') !== currencyFilter)
                ? 'Все ваши сохраненные чеки находятся в других валютах. Нажмите кнопку ниже, чтобы сбросить фильтр валюты.'
                : 'Попробуйте сбросить фильтры или изменить поисковый запрос.'}
            </p>
          </div>
          {receipts.length === 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#E15A42] hover:bg-[#D04A33] text-white text-xs font-bold inline-flex items-center space-x-2 shadow-sm transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Сканировать первый чек</span>
              </button>
              <button
                type="button"
                onClick={loadSampleReceipts}
                className="px-4 py-2.5 rounded-xl bg-[#FAF9F5] hover:bg-orange-50 text-[#E15A42] border border-[#DDD8CD] hover:border-orange-300 text-xs font-bold inline-flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#E15A42]" />
                <span>Загрузить примеры чеков для графиков</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCurrencyFilter('all');
                  setCategoryFilter('all');
                  setStoreFilter('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#E15A42] text-xs font-bold inline-flex items-center space-x-1.5 border border-orange-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Сбросить все фильтры</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReceipts.map((receipt) => {
            const hasDiscrepancy =
              receipt.matchedSumDiff !== undefined && receipt.matchedSumDiff > 0.1;
            const receiptBreakdown = calculateCategoryBreakdown(receipt.items, receipt.totalAmount);

            return (
              <div
                key={receipt.id}
                onClick={() => setSelectedReceiptDetail(receipt)}
                className="bg-white rounded-2xl border border-[#E8E4DA] hover:border-[#D5D0C5] hover:shadow-md p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div>
                  {/* Верхняя строка карточки */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2.5">
                      {receipt.images && receipt.images.length > 0 && receipt.images[0] ? (
                        <div className="w-10 h-12 rounded-lg bg-[#181716] overflow-hidden border border-[#DDD8CD] shrink-0 shadow-2xs group-hover:border-[#E15A42] transition-colors">
                          <img
                            src={receipt.images[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#E15A42] flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-[#1F1E1C] group-hover:text-[#E15A42] transition-colors truncate max-w-[150px]">
                          {receipt.storeName || 'Покупки'}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-[11px] text-[#8C867D]">
                          <span>{receipt.date}</span>
                          {receipt.time && <span>• {receipt.time}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-[#1F1E1C]">
                        {receipt.totalAmount.toFixed(2)} {receipt.currency}
                      </div>
                      <span className="text-[10px] text-[#8C867D] block">
                        {receipt.items.length} поз.
                      </span>
                    </div>
                  </div>

                  {/* Превью товаров из чека */}
                  <div className="bg-[#FAF9F5] rounded-xl p-2.5 border border-[#EBE7DF] space-y-1 text-xs">
                    {receipt.items.slice(0, 3).map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] text-[#555047]"
                      >
                        <span className="truncate pr-2 font-medium">
                          • {it.normalizedTitle || it.originalText}
                        </span>
                        <span className="shrink-0 font-semibold text-[#1F1E1C]">
                          {it.totalPrice.toFixed(2)} {receipt.currency}
                        </span>
                      </div>
                    ))}
                    {receipt.items.length > 3 && (
                      <div className="text-[10px] text-[#8C867D] pt-0.5">
                        Еще +{receipt.items.length - 3} поз...
                      </div>
                    )}
                  </div>

                  {/* Распределение по категориям данного чека */}
                  {receiptBreakdown.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-[10px] text-[#7A746B]">
                        <span className="font-semibold uppercase tracking-wider">Категории покупок:</span>
                        <span>{receiptBreakdown.length} {receiptBreakdown.length === 1 ? 'кат.' : 'категории'}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#EBE7DF] overflow-hidden flex shadow-2xs">
                        {receiptBreakdown.map((b) => (
                          <div
                            key={b.category}
                            style={{ width: `${Math.max(b.percentage, 4)}%`, backgroundColor: b.meta.color }}
                            className="h-full transition-all"
                            title={`${b.meta.label}: ${b.totalAmount.toFixed(2)} ${receipt.currency} (${b.percentage}%)`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center flex-wrap gap-1 pt-0.5">
                        {receiptBreakdown.map((b) => (
                          <span
                            key={b.category}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium flex items-center space-x-1 ${b.meta.badgeClass}`}
                          >
                            <span>{b.meta.icon}</span>
                            <span className="font-bold">{b.totalAmount.toFixed(2)} {receipt.currency}</span>
                            <span className="text-[9px] opacity-75 font-normal">({b.percentage}%)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Подвал карточки */}
                <div className="flex items-center justify-between pt-2 border-t border-[#F2EFE9] text-xs">
                  <div className="flex items-center space-x-1 flex-wrap gap-1">
                    {hasDiscrepancy ? (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>±{receipt.matchedSumDiff?.toFixed(2)}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Сверено</span>
                      </span>
                    )}
                    {receipt.images && receipt.images.length > 0 && (
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 flex items-center space-x-1">
                        <Camera className="w-2.5 h-2.5 text-blue-600" />
                        <span>Фото</span>
                      </span>
                    )}
                    <span className="text-[10px] text-[#8C867D] uppercase font-mono px-1">
                      {receipt.language}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        importReceiptItemsToShopping(receipt.items);
                      }}
                      className="p-1.5 text-[#7A746B] hover:text-[#E15A42] hover:bg-[#FFF5F2] rounded-lg transition-colors"
                      title="Экспорт в список покупок"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReceiptToDelete(receipt);
                      }}
                      className="p-1.5 text-[#7A746B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Удалить чек"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно захвата / сканирования чека */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onReceiptParsed={handleReceiptParsed}
      />

      {/* Экран проверки результатов до сохранения */}
      <ReceiptReviewModal
        receipt={pendingReceipt}
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setPendingReceipt(null);
        }}
        onSaveToHistory={handleSaveToHistory}
        onBackToScanner={() => {
          setIsReviewOpen(false);
          setIsScannerOpen(true);
        }}
      />

      {/* Модальное окно просмотра сохраненного чека из истории */}
      <ReceiptDetailModal
        receipt={selectedReceiptDetail}
        isOpen={!!selectedReceiptDetail}
        onClose={() => setSelectedReceiptDetail(null)}
        onDelete={deleteReceipt}
      />

      {/* Модальное окно подтверждения удаления одного чека */}
      {receiptToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F1E1C]">Удалить чек?</h3>
              <p className="text-xs text-[#7A746B] mt-1">
                Чек «{receiptToDelete.storeName || 'Покупки'}» на сумму {receiptToDelete.totalAmount.toFixed(2)} {receiptToDelete.currency} будет безвозвратно удален из истории.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setReceiptToDelete(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-[#DDD8CD] text-xs font-semibold text-[#5A554D] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteReceipt(receiptToDelete.id);
                  setReceiptToDelete(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Да, удалить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения очистки всей истории чеков */}
      {isConfirmingClearAll && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F1E1C]">Очистить все чеки?</h3>
              <p className="text-xs text-[#7A746B] mt-1">
                Все {receipts.length} сохраненных чеков и прикрепленные к ним фотографии будут удалены. История чеков станет полностью пустой для добавления новых живых чеков.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingClearAll(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-[#DDD8CD] text-xs font-semibold text-[#5A554D] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllReceipts();
                  setIsConfirmingClearAll(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистить всё</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
