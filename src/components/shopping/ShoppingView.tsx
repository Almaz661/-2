import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Trash2,
  ListFilter,
  Sparkles,
  ShoppingBag,
  HeartPulse,
  BookOpen,
  Hammer,
  Camera,
  Receipt,
  ListPlus,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { ShoppingCategory, ShoppingItem, ScannedReceipt } from '../../types';
import { MemberAvatar } from '../common/MemberAvatar';
import { ReceiptScannerModal } from '../receipts/ReceiptScannerModal';
import { ReceiptReviewModal } from '../receipts/ReceiptReviewModal';
import { SmartBulkAddModal } from './SmartBulkAddModal';
import { parseShoppingInput, ParsedShoppingItem } from '../../utils/shoppingParser';

const CATEGORY_NAMES: Record<ShoppingCategory, string> = {
  produce: '🥦 Овощи, фрукты и зелень',
  dairy: '🧀 Молочные продукты и яйца',
  meat: '🥩 Мясо, птица и рыба',
  bakery: '🥖 Свежая выпечка и хлеб',
  pantry: '🍝 Бакалея, крупы и специи',
  household: '🧴 Бытовая химия и для дома',
  pharmacy: '💊 Аптека и здоровье',
  drinks: '🧃 Напитки, соки и кофе',
  sweets: '🍫 Сладости, десерты и снеки',
  other: '📦 Разное',
};

export const ShoppingView: React.FC = () => {
  const {
    shoppingLists,
    activeShoppingListId,
    setActiveShoppingListId,
    shoppingItems,
    addShoppingItem,
    addShoppingItems,
    toggleShoppingItem,
    deleteShoppingItem,
    clearCompletedShoppingItems,
    addShoppingList,
    saveReceipt,
    members,
    activeMemberId,
  } = useHousehold();

  const [newTitle, setNewTitle] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newCategory, setNewCategory] = useState<ShoppingCategory>('produce');
  const [isAddingNewList, setIsAddingNewList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Умная пакетная вставка списка
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);

  // Состояния сканера чеков в покупках
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState<ScannedReceipt | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const activeList =
    shoppingLists.find((l) => l.id === activeShoppingListId) || shoppingLists[0];

  // Фильтрация товаров текущего списка
  const currentListItems = shoppingItems.filter((i) => i.listId === activeList?.id);
  const pendingItems = currentListItems.filter((i) => !i.completed);
  const completedItems = currentListItems.filter((i) => i.completed);

  // Группировка некупленных товаров по категориям
  const groupedPending: Partial<Record<ShoppingCategory, ShoppingItem[]>> = {};
  pendingItems.forEach((item) => {
    if (!groupedPending[item.category]) {
      groupedPending[item.category] = [];
    }
    groupedPending[item.category]!.push(item);
  });

  // Предпросмотр интеллектуального разделения при вводе строки
  const previewItems: ParsedShoppingItem[] = React.useMemo(() => {
    const trimmed = newTitle.trim();
    if (
      !trimmed ||
      (!trimmed.includes(',') &&
        !trimmed.includes(';') &&
        !trimmed.includes('\n') &&
        !/\s+и\s+/iu.test(trimmed) &&
        !/\s+да\s+/iu.test(trimmed) &&
        !/\s+плюс\s+/iu.test(trimmed) &&
        !/\s+\+\s+/.test(trimmed))
    ) {
      return [];
    }
    return parseShoppingInput(trimmed, {
      defaultCategory: newCategory,
      defaultQuantity: newQuantity,
    });
  }, [newTitle, newCategory, newQuantity]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addShoppingItem({
      listId: activeList.id,
      title: newTitle.trim(),
      category: newCategory,
      quantity: newQuantity.trim() || undefined,
      completed: false,
      addedBy: activeMemberId || undefined,
    });

    setNewTitle('');
    setNewQuantity('');
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    addShoppingList(newListName.trim(), 'ShoppingCart');
    setNewListName('');
    setIsAddingNewList(false);
  };

  const getListIcon = (icon: string) => {
    if (icon === 'Cross' || icon === 'HeartPulse') return <HeartPulse className="w-4 h-4 text-emerald-600" />;
    if (icon === 'Hammer') return <Hammer className="w-4 h-4 text-amber-600" />;
    if (icon === 'BookOpen') return <BookOpen className="w-4 h-4 text-blue-600" />;
    return <ShoppingCart className="w-4 h-4 text-rose-500" />;
  };

  const progressPercent =
    currentListItems.length > 0
      ? Math.round((completedItems.length / currentListItems.length) * 100)
      : 0;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Верхний ряд: Списки покупок в виде табов */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {shoppingLists.map((list) => {
            const isActive = list.id === activeList?.id;
            const itemsCount = shoppingItems.filter(
              (i) => i.listId === list.id && !i.completed
            ).length;

            return (
              <button
                key={list.id}
                onClick={() => setActiveShoppingListId(list.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1F1D1A] text-white shadow-xs'
                    : 'bg-white border border-[#E5DFD1] text-[#5C564B] hover:bg-[#F3EFE6]'
                }`}
              >
                {getListIcon(list.icon)}
                <span>{list.name}</span>
                {itemsCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {itemsCount}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => setIsAddingNewList(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl border border-dashed border-stone-300 hover:border-stone-500 text-stone-600 text-xs font-semibold transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый список</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-2">
          <button
            type="button"
            onClick={() => setIsBulkAddOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-white border border-[#E3DFD5] hover:bg-[#FAF9F5] hover:border-[#E15A42]/50 text-[#1F1D1A] text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
            title="Вставить список из заметок или мессенджера"
          >
            <ListPlus className="w-3.5 h-3.5 text-[#E15A42]" />
            <span>Вставить списком</span>
          </button>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#E15A42] to-[#F28C38] hover:from-[#D14B33] hover:to-[#E07925] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Сканировать чек</span>
          </button>

          {/* Очистить купленное */}
          {completedItems.length > 0 && (
            <button
              onClick={() => clearCompletedShoppingItems(activeList.id)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-white border border-stone-200 text-stone-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить купленное ({completedItems.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Модалка/форма создания нового списка */}
      {isAddingNewList && (
        <form
          onSubmit={handleCreateList}
          className="p-4 rounded-2xl bg-white border border-[#E5DFD1] shadow-xs flex items-center space-x-3 max-w-md animate-in fade-in"
        >
          <input
            type="text"
            required
            autoFocus
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Название списка (напр: Косметика, Ozon)..."
            className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-[#1F1D1A]"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-[#E15A42] text-white text-xs font-semibold"
          >
            Создать
          </button>
          <button
            type="button"
            onClick={() => setIsAddingNewList(false)}
            className="px-3 py-1.5 rounded-xl text-stone-500 hover:bg-stone-100 text-xs"
          >
            Отмена
          </button>
        </form>
      )}

      {/* Прогресс-бар покупок */}
      {currentListItems.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#1F1D1A]">
              Прогресс покупок в «{activeList?.name}»:
            </span>
            <span className="text-[#8A8477] font-semibold">
              {completedItems.length} из {currentListItems.length} товаров ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#EFECE4] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Форма быстрого добавления товара */}
      <form
        onSubmit={handleAddItem}
        className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EBE7DF] shadow-xs flex flex-col gap-3"
      >
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Что нужно купить? (напр: свежий базилик и черри, 2 пачки творога, молоко)..."
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] text-sm text-[#1F1D1A] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#E15A42]/30 focus:border-[#E15A42]"
            />
          </div>

          <div className="w-full md:w-44">
            <input
              type="text"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="Количество (2 уп, 1 кг)"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs text-[#1F1D1A] placeholder:text-stone-400 focus:outline-none"
            />
          </div>

          <div className="w-full md:w-56">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as ShoppingCategory)}
              className="w-full px-3 py-2.5 rounded-2xl bg-[#FAF9F5] border border-[#E3DFD5] text-xs text-[#1F1D1A] focus:outline-none"
            >
              {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full md:w-auto px-6 py-2.5 rounded-2xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all cursor-pointer shrink-0 flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Добавить</span>
          </button>
        </div>

        {/* Индикатор интеллектуального разделения на отдельные товары при вводе союзов «и» или запятых */}
        {previewItems.length > 1 ? (
          <div className="pt-2 border-t border-dashed border-[#E8E3D7] flex items-center flex-wrap gap-1.5 animate-in fade-in">
            <div className="flex items-center space-x-1 text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-xl border border-amber-200 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Автоматически разобьётся на {previewItems.length} поз.:</span>
            </div>
            {previewItems.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-[#FAF9F5] border border-[#E0DBD0] text-xs text-[#1F1D1A] font-medium shadow-2xs"
              >
                <span className="font-bold">{item.title}</span>
                {item.quantity && (
                  <span className="text-[#E15A42] text-[10px] font-bold bg-white px-1.5 py-0.5 rounded-md border border-stone-200">
                    {item.quantity}
                  </span>
                )}
                <span className="text-[10px] text-stone-400">
                  · {CATEGORY_NAMES[item.category]?.split(' ')[1] || CATEGORY_NAMES[item.category]}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-[#8C867D] flex items-center space-x-1.5 px-1">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            <span>
              💡 Пишите через запятую или союзы «и», «плюс» (напр: <em>«базилик и черри»</em>) — система автоматически создаст отдельные позиции по отделам.
            </span>
          </div>
        )}
      </form>

      {/* Список товаров, сгруппированный по категориям */}
      <div className="space-y-6">
        {pendingItems.length === 0 && completedItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-[#EBE7DF] shadow-xs space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto text-stone-300 stroke-[1.5]" />
            <h3 className="text-base font-bold text-[#1F1D1A]">Список покупок пуст</h3>
            <p className="text-xs text-[#8A8477] max-w-md mx-auto">
              Введите товары через строку выше, воспользуйтесь кнопкой «Вставить списком» или кликните готовый пример:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setNewTitle('Свежий базилик и черри')}
                className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-stone-200 hover:border-[#E15A42] hover:bg-orange-50/40 text-xs text-[#1F1D1A] font-medium transition-all cursor-pointer"
              >
                🥦 Свежий базилик и черри
              </button>
              <button
                type="button"
                onClick={() => setNewTitle('Морская соль и прованские травы')}
                className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-stone-200 hover:border-[#E15A42] hover:bg-orange-50/40 text-xs text-[#1F1D1A] font-medium transition-all cursor-pointer"
              >
                🧂 Морская соль и прованские травы
              </button>
              <button
                type="button"
                onClick={() => setNewTitle('Молоко 1 л, 2 пачки творога и яйца')}
                className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-stone-200 hover:border-[#E15A42] hover:bg-orange-50/40 text-xs text-[#1F1D1A] font-medium transition-all cursor-pointer"
              >
                🥛 Молоко 1 л, 2 пачки творога и яйца
              </button>
            </div>
          </div>
        ) : (
          Object.entries(groupedPending).map(([category, items]) => {
            if (!items || items.length === 0) return null;
            return (
              <div
                key={category}
                className="bg-white rounded-3xl p-5 border border-[#EBE7DF] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-2">
                  <h3 className="font-bold text-xs text-[#1F1D1A] tracking-tight">
                    {CATEGORY_NAMES[category as ShoppingCategory]}
                  </h3>
                  <span className="text-[11px] font-semibold text-[#8A8477]">
                    {items.length} шт.
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((item) => {
                    const author = members.find((m) => m.id === item.addedBy);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleShoppingItem(item.id)}
                        className="group flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F5] border border-[#EAE6DE] hover:bg-white hover:border-[#E15A42]/50 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <button
                            type="button"
                            className="w-5 h-5 rounded-lg border border-stone-300 group-hover:border-[#E15A42] bg-white flex items-center justify-center transition-all"
                          />
                          <div>
                            <span className="text-xs font-bold text-[#1F1D1A]">
                              {item.title}
                            </span>
                            {item.recipeSource && (
                              <span className="ml-2 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                                Из рецепта: {item.recipeSource}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {item.quantity && (
                            <span className="text-xs font-semibold text-[#5C564B] bg-[#EFECE4] px-2.5 py-1 rounded-xl">
                              {item.quantity}
                            </span>
                          )}

                          {author && (
                            <MemberAvatar
                              member={author}
                              size="xs"
                              title={`Добавил(а): ${author.name}`}
                            />
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteShoppingItem(item.id);
                            }}
                            className="p-1 rounded-lg text-stone-300 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Секция: Уже куплено */}
        {completedItems.length > 0 && (
          <div className="bg-[#FAF9F6] rounded-3xl p-5 border border-[#E8E4DA] space-y-3 opacity-75">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h3 className="font-bold text-xs text-[#5C564B]">
                Уже в корзине ({completedItems.length})
              </h3>
              <button
                onClick={() => clearCompletedShoppingItems(activeList.id)}
                className="text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Очистить все
              </button>
            </div>

            <div className="space-y-1.5">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleShoppingItem(item.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200 text-xs cursor-pointer hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    </span>
                    <span className="line-through text-stone-400 font-medium">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.addedBy && (
                      <MemberAvatar
                        member={members.find((m) => m.id === item.addedBy)}
                        size="2xs"
                      />
                    )}
                    {item.quantity && (
                      <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                        {item.quantity}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteShoppingItem(item.id);
                      }}
                      className="p-1 text-stone-300 hover:text-rose-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Сканер чеков из списка покупок */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onReceiptParsed={(parsed) => {
          setPendingReceipt(parsed);
          setIsReviewOpen(true);
        }}
      />

      {/* Проверка результатов до сохранения */}
      <ReceiptReviewModal
        receipt={pendingReceipt}
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setPendingReceipt(null);
        }}
        onSaveToHistory={(verified) => {
          saveReceipt(verified);
          setPendingReceipt(null);
        }}
        onBackToScanner={() => {
          setIsReviewOpen(false);
          setIsScannerOpen(true);
        }}
      />

      {/* Модалка умной вставки списка покупок */}
      <SmartBulkAddModal
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        shoppingLists={shoppingLists}
        activeListId={activeList.id}
        onAddItems={(items) => {
          addShoppingItems(
            items.map((i) => ({
              ...i,
              addedBy: activeMemberId || undefined,
            }))
          );
        }}
      />
    </div>
  );
};
