import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Calendar,
  Store,
  DollarSign,
  Percent,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  Info,
  Check,
  FileText,
  RefreshCw,
  Copy,
  RotateCw,
} from 'lucide-react';
import {
  ScannedReceipt,
  ReceiptItemLine,
  ShoppingCategory,
  ReceiptLanguage,
} from '../../types';
import { useHousehold } from '../../context/HouseholdContext';
import { normalizeProductTitle } from '../../utils/receiptNormalizer';
import { parseReceiptText } from '../../services/receiptParser';
import { CategoryDistributionWidget } from './CategoryDistributionWidget';
import {
  calculateCategoryBreakdown,
  CATEGORY_METADATA,
} from '../../utils/categoryMetadata';
import { SUPPORTED_CURRENCIES } from '../../utils/currencyConstants';

interface ReceiptReviewModalProps {
  receipt: ScannedReceipt | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToHistory: (updatedReceipt: ScannedReceipt) => void;
  onBackToScanner?: () => void;
}

const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  produce: 'Овощи и фрукты',
  dairy: 'Молочные продукты',
  meat: 'Мясо и птица',
  bakery: 'Хлеб и выпечка',
  pantry: 'Бакалея',
  household: 'Товары для дома',
  drinks: 'Напитки',
  pharmacy: 'Аптека',
  sweets: 'Сладости и десерты',
  other: 'Прочее',
};

const CATEGORY_COLORS: Record<ShoppingCategory, string> = {
  produce: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dairy: 'bg-blue-50 text-blue-700 border-blue-200',
  meat: 'bg-rose-50 text-rose-700 border-rose-200',
  bakery: 'bg-amber-50 text-amber-700 border-amber-200',
  pantry: 'bg-orange-50 text-orange-700 border-orange-200',
  household: 'bg-purple-50 text-purple-700 border-purple-200',
  drinks: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  pharmacy: 'bg-teal-50 text-teal-700 border-teal-200',
  sweets: 'bg-pink-50 text-pink-700 border-pink-200',
  other: 'bg-stone-50 text-stone-700 border-stone-200',
};

const LANGUAGE_OPTIONS: Array<{ code: ReceiptLanguage; flag: string; label: string }> = [
  { code: 'nld', flag: '🇳🇱', label: 'NL' },
  { code: 'deu', flag: '🇩🇪', label: 'DE' },
  { code: 'pol', flag: '🇵🇱', label: 'PL' },
  { code: 'ell', flag: '🇬🇷', label: 'GR' },
  { code: 'rus', flag: '🇷🇺', label: 'RU' },
  { code: 'eng', flag: '🇬🇧', label: 'EN' },
];

export const ReceiptReviewModal: React.FC<ReceiptReviewModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onSaveToHistory,
  onBackToScanner,
}) => {
  const { shoppingLists, importReceiptItemsToShopping, showToast } = useHousehold();

  // Редактируемые данные чека
  const [storeName, setStoreName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number | undefined>(undefined);
  const [discountTotal, setDiscountTotal] = useState<number | undefined>(undefined);
  const [currency, setCurrency] = useState('EUR');
  const [currentLanguage, setCurrentLanguage] = useState<ReceiptLanguage>('nld');

  // Товарные строки
  const [items, setItems] = useState<ReceiptItemLine[]>([]);

  // Фильтр списка строк
  const [activeFilter, setActiveFilter] = useState<'all' | 'doubtful' | 'verified'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ShoppingCategory | 'all'>('all');

  // Просмотр оригинала фото
  const [showImagePreview, setShowImagePreview] = useState(true);
  const [imageRotation, setImageRotation] = useState<number>(0);

  // Просмотр и редактирование исходного текста OCR
  const [showRawTextModal, setShowRawTextModal] = useState(false);
  const [editableRawText, setEditableRawText] = useState('');
  const [copiedRawText, setCopiedRawText] = useState(false);

  // Экспорт в список покупок
  const [targetShoppingListId, setTargetShoppingListId] = useState<string>(
    shoppingLists[0]?.id || 'list-supermarket'
  );
  const [isExportingToShopping, setIsExportingToShopping] = useState(false);

  // Синхронизация при открытии / смене чека
  useEffect(() => {
    if (receipt) {
      setStoreName(receipt.storeName || '');
      setDate(receipt.date || new Date().toISOString().split('T')[0]);
      setTime(receipt.time || '12:00');
      setTotalAmount(receipt.totalAmount || 0);
      setTaxAmount(receipt.taxAmount);
      setDiscountTotal(receipt.discountTotal);
      setCurrency(receipt.currency || 'EUR');
      setCurrentLanguage(receipt.language || 'nld');
      setItems(receipt.items || []);
      setEditableRawText(receipt.rawText || '');
    }
  }, [receipt]);

  if (!isOpen || !receipt) return null;

  // Вычисление текущей суммы позиций
  const sumOfItems = Math.round(items.reduce((sum, it) => sum + (it.totalPrice || 0), 0) * 100) / 100;
  const discrepancy = Math.round(Math.abs(sumOfItems - totalAmount) * 100) / 100;
  const isMatching = discrepancy <= 0.05 && totalAmount > 0;

  // Количество сомнительных строк
  const doubtfulCount = items.filter((it) => it.isDoubtful || it.status === 'needs_review').length;

  // Смена языка нормализации
  const handleSwitchLanguage = (newLang: ReceiptLanguage) => {
    setCurrentLanguage(newLang);
    setItems((prev) =>
      prev.map((it) => {
        if (!it.originalText || it.originalText === 'Добавлено вручную') return it;
        const norm = normalizeProductTitle(it.originalText, newLang);
        return {
          ...it,
          normalizedTitle: norm.normalizedTitle,
          category: norm.category,
        };
      })
    );
    showToast(`Товары переведены по правилам ${newLang.toUpperCase()}`, 'info');
  };

  // Изменение поля строки
  const handleItemChange = (
    id: string,
    field: keyof ReceiptItemLine,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated: ReceiptItemLine = {
          ...item,
          [field]: value,
          status: 'edited',
          isDoubtful: false,
        };

        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(value) : item.quantity;
          const uPrice = field === 'unitPrice' ? Number(value) : (item.unitPrice || item.totalPrice);
          if (!isNaN(qty) && !isNaN(uPrice)) {
            updated.totalPrice = Math.round(qty * uPrice * 100) / 100;
          }
        }

        return updated;
      })
    );
  };

  // Пометить строку как проверенную
  const handleMarkVerified = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'verified', isDoubtful: false }
          : item
      )
    );
  };

  // Удалить строку
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Добавить новую позицию вручную (без фиктивных значений!)
  const handleAddItem = () => {
    const newItem: ReceiptItemLine = {
      id: 'manual_' + Date.now().toString(36),
      originalText: 'Добавлено вручную',
      normalizedTitle: '',
      quantity: 1,
      unit: 'шт',
      unitPrice: 0,
      totalPrice: 0,
      currency,
      confidence: 100,
      status: 'verified',
      category: 'other',
      isDoubtful: false,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Установить итог из суммы строк
  const handleSetTotalFromItems = () => {
    if (sumOfItems > 0) {
      setTotalAmount(sumOfItems);
      showToast(`Итоговая сумма обновлена: ${sumOfItems.toFixed(2)} ${currency}`, 'info');
    }
  };

  // Перепарсить отредактированный текст OCR
  const handleReparseRawText = () => {
    try {
      const reParsed = parseReceiptText(editableRawText, currentLanguage);
      if (reParsed.storeName) setStoreName(reParsed.storeName);
      if (reParsed.date) setDate(reParsed.date);
      if (reParsed.time) setTime(reParsed.time);
      if (reParsed.totalAmount > 0) setTotalAmount(reParsed.totalAmount);
      if (reParsed.taxAmount !== undefined) setTaxAmount(reParsed.taxAmount);
      if (reParsed.discountTotal !== undefined) setDiscountTotal(reParsed.discountTotal);
      if (reParsed.currency) setCurrency(reParsed.currency);
      setItems(reParsed.items);
      setShowRawTextModal(false);
      if (reParsed.items.length > 0) {
        showToast(
          `Распознано: ${reParsed.items.length} поз. на ${reParsed.totalAmount.toFixed(2)} ${reParsed.currency}`,
          'success'
        );
      } else {
        showToast(
          'Текст перепарсен. Если товары не определились, проверьте формат строк (Товар 1.25 B) или добавьте позиции вручную.',
          'warning'
        );
      }
    } catch (e: any) {
      showToast('Ошибка разбора текста: ' + (e?.message || ''), 'warning');
    }
  };

  // Копировать сырой текст в буфер
  const handleCopyRawText = () => {
    navigator.clipboard.writeText(editableRawText);
    setCopiedRawText(true);
    setTimeout(() => setCopiedRawText(false), 2000);
  };

  // Сохранить чек в историю
  const handleSave = () => {
    const finalReceipt: ScannedReceipt = {
      ...receipt,
      storeName: storeName.trim() || 'Покупки',
      rawStoreName: receipt.rawStoreName,
      date,
      time,
      totalAmount,
      taxAmount,
      discountTotal,
      currency,
      language: currentLanguage,
      items,
      rawText: editableRawText || receipt.rawText,
      verifiedAt: new Date().toISOString(),
      matchedSumDiff: discrepancy,
    };

    onSaveToHistory(finalReceipt);

    if (isExportingToShopping && items.length > 0) {
      importReceiptItemsToShopping(items, targetShoppingListId);
    }

    onClose();
  };

  // Фильтрация позиций
  const filteredItems = items.filter((it) => {
    if (activeFilter === 'doubtful' && !(it.isDoubtful || it.status === 'needs_review')) return false;
    if (activeFilter === 'verified' && it.status !== 'verified') return false;
    if (categoryFilter !== 'all' && (it.category || 'other') !== categoryFilter) return false;
    return true;
  });

  const reviewCategoryBreakdown = calculateCategoryBreakdown(items, totalAmount);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 overflow-y-auto">
      <div className="bg-[#FAF9F5] w-full max-w-6xl rounded-2xl shadow-2xl border border-[#E5E0D5] flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in duration-200">
        {/* Заголовок экрана проверки */}
        <div className="px-6 py-4 bg-white border-b border-[#EBE7DF] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBackToScanner && (
              <button
                type="button"
                onClick={onBackToScanner}
                className="p-1.5 rounded-lg text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#F2EFE9] transition-colors"
                title="Назад к сканированию"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-[#1F1E1C]">
                  Проверка распознанного чека
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  Предпросмотр
                </span>
              </div>
              <p className="text-xs text-[#7A746B]">
                Сверьте реквизиты, проверьте строки покупок и сохраните результат
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Кнопка просмотра сырого текста OCR */}
            <button
              type="button"
              onClick={() => setShowRawTextModal(true)}
              className="px-3 py-1.5 rounded-xl border border-[#DDD8CD] bg-white hover:bg-[#F2EFE9] text-xs font-semibold text-[#5A554D] flex items-center space-x-1.5 transition-colors"
              title="Посмотреть или отредактировать исходный текст OCR"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Текст OCR</span>
            </button>

            {/* Показ/скрытие фото */}
            <button
              type="button"
              onClick={() => setShowImagePreview(!showImagePreview)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                showImagePreview
                  ? 'bg-[#F2EFE9] border-[#DDD8CD] text-[#2E2C29]'
                  : 'bg-white border-[#E8E4DA] text-[#6D675E]'
              }`}
            >
              {showImagePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showImagePreview ? 'Скрыть фото' : 'Фото чека'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#F2EFE9] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Тело экрана: Двухколоночный макет */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Сводная карточка чека (Магазин, Дата, Итог, Валюта, Язык) */}
          <div className="bg-white p-4 rounded-xl border border-[#E8E4DA] shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Магазин */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6D675E] uppercase tracking-wider flex items-center space-x-1">
                  <Store className="w-3 h-3 text-[#E15A42]" />
                  <span>Магазин</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Название магазина"
                  className="w-full px-3 py-1.5 text-xs font-bold text-[#1F1E1C] bg-[#FAF9F5] border border-[#DDD8CD] rounded-lg focus:outline-none focus:border-[#E15A42]"
                />
                {receipt.rawStoreName && (
                  <div className="text-[10px] text-[#8C867D] truncate" title={`Оригинальная строка OCR: ${receipt.rawStoreName}`}>
                    OCR: «{receipt.rawStoreName}»
                  </div>
                )}
              </div>

              {/* Дата покупки */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6D675E] uppercase tracking-wider flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-blue-600" />
                  <span>Дата</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF9F5] border border-[#DDD8CD] rounded-lg focus:outline-none focus:border-[#E15A42]"
                />
              </div>

              {/* Время */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6D675E] uppercase tracking-wider">
                  Время
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAF9F5] border border-[#DDD8CD] rounded-lg focus:outline-none focus:border-[#E15A42]"
                />
              </div>

              {/* Итог чека и переключатель валюты */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6D675E] uppercase tracking-wider flex items-center space-x-1">
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  <span>Итоговый чек и валюта</span>
                </label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs font-bold text-[#1F1E1C] bg-[#FAF9F5] border border-[#DDD8CD] rounded-lg focus:outline-none focus:border-[#E15A42]"
                  />
                  <select
                    value={
                      SUPPORTED_CURRENCIES.some((c) => c.code === currency.toUpperCase())
                        ? currency.toUpperCase()
                        : 'OTHER'
                    }
                    onChange={(e) => {
                      const newCurr = e.target.value;
                      if (newCurr !== 'OTHER') {
                        setCurrency(newCurr);
                        setItems((prev) => prev.map((it) => ({ ...it, currency: newCurr })));
                      }
                    }}
                    className="px-2 py-1.5 text-xs font-bold text-[#1F1E1C] bg-[#FAF9F5] border border-[#DDD8CD] rounded-lg focus:outline-none focus:border-[#E15A42] shrink-0"
                    title="Выбрать валюту чека"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                    {!SUPPORTED_CURRENCIES.some((c) => c.code === currency.toUpperCase()) && (
                      <option value="OTHER">{currency}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Налоги и скидки */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6D675E] uppercase tracking-wider flex items-center space-x-1">
                  <Percent className="w-3 h-3 text-purple-600" />
                  <span>Налог / Скидка</span>
                </label>
                <div className="text-xs text-[#555047] py-1.5 px-2 bg-[#FAF9F5] border border-[#DDD8CD] rounded-lg truncate">
                  {discountTotal ? `Скидка: -${discountTotal} ${currency}` : ''}
                  {taxAmount ? ` • НДС: ${taxAmount} ${currency}` : (!discountTotal ? 'НДС в чеке' : '')}
                </div>
              </div>
            </div>

            {/* Языковая панель: переключение языка нормализации */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F0ECE4]">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-[#7A746B] uppercase">Словарь перевода:</span>
                <div className="flex items-center space-x-1">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => handleSwitchLanguage(opt.code)}
                      className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                        currentLanguage === opt.code
                          ? 'bg-[#E15A42] text-white shadow-xs'
                          : 'bg-[#F2EFE9] text-[#6D675E] hover:bg-[#E5E0D5]'
                      }`}
                    >
                      <span>{opt.flag}</span> <span className="text-[10px]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Диагностика уверенности OCR */}
              {receipt.qualityReport && (
                <div className="text-[11px] text-[#8C867D]">
                  Качество фото: <strong className="text-[#3D3A36]">{receipt.qualityReport.score}%</strong>
                </div>
              )}
            </div>

            {/* Арифметическая проверка сходимости */}
            <div
              className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2 ${
                isMatching
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                {isMatching ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>
                  {isMatching ? (
                    <strong>Сумма товарных строк совпадает с итогом чека ({sumOfItems.toFixed(2)} {currency}) ✓</strong>
                  ) : (
                    <span>
                      Сумма строк (<strong>{sumOfItems.toFixed(2)} {currency}</strong>) отличается от итога чека (<strong>{totalAmount.toFixed(2)} {currency}</strong>) на <strong>{discrepancy.toFixed(2)} {currency}</strong>.
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {!isMatching && sumOfItems > 0 && (
                  <button
                    type="button"
                    onClick={handleSetTotalFromItems}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg font-bold text-[11px] text-amber-900 transition-colors shadow-xs"
                  >
                    Приравнять итог к {sumOfItems.toFixed(2)} {currency}
                  </button>
                )}

                {doubtfulCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('doubtful')}
                    className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 rounded-lg font-semibold text-[11px] text-amber-950 transition-colors"
                  >
                    Сомнительные ({doubtfulCount})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Распределение по категориям текущего чека в реальном времени */}
          <CategoryDistributionWidget
            breakdown={reviewCategoryBreakdown}
            totalAmount={totalAmount || sumOfItems}
            currency={currency}
            selectedCategory={categoryFilter}
            onSelectCategory={setCategoryFilter}
            title={`Распределение покупок «${storeName.trim() || 'в чеке'}» по категориям`}
            subtitle="Нажмите на любую категорию, чтобы отфильтровать строки чека"
          />

          {/* Основная зона: Фото чека + Таблица покупок */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Превью оригинала чека */}
            {showImagePreview && receipt.images && receipt.images.length > 0 && (
              <div className="w-full lg:w-72 shrink-0 bg-white p-3 rounded-xl border border-[#E8E4DA] shadow-xs flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#5A554D]">
                  <span>Оригинал чека</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setImageRotation((r) => (r + 90) % 360)}
                      className="p-1 rounded text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#F2EFE9]"
                      title="Повернуть фото"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-[#8C867D]">
                      {receipt.images.length > 1 ? `${receipt.images.length} фото` : '1 фото'}
                    </span>
                  </div>
                </div>
                <div className="max-h-[480px] overflow-y-auto rounded-lg bg-[#181716] p-1 flex flex-col items-center space-y-2">
                  {receipt.images.map((imgSrc, i) => (
                    <img
                      key={i}
                      src={imgSrc}
                      alt={`Сегмент ${i + 1}`}
                      style={{ transform: `rotate(${imageRotation}deg)`, transition: 'transform 0.2s' }}
                      className="w-full h-auto object-contain rounded"
                    />
                  ))}
                </div>
                <p className="text-[10px] text-[#8C867D] text-center">
                  Сверяйте строки с оригинальной бумажной лентой
                </p>
              </div>
            )}

            {/* Таблица товарных строк */}
            <div className="flex-1 bg-white p-4 rounded-xl border border-[#E8E4DA] shadow-xs space-y-3">
              {/* Фильтры и добавление */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#F0ECE4] pb-3">
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      activeFilter === 'all'
                        ? 'bg-[#E15A42] text-white shadow-xs'
                        : 'bg-[#F2EFE9] text-[#6D675E] hover:bg-[#E5E0D5]'
                    }`}
                  >
                    Все позиции ({items.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('doubtful')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 ${
                      activeFilter === 'doubtful'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Требуют внимания ({doubtfulCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('verified')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      activeFilter === 'verified'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[#F2EFE9] text-[#6D675E] hover:bg-[#E5E0D5]'
                    }`}
                  >
                    Проверенные ({items.filter((it) => it.status === 'verified').length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 rounded-lg border border-[#DDD8CD] hover:border-[#E15A42] hover:bg-[#FFF5F2] text-xs font-semibold text-[#E15A42] flex items-center space-x-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить позицию</span>
                </button>
              </div>

              {/* Список строк или честный Empty State */}
              {items.length === 0 ? (
                <div className="p-8 text-center bg-[#FAF9F5] border border-dashed border-[#DDD8CD] rounded-xl space-y-3 my-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#1F1E1C]">
                      Товары не были обнаружены автоматически
                    </h4>
                    <p className="text-xs text-[#7A746B] max-w-md mx-auto">
                      OCR не смог выделить строки покупок. Возможно, фото нечеткое или язык распознавания отличается. Вы можете посмотреть сырой текст OCR или внести позиции вручную.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRawTextModal(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-white border border-[#DDD8CD] text-xs font-semibold text-[#5A554D] hover:bg-[#F2EFE9] transition-colors flex items-center space-x-1.5 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Посмотреть текст OCR</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3.5 py-1.5 rounded-lg bg-[#E15A42] text-white text-xs font-semibold hover:bg-[#C94730] transition-colors flex items-center space-x-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Внести позицию вручную</span>
                    </button>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8C867D]">
                  Нет позиций в выбранном фильтре
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {filteredItems.map((item, idx) => {
                    const isDoubtful = item.isDoubtful || item.status === 'needs_review';
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isDoubtful
                            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/40'
                            : 'bg-[#FAF9F5] border-[#E8E4DA] hover:border-[#D5D0C5]'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                          {/* Индекс, Уверенность и Наименование */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-[11px] font-bold text-[#8C867D] w-5">
                                #{idx + 1}
                              </span>

                              {/* Бейдж уверенности */}
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  item.confidence >= 85
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.confidence >= 65
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                                title={`Точность OCR: ${item.confidence}%`}
                              >
                                {item.confidence}%
                              </span>

                              {/* Статус проверки */}
                              {isDoubtful && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center space-x-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>Проверьте цену</span>
                                </span>
                              )}

                              {/* Категория */}
                              <select
                                value={item.category || 'other'}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.id,
                                    'category',
                                    e.target.value as ShoppingCategory
                                  )
                                }
                                className={`text-[11px] font-medium px-2 py-0.5 rounded border focus:outline-none ${
                                  CATEGORY_COLORS[item.category || 'other']
                                }`}
                              >
                                {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => (
                                  <option key={catKey} value={catKey}>
                                    {catLabel}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Название товара */}
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={item.normalizedTitle}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'normalizedTitle', e.target.value)
                                }
                                className="w-full text-xs font-bold text-[#1F1E1C] bg-white border border-[#DDD8CD] rounded px-2 py-1 focus:outline-none focus:border-[#E15A42]"
                                placeholder="Название товара (например, Молоко 1.5%)"
                              />
                            </div>

                            {/* Оригинальный текст с чека */}
                            <div className="text-[11px] text-[#7A746B] flex items-center space-x-1 font-mono">
                              <span className="text-[10px] text-[#A39E94]">Оригинал:</span>
                              <span className="truncate max-w-md bg-white/70 px-1.5 py-0.5 rounded border border-[#EBE7DF]">
                                {item.originalText}
                              </span>
                            </div>
                          </div>

                          {/* Числовые поля: Количество, Ед., Цена, Итого */}
                          <div className="flex items-center space-x-2 shrink-0">
                            {/* Количество */}
                            <div className="w-16">
                              <label className="text-[9px] text-[#8C867D] block">Кол-во</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 1)
                                }
                                className="w-full text-xs font-semibold text-center bg-white border border-[#DDD8CD] rounded px-1.5 py-1 focus:outline-none focus:border-[#E15A42]"
                              />
                            </div>

                            {/* Единица измерения */}
                            <div className="w-14">
                              <label className="text-[9px] text-[#8C867D] block">Ед.</label>
                              <input
                                type="text"
                                value={item.unit || 'шт'}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'unit', e.target.value)
                                }
                                className="w-full text-xs font-semibold text-center bg-white border border-[#DDD8CD] rounded px-1 py-1 focus:outline-none focus:border-[#E15A42]"
                              />
                            </div>

                            {/* Цена за единицу */}
                            <div className="w-20">
                              <label className="text-[9px] text-[#8C867D] block">Цена за ед.</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice || item.totalPrice}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                                }
                                className="w-full text-xs font-semibold text-right bg-white border border-[#DDD8CD] rounded px-1.5 py-1 focus:outline-none focus:border-[#E15A42]"
                              />
                            </div>

                            {/* Итоговая стоимость строки */}
                            <div className="w-20">
                              <label className="text-[9px] text-[#8C867D] block">Итого ({currency})</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.totalPrice}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'totalPrice', parseFloat(e.target.value) || 0)
                                }
                                className="w-full text-xs font-bold text-right text-emerald-800 bg-white border border-[#DDD8CD] rounded px-1.5 py-1 focus:outline-none focus:border-[#E15A42]"
                              />
                            </div>

                            {/* Кнопки подтверждения / удаления */}
                            <div className="flex items-center space-x-1 pl-1 pt-3">
                              {isDoubtful ? (
                                <button
                                  type="button"
                                  onClick={() => handleMarkVerified(item.id)}
                                  className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition-colors"
                                  title="Подтвердить корректность строки"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 text-[#8C867D] hover:text-rose-600 rounded transition-colors"
                                title="Удалить строку"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Опция экспорта в Список покупок */}
          <div className="bg-[#FFFDF9] p-4 rounded-xl border border-[#EAE5DA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isExportingToShopping}
                onChange={(e) => setIsExportingToShopping(e.target.checked)}
                className="w-4 h-4 rounded text-[#E15A42] focus:ring-[#E15A42]"
              />
              <div>
                <span className="text-xs font-bold text-[#2E2C29]">
                  Экспортировать купленные товары в список покупок
                </span>
                <p className="text-[11px] text-[#7A746B]">
                  Позиции из чека добавятся в ваш семейный список с нормализованными названиями
                </p>
              </div>
            </label>

            {isExportingToShopping && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-[#6D675E]">В список:</span>
                <select
                  value={targetShoppingListId}
                  onChange={(e) => setTargetShoppingListId(e.target.value)}
                  className="text-xs font-semibold bg-white border border-[#DDD8CD] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E15A42]"
                >
                  {shoppingLists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.icon} {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Подвал с главными действиями */}
        <div className="px-6 py-4 bg-white border-t border-[#EBE7DF] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#7A746B] flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span>
              Позиций: <strong>{items.length}</strong> • Сумма: <strong>{sumOfItems.toFixed(2)} {currency}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D5D0C5] text-xs font-semibold text-[#5A554D] hover:bg-[#F2EFE9] transition-colors"
            >
              Отмена
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 active:scale-98 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Сохранить чек в историю</span>
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно просмотра и редактирования исходного текста OCR */}
      {showRawTextModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-[#E5E0D5] flex flex-col max-h-[88vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EBE7DF] flex items-center justify-between bg-[#FAF9F5]">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-[#1F1E1C]">Исходный текст OCR (Распознанные строки)</h3>
                  <p className="text-[11px] text-[#7A746B]">
                    Точный текст, извлеченный Tesseract. Вы можете исправить опечатки и перепарсить чек
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRawTextModal(false)}
                className="p-1 rounded-lg text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#EBE7DF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {/* Живой статус парсинга */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-[#FAF8F3] rounded-xl border border-[#E5E0D5]">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-[#6D675E]">Анализ:</span>
                  {(() => {
                    if (!editableRawText.trim()) return <span className="text-[11px] text-[#8C867D]">Текст пуст</span>;
                    try {
                      const p = parseReceiptText(editableRawText, currentLanguage);
                      return (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                            p.items.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Позиций: {p.items.length} • Итог: {p.totalAmount.toFixed(2)} {p.currency} • Магазин: {p.storeName || 'По чеку'}
                        </span>
                      );
                    } catch {
                      return <span className="text-[11px] text-amber-700">Ожидание...</span>;
                    }
                  })()}
                </div>

                <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = editableRawText
                        .split('\n')
                        .filter((l) => l.trim().length > 0)
                        .join('\n');
                      setEditableRawText(cleaned);
                    }}
                    className="px-2 py-1 bg-white hover:bg-[#EBE7DF] border border-[#DDD8CD] rounded text-[10px] font-medium text-[#5A554D] transition-colors"
                    title="Удалить пустые строки"
                  >
                    Убрать пустые строки
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const lns = editableRawText.split('\n');
                      const merged: string[] = [];
                      for (let k = 0; k < lns.length; k++) {
                        const cur = lns[k].trim();
                        if (k + 1 < lns.length) {
                          const nxt = lns[k + 1].trim();
                          if (
                            /^[-–—]?\s*\d{1,4}[.,]\d{2}(?:\s*[A-Za-z*])?$/.test(nxt) &&
                            cur.length >= 2 &&
                            !/\d{1,4}[.,]\d{2}/.test(cur)
                          ) {
                            merged.push(`${cur}   ${nxt}`);
                            k++;
                            continue;
                          }
                        }
                        merged.push(lns[k]);
                      }
                      setEditableRawText(merged.join('\n'));
                    }}
                    className="px-2 py-1 bg-white hover:bg-[#EBE7DF] border border-[#DDD8CD] rounded text-[10px] font-medium text-[#5A554D] transition-colors"
                    title="Сшить строки товар и цена в одну"
                  >
                    Сшить «Товар + Цена»
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6D675E]">
                <span>Строк: {editableRawText.split('\n').filter(Boolean).length}</span>
                <button
                  type="button"
                  onClick={handleCopyRawText}
                  className="px-2.5 py-1 rounded bg-[#F2EFE9] hover:bg-[#E5E0D5] text-xs font-medium text-[#2E2C29] flex items-center space-x-1"
                >
                  {copiedRawText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRawText ? 'Скопировано!' : 'Скопировать текст'}</span>
                </button>
              </div>

              <textarea
                value={editableRawText}
                onChange={(e) => setEditableRawText(e.target.value)}
                rows={16}
                className="w-full font-mono text-xs p-3.5 bg-[#FAF9F5] border border-[#DDD8CD] rounded-xl focus:outline-none focus:border-[#E15A42] leading-relaxed resize-none"
                placeholder="Текст чека..."
              />
            </div>

            <div className="px-6 py-3.5 border-t border-[#EBE7DF] bg-[#FAF9F5] flex items-center justify-between">
              <span className="text-[11px] text-[#8C867D]">
                Нажмите «Перепарсить», чтобы обновить магазин, строки и итоги
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRawTextModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#D5D0C5] text-xs font-semibold text-[#5A554D] hover:bg-[#EBE7DF]"
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  onClick={handleReparseRawText}
                  className="px-4 py-1.5 rounded-lg bg-[#E15A42] hover:bg-[#C94730] text-xs font-bold text-white shadow-xs flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Перепарсить текст</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
