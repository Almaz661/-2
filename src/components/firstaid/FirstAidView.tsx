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
  ChevronRight,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { MedicineItem, MedicineCategory, MedicineForm } from '../../types';
import { Btn, Card, CountUp, EmptyState, FilterMenu, IconBtn, PageWrap, Segmented, Slide, Tag } from '../ui/mercury';

const CATEGORY_LABELS: Record<MedicineCategory, { label: string; color: string }> = {
  fever: { label: 'Жаропонижающие', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  painkiller: { label: 'Обезболивающие', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  cold: { label: 'Простуда и грипп', color: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--line)]' },
  allergy: { label: 'От аллергии', color: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--line)]' },
  digestive: { label: 'ЖКТ и пищеварение', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  antiseptic: { label: 'Антисептики', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  vitamins: { label: 'Витамины и БАД', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  chronic: { label: 'Постоянный приём', color: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--line)]' },
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
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
      };
    } else if (diffDays <= 30) {
      return {
        status: 'critical' as const,
        diffDays,
        label: `Истекает через ${diffDays} дн.!`,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
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

  const [expanded, setExpanded] = useState<string | null>(null);
  const kpi = [
    { id: 'all' as const, label: 'Всего', value: stats.total, sub: 'наименований', Icon: Pill },
    { id: 'safe' as const, label: 'В норме', value: stats.safe, sub: 'со свежим сроком', Icon: CheckCircle2 },
    { id: 'attention' as const, label: 'Скоро истекают', value: stats.critical, sub: 'в ближайшие 60 дней', Icon: Clock, tone: 'warn' },
    { id: 'low' as const, label: 'Заканчиваются', value: stats.low, sub: 'пора докупить', Icon: ShoppingCart, tone: 'warn' },
  ];

  return (
    <PageWrap>
      {/* Сводка аптечки */}
      <Card>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {kpi.map((k, i) => {
            const clickable = k.id === 'attention' || k.id === 'low';
            const active = clickable && statusFilter === k.id;
            return (
              <button
                key={k.id}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setStatusFilter(active ? 'all' : (k.id as 'attention' | 'low'))}
                aria-pressed={clickable ? active : undefined}
                className={`text-left p-5 sm:p-6 transition-colors border-[var(--line)] disabled:cursor-default disabled:opacity-100 ${ clickable ? 'hover:bg-[var(--surface-3)]' : '' } ${active ? 'bg-[var(--accent-soft)]' : ''} ${i % 2 === 1 ? 'border-l' : ''} ${ i >= 2 ? 'border-t lg:border-t-0' : '' } ${i === 2 ? 'lg:border-l' : ''} ${i === 0 ? 'rounded-tl-2xl lg:rounded-l-2xl' : ''} ${ i === 3 ? 'rounded-br-2xl lg:rounded-r-2xl' : '' }`}
              >
                <div className="flex items-center gap-2 text-[14px] text-[var(--muted)]">
                  <k.Icon className="w-4 h-4" />
                  {k.label}
                </div>
                <div
                  className={`mt-2 text-[32px] leading-none font-semibold tabular-nums tracking-[-0.02em] ${ k.tone === 'warn' && k.value > 0 ? 'text-amber-600' : 'text-[var(--text)]' }`}
                >
                  <CountUp value={k.value} />
                </div>
                <div className="mt-1.5 text-[14px] text-[var(--muted)]">{k.sub}</div>
              </button>
            );
          })}
        </div>
        {stats.expired > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter('attention')}
            className="group w-full flex items-center gap-3 px-5 sm:px-6 py-3.5 border-t border-[var(--line)] text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-3)] transition-colors rounded-b-2xl"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="flex-1">Просрочено: {stats.expired}. Такие лекарства лучше утилизировать.</span>
            <span className="flex items-center gap-0.5 text-[var(--accent)] font-medium">
              Показать
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        )}
      </Card>

      {/* Поиск, фильтры, добавление */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Название, вещество, место"
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <Segmented
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { id: 'all', label: 'Все' },
            { id: 'attention', label: 'Сроки', count: stats.critical + stats.expired },
            { id: 'low', label: 'Заканчиваются', count: stats.low },
          ]}
        />
        <FilterMenu
          label="Категория"
          value={selectedCategory}
          allValue={'all' as MedicineCategory | 'all'}
          onChange={setSelectedCategory}
          options={[
            { id: 'all' as MedicineCategory | 'all', label: 'Все категории' },
            ...(Object.keys(CATEGORY_LABELS) as MedicineCategory[]).map((c) => ({ id: c, label: CATEGORY_LABELS[c].label })),
          ]}
        />
        <Btn variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddModal} className="ml-auto">
          Добавить
        </Btn>
      </div>

      {/* Таблица лекарств */}
      <Card className="p-2 sm:p-3">
        <Slide k={statusFilter + selectedCategory} index={['all', 'attention', 'low'].indexOf(statusFilter)}>
        {filteredMedicines.length === 0 ? (
          <EmptyState
            icon={<Pill className="w-5 h-5" />}
            title={medicines.length === 0 ? 'Аптечка пуста' : 'Ничего не найдено'}
            text={
              medicines.length === 0
                ? 'Добавьте лекарства со сроком годности — напомним, когда пора заменить.'
                : 'Измените поиск или фильтры.'
            }
            action={
              <Btn variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAddModal}>
                Добавить лекарство
              </Btn>
            }
          />
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[44px_1fr_170px_120px_130px_112px] gap-x-3 px-3 pt-2 pb-2 text-xs text-[var(--muted)] border-b border-[var(--line)]">
              <span />
              <span>Лекарство</span>
              <span>Где лежит</span>
              <span>Остаток</span>
              <span>Годен до</span>
              <span />
            </div>
            {filteredMedicines.map((med) => {
              const exp = getExpiryStatus(med.expiryDate);
              const bad = exp.status === 'expired';
              const soon = exp.status === 'critical' || exp.status === 'warning';
              const open = expanded === med.id;
              return (
                <div key={med.id} className="border-t border-[var(--line)] first:border-t-0">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : med.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setExpanded(open ? null : med.id);
                    }}
                    className="group grid grid-cols-[44px_1fr_auto] md:grid-cols-[44px_1fr_170px_120px_130px_112px] items-center gap-x-3 px-2 sm:px-3 py-3 rounded-xl hover:bg-[var(--surface-3)] focus-visible:bg-[var(--surface-3)] outline-none transition-colors cursor-pointer"
                  >
                    <span
                      className={`w-10 h-10 rounded-full grid place-items-center border ${ bad ? 'border-red-300 text-red-600' : soon ? 'border-amber-300 text-amber-600' : 'border-[var(--line-strong)] text-[var(--muted)]' }`}
                    >
                      <Pill className="w-4 h-4" />
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[16px] font-medium text-[var(--text)] line-clamp-2 md:line-clamp-1 break-words">{med.name}</span>
                        {med.isLow && <Tag tone="warn">Заканчивается</Tag>}
                      </div>
                      <div className="text-[14px] text-[var(--muted)] truncate mt-0.5">
                        {[CATEGORY_LABELS[med.category]?.label, med.activeSubstance, med.dosage].filter(Boolean).join(', ')}
                      </div>
                    </div>

                    <span className="hidden md:block text-sm text-[var(--text-2)] truncate">
                      {med.location || '—'}
                      {med.forWhom && <span className="block text-[14px] text-[var(--muted)] truncate">{med.forWhom}</span>}
                    </span>

                    <span className="hidden md:block text-sm text-[var(--text-2)] truncate">{med.quantity}</span>

                    <span
                      className={`text-[14px] md:text-sm tabular-nums text-right md:text-left max-w-[110px] md:max-w-none ${ bad ? 'text-red-600 font-medium' : soon ? 'text-amber-600 font-medium' : 'text-[var(--text-2)]' }`}
                    >
                      {bad ? 'Просрочено' : soon ? `${exp.diffDays} дн.` : new Date(med.expiryDate).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}
                      {(bad || soon) && (
                        <span className="block text-[14px] font-normal text-[var(--muted)]">
                          {new Date(med.expiryDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </span>

                    <div className="hidden md:flex items-center justify-end gap-0.5 hover-actions opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <IconBtn
                        title="В список покупок"
                        aria-label="В список покупок"
                        onClick={(e) => {
                          e.stopPropagation();
                          addMedicineToShoppingList(med);
                        }}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </IconBtn>
                      <IconBtn
                        title="Редактировать"
                        aria-label="Редактировать"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(med);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </IconBtn>
                      <IconBtn
                        danger
                        title="Удалить"
                        aria-label="Удалить"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMedicine(med.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconBtn>
                    </div>
                  </div>

                  {open && (
                    <div className="mx-2 sm:mx-3 mb-3 ml-[56px] sm:ml-[68px] p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] text-sm space-y-2">
                      {med.instructions && (
                        <p className="text-[var(--text-2)] leading-relaxed">
                          <span className="text-[var(--muted)]">Как принимать: </span>
                          {med.instructions}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-[var(--muted)]">
                        <span>Форма: {FORM_LABELS[med.form]}</span>
                        {med.forWhom && <span>Для кого: {med.forWhom}</span>}
                        {med.location && <span>Где: {med.location}</span>}
                        <span>Остаток: {med.quantity}</span>
                        {med.openedDate && <span>Вскрыто: {new Date(med.openedDate).toLocaleDateString('ru-RU')}</span>}
                      </div>
                      {med.notes && <p className="text-[14px] text-[var(--muted)]">{med.notes}</p>}
                      <div className="flex gap-2 pt-1 md:hidden">
                        <Btn size="sm" icon={<ShoppingCart className="w-3.5 h-3.5" />} onClick={() => addMedicineToShoppingList(med)}>
                          В покупки
                        </Btn>
                        <Btn size="sm" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => handleEdit(med)}>
                          Изменить
                        </Btn>
                        <Btn size="sm" variant="ghost" onClick={() => deleteMedicine(med.id)}>
                          Удалить
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
        </Slide>
      </Card>

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
    </PageWrap>
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
      <div className="bg-[var(--surface-3)] rounded-2xl max-w-lg w-full border border-[var(--line)] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
          <div className="flex items-center space-x-2">
            <Pill className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-semibold text-base text-[var(--text)]">
              {medicine ? 'Редактировать препарат' : 'Новый препарат в аптечку'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--line)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Название */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--text)]">
              Название препарата <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Нурофен детский, Парацетамол, Супрастин"
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Действующее вещество и дозировка */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text)]">Действующее в-во</label>
              <input
                type="text"
                value={activeSubstance}
                onChange={(e) => setActiveSubstance(e.target.value)}
                placeholder="Ибупрофен, Лоратадин..."
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text)]">Дозировка</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="500 мг, 100 мг/5 мл..."
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Категория и форма выпуска */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text)]">Категория назначения</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MedicineCategory)}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text)]">Форма выпуска</label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value as MedicineForm)}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
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
              <label className="font-semibold text-[var(--text)]">
                Срок годности (годен до) <span className="text-[var(--accent)]">*</span>
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text)]">Дата вскрытия (для сиропов/капель)</label>
              <input
                type="date"
                value={openedDate}
                onChange={(e) => setOpenedDate(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Для кого и остаток */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text)]">Для кого</label>
              <input
                type="text"
                value={forWhom}
                onChange={(e) => setForWhom(e.target.value)}
                placeholder="Вся семья, Дети, Папа..."
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text)]">Остаток / количество</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1 фл. (70%), 8 таб..."
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Место хранения */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--text)]">Место хранения в доме</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Аптечка в коридоре (верхняя полка), Холодильник..."
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Инструкции по применению */}
          <div className="space-y-1">
            <label className="font-semibold text-[var(--text)]">Схема приёма и дозировка</label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Например: по 1 таб 2 раза в день после еды; при t > 38.5..."
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>

          {/* Чекбокс: заканчивается */}
          <label className="flex items-center space-x-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isLow}
              onChange={(e) => setIsLow(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <span className="font-medium text-[var(--text)]">
              Препарат заканчивается (требуется пополнить запас)
            </span>
          </label>

          {/* Кнопки сохранения */}
          <div className="flex items-center space-x-2 pt-3 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[var(--line-strong)] hover:bg-[var(--surface-3)] text-[var(--text-2)] font-semibold transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-full bg-[var(--accent)] hover:brightness-110 text-white font-semibold transition-all shadow-[var(--shadow)] cursor-pointer"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
