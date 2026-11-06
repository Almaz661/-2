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

export const InventoryView: React.FC = () => {
  const { inventory, deleteInventoryItem, setIsSOSOpen, showToast } = useHousehold();

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
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
          Гарантия истекла
        </span>
      );
    }
    if (diffDays <= 60) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center space-x-1">
          <ShieldAlert className="w-3 h-3 text-amber-600" />
          <span>Истекает ({diffDays} дн.)</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center space-x-1">
        <Shield className="w-3 h-3 text-emerald-600" />
        <span>Гарантия до {expiry.toLocaleDateString('ru-RU')}</span>
      </span>
    );
  };

  const getCategoryIcon = (cat: InventoryCategory) => {
    switch (cat) {
      case 'vehicles':
        return <Car className="w-4 h-4 text-blue-600" />;
      case 'pets':
        return <Dog className="w-4 h-4 text-amber-600" />;
      case 'electronics':
        return <Tv className="w-4 h-4 text-purple-600" />;
      case 'subscriptions':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      default:
        return <Package className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Верхняя строка управления */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Табы категорий */}
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-[#EFECE4] border border-[#E3DFD5] overflow-x-auto">
          {[
            { id: 'all', label: 'Все предметы' },
            { id: 'appliances', label: 'Бытовая техника' },
            { id: 'electronics', label: 'Гаджеты' },
            { id: 'vehicles', label: 'Автомобиль' },
            { id: 'pets', label: 'Питомцы' },
            { id: 'subscriptions', label: 'Подписки' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === tab.id
                  ? 'bg-white text-[#1F1D1A] shadow-xs'
                  : 'text-[#6B6456] hover:text-[#1F1D1A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setItemToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>
            {activeCategory === 'pets'
              ? 'Добавить питомца'
              : activeCategory === 'vehicles'
              ? 'Добавить автомобиль'
              : 'Добавить предмет'}
          </span>
        </button>
      </div>

      {/* Сетка предметов инвентаря */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EBE7DF] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            {activeCategory === 'pets' ? <Dog className="w-6 h-6" /> : <Package className="w-6 h-6" />}
          </div>
          <p className="text-sm font-bold text-stone-700">
            {activeCategory === 'pets' ? 'В семье пока не добавлены питомцы' : 'В этой категории пока пусто'}
          </p>
          <p className="text-xs text-stone-500">
            {activeCategory === 'pets'
              ? 'Добавьте собаку, кошку или другого любимца, чтобы хранить чип, вакцинации и диету'
              : 'Добавьте предмет, чтобы всегда знать где он лежит и когда кончается гарантия'}
          </p>
          <button
            onClick={() => {
              setItemToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#E15A42] text-white text-xs font-bold hover:bg-[#D04931] cursor-pointer"
          >
            {activeCategory === 'pets' ? '+ Добавить питомца' : '+ Добавить предмет'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-5 border border-[#EBE7DF] shadow-xs hover:border-[#E15A42]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF8F3] border border-[#EBE7DF] flex items-center justify-center">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1F1D1A] leading-snug">
                        {item.name}
                      </h3>
                      <span className="text-[10px] font-semibold text-[#8A8477] bg-[#F2EFE8] px-2 py-0.5 rounded-md mt-0.5 inline-block">
                        {item.locationZone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setItemToEdit(item);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 border border-stone-200 transition-all cursor-pointer shadow-2xs"
                      title={item.category === 'pets' ? 'Редактировать питомца' : 'Редактировать предмет'}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-2 rounded-xl text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 transition-all cursor-pointer shadow-2xs"
                      title={item.category === 'pets' ? 'Удалить питомца' : 'Удалить предмет'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Детали модели / серийника */}
                {item.model && (
                  <div className="text-xs text-[#5C564B]">
                    <span className="text-[#8A8477]">Модель:</span> {item.model}
                  </div>
                )}
                {item.serialNumber && (
                  <div className="text-[11px] text-[#8A8477] font-mono">
                    S/N: {item.serialNumber}
                  </div>
                )}

                {/* Специфика авто */}
                {item.vehicleDetails && (
                  <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs space-y-1">
                    <div className="font-bold text-blue-900">
                      Госномер: {item.vehicleDetails.licensePlate}
                    </div>
                    {item.vehicleDetails.insuranceExpiry && (
                      <div className="text-blue-700 text-[11px]">
                        ОСАГО/КАСКО до:{' '}
                        {new Date(item.vehicleDetails.insuranceExpiry).toLocaleDateString(
                          'ru-RU'
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Специфика питомца */}
                {item.petDetails && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-2">
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>Порода: {item.petDetails.breed || 'Не указана'}</span>
                      <span className="text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        Питомец
                      </span>
                    </div>

                    {item.petDetails.chipNumber && (
                      <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-[11px]">
                        <span className="text-amber-800 font-medium">Микрочип:</span>
                        <div className="flex items-center space-x-1.5 font-mono text-stone-800">
                          <span>{item.petDetails.chipNumber}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.petDetails!.chipNumber!);
                              setCopiedChipId(item.id);
                              showToast(`Чип питомца ${item.name} скопирован в буфер`, 'success');
                              setTimeout(() => setCopiedChipId(null), 2000);
                            }}
                            className="p-1 rounded text-stone-500 hover:text-amber-900 hover:bg-amber-100 cursor-pointer"
                            title="Скопировать номер микрочипа"
                          >
                            {copiedChipId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {item.petDetails.nextVaccinationDate && (
                      <div className="text-amber-900 text-[11px] font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>
                          Прививка до:{' '}
                          <strong>
                            {new Date(item.petDetails.nextVaccinationDate).toLocaleDateString('ru-RU')}
                          </strong>
                        </span>
                      </div>
                    )}

                    {/* Быстрая кнопка перехода в SOS Ветклинику */}
                    <button
                      onClick={() => setIsSOSOpen(true)}
                      className="w-full mt-1 py-1.5 px-2.5 rounded-xl bg-amber-600/15 hover:bg-amber-600/25 text-amber-900 font-bold text-[11px] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-amber-300"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      <span>Экстренная ветклиника (в SOS)</span>
                    </button>
                  </div>
                )}

                {/* Специфика подписки */}
                {item.subscriptionDetails && (
                  <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100 text-xs space-y-1">
                    <div className="font-bold text-purple-900">
                      {item.subscriptionDetails.cost} ₽ в месяц
                    </div>
                    <div className="text-purple-700 text-[11px]">
                      Следующее списание:{' '}
                      {new Date(
                        item.subscriptionDetails.nextPaymentDate
                      ).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                )}

                {item.notes && (
                  <p className="text-xs text-[#8A8477] bg-[#FAF8F5] p-2.5 rounded-xl border border-stone-100 leading-relaxed">
                    {item.notes}
                  </p>
                )}
              </div>

              {/* Статус гарантии */}
              {item.warrantyExpiry && (
                <div className="pt-2 border-t border-[#F0ECE1]">
                  {getWarrantyStatus(item.warrantyExpiry)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно подтверждения удаления предмета/питомца */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-bold text-base text-[#1F1D1A]">Удалить запись?</h3>
            </div>
            <p className="text-xs text-[#5C564B] leading-relaxed">
              Вы уверены, что хотите удалить «{itemToDelete.name}» из инвентаря дома?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  deleteInventoryItem(itemToDelete.id);
                  showToast(`«${itemToDelete.name}» удалено`, 'info');
                  setItemToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
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
    </div>
  );
};
