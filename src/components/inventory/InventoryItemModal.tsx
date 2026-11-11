import React, { useState, useEffect } from 'react';
import { X, Package, Shield, Calendar, DollarSign, Wrench, Dog, Car, Tv, CreditCard } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { HouseholdZone, InventoryCategory, InventoryItem } from '../../types';
import { formatLocalDate } from '../../utils/dateUtils';

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: InventoryItem | null;
  defaultCategory?: InventoryCategory;
}

const CATEGORIES: Array<{ id: InventoryCategory; label: string }> = [
  { id: 'appliances', label: 'Бытовая техника' },
  { id: 'electronics', label: 'Гаджеты и электроника' },
  { id: 'vehicles', label: 'Автомобиль / Транспорт' },
  { id: 'pets', label: 'Домашние животные (Питомцы)' },
  { id: 'subscriptions', label: 'Подписки и сервисы' },
  { id: 'home', label: 'Дом и мебель' },
];

const ZONES: HouseholdZone[] = [
  'Весь дом',
  'Кухня',
  'Гостиная',
  'Ванная',
  'Спальня',
  'Детская',
  'Прихожая',
  'Авто',
  'Участок/Дача',
];

export const InventoryItemModal: React.FC<InventoryItemModalProps> = ({
  isOpen,
  onClose,
  itemToEdit,
  defaultCategory = 'appliances',
}) => {
  const { addInventoryItem, updateInventoryItem, showToast, members } = useHousehold();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>(defaultCategory);
  const [locationZone, setLocationZone] = useState<HouseholdZone>('Весь дом');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [price, setPrice] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [serviceIntervalDays, setServiceIntervalDays] = useState<number | undefined>();

  // Специфика авто
  const [licensePlate, setLicensePlate] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');

  // Специфика питомца
  const [gKind, setGKind] = useState('');
  const [gOwner, setGOwner] = useState('');
  const [gBackup, setGBackup] = useState('');
  const [breed, setBreed] = useState('');
  const [chipNumber, setChipNumber] = useState('');
  const [nextVaccinationDate, setNextVaccinationDate] = useState('');

  // Специфика подписки
  const [subCost, setSubCost] = useState(399);
  const [nextPaymentDate, setNextPaymentDate] = useState('');

  // Синхронизация полей при открытии или смене редактируемого предмета
  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setName(itemToEdit.name || '');
        setCategory(itemToEdit.category || 'appliances');
        setLocationZone(itemToEdit.locationZone || 'Весь дом');
        setModel(itemToEdit.model || '');
        setSerialNumber(itemToEdit.serialNumber || '');
        setPurchaseDate(itemToEdit.purchaseDate || '');
        setWarrantyExpiry(itemToEdit.warrantyExpiry || '');
        setPrice(itemToEdit.price);
        setGKind(itemToEdit.gadgetDetails?.kind || '');
        setGOwner(itemToEdit.gadgetDetails?.ownerId || '');
        setGBackup(itemToEdit.gadgetDetails?.lastBackup || '');
        setNotes(itemToEdit.notes || '');
        setServiceIntervalDays(itemToEdit.serviceIntervalDays);

        setLicensePlate(itemToEdit.vehicleDetails?.licensePlate || '');
        setInsuranceExpiry(itemToEdit.vehicleDetails?.insuranceExpiry || '');

        setBreed(itemToEdit.petDetails?.breed || '');
        setChipNumber(itemToEdit.petDetails?.chipNumber || '');
        setNextVaccinationDate(itemToEdit.petDetails?.nextVaccinationDate || '');

        setSubCost(itemToEdit.subscriptionDetails?.cost || 399);
        setNextPaymentDate(itemToEdit.subscriptionDetails?.nextPaymentDate || '');
      } else {
        setName('');
        setCategory(defaultCategory);
        setLocationZone(defaultCategory === 'pets' ? 'Весь дом' : defaultCategory === 'vehicles' ? 'Авто' : 'Кухня');
        setModel('');
        setSerialNumber('');
        setPurchaseDate('');
        setWarrantyExpiry('');
        setPrice(undefined);
        setNotes('');
        setServiceIntervalDays(undefined);

        setLicensePlate('');
        setInsuranceExpiry('');

        setBreed('');
        setChipNumber('');
        setNextVaccinationDate('');

        setSubCost(399);
        setNextPaymentDate('');
      }
    }
  }, [isOpen, itemToEdit, defaultCategory]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(category === 'pets' ? 'Укажите кличку питомца' : 'Укажите название предмета', 'warning');
      return;
    }

    const data: Omit<InventoryItem, 'id'> = {
      name: name.trim(),
      category,
      locationZone,
      model: model.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      warrantyExpiry: warrantyExpiry || undefined,
      price: price ? Number(price) : undefined,
      notes: notes.trim() || undefined,
      serviceIntervalDays: serviceIntervalDays ? Number(serviceIntervalDays) : undefined,
      vehicleDetails:
        category === 'vehicles'
          ? {
              licensePlate: licensePlate.trim() || undefined,
              insuranceExpiry: insuranceExpiry || undefined,
            }
          : undefined,
      gadgetDetails: category === 'electronics' ? { kind: gKind || undefined, ownerId: gOwner || undefined, lastBackup: gBackup || undefined } : undefined,
      petDetails:
        category === 'pets'
          ? {
              breed: breed.trim() || undefined,
              chipNumber: chipNumber.trim() || undefined,
              nextVaccinationDate: nextVaccinationDate || undefined,
            }
          : undefined,
      subscriptionDetails:
        category === 'subscriptions'
          ? {
              cost: Number(subCost),
              billingCycle: 'monthly',
              nextPaymentDate: nextPaymentDate || formatLocalDate(new Date()),
            }
          : undefined,
    };

    if (itemToEdit) {
      updateInventoryItem(itemToEdit.id, data);
    } else {
      addInventoryItem(data);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[var(--surface-2)] rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface)]">
          <div className="flex items-center space-x-2">
            {category === 'pets' ? (
              <Dog className="w-5 h-5 text-amber-600" />
            ) : category === 'vehicles' ? (
              <Car className="w-5 h-5 text-[var(--accent)]" />
            ) : (
              <Package className="w-5 h-5 text-[var(--accent)]" />
            )}
            <h3 className="text-base font-semibold text-[var(--text)]">
              {category === 'pets'
                ? itemToEdit
                  ? 'Редактировать данные питомца'
                  : 'Добавить питомца в семью'
                : itemToEdit
                ? 'Редактировать предмет'
                : 'Добавить предмет в инвентарь'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-black/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">
              {category === 'pets' ? 'Кличка питомца *' : 'Название предмета *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                category === 'pets'
                  ? 'Например: Корги Барни, Кот Барсик, попугай Кеша...'
                  : 'Например: Стиральная машина LG, Автомобиль...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Категория
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Зона дома
              </label>
              <select
                value={locationZone}
                onChange={(e) => setLocationZone(e.target.value as HouseholdZone)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Гаджеты: что это, чей, резервная копия */}
          {category === 'electronics' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[var(--surface-3)] border border-[var(--line)]">
              <label className="block">
                <span className="block text-xs font-semibold text-[var(--text)] mb-1">Что это</span>
                <select value={gKind} onChange={(e) => setGKind(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm bg-[var(--surface)] border border-[var(--line)] text-[var(--text)]">
                  <option value="">—</option>
                  {['Телефон', 'Планшет', 'Ноутбук', 'Компьютер', 'Умные часы', 'Электронная книга', 'Наушники', 'Роутер', 'Принтер', 'Колонка или умный дом', 'Приставка', 'Другое'].map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-[var(--text)] mb-1">Чей</span>
                <select value={gOwner} onChange={(e) => setGOwner(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm bg-[var(--surface)] border border-[var(--line)] text-[var(--text)]">
                  <option value="">Общий</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-[var(--text)] mb-1">Последняя резервная копия</span>
                <input type="date" value={gBackup} onChange={(e) => setGBackup(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm bg-[var(--surface)] border border-[var(--line)] text-[var(--text)]" />
              </label>
            </div>
          )}

          {/* Специфика техники */}
          {(category === 'appliances' || category === 'electronics') && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-[var(--surface-3)] border border-[var(--line)]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Модель
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Напр: S8 Pro Ultra"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Серийный номер
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="SN-12345"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Гарантия до
                  </label>
                  <input
                    type="date"
                    value={warrantyExpiry}
                    onChange={(e) => setWarrantyExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Период ТО (дней)
                  </label>
                  <input
                    type="number"
                    value={serviceIntervalDays || ''}
                    onChange={(e) => setServiceIntervalDays(Number(e.target.value))}
                    placeholder="Напр: 90 (фильтр)"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Специфика авто */}
          {category === 'vehicles' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-[var(--accent-soft)]/50 border border-[var(--line)]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Госномер
                  </label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="А 123 ВС 777"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    ОСАГО/КАСКО до
                  </label>
                  <input
                    type="date"
                    value={insuranceExpiry}
                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Специфика питомца */}
          {category === 'pets' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Порода
                  </label>
                  <input
                    type="text"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder="Корги, Мейн-кун..."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Вакцинация до
                  </label>
                  <input
                    type="date"
                    value={nextVaccinationDate}
                    onChange={(e) => setNextVaccinationDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Специфика подписки */}
          {category === 'subscriptions' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-[var(--accent-soft)]/50 border border-[var(--line)]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Сумма списания (₽/мес)
                  </label>
                  <input
                    type="number"
                    value={subCost}
                    onChange={(e) => setSubCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Дата списания
                  </label>
                  <input
                    type="date"
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">
              Заметки и регламент
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Как обслуживать, какой фильтр покупать, особенности..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)] resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-black/5"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
            >
              {itemToEdit ? 'Сохранить' : 'Добавить в дом'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
