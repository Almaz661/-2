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
  ChevronDown,
  Carrot,
  Croissant,
  Beef,
  Milk,
  Wheat,
  CupSoda,
  Candy,
  SprayCan,
  Pill,
  Package,
  Store,
  X as XIcon,
  Pencil,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { ShoppingCategory, ShoppingItem, ScannedReceipt } from '../../types';
import { MemberAvatar } from '../common/MemberAvatar';
import { ReceiptsView } from '../receipts/ReceiptsView';
import { SuppliesBoard } from './SuppliesBoard';
import { Btn, Card, EmptyState, GroupLabel, IconBtn, PageWrap, Segmented, Slide, Tag } from '../ui/mercury';
import { ReceiptScannerModal } from '../receipts/ReceiptScannerModal';
import { ReceiptReviewModal } from '../receipts/ReceiptReviewModal';
import { SmartBulkAddModal } from './SmartBulkAddModal';
import { parseShoppingInput, ParsedShoppingItem } from '../../utils/shoppingParser';

// Порядок отделов — как обычно идёшь по супермаркету: от входа (овощи, хлеб) к кассе (химия, аптека)
const STORE_ORDER: ShoppingCategory[] = ['produce', 'bakery', 'meat', 'dairy', 'pantry', 'drinks', 'sweets', 'household', 'pharmacy', 'other'];
const CATEGORY_ICON: Record<ShoppingCategory, React.ElementType> = {
  produce: Carrot,
  bakery: Croissant,
  meat: Beef,
  dairy: Milk,
  pantry: Wheat,
  drinks: CupSoda,
  sweets: Candy,
  household: SprayCan,
  pharmacy: Pill,
  other: Package,
};

const CATEGORY_NAMES: Record<ShoppingCategory, string> = {
  produce: 'Овощи, фрукты и зелень',
  dairy: 'Молочные продукты и яйца',
  meat: 'Мясо, птица и рыба',
  bakery: 'Хлеб и выпечка',
  pantry: 'Бакалея, крупы и специи',
  household: 'Бытовая химия',
  pharmacy: 'Аптека',
  drinks: 'Напитки',
  sweets: 'Сладости и снеки',
  other: 'Разное',
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
    recategorizeShoppingItems,
    showToast,
    updateShoppingItem,
    updateShoppingList,
    deleteShoppingList,
  } = useHousehold();

  const [newTitle, setNewTitle] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  // По умолчанию отдел определяется сам по названию; выбранный вручную — применяется как есть
  const [newCategory, setNewCategory] = useState<ShoppingCategory | 'auto'>('auto');
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
      defaultCategory: newCategory === 'auto' ? undefined : newCategory,
      defaultQuantity: newQuantity,
      forceCategory: newCategory !== 'auto',
    });
  }, [newTitle, newCategory, newQuantity]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addShoppingItem(
      {
      listId: activeList.id,
      title: newTitle.trim(),
      category: newCategory === 'auto' ? 'other' : newCategory,
      quantity: newQuantity.trim() || undefined,
      completed: false,
      addedBy: activeMemberId || undefined,
      },
      { forceCategory: newCategory !== 'auto' }
    );

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
    if (icon === 'BookOpen') return <BookOpen className="w-4 h-4 text-[var(--accent)]" />;
    return <ShoppingCart className="w-4 h-4 text-rose-500" />;
  };

  const progressPercent =
    currentListItems.length > 0
      ? Math.round((completedItems.length / currentListItems.length) * 100)
      : 0;

  const [showCompleted, setShowCompleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; quantity: string; category: ShoppingCategory; listId: string }>({ title: '', quantity: '', category: 'other', listId: '' });
  const [listAction, setListAction] = useState<null | 'rename' | 'delete'>(null);
  const [listName, setListName] = useState('');
  // «В магазине»: крупно, по отделам в порядке маршрута, экран не гаснет
  const [shopMode, setShopMode] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  React.useEffect(() => {
    if (!shopMode) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);
    return () => {
      lock?.release().catch(() => undefined);
    };
  }, [shopMode]);
  // «Покупки» и «Чеки» — одна тема, один раздел
  const [mode, setMode] = useState<'lists' | 'supplies' | 'receipts'>(() => {
    try {
      const v = localStorage.getItem('dbh_shopping_mode');
      localStorage.removeItem('dbh_shopping_mode');
      return v === 'receipts' || v === 'supplies' ? v : 'lists';
    } catch {
      return 'lists';
    }
  });
  const modeSwitch = (
    <Segmented
      value={mode}
      onChange={setMode}
      options={[
        { id: 'lists', label: 'Списки' },
        { id: 'supplies', label: 'Запасы' },
        { id: 'receipts', label: 'Чеки' },
      ]}
    />
  );
  if (mode === 'supplies')
    return (
      <PageWrap className="max-w-7xl">
        {modeSwitch}
        <SuppliesBoard />
      </PageWrap>
    );
  if (mode === 'receipts')
    return (
      <PageWrap className="max-w-7xl">
        {modeSwitch}
        <ReceiptsView embedded />
      </PageWrap>
    );
  const inputCls =
    'w-full px-4 py-2.5 rounded-full bg-[var(--surface-2)] border border-[var(--line)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors';

  const itemRow = (item: ShoppingItem, done = false) => {
    const author = members.find((m) => m.id === item.addedBy);
    // Правка позиции: название, количество, отдел, список
    if (editingId === item.id)
      return (
        <div key={item.id} className="px-3 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2">
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} aria-label="Название" autoFocus />
            <input value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} placeholder="Количество" className={inputCls} aria-label="Количество" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ShoppingCategory })} className={inputCls} aria-label="Отдел">
              {STORE_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_NAMES[c]}
                </option>
              ))}
            </select>
            <select value={draft.listId} onChange={(e) => setDraft({ ...draft, listId: e.target.value })} className={inputCls} aria-label="Список">
              {shoppingLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Btn size="sm" variant="ghost" onClick={() => setEditingId(null)}>
              Отмена
            </Btn>
            <Btn
              size="sm"
              variant="primary"
              onClick={() => {
                if (!draft.title.trim()) return;
                updateShoppingItem(item.id, { title: draft.title.trim(), quantity: draft.quantity.trim() || undefined, category: draft.category, listId: draft.listId });
                setEditingId(null);
              }}
            >
              Сохранить
            </Btn>
          </div>
        </div>
      );
    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={() => toggleShoppingItem(item.id)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggleShoppingItem(item.id))}
        className={`group flex items-center gap-3.5 px-3 ${shopMode ? 'py-4' : 'py-3'} rounded-xl hover:bg-[var(--surface-3)] focus-visible:bg-[var(--surface-3)] outline-none transition-colors cursor-pointer`}
      >
        <span
          className={`w-6 h-6 rounded-full grid place-items-center border shrink-0 transition-colors ${
            done
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-[var(--line-strong)] text-transparent group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]'
          }`}
          aria-hidden="true"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className={`${shopMode ? 'text-[18px]' : 'text-[16px]'} truncate ${done ? 'line-through text-[var(--muted)]' : 'text-[var(--text)] font-medium'}`}>
            {item.title}
          </div>
          {item.recipeSource && !done && (
            <div className="text-[14px] text-[var(--muted)] truncate mt-0.5">Для рецепта: {item.recipeSource}</div>
          )}
        </div>
        {item.quantity && <span className="text-sm tabular-nums text-[var(--text-2)] shrink-0">{item.quantity}</span>}
        {author && <MemberAvatar member={author} size="xs" title={`Добавил(а): ${author.name}`} />}
        <IconBtn
          aria-label="Изменить"
          title="Изменить"
          className="hover-actions opacity-0 group-hover:opacity-100 focus:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setDraft({ title: item.title, quantity: item.quantity || '', category: item.category, listId: item.listId });
            setEditingId(item.id);
          }}
        >
          <Pencil className="w-4 h-4" />
        </IconBtn>
        <IconBtn
          danger
          aria-label="Удалить"
          title="Удалить"
          className="hover-actions opacity-0 group-hover:opacity-100 focus:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            deleteShoppingItem(item.id);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </IconBtn>
      </div>
    );
  };

  return (
    <PageWrap>
      {modeSwitch}
      {/* Режим «В магазине» */}
      {shopMode && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl text-[var(--text)]">{activeList?.name}</h2>
            <p className="text-sm text-[var(--muted)]">Осталось {pendingItems.length} · по отделам, как идёте по магазину</p>
          </div>
          <Btn icon={<XIcon className="w-4 h-4" />} onClick={() => setShopMode(false)}>
            Выйти
          </Btn>
        </div>
      )}

      {!shopMode && (
      <>
      {/* Списки и действия */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Segmented
            value={activeList?.id || ''}
            onChange={setActiveShoppingListId}
            options={shoppingLists.map((l) => ({
              id: l.id,
              label: l.name,
              count: shoppingItems.filter((i) => i.listId === l.id && !i.completed).length,
            }))}
          />
          <Btn variant="ghost" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsAddingNewList(true)} aria-label="Новый список">
            <span className="hidden sm:inline">Новый список</span>
          </Btn>
          {activeList && (
            <>
              <Btn variant="ghost" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={() => { setListName(activeList.name); setListAction('rename'); }} aria-label="Переименовать список">
                <span className="hidden sm:inline">Переименовать</span>
              </Btn>
              {!activeList.isDefault && (
                <Btn variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => setListAction('delete')} aria-label="Удалить список">
                  <span className="hidden sm:inline">Удалить список</span>
                </Btn>
              )}
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Btn icon={<ListPlus className="w-4 h-4" />} onClick={() => setIsBulkAddOpen(true)}>
            Вставить списком
          </Btn>
          <Btn variant="primary" icon={<Camera className="w-4 h-4" />} onClick={() => setIsScannerOpen(true)}>
            Сканировать чек
          </Btn>
        </div>
      </div>

      {isAddingNewList && (
        <Card className="p-3 max-w-lg">
          <form onSubmit={handleCreateList} className="flex items-center gap-2">
            <input
              type="text"
              required
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Название списка, например «Ozon»"
              className={inputCls}
            />
            <Btn variant="primary" type="submit">
              Создать
            </Btn>
            <Btn variant="ghost" onClick={() => setIsAddingNewList(false)}>
              Отмена
            </Btn>
          </form>
        </Card>
      )}

      {listAction && activeList && (
        <Card className="p-4 flex flex-wrap items-center gap-3">
          {listAction === 'rename' ? (
            <>
              <input value={listName} onChange={(e) => setListName(e.target.value)} className={`${inputCls} flex-1 min-w-[200px]`} aria-label="Название списка" autoFocus />
              <Btn size="sm" variant="ghost" onClick={() => setListAction(null)}>Отмена</Btn>
              <Btn size="sm" variant="primary" onClick={() => { if (listName.trim()) updateShoppingList(activeList.id, { name: listName.trim() }); setListAction(null); }}>
                Сохранить
              </Btn>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-[var(--text)]">
                Удалить список «{activeList.name}» и все его товары ({currentListItems.length})?
              </span>
              <Btn size="sm" variant="ghost" onClick={() => setListAction(null)}>Отмена</Btn>
              <Btn size="sm" variant="danger" onClick={() => { deleteShoppingList(activeList.id); setListAction(null); }}>
                Удалить
              </Btn>
            </>
          )}
        </Card>
      )}

      {/* Добавление товара */}
      <Card className="p-3 sm:p-4">
        <form onSubmit={handleAddItem} className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Что купить? Например: молоко, 2 пачки творога и яйца"
            className={`${inputCls} flex-1`}
          />
          <input
            type="text"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder="Количество"
            className={`${inputCls} md:w-36`}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as ShoppingCategory | 'auto')}
            className={`${inputCls} md:w-56 appearance-none`}
          >
            <option value="auto">Отдел — автоматически</option>
            {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <Btn variant="primary" type="submit" icon={<Plus className="w-4 h-4" />}>
            Добавить
          </Btn>
        </form>
        <div className="mt-3 px-1 flex items-center gap-1.5 flex-wrap text-[14px] text-[var(--muted)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
          {previewItems.length > 1 ? (
            <>
              <span>Будет {previewItems.length} позиции:</span>
              {previewItems.map((it, idx) => (
                <Tag key={idx} tone="accent">
                  {it.title}
                  {it.quantity ? `, ${it.quantity}` : ''}
                </Tag>
              ))}
            </>
          ) : (
            <span>Пишите через запятую или «и» — каждая позиция ляжет в свой отдел.</span>
          )}
        </div>
      </Card>

      </>
      )}

      {/* Список */}
      <Card className="p-2 sm:p-3">
        <Slide k={activeList?.id || 'none'} index={shoppingLists.findIndex((l) => l.id === activeList?.id)}>
        {currentListItems.length > 0 && !shopMode && (
          <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1">
            <Btn size="sm" variant="primary" icon={<Store className="w-3.5 h-3.5" />} onClick={() => setShopMode(true)}>
              В магазине
            </Btn>
            <Btn
              size="sm"
              variant="ghost"
              onClick={() => {
                const n = recategorizeShoppingItems(activeList?.id);
                showToast(n ? `Переложено по отделам: ${n}` : 'Все товары уже в своих отделах', 'success');
              }}
            >
              Разложить по отделам
            </Btn>
          </div>
        )}
        {currentListItems.length > 0 && (
          <div className="px-3 pt-2 pb-3">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[16px] font-semibold text-[var(--text)]">{activeList?.name}</span>
              <span className="text-[var(--muted)] tabular-nums">
                Куплено {completedItems.length} из {currentListItems.length}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {currentListItems.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-5 h-5" />}
            title="Список пуст"
            text="Добавьте товары в строке выше или вставьте готовый список из заметок."
            action={
              <>
                <Btn onClick={() => setNewTitle('Молоко 1 л, 2 пачки творога и яйца')}>Пример</Btn>
                <Btn variant="primary" icon={<ListPlus className="w-4 h-4" />} onClick={() => setIsBulkAddOpen(true)}>
                  Вставить списком
                </Btn>
              </>
            }
          />
        ) : (
          <>
            {STORE_ORDER.map((category) => {
              const items = groupedPending[category];
              if (!items || items.length === 0) return null;
              const Icon = CATEGORY_ICON[category];
              const isCollapsed = collapsed[category];
              return (
                <div key={category}>
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [category]: !c[category] }))}
                    aria-expanded={!isCollapsed}
                    className={`sticky top-0 z-[1] w-full flex items-center gap-2.5 px-3 pt-4 pb-2 bg-[var(--surface)] text-left ${shopMode ? 'text-[16px]' : 'text-[14px]'} font-medium text-[var(--text-2)]`}
                  >
                    <Icon className={shopMode ? 'w-5 h-5 text-[var(--accent)]' : 'w-4 h-4 text-[var(--muted)]'} />
                    <span className="flex-1">{CATEGORY_NAMES[category]}</span>
                    <span className="tabular-nums text-[var(--muted)]">{items.length}</span>
                    <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                  {!isCollapsed && items.map((it) => itemRow(it))}
                </div>
              );
            })}

            {pendingItems.length === 0 && (
              <p className="px-4 py-6 text-sm text-[var(--text-2)]">Всё куплено.</p>
            )}

            {completedItems.length > 0 && (
              <div className="border-t border-[var(--line)] mt-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setShowCompleted((v) => !v)}
                    aria-expanded={showCompleted}
                    className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-[14px] font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                  >
                    В корзине <span className="tabular-nums">{completedItems.length}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${showCompleted ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <Btn variant="ghost" size="sm" onClick={() => clearCompletedShoppingItems(activeList.id)}>
                    Очистить
                  </Btn>
                </div>
                {showCompleted && completedItems.map((it) => itemRow(it, true))}
              </div>
            )}
          </>
        )}
        </Slide>
      </Card>

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
    </PageWrap>
  );
};
