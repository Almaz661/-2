import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  Calendar,
  Clock,
  ShoppingCart,
  Trash2,
  Download,
  ZoomIn,
  ShieldCheck,
  Tag,
  Maximize2,
  Image as ImageIcon,
  Filter,
  Sparkles,
} from 'lucide-react';
import { ScannedReceipt, ShoppingCategory } from '../../types';
import { useHousehold } from '../../context/HouseholdContext';
import { getReceiptPhotosFromIDB } from '../../services/receiptStorage';
import { parseReceiptWithGemini } from '../../services/geminiReceiptService';
import { CategoryDistributionWidget } from './CategoryDistributionWidget';
import {
  calculateCategoryBreakdown,
  CATEGORY_METADATA,
} from '../../utils/categoryMetadata';
import { SUPPORTED_CURRENCIES } from '../../utils/currencyConstants';

interface ReceiptDetailModalProps {
  receipt: ScannedReceipt | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onDelete,
}) => {
  if (!isOpen || !receipt) return null;

  const { shoppingLists, importReceiptItemsToShopping, updateReceipt, showToast } = useHousehold();
  const [selectedListId, setSelectedListId] = useState(
    shoppingLists[0]?.id || 'list-supermarket'
  );
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [photos, setPhotos] = useState<string[]>(receipt.images || []);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isReparsingAi, setIsReparsingAi] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ShoppingCategory | 'all'>('all');

  const receiptCategoryBreakdown = calculateCategoryBreakdown(
    receipt.items || [],
    receipt.totalAmount
  );

  // Загрузка фото из IndexedDB, если в объекте чека отсутствуют или были сжаты
  useEffect(() => {
    let isMounted = true;
    if (receipt.images && receipt.images.length > 0 && receipt.images[0].length > 500) {
      setPhotos(receipt.images);
    } else {
      setIsLoadingPhotos(true);
      getReceiptPhotosFromIDB(receipt.id)
        .then((saved) => {
          if (isMounted) {
            if (saved && saved.length > 0) {
              setPhotos(saved);
            } else if (receipt.images) {
              setPhotos(receipt.images);
            }
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingPhotos(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [receipt.id, receipt.images]);

  const handleReparseWithGemini = async () => {
    const photoToUse = photos[activePhotoIdx] || photos[0] || (receipt.images && receipt.images[0]);
    if (!photoToUse) {
      showToast('Нет фото чека для повторного распознавания', 'warning');
      return;
    }
    setIsReparsingAi(true);
    try {
      showToast('🤖 Gemini API анализирует чек и категоризирует товары...', 'info');
      const parsed = await parseReceiptWithGemini(photoToUse, receipt.rawText, receipt.language);
      if (parsed && parsed.items && parsed.items.length > 0) {
        updateReceipt(receipt.id, {
          storeName: parsed.storeName || receipt.storeName,
          date: parsed.date || receipt.date,
          time: parsed.time || receipt.time,
          totalAmount: parsed.totalAmount || receipt.totalAmount,
          taxAmount: parsed.taxAmount !== undefined ? parsed.taxAmount : receipt.taxAmount,
          discountTotal: parsed.discountTotal !== undefined ? parsed.discountTotal : receipt.discountTotal,
          currency: parsed.currency || receipt.currency,
          language: parsed.language || receipt.language,
          items: parsed.items,
          matchedSumDiff: parsed.matchedSumDiff,
        });
        showToast(`Успешно! Gemini AI распознал ${parsed.items.length} товаров и распределил по категориям`, 'success');
      } else {
        showToast('Не удалось извлечь товары из чека через Gemini API', 'warning');
      }
    } catch (err: any) {
      showToast('Ошибка при вызове Gemini API: ' + (err?.message || ''), 'error');
    } finally {
      setIsReparsingAi(false);
    }
  };

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [receipt?.id, isOpen]);

  const handleExportToShopping = () => {
    importReceiptItemsToShopping(receipt.items, selectedListId);
    onClose();
  };

  const handleDeleteClick = () => {
    setIsConfirmingDelete(true);
  };

  const handleConfirmDelete = () => {
    if (receipt) {
      onDelete(receipt.id);
    }
    setIsConfirmingDelete(false);
    onClose();
  };

  const handleDownloadPhoto = () => {
    const currentPhoto = photos[activePhotoIdx] || photos[0];
    if (!currentPhoto) return;
    const a = document.createElement('a');
    a.href = currentPhoto;
    a.download = `receipt-${receipt.storeName || 'photo'}-${receipt.date || 'scanned'}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const currentPhoto = photos[activePhotoIdx] || photos[0];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
        <div className="bg-[#FAF9F5] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#E5E0D5] flex flex-col max-h-[92vh] overflow-hidden relative animate-in fade-in duration-200">
          {/* Модальное окно подтверждения удаления чека */}
          {isConfirmingDelete && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1E1C]">Удалить чек?</h3>
                  <p className="text-xs text-[#7A746B] mt-1">
                    Чек «{receipt.storeName || 'Покупки'}» на сумму {receipt.totalAmount.toFixed(2)} {receipt.currency} будет безвозвратно удален из истории вместе с фотографиями.
                  </p>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="flex-1 py-2 px-3 rounded-xl border border-[#DDD8CD] text-xs font-semibold text-[#5A554D] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Да, удалить</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Заголовок */}
          <div className="px-6 py-4 bg-white border-b border-[#EBE7DF] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#E15A42] flex items-center justify-center shadow-xs">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F1E1C]">
                  {receipt.storeName || 'Кассовый чек'}
                </h2>
                <div className="flex items-center space-x-2 text-xs text-[#7A746B]">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{receipt.date || 'Дата не указана'}</span>
                  </span>
                  {receipt.time && (
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{receipt.time}</span>
                    </span>
                  )}
                  <span>• {receipt.language.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleReparseWithGemini}
                disabled={isReparsingAi}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#E15A42] to-[#F28C38] hover:from-[#D14B33] hover:to-[#E07925] text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title="Перераспознать чек через Gemini API без шаблонов"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isReparsingAi ? 'animate-spin' : ''}`} />
                <span>{isReparsingAi ? 'AI анализ...' : 'Перераспознать с Gemini AI'}</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="p-2 text-[#7A746B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Удалить чек"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#F2EFE9] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Тело */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Верхние показатели */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-[#E8E4DA] shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] text-[#7A746B] block">Итоговая сумма</span>
                  <span className="text-xl font-bold text-[#1F1E1C]">
                    {receipt.totalAmount.toFixed(2)} {receipt.currency}
                  </span>
                </div>
                <div className="mt-2 flex items-center space-x-1.5 pt-1.5 border-t border-[#F0ECE4]">
                  <span className="text-[10px] text-[#8C867D] font-medium">Валюта:</span>
                  <select
                    value={
                      SUPPORTED_CURRENCIES.some(
                        (c) => c.code === (receipt.currency || 'EUR').toUpperCase()
                      )
                        ? (receipt.currency || 'EUR').toUpperCase()
                        : 'OTHER'
                    }
                    onChange={(e) => {
                      const newCurr = e.target.value;
                      if (newCurr !== 'OTHER') {
                        updateReceipt(receipt.id, {
                          currency: newCurr,
                          items: (receipt.items || []).map((it) => ({ ...it, currency: newCurr })),
                        });
                        showToast(`Валюта чека изменена на ${newCurr}`, 'info');
                      }
                    }}
                    className="text-xs font-semibold text-[#E15A42] bg-orange-50 border border-orange-200 rounded-md px-1.5 py-0.5 focus:outline-none cursor-pointer"
                    title="Сменить валюту чека"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                    {!SUPPORTED_CURRENCIES.some(
                      (c) => c.code === (receipt.currency || 'EUR').toUpperCase()
                    ) && <option value="OTHER">{receipt.currency}</option>}
                  </select>
                </div>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-[#E8E4DA] shadow-xs">
                <span className="text-[11px] text-[#7A746B] block">Всего позиций</span>
                <span className="text-xl font-bold text-[#1F1E1C]">
                  {receipt.items.length}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-[#E8E4DA] shadow-xs">
                <span className="text-[11px] text-[#7A746B] block">Скидка по чеку</span>
                <span className="text-xl font-bold text-emerald-600">
                  {receipt.discountTotal ? `-${receipt.discountTotal.toFixed(2)}` : '0.00'} {receipt.currency}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-[#E8E4DA] shadow-xs">
                <span className="text-[11px] text-[#7A746B] block">Налог / НДС</span>
                <span className="text-xl font-bold text-[#1F1E1C]">
                  {receipt.taxAmount ? `${receipt.taxAmount.toFixed(2)}` : '—'} {receipt.currency}
                </span>
              </div>
            </div>

            {/* Распределение по категориям в данном чеке */}
            <CategoryDistributionWidget
              breakdown={receiptCategoryBreakdown}
              totalAmount={receipt.totalAmount}
              currency={receipt.currency}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              title={`Распределение покупок «${receipt.storeName || 'в чеке'}» по категориям`}
              subtitle="Нажмите на любую категорию выше, чтобы отфильтровать позиции чека"
              variant="modal"
            />

            <div className="flex flex-col md:flex-row gap-6">
              {/* Фотографии чека */}
              <div className="w-full md:w-80 shrink-0 bg-white p-3.5 rounded-xl border border-[#E8E4DA] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5A554D] flex items-center space-x-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#E15A42]" />
                    <span>Фотография чека</span>
                    {photos.length > 0 && <span className="text-[#8C867D]">({photos.length})</span>}
                  </span>
                  {currentPhoto && (
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setIsZoomOpen(true)}
                        className="p-1 rounded-md text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#FAF9F5] transition-colors"
                        title="Увеличить на весь экран"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPhoto}
                        className="p-1 rounded-md text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#FAF9F5] transition-colors"
                        title="Скачать фото на устройство"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isLoadingPhotos ? (
                  <div className="h-64 rounded-lg bg-[#FAF9F5] border border-dashed border-[#DDD8CD] flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-6 h-6 border-2 border-[#E15A42] border-t-transparent rounded-full animate-spin mb-2" />
                    <span className="text-xs text-[#7A746B]">Загрузка фото чека...</span>
                  </div>
                ) : currentPhoto ? (
                  <div className="space-y-2">
                    <div
                      onClick={() => setIsZoomOpen(true)}
                      className="relative group cursor-pointer max-h-[380px] overflow-y-auto rounded-lg bg-[#181716] p-1 flex flex-col items-center border border-[#302D2A]"
                    >
                      <img
                        src={currentPhoto}
                        alt="Чек"
                        className="w-full h-auto object-contain rounded"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                        <span className="bg-black/70 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center space-x-1 shadow-md">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Увеличить</span>
                        </span>
                      </div>
                    </div>

                    {photos.length > 1 && (
                      <div className="flex items-center space-x-1.5 overflow-x-auto pt-1">
                        {photos.map((imgSrc, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setActivePhotoIdx(i)}
                            className={`w-12 h-14 rounded-md border-2 overflow-hidden shrink-0 ${
                              activePhotoIdx === i
                                ? 'border-[#E15A42]'
                                : 'border-[#E5E0D5]'
                            }`}
                          >
                            <img
                              src={imgSrc}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="pt-1 flex items-center space-x-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Фото надёжно сохранено в памяти устройства</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 rounded-lg bg-[#FAF9F5] border border-dashed border-[#DDD8CD] flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-[#8C867D] flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-[#5A554D]">Фото не прикреплено</span>
                    <span className="text-[11px] text-[#8C867D]">
                      Текст чека и распознанные товары сохранены в базе
                    </span>
                  </div>
                )}
              </div>

              {/* Таблица товаров */}
              <div className="flex-1 bg-white p-4 rounded-xl border border-[#E8E4DA] shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-[#5A554D] block">
                      Список товаров ({selectedCategory === 'all' ? receipt.items.length : `${receipt.items.filter(it => (it.category || 'other') === selectedCategory).length} из ${receipt.items.length}`})
                    </span>
                    {selectedCategory !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 hover:bg-orange-200 text-[#E15A42] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <span>Фильтр: {CATEGORY_METADATA[selectedCategory]?.shortLabel} ×</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-[#8C867D] font-medium">
                    Сумма:{' '}
                    {receipt.items
                      .filter((it) => selectedCategory === 'all' || (it.category || 'other') === selectedCategory)
                      .reduce((s, it) => s + it.totalPrice, 0)
                      .toFixed(2)}{' '}
                    {receipt.currency}
                  </span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {receipt.items
                    .filter((it) => selectedCategory === 'all' || (it.category || 'other') === selectedCategory)
                    .map((it, idx) => {
                      const cat = it.category || 'other';
                      const meta = CATEGORY_METADATA[cat] || CATEGORY_METADATA.other;
                      return (
                        <div
                          key={it.id || idx}
                          className="p-2.5 rounded-lg border border-[#EBE7DF] bg-[#FAF9F5] flex items-start justify-between text-xs hover:border-[#DDD8CD] transition-colors"
                        >
                          <div className="min-w-0 pr-3 space-y-1">
                            <div className="font-semibold text-[#1F1E1C]">
                              {it.normalizedTitle || it.originalText}
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center space-x-1 ${
                                  meta.badgeClass
                                }`}
                              >
                                <span>{meta.icon}</span>
                                <span>{meta.shortLabel}</span>
                              </span>
                              <span className="text-[10px] text-[#7A746B] font-mono truncate max-w-[220px]">
                                {it.originalText.replace(/\n/g, ' ')}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-[#1F1E1C]">
                              {it.totalPrice.toFixed(2)} {receipt.currency}
                            </div>
                            <div className="text-[10px] text-[#8C867D]">
                              {it.quantity > 1 ? `${it.quantity} ${it.unit || 'шт'}` : '1 шт'}
                              {it.unitPrice && it.quantity > 1 ? ` × ${it.unitPrice.toFixed(2)}` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* Подвал */}
          <div className="px-6 py-4 bg-white border-t border-[#EBE7DF] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs text-[#7A746B]">
              <span>Добавить в список:</span>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="text-xs font-semibold bg-[#FAF9F5] border border-[#DDD8CD] rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                {shoppingLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.icon} {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-between sm:justify-end">
              <button
                type="button"
                onClick={handleDeleteClick}
                className="px-3.5 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center space-x-1.5 transition-colors cursor-pointer mr-auto sm:mr-0"
                title="Удалить данный чек"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить чек</span>
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleExportToShopping}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#E15A42] hover:bg-[#D04A33] flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Добавить в список покупок</span>
                  <span className="sm:hidden">В список</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#DDD8CD] text-xs font-semibold text-[#5A554D] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Полноэкранный просмотр фото чека */}
      {isZoomOpen && currentPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 px-2">
            <span className="text-sm font-semibold flex items-center space-x-2">
              <Store className="w-4 h-4 text-orange-400" />
              <span>{receipt.storeName || 'Чек'} • Полный размер</span>
            </span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadPhoto();
                }}
                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать оригинал</span>
              </button>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            className="max-w-4xl max-h-[85vh] overflow-auto rounded-xl bg-[#141312] p-2 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentPhoto}
              alt="Оригинал чека"
              className="max-h-[82vh] w-auto mx-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
};
