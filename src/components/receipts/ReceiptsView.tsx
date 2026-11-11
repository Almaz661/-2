import { ItemSpending } from './ItemSpending';
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
import { Btn, Card, CountUp, PageWrap } from '../ui/mercury';
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

export const ReceiptsView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
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
    <PageWrap className={embedded ? '!p-0 max-w-none' : 'max-w-7xl'}>
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
          <div className="bg-[var(--surface)] rounded-2xl p-8 max-w-md w-full shadow-2xl border border-orange-200 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center text-white mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-[var(--text)]">
                Gemini AI анализирует живой чек
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {aiStatusText || 'Автоматическая категоризация на продукты, бытовую химию и прочее...'}
              </p>
            </div>
            <div className="w-full bg-[var(--line)] h-2 rounded-full overflow-hidden">
              <div className="bg-[var(--accent)] h-full w-2/3" />
            </div>
            <span className="text-[12px] text-[var(--muted)] block">
              Без жестких шаблонов • Точное распознавание позиций и цен
            </span>
          </div>
        </div>
      )}

      {/* Сканирование: перетащите чек на карточку или выберите способ */}
      <Card
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
        className={`p-6 sm:p-8 transition ${isDragging ? 'ring-2 ring-[var(--accent)] bg-[var(--accent-soft)]' : ''}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.03em] leading-tight text-[var(--text)]">
              Сканер чеков
            </h1>
            <p className="mt-2 text-[16px] text-[var(--text-2)] leading-relaxed">
              Сфотографируйте чек или перетащите снимок сюда. Товары, суммы и категории распознаются автоматически.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn
              variant="primary"
              icon={<Camera className="w-4 h-4" />}
              onClick={() => setIsScannerOpen(true)}
              disabled={isAiProcessing}
            >
              Сфотографировать
            </Btn>
            <Btn icon={<Upload className="w-4 h-4" />} onClick={() => fileInputRef.current?.click()} disabled={isAiProcessing}>
              Загрузить фото
            </Btn>
            <Btn
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isAiProcessing}
              title="Быстрый снимок камерой устройства"
            >
              Быстрый снимок
            </Btn>
          </div>
        </div>
      </Card>

      {/* Сводка */}
      <Card>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Чеков', Icon: FileText, value: <CountUp value={receipts.length} /> },
            {
              label: 'Сумма покупок',
              Icon: DollarSign,
              value:
                Object.entries(totalsByCurrency).length > 0
                  ? Object.entries(totalsByCurrency)
                      .map(([c, val]) => `${Math.round(val).toLocaleString('ru-RU')} ${c}`)
                      .join(' / ')
                  : '0',
            },
            { label: 'Магазинов', Icon: Store, value: <CountUp value={uniqueStores.length} /> },
            {
              label: 'Товаров распознано',
              Icon: ShoppingCart,
              value: <CountUp value={receipts.reduce((acc, r) => acc + (r.items?.length || 0), 0)} />,
            },
          ].map((k, i) => (
            <div
              key={k.label}
              className={`p-5 sm:p-6 border-[var(--line)] ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${ i === 2 ? 'lg:border-l' : '' }`}
            >
              <div className="flex items-center gap-2 text-[14px] text-[var(--muted)]">
                <k.Icon className="w-4 h-4" />
                {k.label}
              </div>
              <div className="mt-2 text-[28px] leading-none font-semibold tabular-nums tracking-[-0.02em] text-[var(--text)] truncate">
                {k.value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Интерактивная визуализация расходов Recharts по категориям за текущий месяц */}
      <ItemSpending receipts={receipts} />

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
      <div className="bg-[var(--surface)] p-4 rounded-2xl border border-[var(--line)] shadow-[var(--shadow)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Поиск */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по магазину или товарам..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Фильтры по категории, магазину и валюте */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Фильтр по категории */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="text-xs bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-xl px-3 py-2 text-[var(--text)] focus:outline-none font-medium"
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
              className="text-xs bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-xl px-3 py-2 text-[var(--text)] focus:outline-none"
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
              className={`text-xs rounded-xl px-3 py-2 focus:outline-none font-medium border transition-colors ${ currencyFilter !== 'all' ? 'bg-orange-50 border-[var(--accent)] text-[var(--accent)] font-semibold' : 'bg-[var(--surface-2)] border-[var(--line-strong)] text-[var(--text)]' }`}
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
                className="p-1.5 text-xs text-[var(--muted)] hover:text-[var(--accent)] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
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
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] text-[var(--muted)] flex items-center justify-center mx-auto border border-[var(--line)]">
            <Camera className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-base text-[var(--text)]">
              {receipts.length === 0
                ? 'История чеков пока пуста'
                : currencyFilter !== 'all' && receipts.every((r) => (r.currency || 'EUR') !== currencyFilter)
                ? `Чеков в валюте ${formatCurrencyLabel(currencyFilter)} пока нет`
                : 'По выбранным фильтрам ничего не найдено'}
            </h3>
            <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
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
                className="px-5 py-2.5 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-xs font-semibold inline-flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Сканировать первый чек</span>
              </button>
              <button
                type="button"
                onClick={loadSampleReceipts}
                className="px-4 py-2.5 rounded-xl bg-[var(--surface-2)] hover:bg-orange-50 text-[var(--accent)] border border-[var(--line-strong)] hover:border-orange-300 text-xs font-semibold inline-flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
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
                className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[var(--accent)] text-xs font-semibold inline-flex items-center space-x-1.5 border border-orange-200 transition-colors cursor-pointer"
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
                className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] hover:border-[var(--line-strong)] hover:shadow-[var(--shadow)] p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div>
                  {/* Верхняя строка карточки */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2.5">
                      {receipt.images && receipt.images.length > 0 && receipt.images[0] ? (
                        <div className="w-10 h-12 rounded-lg bg-[var(--inverse)] overflow-hidden border border-[var(--line-strong)] shrink-0 shadow-none group-hover:border-[var(--accent)] transition-colors">
                          <img
                            src={receipt.images[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-[var(--accent)] flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate max-w-[150px]">
                          {receipt.storeName || 'Покупки'}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-[12px] text-[var(--muted)]">
                          <span>{receipt.date}</span>
                          {receipt.time && <span>• {receipt.time}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-semibold text-[var(--text)]">
                        {receipt.totalAmount.toFixed(2)} {receipt.currency}
                      </div>
                      <span className="text-[12px] text-[var(--muted)] block">
                        {receipt.items.length} поз.
                      </span>
                    </div>
                  </div>

                  {/* Превью товаров из чека */}
                  <div className="bg-[var(--surface-2)] rounded-xl p-2.5 border border-[var(--line)] space-y-1 text-xs">
                    {receipt.items.slice(0, 3).map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[12px] text-[var(--text-2)]"
                      >
                        <span className="truncate pr-2 font-medium">
                          • {it.normalizedTitle || it.originalText}
                        </span>
                        <span className="shrink-0 font-semibold text-[var(--text)]">
                          {it.totalPrice.toFixed(2)} {receipt.currency}
                        </span>
                      </div>
                    ))}
                    {receipt.items.length > 3 && (
                      <div className="text-[12px] text-[var(--muted)] pt-0.5">
                        Еще +{receipt.items.length - 3} поз...
                      </div>
                    )}
                  </div>

                  {/* Распределение по категориям данного чека */}
                  {receiptBreakdown.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-[12px] text-[var(--muted)]">
                        <span className="font-semibold">Категории покупок:</span>
                        <span>{receiptBreakdown.length} {receiptBreakdown.length === 1 ? 'кат.' : 'категории'}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--line)] overflow-hidden flex shadow-none">
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
                            className={`text-[12px] px-1.5 py-0.5 rounded-md border font-medium flex items-center space-x-1 ${b.meta.badgeClass}`}
                          >
                            <span>{b.meta.icon}</span>
                            <span className="font-semibold">{b.totalAmount.toFixed(2)} {receipt.currency}</span>
                            <span className="text-[12px] opacity-75 font-normal">({b.percentage}%)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Подвал карточки */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--surface-3)] text-xs">
                  <div className="flex items-center space-x-1 flex-wrap gap-1">
                    {hasDiscrepancy ? (
                      <span className="text-[12px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>±{receipt.matchedSumDiff?.toFixed(2)}</span>
                      </span>
                    ) : (
                      <span className="text-[12px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Сверено</span>
                      </span>
                    )}
                    {receipt.images && receipt.images.length > 0 && (
                      <span className="text-[12px] text-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 rounded border border-[var(--line)] flex items-center space-x-1">
                        <Camera className="w-2.5 h-2.5 text-[var(--accent)]" />
                        <span>Фото</span>
                      </span>
                    )}
                    <span className="text-[12px] text-[var(--muted)] font-mono px-1">
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
                      className="p-1.5 text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-lg transition-colors"
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
                      className="p-1.5 text-[var(--muted)] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
          <div className="bg-[var(--surface)] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">Удалить чек?</h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                Чек «{receiptToDelete.storeName || 'Покупки'}» на сумму {receiptToDelete.totalAmount.toFixed(2)} {receiptToDelete.currency} будет безвозвратно удален из истории.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setReceiptToDelete(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--line-strong)] text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteReceipt(receiptToDelete.id);
                  setReceiptToDelete(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-[var(--shadow)] transition-colors flex items-center justify-center space-x-1 cursor-pointer"
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
          <div className="bg-[var(--surface)] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">Очистить все чеки?</h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                Все {receipts.length} сохраненных чеков и прикрепленные к ним фотографии будут удалены. История чеков станет полностью пустой для добавления новых живых чеков.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingClearAll(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--line-strong)] text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllReceipts();
                  setIsConfirmingClearAll(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-[var(--shadow)] transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистить всё</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrap>
  );
};
