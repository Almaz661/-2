import React, { useState } from 'react';
import {
  Package,
  Plus,
  Shield,
  ShieldAlert,
  Car,
  Dog,
  Tv,
  CreditCard,
  Edit2,
  Trash2,
  Wrench,
  Calendar,
  Copy,
  Check,
  Phone,
  Pencil,
  X,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { InventoryCategory, InventoryItem } from '../../types';
import { InventoryItemModal } from './InventoryItemModal';
import { TechCheckBoard } from './TechCheckBoard';
import { HomePassport } from './HomePassport';
import { Btn, Card, EmptyState, IconBtn, PageWrap, Segmented, Slide } from '../ui/mercury';

export const InventoryView: React.FC = () => {
  const [mode, setMode] = React.useState<'items' | 'tech' | 'passport'>(() => {
    try {
      const v = localStorage.getItem('dbh_inventory_mode');
      localStorage.removeItem('dbh_inventory_mode');
      return v === 'tech' || v === 'passport' ? v : 'items';
    } catch {
      return 'items';
    }
  });
  const { inventory, deleteInventoryItem, setIsSOSOpen, showToast, members } = useHousehold();

  const [activeCategory, setActiveCategory] = useState<InventoryCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [copiedChipId, setCopiedChipId] = useState<string | null>(null);

  const filteredItems = inventory.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const getWarrantyStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return (
        <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
          Гарантия истекла
        </span>
      );
    }
    if (diffDays <= 60) {
      return (
        <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center space-x-1">
          <ShieldAlert className="w-3 h-3 text-amber-600" />
          <span>Истекает ({diffDays} дн.)</span>
        </span>
      );
    }
    return (
      <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center space-x-1">
        <Shield className="w-3 h-3 text-emerald-600" />
        <span>Гарантия до {expiry.toLocaleDateString('ru-RU')}</span>
      </span>
    );
  };

  const getCategoryIcon = (cat: InventoryCategory) => {
    switch (cat) {
      case 'vehicles':
        return <Car className="w-4 h-4 text-[var(--accent)]" />;
      case 'pets':
        return <Dog className="w-4 h-4 text-amber-600" />;
      case 'electronics':
        return <Tv className="w-4 h-4 text-[var(--accent)]" />;
      case 'subscriptions':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      default:
        return <Package className="w-4 h-4 text-stone-600" />;
    }
  };

  const CATS: { id: InventoryCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'appliances' as InventoryCategory, label: 'Техника' },
    { id: 'electronics' as InventoryCategory, label: 'Гаджеты' },
    { id: 'vehicles' as InventoryCategory, label: 'Автомобили' },
    { id: 'pets' as InventoryCategory, label: 'Питомцы' },
    { id: 'subscriptions' as InventoryCategory, label: 'Подписки' },
  ];

  const daysTo = (d?: string) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);
  const fmt = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

  // Главная дата строки: то, о чём нужно помнить по этому предмету
  const keyDate = (item: InventoryItem): { label: string; date?: string } => {
    if (item.category === 'vehicles') {
      const cands = [
        { label: 'ТО', date: item.vehicleDetails?.nextMaintenanceDate },
        { label: 'Страховка', date: item.vehicleDetails?.insuranceExpiry },
      ].filter((c) => c.date) as { label: string; date: string }[];
      cands.sort((a, b) => a.date.localeCompare(b.date));
      return cands[0] || { label: 'Сроки' };
    }
    if (item.category === 'pets') return { label: 'Прививка', date: item.petDetails?.nextVaccinationDate };
    if (item.category === 'subscriptions') return { label: 'Списание', date: item.subscriptionDetails?.nextPaymentDate };
    if (item.nextServiceDate) return { label: 'Обслуживание', date: item.nextServiceDate };
    return { label: 'Гарантия', date: item.warrantyExpiry };
  };

  const detail = (item: InventoryItem) => {
    if (item.category === 'vehicles') return [item.vehicleDetails?.licensePlate, item.vehicleDetails?.mileage ? `${item.vehicleDetails.mileage.toLocaleString('ru-RU')} км` : null];
    if (item.category === 'pets') return [item.petDetails?.breed, item.petDetails?.chipNumber ? `чип ${item.petDetails.chipNumber}` : null];
    if (item.category === 'subscriptions' && item.subscriptionDetails)
      return [`${item.subscriptionDetails.cost} в ${item.subscriptionDetails.billingCycle === 'monthly' ? 'месяц' : 'год'}`];
    if (item.category === 'electronics' && item.gadgetDetails) {
      const g = item.gadgetDetails;
      const owner = g.ownerId ? members.find((m) => m.id === g.ownerId)?.name : null;
      const days = g.lastBackup ? Math.floor((Date.now() - new Date(g.lastBackup).getTime()) / 86400000) : null;
      return [g.kind, owner, item.model, days === null ? null : days > 60 ? `копия ${days} дн. назад — пора` : `копия ${days} дн. назад`];
    }
    return [item.model, item.serialNumber ? `S/N ${item.serialNumber}` : null];
  };

  const sortedItems = filteredItems.slice().sort((a, b) => (keyDate(a).date || '9999').localeCompare(keyDate(b).date || '9999'));

  const openNew = () => {
    setItemToEdit(null);
    setIsModalOpen(true);
  };

  return (
    <PageWrap>
      {/* Имущество и техосмотр дома — один раздел */}
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { id: 'items', label: 'Имущество' },
          { id: 'tech', label: 'Техосмотр дома' },
          { id: 'passport', label: 'Паспорт дома' },
        ]}
      />
      {mode === 'passport' ? (
        <HomePassport />
      ) : mode === 'tech' ? (
        <TechCheckBoard />
      ) : (
      <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={activeCategory} onChange={setActiveCategory} options={CATS} />
        <Btn variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openNew} className="ml-auto">
          Добавить
        </Btn>
      </div>

      <Card className="p-2 sm:p-3">
        <Slide k={activeCategory} index={CATS.findIndex((c) => c.id === activeCategory)}>
        {sortedItems.length === 0 ? (
          <EmptyState
            icon={<Package className="w-5 h-5" />}
            title="Здесь пока пусто"
            text="Добавьте технику, автомобиль, питомца или подписку — напомним о гарантии, ТО и платежах."
            action={
              <Btn variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openNew}>
                Добавить
              </Btn>
            }
          />
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[44px_1fr_140px_190px_88px] gap-x-3 px-3 pt-2 pb-2 text-xs text-[var(--muted)] border-b border-[var(--line)]">
              <span />
              <span>Предмет</span>
              <span>Где</span>
              <span>Ближайший срок</span>
              <span />
            </div>
            {sortedItems.map((item) => {
              const k = keyDate(item);
              const d = daysTo(k.date);
              const late = d !== null && d < 0;
              const soon = d !== null && d >= 0 && d <= 60;
              const info = detail(item).filter(Boolean).join(', ');
              const chip = item.petDetails?.chipNumber;
              return (
                <div
                  key={item.id}
                  className="group grid grid-cols-[44px_1fr_auto_auto] md:grid-cols-[44px_1fr_140px_190px_88px] items-center gap-x-3 px-2 sm:px-3 py-3 rounded-xl border-t border-[var(--line)] first:border-t-0 hover:bg-[var(--surface-3)] transition-colors"
                >
                  <span className="w-10 h-10 rounded-full grid place-items-center border border-[var(--line-strong)] text-[var(--muted)]">
                    {item.category === 'vehicles' ? (
                      <Car className="w-4 h-4" />
                    ) : item.category === 'pets' ? (
                      <Dog className="w-4 h-4" />
                    ) : item.category === 'electronics' ? (
                      <Tv className="w-4 h-4" />
                    ) : item.category === 'subscriptions' ? (
                      <CreditCard className="w-4 h-4" />
                    ) : (
                      <Package className="w-4 h-4" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="text-[16px] font-medium text-[var(--text)] line-clamp-2 md:line-clamp-1 break-words">{item.name}</div>
                    <div className="flex items-center gap-1 text-[14px] text-[var(--muted)] mt-0.5 min-w-0">
                      <span className="truncate">{info || item.notes || '—'}</span>
                      {chip && (
                        <IconBtn
                          title="Скопировать номер чипа"
                          aria-label="Скопировать номер чипа"
                          className="!w-6 !h-6 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(chip);
                            setCopiedChipId(item.id);
                            showToast('Номер чипа скопирован', 'info');
                            window.setTimeout(() => setCopiedChipId(null), 1500);
                          }}
                        >
                          {copiedChipId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </IconBtn>
                      )}
                    </div>
                  </div>

                  <span className="hidden md:block text-sm text-[var(--text-2)] truncate">{item.locationZone}</span>

                  <span
                    className={`text-[14px] md:text-sm tabular-nums text-right md:text-left max-w-[120px] md:max-w-none ${ late ? 'text-amber-700 font-medium' : soon ? 'text-amber-600 font-medium' : 'text-[var(--text-2)]' }`}
                  >
                    {k.date ? (late ? 'Пора' : soon ? `через ${d} дн.` : fmt(k.date)) : '—'}
                    <span className="block text-[14px] font-normal text-[var(--muted)]">
                      {k.label}
                      {k.date && (late || soon) ? `, ${new Date(k.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : ''}
                    </span>
                  </span>

                  <div className="flex items-center justify-end gap-0.5 hover-actions opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {item.category === 'pets' && (
                      <IconBtn title="Экстренная ветпомощь" aria-label="Экстренная ветпомощь" onClick={() => setIsSOSOpen(true)}>
                        <ShieldAlert className="w-4 h-4" />
                      </IconBtn>
                    )}
                    <IconBtn
                      title="Редактировать"
                      aria-label="Редактировать"
                      onClick={() => {
                        setItemToEdit(item);
                        setIsModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </IconBtn>
                    <IconBtn danger title="Удалить" aria-label="Удалить" onClick={() => setItemToDelete(item)}>
                      <Trash2 className="w-4 h-4" />
                    </IconBtn>
                  </div>
                </div>
              );
            })}
          </>
        )}
        </Slide>
      </Card>

      {/* Модальное окно подтверждения удаления предмета/питомца */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[var(--surface)] rounded-2xl p-6 shadow-2xl border border-[var(--line)] space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-semibold text-base text-[var(--text)]">Удалить запись?</h3>
            </div>
            <p className="text-xs text-[var(--text-2)] leading-relaxed">
              Вы уверены, что хотите удалить «{itemToDelete.name}» из инвентаря дома?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-full text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-3)]"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  deleteInventoryItem(itemToDelete.id);
                  showToast(`«${itemToDelete.name}» удалено`, 'info');
                  setItemToDelete(null);
                }}
                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition active:scale-95"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <InventoryItemModal
        isOpen={isModalOpen}
        defaultCategory={activeCategory === 'all' ? 'appliances' : activeCategory}
        onClose={() => {
          setIsModalOpen(false);
          setItemToEdit(null);
        }}
        itemToEdit={itemToEdit}
      />
      </>
      )}
    </PageWrap>
  );
};
