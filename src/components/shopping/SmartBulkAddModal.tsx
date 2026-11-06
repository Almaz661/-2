import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Check,
  Trash2,
  ShoppingCart,
  ListPlus,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ShoppingCategory, ShoppingItem, ShoppingList } from '../../types';
import { parseShoppingInput, ParsedShoppingItem } from '../../utils/shoppingParser';

interface SmartBulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoppingLists: ShoppingList[];
  activeListId: string;
  onAddItems: (items: Array<Omit<ShoppingItem, 'id' | 'createdAt'>>) => void;
}

const CATEGORY_ICONS: Record<ShoppingCategory, string> = {
  produce: '🥦',
  dairy: '🧀',
  meat: '🥩',
  bakery: '🥖',
  pantry: '🍝',
  household: '🧴',
  pharmacy: '💊',
  drinks: '🧃',
  sweets: '🍫',
  other: '📦',
};

const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  produce: 'Овощи и зелень',
  dairy: 'Молочное',
  meat: 'Мясо и рыба',
  bakery: 'Выпечка',
  pantry: 'Бакалея',
  household: 'Для дома',
  pharmacy: 'Аптека',
  drinks: 'Напитки',
  sweets: 'Сладости',
  other: 'Разное',
};

export const SmartBulkAddModal: React.FC<SmartBulkAddModalProps> = ({
  isOpen,
  onClose,
  shoppingLists,
  activeListId,
  onAddItems,
}) => {
  const [rawText, setRawText] = useState('');
  const [targetListId, setTargetListId] = useState(activeListId || shoppingLists[0]?.id || 'list-supermarket');
  const [itemsList, setItemsList] = useState<ParsedShoppingItem[]>([]);

  // При изменении сырого текста обновляем распознанные элементы
  const recognizedItems = useMemo(() => {
    return parseShoppingInput(rawText);
  }, [rawText]);

  // Синхронизируем локальный список при изменении текста
  React.useEffect(() => {
    setItemsList(recognizedItems);
  }, [recognizedItems]);

  if (!isOpen) return null;

  const handleRemoveItem = (index: number) => {
    setItemsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsList.length === 0) return;

    const toAdd = itemsList.map((item) => ({
      listId: targetListId,
      title: item.title,
      quantity: item.quantity,
      category: item.category,
      completed: false,
    }));

    onAddItems(toAdd);
    setRawText('');
    setItemsList([]);
    onClose();
  };

  const sampleSnippets = [
    {
      label: 'Базилик и черри, молоко, сыр',
      text: 'Свежий базилик и черри, молоко 1 л, сыр пармезан 200г',
    },
    {
      label: 'Морская соль и прованские травы',
      text: 'Морская соль и прованские травы, оливковое масло',
    },
    {
      label: 'Список из заметок (по строкам)',
      text: '1. Хлеб цельнозерновой\n2. 2 пачки творога\n3. Бананы 1 кг и авокадо\n4. Овсяное молоко',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#FCFBF8] rounded-3xl border border-[#EBE7DF] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBE7DF] bg-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E15A42] to-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1F1E1C] flex items-center space-x-1.5">
                <span>Умная вставка списка покупок</span>
              </h3>
              <p className="text-[11px] text-[#8C867D]">
                Разбивает союзы «и», запятые и переносы строк на отдельные товары
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#EDE8DC] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Быстрые примеры */}
          <div>
            <span className="text-[11px] font-semibold text-[#8C867D] block mb-1.5">
              Быстрые примеры для проверки:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sampleSnippets.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRawText(s.text)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-[#DDD7CB] hover:border-[#E15A42] hover:bg-orange-50/50 text-[11px] text-[#5C564B] transition-all cursor-pointer"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Текстовое поле ввода */}
          <div className="space-y-1.5">
            <label className="font-bold text-xs text-[#1F1E1C] flex items-center justify-between">
              <span>Вставьте текст из WhatsApp, мессенджера или заметок:</span>
              <span className="text-[10px] text-[#8C867D] font-normal">
                Понимает союзы «и», запятые, переносы
              </span>
            </label>
            <textarea
              rows={4}
              required
              autoFocus
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Например: Свежий базилик и черри, 2 пачки творога, молоко 1 л, морская соль и прованские травы..."
              className="w-full p-3.5 rounded-2xl bg-white border border-[#E3DFD5] text-xs text-[#1F1E1C] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#E15A42]/30 focus:border-[#E15A42] resize-none"
            />
          </div>

          {/* Целевой список */}
          <div className="flex items-center space-x-3 p-3 rounded-2xl bg-[#F6F3EB] border border-[#E8E3D7]">
            <ShoppingCart className="w-4 h-4 text-[#E15A42] shrink-0" />
            <div className="flex-1">
              <span className="text-[11px] font-bold text-[#1F1E1C] block">Куда добавить:</span>
              <span className="text-[10px] text-[#8C867D]">Выберите список для сохранения товаров</span>
            </div>
            <select
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD7CB] text-xs font-semibold text-[#1F1E1C] focus:outline-none"
            >
              {shoppingLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Интерактивный предпросмотр распознанных позиций */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#1F1E1C] flex items-center space-x-1.5">
                <span>Распознанные позиции</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {itemsList.length} шт.
                </span>
              </span>
              {itemsList.length > 0 && (
                <span className="text-[10px] text-[#8C867D]">
                  💡 Каждый товар попадёт в свой отдел супермаркета
                </span>
              )}
            </div>

            {itemsList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white border border-dashed border-[#E3DFD5] text-[#8C867D]">
                <ListPlus className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                <p className="text-xs">
                  Начните вводить или вставьте текст выше, чтобы увидеть разделение на товары
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                {itemsList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-[#E8E3D7] shadow-2xs text-xs animate-in fade-in"
                  >
                    <div className="flex items-center space-x-2 overflow-hidden flex-1 mr-2">
                      <span className="text-sm shrink-0" title={CATEGORY_LABELS[item.category]}>
                        {CATEGORY_ICONS[item.category] || '📦'}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-[#1F1E1C] truncate block">{item.title}</span>
                        <span className="text-[10px] text-[#8C867D] block">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {item.quantity && (
                        <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-[#E15A42] border border-orange-200 text-[10px] font-bold">
                          {item.quantity}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Удалить позицию"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Кнопка отправки */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-[#EBE7DF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#DDD7CB] text-[#5C564B] hover:bg-stone-100 font-semibold cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={itemsList.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E15A42] to-amber-600 hover:brightness-105 active:scale-[0.99] text-white font-bold shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Добавить в покупки ({itemsList.length})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
