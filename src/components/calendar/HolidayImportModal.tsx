import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calendar,
  Bell,
  Check,
  CheckCheck,
  Plus,
  Sparkles,
  Info,
  Gift,
  Heart,
  Globe,
  BellRing,
  Pencil,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { COUNTRY_PRESETS } from '../../utils/countryPresets';
import {
  HolidayItem,
  getHolidaysForCountry,
  getFamilyHolidayPresets,
} from '../../utils/holidaysData';
import {
  requestNotificationPermission,
  getNotificationPermission,
  playNotificationSound,
} from '../../services/notificationService';
import { CalendarEvent, EventCategory } from '../../types';
import { parseLocalDate, formatLocalDate } from '../../utils/dateUtils';

interface HolidayImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'public' | 'family';

// Ключевые страны с быстрым переключением
const FEATURED_COUNTRIES = [
  { code: 'RU', name: 'РФ (Россия)', flag: '🇷🇺' },
  { code: 'NL', name: 'Нидерланды', flag: '🇳🇱' },
  { code: 'GR', name: 'Греция', flag: '🇬🇷' },
  { code: 'CY', name: 'Кипр', flag: '🇨🇾' },
];

export const HolidayImportModal: React.FC<HolidayImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    householdRegion,
    members,
    events,
    importHolidaysToCalendar,
    deleteEvent,
    showToast,
  } = useHousehold();

  // Выбранные страны (по умолчанию РФ, Нидерланды и Греция)
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['RU', 'NL', 'GR']);

  // Год для импорта
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [activeTab, setActiveTab] = useState<TabType>('public');

  // Выбранные ID праздников для импорта
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Настройки авто-напоминаний
  const [reminder7Days, setReminder7Days] = useState(true);
  const [reminder3Days, setReminder3Days] = useState(true);
  const [reminder1Day, setReminder1Day] = useState(true);
  const [reminderSameDay, setReminderSameDay] = useState(true);

  // Статус системных уведомлений браузера
  const [permissionStatus, setPermissionStatus] = useState<string>(() =>
    getNotificationPermission()
  );

  // Пользовательские добавленные и отредактированные семейные даты
  const [customFamilyDates, setCustomFamilyDates] = useState<HolidayItem[]>(() => {
    try {
      const raw = localStorage.getItem('onehaus_custom_family_dates');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  });

  // Удаленные ID пресетов
  const [deletedPresetIds, setDeletedPresetIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('onehaus_deleted_family_preset_ids');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  });

  // Форма добавления / редактирования семейной даты
  const [isFamilyFormOpen, setIsFamilyFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(`${selectedYear}-05-01`);
  const [formEmoji, setFormEmoji] = useState('🎂');
  const [formCategory, setFormCategory] = useState<'family' | 'holiday'>('family');

  // Сохранение пользовательских дат в localStorage
  useEffect(() => {
    try {
      localStorage.setItem('onehaus_custom_family_dates', JSON.stringify(customFamilyDates));
    } catch (_) {}
  }, [customFamilyDates]);

  useEffect(() => {
    try {
      localStorage.setItem('onehaus_deleted_family_preset_ids', JSON.stringify(deletedPresetIds));
    } catch (_) {}
  }, [deletedPresetIds]);

  // Государственные праздники для ВСЕХ выбранных стран (РФ, Нидерланды, Греция и др.)
  const publicHolidays = useMemo(() => {
    const list: HolidayItem[] = [];
    selectedCountries.forEach((cCode) => {
      const items = getHolidaysForCountry(cCode, selectedYear);
      list.push(...items);
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedCountries, selectedYear]);

  // Семейные праздники (дни рождения участников + семейные даты)
  const familyHolidays = useMemo(() => {
    const deletedSet = new Set(deletedPresetIds);
    const presets = getFamilyHolidayPresets(members, selectedYear).filter(
      (item) => !deletedSet.has(item.id)
    );
    // Добавляем пользовательские семейные даты
    return [...presets, ...customFamilyDates].sort((a, b) => a.date.localeCompare(b.date));
  }, [members, selectedYear, deletedPresetIds, customFamilyDates]);

  // Список для текущей вкладки
  const currentList = activeTab === 'public' ? publicHolidays : familyHolidays;

  // Проверка, есть ли уже такое событие в календаре (по названию и дате)
  const existingKeys = useMemo(() => {
    return new Set(
      events.map((e) => `${(e.title || '').trim().toLowerCase()}_${e.date}`)
    );
  }, [events]);

  const isEventAlreadyImported = (item: HolidayItem): boolean => {
    return existingKeys.has(`${item.title.trim().toLowerCase()}_${item.date}`);
  };

  // Первичный выбор неимпортированных праздников при смене страны/вкладки
  useEffect(() => {
    if (isOpen) {
      const initialSelected = new Set<string>();
      currentList.forEach((h) => {
        if (!isEventAlreadyImported(h)) {
          initialSelected.add(h.id);
        }
      });
      setSelectedIds(initialSelected);
    }
  }, [isOpen, selectedCountries, selectedYear, activeTab, currentList.length]);

  if (!isOpen) return null;

  // Переключение выбора конкретной страны
  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) => {
      if (prev.includes(code)) {
        if (prev.length === 1) {
          showToast('Должна быть выбрана хотя бы одна страна', 'info');
          return prev;
        }
        return prev.filter((c) => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(currentList.map((h) => h.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Запрос разрешения браузера на Push-уведомления
  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
    if (granted) {
      playNotificationSound();
      showToast('Уведомления браузера и звуковые напоминания успешно включены!', 'success');
    } else {
      showToast(
        'Уведомления заблокированы браузером. Включите их в настройках сайта.',
        'warning'
      );
    }
  };

  const handleTestSound = () => {
    playNotificationSound();
    showToast('Звуковой сигнал колокольчика и напоминание сработали отлично!', 'success');
  };

  const getSelectedReminderDays = (): number[] => {
    const days: number[] = [];
    if (reminder7Days) days.push(7);
    if (reminder3Days) days.push(3);
    if (reminder1Day) days.push(1);
    if (reminderSameDay) days.push(0);
    return days;
  };

  // Импорт выбранных праздников
  const handleImport = () => {
    const itemsToImport = currentList.filter((item) => selectedIds.has(item.id));
    if (itemsToImport.length === 0) {
      showToast('Пожалуйста, выберите хотя бы один праздник для импорта', 'warning');
      return;
    }

    const reminderDays = getSelectedReminderDays();

    const calendarEventsToCreate: Array<Omit<CalendarEvent, 'id'>> = itemsToImport.map(
      (item) => ({
        title: item.title,
        description: item.description,
        date: item.date,
        startTime: '09:00',
        endTime: '22:00',
        allDay: true,
        category: item.category,
        memberIds: members.map((m) => m.id),
        isHoliday: true,
        holidayType: item.holidayType,
        reminderDaysBefore: reminderDays,
        reminderTime: '09:00',
        recurringYearly: true,
        holidayCountry: item.countryCode,
      })
    );

    const count = importHolidaysToCalendar(calendarEventsToCreate);
    if (count > 0) {
      playNotificationSound();
      onClose();
    }
  };

  // Открыть форму добавления семейной даты
  const handleOpenAddForm = () => {
    setEditingItemId(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(`${selectedYear}-05-01`);
    setFormEmoji('🎂');
    setFormCategory('family');
    setIsFamilyFormOpen(true);
  };

  // Открыть форму редактирования семейной даты
  const handleOpenEditForm = (item: HolidayItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemId(item.id);
    setFormTitle(item.title.replace(/^[^\w\sа-яА-ЯёЁ]+/, '').trim());
    setFormDescription(item.description);
    setFormDate(item.date);
    setFormEmoji(item.emoji || '🎂');
    setFormCategory(item.category);
    setIsFamilyFormOpen(true);
  };

  // Удалить семейную дату из списка и из календаря
  const handleDeleteFamilyDate = (item: HolidayItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Удалить дату «${item.title}»?`)) return;

    // 1. Удаляем из кастомных или добавляем в deletedPresetIds
    if (customFamilyDates.some((d) => d.id === item.id)) {
      setCustomFamilyDates((prev) => prev.filter((d) => d.id !== item.id));
    } else {
      setDeletedPresetIds((prev) => [...prev, item.id]);
    }

    // 2. Ищем и удаляем соответствующее событие из календаря
    const matchingEvent = events.find(
      (ev) =>
        (ev.title.trim().toLowerCase() === item.title.trim().toLowerCase() ||
          ev.title.includes(item.title) ||
          item.title.includes(ev.title)) &&
        ev.date === item.date
    );
    if (matchingEvent) {
      deleteEvent(matchingEvent.id);
    }

    // 3. Убираем из выбранных
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });

    showToast(`Семейная дата «${item.title}» удалена`, 'info');
  };

  // Сохранить (добавить или обновить) семейную дату
  const handleSaveFamilyDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Введите название события или праздника', 'warning');
      return;
    }

    const fullTitle = `${formEmoji} ${formTitle.trim()}`;
    const reminderDays = getSelectedReminderDays();

    if (editingItemId) {
      // Редактирование
      const updatedItem: HolidayItem = {
        id: editingItemId,
        title: fullTitle,
        description: formDescription.trim() || 'Семейная памятная дата с напоминаниями',
        date: formDate,
        category: formCategory,
        holidayType: formEmoji === '🎂' ? 'birthday' : 'family',
        emoji: formEmoji,
        isOfficialDayOff: false,
        suggestedReminderDays: reminderDays,
      };

      setCustomFamilyDates((prev) => {
        const filtered = prev.filter((d) => d.id !== editingItemId);
        return [...filtered, updatedItem];
      });

      // Если это был пресет, помечаем старый пресет как скрытый
      setDeletedPresetIds((prev) =>
        prev.includes(editingItemId) ? prev : [...prev, editingItemId]
      );

      // Обновляем событие в календаре, если было создано
      const matchingEvent = events.find((ev) => ev.date === formDate);
      if (matchingEvent) {
        deleteEvent(matchingEvent.id);
      }
      importHolidaysToCalendar([
        {
          title: fullTitle,
          description: formDescription.trim() || 'Семейная памятная дата с напоминаниями',
          date: formDate,
          startTime: '09:00',
          endTime: '22:00',
          allDay: true,
          category: formCategory,
          memberIds: members.map((m) => m.id),
          isHoliday: true,
          holidayType: formEmoji === '🎂' ? 'birthday' : 'family',
          reminderDaysBefore: reminderDays,
          reminderTime: '09:00',
          recurringYearly: true,
        },
      ]);

      showToast(`Дата «${fullTitle}» обновлена в календаре`, 'success');
    } else {
      // Новая дата
      const newItemId = `custom-family-${Date.now()}`;
      const newItem: HolidayItem = {
        id: newItemId,
        title: fullTitle,
        description: formDescription.trim() || 'Семейная памятная дата с напоминаниями',
        date: formDate,
        category: formCategory,
        holidayType: formEmoji === '🎂' ? 'birthday' : 'family',
        emoji: formEmoji,
        isOfficialDayOff: false,
        suggestedReminderDays: reminderDays,
      };

      setCustomFamilyDates((prev) => [...prev, newItem]);

      // Автоматически добавляем в календарь
      importHolidaysToCalendar([
        {
          title: fullTitle,
          description: formDescription.trim() || 'Семейная памятная дата с напоминаниями',
          date: formDate,
          startTime: '09:00',
          endTime: '22:00',
          allDay: true,
          category: formCategory,
          memberIds: members.map((m) => m.id),
          isHoliday: true,
          holidayType: formEmoji === '🎂' ? 'birthday' : 'family',
          reminderDaysBefore: reminderDays,
          reminderTime: '09:00',
          recurringYearly: true,
        },
      ]);

      playNotificationSound();
      showToast(`Дата «${fullTitle}» добавлена с напоминаниями!`, 'success');
    }

    setIsFamilyFormOpen(false);
    setEditingItemId(null);
  };

  const selectedCount = currentList.filter((h) => selectedIds.has(h.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[var(--surface-2)] rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Заголовок */}
        <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface)] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-xl shadow-none">
              🎉
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">
                Праздники РФ, Нидерландов, Греции и Семейные даты
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Официальные государственные выходные, дни рождения и традиции с автоматическими напоминаниями
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Панель фильтров: страны, год и переключение вкладок */}
        <div className="p-4 sm:p-6 bg-[var(--surface-2)] border-b border-[var(--line)] space-y-3.5 shrink-0">
          {/* Быстрый выбор стран (только для государственных праздников) */}
          {activeTab === 'public' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-2)] flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Страны для импорта праздников:</span>
                </span>
                <span className="text-[12px] text-stone-500">
                  Выбрано: <strong>{selectedCountries.join(', ')}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FEATURED_COUNTRIES.map((country) => {
                  const isActive = selectedCountries.includes(country.code);
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => toggleCountry(country.code)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border ${ isActive ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[var(--shadow)]' : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--line-strong)] hover:bg-[var(--surface-3)]' }`}
                    >
                      <span className="text-base leading-none">{country.flag}</span>
                      <span className="truncate">{country.name}</span>
                      {isActive && <Check className="w-3.5 h-3.5 ml-auto stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Вкладки и выбор года */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('public')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${ activeTab === 'public' ? 'bg-[var(--inverse)] text-white shadow-[var(--shadow)]' : 'bg-[var(--surface)] border border-[var(--line-strong)] text-[var(--text-2)] hover:bg-[var(--surface-3)]' }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Государственные праздники ({publicHolidays.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('family')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${ activeTab === 'family' ? 'bg-[var(--inverse)] text-white shadow-[var(--shadow)]' : 'bg-[var(--surface)] border border-[var(--line-strong)] text-[var(--text-2)] hover:bg-[var(--surface-3)]' }`}
              >
                <Heart className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Семейные даты и ДР ({familyHolidays.length})</span>
              </button>
            </div>

            {/* Выбор года */}
            <div className="flex items-center space-x-1.5 self-end sm:self-auto">
              <span className="text-xs font-semibold text-[var(--muted)]">Год:</span>
              {[2025, 2026, 2027].map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${ selectedYear === y ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-none' : 'bg-[var(--surface)] border border-stone-200 text-stone-600 hover:bg-stone-50' }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Контент модального окна */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Кнопка добавления в семейной вкладке */}
          {activeTab === 'family' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div>
                <h4 className="text-xs font-semibold text-amber-950 flex items-center space-x-1.5">
                  <Gift className="w-4 h-4 text-amber-600" />
                  <span>Управление семейными праздниками и днями рождения</span>
                </h4>
                <p className="text-[12px] text-amber-800/80 mt-0.5">
                  Добавляйте дни рождения родных, годовщины и традиции с автоматическими напоминаниями
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddForm}
                className="px-4 py-2 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-xs font-semibold active:scale-95 transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Добавить семейную дату или ДР</span>
              </button>
            </div>
          )}

          {/* Инлайн-форма добавления / редактирования семейной даты */}
          {activeTab === 'family' && isFamilyFormOpen && (
            <form
              onSubmit={handleSaveFamilyDate}
              className="p-5 rounded-2xl bg-[var(--surface)] border-2 border-[var(--accent)]/50 shadow-[var(--shadow)] space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-xs font-semibold text-[var(--text)] flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-[var(--accent)]" />
                  <span>
                    {editingItemId ? 'Редактировать семейную дату' : 'Новая семейная дата или День рождения'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsFamilyFormOpen(false)}
                  className="text-stone-400 hover:text-stone-700 text-xs font-semibold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text)]">
                  Название события или ДР *
                </label>
                <div className="flex space-x-2">
                  <select
                    value={formEmoji}
                    onChange={(e) => setFormEmoji(e.target.value)}
                    className="px-2.5 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line-strong)] text-lg cursor-pointer"
                  >
                    <option value="🎂">🎂</option>
                    <option value="🎉">🎉</option>
                    <option value="💍">💍</option>
                    <option value="👑">👑</option>
                    <option value="💐">💐</option>
                    <option value="💖">💖</option>
                    <option value="🐾">🐾</option>
                    <option value="🎒">🎒</option>
                    <option value="🏖️">🏖️</option>
                    <option value="🎄">🎄</option>
                    <option value="🍽️">🍽️</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Например: День рождения бабушки, Годовщина знакомства..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line-strong)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Дата события
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line-strong)] text-xs text-[var(--text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                    Категория
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as 'family' | 'holiday')}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line-strong)] text-xs text-[var(--text)]"
                  >
                    <option value="family">Семейное / ДР</option>
                    <option value="holiday">Праздник / Традиция</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Заметки / Памятка к празднику
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Купить цветы, подготовить подарок, заказать торт..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line-strong)] text-xs text-[var(--text)]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFamilyFormOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-xs font-semibold cursor-pointer"
                >
                  {editingItemId ? 'Сохранить изменения' : 'Сохранить дату'}
                </button>
              </div>
            </form>
          )}

          {/* Полоса действий выбора */}
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-semibold text-[var(--text-2)]">
              Выбрано для импорта:{' '}
              <span className="text-[var(--accent)] font-semibold">{selectedCount}</span> из{' '}
              {currentList.length}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent)] hover:underline cursor-pointer"
              >
                Выбрать все
              </button>
              <span className="text-stone-300">•</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-xs font-semibold text-stone-500 hover:text-stone-700 hover:underline cursor-pointer"
              >
                Снять выбор
              </button>
            </div>
          </div>

          {/* Список праздников */}
          <div className="space-y-2.5">
            {currentList.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isImported = isEventAlreadyImported(item);

              // Точное локальное отображение даты
              const dateObj = parseLocalDate(item.date);
              const formattedDate = dateObj.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                weekday: 'short',
              });

              // Определение флага страны
              const flag =
                item.countryCode === 'RU'
                  ? '🇷🇺 РФ'
                  : item.countryCode === 'NL'
                  ? '🇳🇱 Нидерланды'
                  : item.countryCode === 'GR'
                  ? '🇬🇷 Греция'
                  : item.countryCode === 'CY'
                  ? '🇨🇾 Кипр'
                  : item.countryCode || '';

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${ isSelected ? 'bg-[var(--surface)] border-[var(--accent)] ring-1 ring-[var(--accent)]/30 shadow-[var(--shadow)]' : 'bg-[var(--surface-2)] border-[var(--line)] opacity-85 hover:bg-[var(--surface)] hover:opacity-100' }`}
                >
                  <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-2">
                    {/* Чекбокс */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${ isSelected ? 'bg-[var(--accent)] text-white shadow-none' : 'bg-[var(--surface)] border border-stone-300' }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {/* Эмодзи */}
                    <div className="text-2xl shrink-0 leading-none select-none">
                      {item.emoji}
                    </div>

                    {/* Текстовая информация */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--text)] truncate">
                          {item.title}
                        </span>
                        {item.originalTitle && (
                          <span className="text-[12px] font-medium text-stone-400 italic">
                            ({item.originalTitle})
                          </span>
                        )}
                        {flag && (
                          <span className="px-1.5 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[12px] font-semibold text-stone-700">
                            {flag}
                          </span>
                        )}
                        {item.isOfficialDayOff && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[12px] font-semibold text-rose-700">
                            Выходной
                          </span>
                        )}
                        {item.holidayType === 'birthday' && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[12px] font-semibold text-amber-700">
                            День рождения
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Дата, статус и кнопки Изменить / Удалить */}
                  <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    {/* Кнопки Изменить и Удалить для семейных дат */}
                    {activeTab === 'family' && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditForm(item, e)}
                          className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Изменить дату или описание"
                        >
                          <Pencil className="w-3.5 h-3.5 text-stone-600" />
                          <span className="text-[12px] hidden sm:inline">Изменить</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteFamilyDate(item, e)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Удалить дату"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span className="text-[12px] hidden sm:inline">Удалить</span>
                        </button>
                      </div>
                    )}

                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-[var(--accent)] bg-[var(--accent-soft)]/80 px-2.5 py-1 rounded-xl border border-[var(--line)]">
                        {formattedDate}
                      </div>
                      {isImported && (
                        <div className="flex items-center justify-end space-x-1 text-[12px] font-semibold text-emerald-600 mt-1">
                          <CheckCheck className="w-3 h-3" />
                          <span>В календаре</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Блок настройки автоматических напоминаний со звуком */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-semibold text-amber-900">
                  Автоматические напоминания и звуковой колокольчик
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {/* Кнопка проверки звука и напоминаний */}
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[12px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors shadow-none"
                  title="Проверить звучание колокольчика и тост"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Тест звука</span>
                </button>

                {permissionStatus !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-amber-300 text-[12px] font-semibold text-amber-800 hover:bg-amber-100 flex items-center space-x-1 cursor-pointer transition-colors shadow-none"
                  >
                    <BellRing className="w-3 h-3 text-amber-600" />
                    <span>Включить Push</span>
                  </button>
                ) : (
                  <span className="text-[12px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Push активны</span>
                  </span>
                )}
              </div>
            </div>

            <p className="text-[12px] text-amber-800/80">
              Приложение заблаговременно напомнит о празднике со звуковым сигналом, чтобы вы успели купить подарок, торт и цветы:
            </p>

            {/* Варианты напоминаний */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <label className="flex items-center space-x-2 p-2 rounded-xl bg-[var(--surface)] border border-amber-200/80 text-xs font-semibold text-[var(--text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder7Days}
                  onChange={(e) => setReminder7Days(e.target.checked)}
                  className="rounded text-[var(--accent)] focus:ring-0"
                />
                <span>За 7 дней (подарок)</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-xl bg-[var(--surface)] border border-amber-200/80 text-xs font-semibold text-[var(--text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder3Days}
                  onChange={(e) => setReminder3Days(e.target.checked)}
                  className="rounded text-[var(--accent)] focus:ring-0"
                />
                <span>За 3 дня (планы)</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-xl bg-[var(--surface)] border border-amber-200/80 text-xs font-semibold text-[var(--text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminder1Day}
                  onChange={(e) => setReminder1Day(e.target.checked)}
                  className="rounded text-[var(--accent)] focus:ring-0"
                />
                <span>За 1 день (цветы)</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-xl bg-[var(--surface)] border border-amber-200/80 text-xs font-semibold text-[var(--text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderSameDay}
                  onChange={(e) => setReminderSameDay(e.target.checked)}
                  className="rounded text-[var(--accent)] focus:ring-0"
                />
                <span>В день (в 09:00)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Подвал с кнопками */}
        <div className="px-6 py-4 border-t border-[var(--line)] flex items-center justify-between bg-[var(--surface)] shrink-0">
          <div className="text-xs text-[var(--muted)] hidden sm:block">
            <span>
              Будет создано событий: <b>{selectedCount}</b> с напоминаниями
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-black/5 transition-colors cursor-pointer"
            >
              Закрыть
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="px-5 py-2.5 rounded-full bg-[var(--accent)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Импортировать в календарь ({selectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
