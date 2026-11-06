import React, { useState, useMemo, useEffect } from 'react';
import {
  Pill,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Trash2,
  Edit2,
  CheckCircle2,
  Filter,
  X,
  MapPin,
  Calendar,
  Sparkles,
  ShieldAlert,
  Info,
  ChevronDown,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { MedicineItem, MedicineCategory, MedicineForm } from '../../types';

const CATEGORY_LABELS: Record<MedicineCategory, { label: string; color: string }> = {
  fever: { label: 'Жаропонижающие', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  painkiller: { label: 'Обезболивающие', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  cold: { label: 'Простуда и грипп', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  allergy: { label: 'От аллергии', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  digestive: { label: 'ЖКТ и пищеварение', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  antiseptic: { label: 'Антисептики', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  vitamins: { label: 'Витамины и БАД', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  chronic: { label: 'Постоянный приём', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  other: { label: 'Другое', color: 'bg-stone-50 text-stone-700 border-stone-200' },
};

const FORM_LABELS: Record<MedicineForm, string> = {
  pills: 'Таблетки/капсулы',
  syrup: 'Сироп/суспензия',
  drops: 'Капли',
  spray: 'Спрей',
  ointment: 'Мазь/крем',
  powder: 'Порошок/саше',
  bandage: 'Перевязка',
  other: 'Другое',
};

export const FirstAidView: React.FC = () => {
  const { medicines, addMedicine, updateMedicine, deleteMedicine, addMedicineToShoppingList } =
    useHousehold();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MedicineCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attention' | 'low'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineItem | null>(null);

  // Расчёт статуса срока годности
  const getExpiryStatus = (expiryDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'expired' as const,
        diffDays: Math.abs(diffDays),
        label: `Просрочено на ${Math.abs(diffDays)} дн.`,
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      };
    } else if (diffDays <= 30) {
      return {
        status: 'critical' as const,
        diffDays,
        label: `Истекает через ${diffDays} дн.!`,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold animate-pulse',
      };
    } else if (diffDays <= 60) {
      return {
        status: 'warning' as const,
        diffDays,
        label: `Истекает через ${diffDays} дн.`,
        badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      };
    }
    return {
      status: 'ok' as const,
      diffDays,
      label: `Годен до ${new Date(expiryDateStr).toLocaleDateString('ru-RU')}`,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  };

  // Сводка по аптечке
  const stats = useMemo(() => {
    let expired = 0;
    let critical = 0;
    let low = 0;
    medicines.forEach((m) => {
      const exp = getExpiryStatus(m.expiryDate);
      if (exp.status === 'expired') expired++;
      else if (exp.status === 'critical' || exp.status === 'warning') critical++;
      if (m.isLow) low++;
    });
    return {
      total: medicines.length,
      expired,
      critical,
      low,
      safe: medicines.length - expired - critical,
    };
  }, [medicines]);

  // Фильтрация лекарств
  const filteredMedicines = useMemo(() => {
    return medicines
      .filter((m) => {
        // Поиск по названию, действующему веществу, инструкции, локации
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = m.name.toLowerCase().includes(q);
          const matchSubstance = m.activeSubstance?.toLowerCase().includes(q);
          const matchInstructions = m.instructions?.toLowerCase().includes(q);
          const matchLocation = m.location?.toLowerCase().includes(q);
          const matchNotes = m.notes?.toLowerCase().includes(q);
          if (!matchName && !matchSubstance && !matchInstructions && !matchLocation && !matchNotes) {
            return false;
          }
        }

        // Фильтр по категории
        if (selectedCategory !== 'all' && m.category !== selectedCategory) {
          return false;
        }

        // Фильтр по статусу
        if (statusFilter === 'attention') {
          const exp = getExpiryStatus(m.expiryDate);
          return exp.status === 'expired' || exp.status === 'critical' || exp.status === 'warning';
        }

        if (statusFilter === 'low') {
          return m.isLow;
        }

        return true;
      })
      .sort((a, b) => {
        // Сначала просроченные и критичные, затем по дате
        const expA = getExpiryStatus(a.expiryDate);
        const expB = getExpiryStatus(b.expiryDate);
        if (expA.status === 'expired' && expB.status !== 'expired') return -1;
        if (expB.status === 'expired' && expA.status !== 'expired') return 1;
        return a.expiryDate.localeCompare(b.expiryDate);
      });
  }, [medicines, searchQuery, selectedCategory, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingMedicine(null);
    setIsModalOpen(true);
  };

  const handleEdit = (med: MedicineItem) => {
    setEditingMedicine(med);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Медицинский дисклеймер */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 sm:p-4 flex items-start gap-3 text-amber-900 text-xs shadow-2xs">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-950">Медицинская оговорка:</strong> Приложение предназначено исключительно для учёта сроков годности и домашнего инвентаря. Не используйте информацию из приложения для самолечения. Всегда консультируйтесь с лечащим врачом или фармацевтом перед приёмом лекарственных препаратов.
        </p>
      </div>

      {/* 1. Верхний информационный дашборд аптечки */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl p-5 border border-[#E8E2D4] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8C867D]">Всего в аптечке</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#E15A42] flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1F1E1C] mt-2">{stats.total}</div>
          <span className="text-[11px] text-[#8C867D]">наименований средств</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-[#E8E2D4] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">В норме</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{stats.safe}</div>
          <span className="text-[11px] text-emerald-600 font-medium">актуальные сроки</span>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'attention' ? 'all' : 'attention')}
          className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'attention'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-[#E8E2D4] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Скоро истекают</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{stats.critical}</div>
          <span className="text-[11px] text-amber-600 font-medium">в ближайшие 60 дней</span>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'attention' ? 'all' : 'attention')}
          className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer shadow-xs ${
            stats.expired > 0
              ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
              : 'border-[#E8E2D4]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Просрочено</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">{stats.expired}</div>
          <span className="text-[11px] text-rose-600 font-medium">требуют утилизации</span>
        </div>
      </div>

      {/* Предупреждение о просроченных лекарствах, если они есть */}
      {stats.expired > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 flex items-center justify-between text-xs text-rose-800 shadow-2xs">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong className="font-bold">Внимание: обнаружены просроченные препараты ({stats.expired} шт.)!</strong>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Использование препаратов с истёкшим сроком годности может быть небезопасно. Проверьте карточки с красным бейджем.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('attention')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
          >
            Показать
          </button>
        </div>
      )}

      {/* 2. Панель поиска, фильтров и кнопка добавления */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#E8E2D4] shadow-xs">
        <div className="flex flex-1 items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8C867D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, веществу, назначению или полке..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-[#1F1E1C] text-white'
                  : 'bg-[#FAF7F2] text-[#5C564B] hover:bg-[#EFECE4]'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setStatusFilter('attention')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 ${
                statusFilter === 'attention'
                  ? 'bg-amber-600 text-white'
                  : 'bg-[#FAF7F2] text-[#5C564B] hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              ⚠️ Сроки ({stats.critical + stats.expired})
            </button>
            <button
              onClick={() => setStatusFilter('low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 ${
                statusFilter === 'low'
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#FAF7F2] text-[#5C564B] hover:bg-rose-50 hover:text-rose-700'
              }`}
            >
              🛒 Заканчиваются ({stats.low})
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[#E15A42] hover:bg-[#D04E37] text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить лекарство</span>
        </button>
      </div>

      {/* 3. Горизонтальные бейджи категорий */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-[#E15A42] text-white shadow-2xs'
              : 'bg-white border border-[#E8E2D4] text-[#5C564B] hover:bg-orange-50/50'
          }`}
        >
          Все категории ({medicines.length})
        </button>
        {Object.entries(CATEGORY_LABELS).map(([catKey, val]) => {
          const count = medicines.filter((m) => m.category === catKey).length;
          if (count === 0 && selectedCategory !== catKey) return null;
          const isSelected = selectedCategory === catKey;
          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(isSelected ? 'all' : (catKey as MedicineCategory))}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 border transition-all cursor-pointer flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-[#1F1E1C] text-white border-[#1F1E1C] shadow-2xs'
                  : 'bg-white border-[#E8E2D4] text-[#4A453C] hover:bg-[#F7F4EE]'
              }`}
            >
              <span>{val.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20' : 'bg-stone-100'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Сетка карточек лекарств */}
      {filteredMedicines.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E8E2D4] space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#E15A42] flex items-center justify-center mx-auto">
            <Pill className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-[#1F1E1C]">Препараты не найдены</h3>
          <p className="text-xs text-[#8C867D] max-w-sm mx-auto">
            Попробуйте изменить поисковый запрос или сбросить фильтры категорий.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMedicines.map((med) => {
            const exp = getExpiryStatus(med.expiryDate);
            const catInfo = CATEGORY_LABELS[med.category] || CATEGORY_LABELS.other;

            return (
              <div
                key={med.id}
                className={`bg-white rounded-3xl p-5 border shadow-xs transition-all flex flex-col justify-between space-y-4 hover:shadow-md relative overflow-hidden ${
                  exp.status === 'expired'
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : exp.status === 'critical'
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : 'border-[#E8E2D4]'
                }`}
              >
                {/* Верхняя строка карточки: Категория и форма выпуска */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${catInfo.color}`}>
                      {catInfo.label}
                    </span>
                    <span className="text-[11px] text-[#8C867D] bg-[#FAF7F2] px-2 py-0.5 rounded-lg border border-[#EDE7DB]">
                      {FORM_LABELS[med.form] || med.form}
                    </span>
                  </div>

                  {/* Название и активное вещество */}
                  <div>
                    <h4 className="font-bold text-base text-[#1F1E1C] leading-snug">{med.name}</h4>
                    {med.activeSubstance && (
                      <p className="text-xs text-[#8C867D] mt-0.5">
                        Действующее в-во: <span className="font-medium text-[#4A443B]">{med.activeSubstance}</span>
                      </p>
                    )}
                    {med.dosage && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-semibold">
                        Дозировка: {med.dosage}
                      </span>
                    )}
                  </div>

                  {/* Статус срока годности */}
                  <div className="pt-1">
                    <div className={`px-3 py-1.5 rounded-xl border text-xs flex items-center justify-between ${exp.badgeClass}`}>
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{exp.label}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold opacity-80">
                        {exp.status === 'expired' ? 'Выбросить' : exp.status === 'critical' ? 'Срочно' : 'В норме'}
                      </span>
                    </div>
                  </div>

                  {/* Инструкция и применение */}
                  {med.instructions && (
                    <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#EFECE4] text-xs text-[#5C564B] space-y-1">
                      <div className="flex items-center space-x-1 font-semibold text-[#1F1E1C] text-[11px]">
                        <Info className="w-3 h-3 text-[#E15A42]" />
                        <span>Как принимать:</span>
                      </div>
                      <p className="leading-relaxed line-clamp-2">{med.instructions}</p>
                    </div>
                  )}

                  {/* Для кого и где лежит */}
                  <div className="space-y-1 text-xs text-[#6B655B] pt-1">
                    {med.forWhom && (
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] text-[#8C867D]">Для кого:</span>
                        <span className="font-medium text-[#1F1E1C]">{med.forWhom}</span>
                      </div>
                    )}
                    {med.location && (
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#E15A42] shrink-0" />
                        <span className="font-medium text-[#1F1E1C] truncate">{med.location}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-[#8C867D]">Остаток:</span>
                      <span className="font-semibold text-[#1F1E1C]">{med.quantity}</span>
                    </div>
                  </div>
                </div>

                {/* Нижняя панель действий */}
                <div className="pt-3 border-t border-[#F0ECE1] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => addMedicineToShoppingList(med)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#E15A42] text-xs font-bold border border-orange-200 transition-colors cursor-pointer"
                    title="Добавить этот препарат в список покупок «Аптека»"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>В покупки</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEdit(med)}
                    className="p-2 rounded-xl text-[#8C867D] hover:text-[#1F1E1C] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                    title="Редактировать"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteMedicine(med.id)}
                    className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Удалить из аптечки"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно добавления / редактирования лекарства */}
      {isModalOpen && (
        <MedicineModal
          isOpen={isModalOpen}
          medicine={editingMedicine}
          onClose={() => setIsModalOpen(false)}
          onSave={(data) => {
            if (editingMedicine) {
              updateMedicine(editingMedicine.id, data);
            } else {
              addMedicine(data);
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

// ==========================================
// КОМПОНЕНТ МОДАЛЬНОГО ОКНА ЛЕКАРСТВА
// ==========================================

interface MedicineModalProps {
  isOpen: boolean;
  medicine: MedicineItem | null;
  onClose: () => void;
  onSave: (data: Omit<MedicineItem, 'id'>) => void;
}

const MedicineModal: React.FC<MedicineModalProps> = ({
  isOpen,
  medicine,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(medicine?.name || '');
  const [activeSubstance, setActiveSubstance] = useState(medicine?.activeSubstance || '');
  const [category, setCategory] = useState<MedicineCategory>(medicine?.category || 'fever');
  const [form, setForm] = useState<MedicineForm>(medicine?.form || 'pills');
  const [dosage, setDosage] = useState(medicine?.dosage || '');
  const [instructions, setInstructions] = useState(medicine?.instructions || '');
  const [forWhom, setForWhom] = useState(medicine?.forWhom || 'Вся семья');
  const [expiryDate, setExpiryDate] = useState(medicine?.expiryDate || '2027-12-31');
  const [openedDate, setOpenedDate] = useState(medicine?.openedDate || '');
  const [quantity, setQuantity] = useState(medicine?.quantity || '1 упаковка');
  const [location, setLocation] = useState(medicine?.location || 'Аптечка в коридоре');
  const [isLow, setIsLow] = useState(medicine?.isLow || false);
  const [notes, setNotes] = useState(medicine?.notes || '');

  // Синхронизация состояния полей при открытии или смене препарата
  useEffect(() => {
    if (isOpen) {
      if (medicine) {
        setName(medicine.name || '');
        setActiveSubstance(medicine.activeSubstance || '');
        setCategory(medicine.category || 'fever');
        setForm(medicine.form || 'pills');
        setDosage(medicine.dosage || '');
        setInstructions(medicine.instructions || '');
        setForWhom(medicine.forWhom || 'Вся семья');
        setExpiryDate(medicine.expiryDate || '2027-12-31');
        setOpenedDate(medicine.openedDate || '');
        setQuantity(medicine.quantity || '1 упаковка');
        setLocation(medicine.location || 'Аптечка в коридоре');
        setIsLow(medicine.isLow || false);
        setNotes(medicine.notes || '');
      } else {
        setName('');
        setActiveSubstance('');
        setCategory('fever');
        setForm('pills');
        setDosage('');
        setInstructions('');
        setForWhom('Вся семья');
        setExpiryDate('2027-12-31');
        setOpenedDate('');
        setQuantity('1 упаковка');
        setLocation('Аптечка в коридоре');
        setIsLow(false);
        setNotes('');
      }
    }
  }, [isOpen, medicine]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      activeSubstance: activeSubstance.trim() || undefined,
      category,
      form,
      dosage: dosage.trim() || undefined,
      instructions: instructions.trim() || undefined,
      forWhom: forWhom.trim() || undefined,
      expiryDate,
      openedDate: openedDate || undefined,
      quantity: quantity.trim() || '1 шт',
      location: location.trim() || undefined,
      isLow,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full border border-[#E5DFD3] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D4]">
          <div className="flex items-center space-x-2">
            <Pill className="w-5 h-5 text-[#E15A42]" />
            <h3 className="font-bold text-base text-[#1F1E1C]">
              {medicine ? 'Редактировать препарат' : 'Новый препарат в аптечку'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#EDE8DC] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Название */}
          <div className="space-y-1">
            <label className="font-semibold text-[#1F1E1C]">
              Название препарата <span className="text-[#E15A42]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Нурофен детский, Парацетамол, Супрастин"
              className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
            />
          </div>

          {/* Действующее вещество и дозировка */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Действующее в-во</label>
              <input
                type="text"
                value={activeSubstance}
                onChange={(e) => setActiveSubstance(e.target.value)}
                placeholder="Ибупрофен, Лоратадин..."
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Дозировка</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="500 мг, 100 мг/5 мл..."
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
          </div>

          {/* Категория и форма выпуска */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Категория назначения</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MedicineCategory)}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Форма выпуска</label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value as MedicineForm)}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              >
                {Object.entries(FORM_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Срок годности и дата вскрытия */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">
                Срок годности (годен до) <span className="text-[#E15A42]">*</span>
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Дата вскрытия (для сиропов/капель)</label>
              <input
                type="date"
                value={openedDate}
                onChange={(e) => setOpenedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
          </div>

          {/* Для кого и остаток */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Для кого</label>
              <input
                type="text"
                value={forWhom}
                onChange={(e) => setForWhom(e.target.value)}
                placeholder="Вся семья, Дети, Папа..."
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[#1F1E1C]">Остаток / количество</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1 фл. (70%), 8 таб..."
                className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
              />
            </div>
          </div>

          {/* Место хранения */}
          <div className="space-y-1">
            <label className="font-semibold text-[#1F1E1C]">Место хранения в доме</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Аптечка в коридоре (верхняя полка), Холодильник..."
              className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
            />
          </div>

          {/* Инструкции по применению */}
          <div className="space-y-1">
            <label className="font-semibold text-[#1F1E1C]">Схема приёма и дозировка</label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Например: по 1 таб 2 раза в день после еды; при t > 38.5..."
              className="w-full px-3 py-2 bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42] resize-none"
            />
          </div>

          {/* Чекбокс: заканчивается */}
          <label className="flex items-center space-x-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isLow}
              onChange={(e) => setIsLow(e.target.checked)}
              className="w-4 h-4 rounded text-[#E15A42] focus:ring-[#E15A42]"
            />
            <span className="font-medium text-[#1F1E1C]">
              Препарат заканчивается (требуется пополнить запас)
            </span>
          </label>

          {/* Кнопки сохранения */}
          <div className="flex items-center space-x-2 pt-3 border-t border-[#E8E2D4]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#DDD7CB] hover:bg-[#F2ECE1] text-[#5C564B] font-semibold transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#E15A42] hover:bg-[#D04E37] text-white font-bold transition-all shadow-xs cursor-pointer"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
