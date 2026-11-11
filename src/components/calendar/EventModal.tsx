import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Tag, Trash2 } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { CalendarEvent, EventCategory } from '../../types';
import { MemberAvatar } from '../common/MemberAvatar';
import { formatLocalDate } from '../../utils/dateUtils';
import { parseRuDate, humanDate, RuDateResult } from '../../utils/ruDate';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEvent | null;
  initialDate?: string;
}

const CATEGORIES: Array<{ id: EventCategory; label: string; color: string }> = [
  { id: 'family', label: 'Семейное', color: 'bg-rose-100 text-rose-800' },
  { id: 'kids', label: 'Детское / Школа', color: 'bg-amber-100 text-amber-800' },
  { id: 'health', label: 'Здоровье / Врачи', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'home', label: 'Быт и сервис', color: 'bg-[var(--accent-soft)] text-[var(--accent)]' },
  { id: 'work', label: 'Работа / Важное', color: 'bg-[var(--accent-soft)] text-[var(--accent)]' },
  { id: 'holiday', label: 'Праздник / Отдых', color: 'bg-pink-100 text-pink-800' },
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  initialDate,
}) => {
  const { members, addEvent, updateEvent, deleteEvent, showToast } = useHousehold();

  const [title, setTitle] = useState(eventToEdit?.title || '');
  const [description, setDescription] = useState(eventToEdit?.description || '');
  const [date, setDate] = useState(
    eventToEdit?.date || initialDate || formatLocalDate(new Date())
  );
  const [startTime, setStartTime] = useState(eventToEdit?.startTime || '12:00');
  const [endTime, setEndTime] = useState(eventToEdit?.endTime || '13:00');
  const [allDay, setAllDay] = useState(eventToEdit?.allDay || false);
  const [category, setCategory] = useState<EventCategory>(eventToEdit?.category || 'family');
  const [memberIds, setMemberIds] = useState<string[]>(
    eventToEdit?.memberIds || members.map((m) => m.id)
  );
  const [location, setLocation] = useState(eventToEdit?.location || '');
  const [reminderMinutes, setReminderMinutes] = useState(eventToEdit?.reminderMinutes || 60);
  const [isHoliday, setIsHoliday] = useState(eventToEdit?.isHoliday || false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number[]>(
    eventToEdit?.reminderDaysBefore || [1, 0]
  );
  const [recurringYearly, setRecurringYearly] = useState(eventToEdit?.recurringYearly || false);
  // Дата и время из названия: «5 декабря день рождения» сразу ставит 5 декабря
  const [reminderTime, setReminderTime] = useState(eventToEdit?.reminderTime || '09:00');
  const [dateTouched, setDateTouched] = useState(false);
  const [timeTouched, setTimeTouched] = useState(false);
  const [titleParse, setTitleParse] = useState<RuDateResult | null>(null);

  // Синхронизация состояния формы при открытии модального окна или смене события
  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setTitle(eventToEdit.title || '');
        setDescription(eventToEdit.description || '');
        setDate(eventToEdit.date || formatLocalDate(new Date()));
        setStartTime(eventToEdit.startTime || '12:00');
        setEndTime(eventToEdit.endTime || '13:00');
        setAllDay(eventToEdit.allDay || false);
        setCategory(eventToEdit.category || 'family');
        setMemberIds(eventToEdit.memberIds || members.map((m) => m.id));
        setLocation(eventToEdit.location || '');
        setReminderMinutes(eventToEdit.reminderMinutes || 60);
        setIsHoliday(eventToEdit.isHoliday || false);
        setReminderDaysBefore(eventToEdit.reminderDaysBefore || [1, 0]);
        setRecurringYearly(eventToEdit.recurringYearly || false);
      } else {
        setTitle('');
        setDescription('');
        setDate(initialDate || formatLocalDate(new Date()));
        setStartTime('12:00');
        setEndTime('13:00');
        setAllDay(false);
        setCategory('family');
        setMemberIds(members.map((m) => m.id));
        setLocation('');
        setReminderMinutes(60);
        setIsHoliday(false);
        setReminderDaysBefore([1, 0]);
        setRecurringYearly(false);
      }
      setReminderTime(eventToEdit?.reminderTime || '09:00');
      setDateTouched(!!initialDate);
      setTimeTouched(false);
      setTitleParse(null);
    }
    // members намеренно не в зависимостях: обновление списка не должно сбрасывать ввод
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, eventToEdit, initialDate]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (eventToEdit) return;
    const r = parseRuDate(value);
    const useful = r.hasDate || !!r.time || r.isBirthday;
    setTitleParse(useful ? r : null);
    if (r.hasDate && !dateTouched) setDate(r.date);
    const birthdayReminder = r.isBirthday && r.wantsReminder;
    if (r.time && !timeTouched && !birthdayReminder) {
      setAllDay(false);
      setStartTime(r.time);
      const [h, m] = r.time.split(':').map(Number);
      setEndTime(`${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    if (r.isBirthday) {
      setRecurringYearly(true);
      setIsHoliday(true);
      setCategory('family');
      setReminderDaysBefore([7, 1, 0]);
      if ((!r.time || birthdayReminder) && !timeTouched) setAllDay(true);
      if (birthdayReminder && r.reminderTime) setReminderTime(r.reminderTime);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (eventToEdit) {
      updateEvent(eventToEdit.id, {
        title: title.trim(),
        description: description.trim(),
        date,
        startTime,
        endTime,
        allDay,
        category,
        memberIds,
        location: location.trim() || undefined,
        reminderMinutes,
        isHoliday,
        reminderDaysBefore,
        recurringYearly,
        reminderTime,
      });
    } else {
      addEvent({
        title: (titleParse && (titleParse.hasDate || titleParse.time) ? titleParse.cleanTitle : title).trim(),
        description: description.trim(),
        date,
        startTime,
        endTime,
        allDay,
        category,
        memberIds,
        location: location.trim() || undefined,
        reminderMinutes,
        isHoliday,
        reminderDaysBefore,
        recurringYearly,
        reminderTime,
      });
    }

    onClose();
  };

  const toggleMember = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[var(--surface-2)] rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface)]">
          <h3 className="text-base font-semibold text-[var(--text)]">
            {eventToEdit ? 'Редактировать событие' : 'Новое событие в календарь'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Название */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">
              Название события *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Например: 5 декабря день рождения двойняшек"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
            />
            {titleParse && (titleParse.hasDate || titleParse.time || titleParse.isBirthday) && (
              <p className="mt-2 text-[14px] text-[var(--accent)] flex flex-wrap items-center gap-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {[
                    titleParse.hasDate ? humanDate(date) : null,
                    titleParse.time && !allDay ? `в ${startTime}` : allDay ? 'весь день' : null,
                    titleParse.reminderTime && allDay ? `напомню в ${reminderTime}` : null,
                    titleParse.isBirthday ? 'каждый год' : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
                {(titleParse.hasDate || titleParse.time) && (
                  <span className="text-[var(--muted)]">— сохраню как «{titleParse.cleanTitle}»</span>
                )}
              </p>
            )}
          </div>

          {/* Дата и Время */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Дата
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setDateTouched(true);
                }}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Начало
              </label>
              <input
                type="time"
                disabled={allDay}
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setTimeTouched(true);
                }}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)] disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Окончание
              </label>
              <input
                type="time"
                disabled={allDay}
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setTimeTouched(true);
                }}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)] disabled:opacity-40"
              />
            </div>
          </div>

          <label className="flex items-center space-x-2 text-xs text-[var(--text-2)] font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => {
                setAllDay(e.target.checked);
                setTimeTouched(true);
              }}
              className="rounded text-[var(--accent)] focus:ring-0"
            />
            <span>Весь день</span>
          </label>

          {/* Участники события */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Кто участвует?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {members.map((member) => {
                const isSelected = memberIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center ${ isSelected ? 'bg-[var(--surface)] border-[var(--accent)] shadow-[var(--shadow)]' : 'bg-[var(--surface)]/40 border-stone-200 opacity-60' }`}
                  >
                    <MemberAvatar
                      member={member}
                      size="md"
                      className="mb-1"
                    />
                    <span className="text-[12px] font-semibold text-[var(--text)]">
                      {member.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Категория */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
              Категория события
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    category === cat.id
                      ? `${cat.color} ring-2 ring-[var(--accent)]/50 font-semibold`
                      : 'bg-[var(--surface)] border border-stone-200 text-stone-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Местоположение */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">
              Место / Локация
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Адрес, клиника, школа или «Дома»..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
              />
            </div>
          </div>

          {/* Праздник и напоминания */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-semibold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHoliday}
                  onChange={(e) => setIsHoliday(e.target.checked)}
                  className="rounded text-[var(--accent)] focus:ring-0"
                />
                <span>Это праздник или семейная дата</span>
              </label>

              {isHoliday && (
                <label className="flex items-center space-x-1.5 text-[12px] font-semibold text-amber-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recurringYearly}
                    onChange={(e) => setRecurringYearly(e.target.checked)}
                    className="rounded text-[var(--accent)] focus:ring-0"
                  />
                  <span>Повторять каждый год</span>
                </label>
              )}
            </div>

            <div>
              <span className="block text-[12px] font-semibold text-amber-800 mb-1.5">
                Авто-напоминания:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[12px]">
                {[
                  { days: 7, label: 'За 7 дней' },
                  { days: 3, label: 'За 3 дня' },
                  { days: 1, label: 'За 1 день' },
                  { days: 0, label: 'В день (09:00)' },
                ].map((opt) => {
                  const isChecked = reminderDaysBefore.includes(opt.days);
                  return (
                    <label
                      key={opt.days}
                      className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-[var(--surface)]/80 border border-amber-200 text-stone-700 cursor-pointer hover:bg-[var(--surface)]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setReminderDaysBefore((prev) => [...prev, opt.days]);
                          } else {
                            setReminderDaysBefore((prev) =>
                              prev.filter((d) => d !== opt.days)
                            );
                          }
                        }}
                        className="rounded text-[var(--accent)] focus:ring-0 w-3.5 h-3.5"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Заметки */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">
              Заметки / Документы с собой
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Взять сменку, полис, номер талона..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)] resize-none"
            />
          </div>

          {/* Кнопки */}
          <div className="pt-4 flex items-center justify-between border-t border-[var(--line)]">
            {eventToEdit ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Удалить событие «${eventToEdit.title}» из календаря?`)) {
                    deleteEvent(eventToEdit.id);
                    showToast('Событие удалено из календаря', 'info');
                    onClose();
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-black/5 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
              >
                {eventToEdit ? 'Сохранить' : 'Добавить в календарь'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
