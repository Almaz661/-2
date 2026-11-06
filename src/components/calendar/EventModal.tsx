import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Tag, Sparkles } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { CalendarEvent, EventCategory } from '../../types';
import { MemberAvatar } from '../common/MemberAvatar';
import { getLocalDateString, parseNaturalDate } from '../../utils/dateUtils';

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
  { id: 'home', label: 'Быт и сервис', color: 'bg-blue-100 text-blue-800' },
  { id: 'work', label: 'Работа / Важное', color: 'bg-purple-100 text-purple-800' },
  { id: 'holiday', label: 'Праздник / Отдых', color: 'bg-pink-100 text-pink-800' },
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  initialDate,
}) => {
  const { members, addEvent, updateEvent } = useHousehold();

  const [title, setTitle] = useState(eventToEdit?.title || '');
  const [description, setDescription] = useState(eventToEdit?.description || '');
  const [date, setDate] = useState(
    eventToEdit?.date || initialDate || getLocalDateString()
  );
  const [startTime, setStartTime] = useState(eventToEdit?.startTime || '12:00');
  const [endTime, setEndTime] = useState(eventToEdit?.endTime || '13:00');
  const [allDay, setAllDay] = useState(eventToEdit?.allDay || false);
  const [recurrence, setRecurrence] = useState<'none' | 'yearly' | 'monthly' | 'weekly' | 'daily'>(
    eventToEdit?.recurrence || 'none'
  );
  const [category, setCategory] = useState<EventCategory>(eventToEdit?.category || 'family');
  const [memberIds, setMemberIds] = useState<string[]>(
    eventToEdit?.memberIds || members.map((m) => m.id)
  );
  const [location, setLocation] = useState(eventToEdit?.location || '');
  const [reminderMinutes, setReminderMinutes] = useState(eventToEdit?.reminderMinutes || 60);

  // Синхронизация состояния формы при открытии модального окна или смене события
  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setTitle(eventToEdit.title || '');
        setDescription(eventToEdit.description || '');
        setDate(eventToEdit.date || getLocalDateString());
        setStartTime(eventToEdit.startTime || '12:00');
        setEndTime(eventToEdit.endTime || '13:00');
        setAllDay(eventToEdit.allDay || false);
        setCategory(eventToEdit.category || 'family');
        setMemberIds(eventToEdit.memberIds || members.map((m) => m.id));
        setLocation(eventToEdit.location || '');
        setReminderMinutes(eventToEdit.reminderMinutes || 60);
      } else {
        setTitle('');
        setDescription('');
        setDate(initialDate || new Date().toISOString().split('T')[0]);
        setStartTime('12:00');
        setEndTime('13:00');
        setAllDay(false);
        setCategory('family');
        setMemberIds(members.map((m) => m.id));
        setLocation('');
        setReminderMinutes(60);
      }
    }
  }, [isOpen, eventToEdit, initialDate, members]);

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
        recurrence,
      });
    } else {
      addEvent({
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
        recurrence,
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
      <div className="w-full max-w-lg bg-[#FCFBF8] rounded-3xl border border-[#EBE7DF] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-[#EBE7DF] flex items-center justify-between bg-white">
          <h3 className="text-base font-bold text-[#1F1D1A]">
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
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
              Название события *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: 5 декабря день рождения двойняшек в 9-00..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E3DFD5] text-sm text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#E15A42]/30 focus:border-[#E15A42]"
            />

            {/* Подсказка распознанной даты */}
            {(() => {
              const parsed = parseNaturalDate(title);
              if (!parsed || parsed.date === date) return null;
              return (
                <div className="mt-2 flex items-center justify-between text-xs bg-amber-50 text-amber-900 border border-amber-200/80 rounded-xl px-3 py-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      {parsed.isBirthday ? '🎂 День рождения: ' : 'Найдена дата: '}
                      <strong>{parsed.date}</strong>
                      {parsed.time ? `, ${parsed.time}` : ''}
                      {parsed.recurrence === 'yearly' ? ' (ежегодно)' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDate(parsed.date);
                      if (parsed.time) setStartTime(parsed.time);
                      if (parsed.isAllDay) setAllDay(true);
                      if (parsed.recurrence) setRecurrence(parsed.recurrence);
                      if (parsed.cleanText) setTitle(parsed.cleanText);
                      if (parsed.isBirthday) setCategory('family');
                    }}
                    className="font-bold text-amber-800 hover:text-amber-950 underline ml-2 cursor-pointer"
                  >
                    Применить
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Дата и Время */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
                Дата
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
                Начало
              </label>
              <input
                type="time"
                disabled={allDay}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A] disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
                Окончание
              </label>
              <input
                type="time"
                disabled={allDay}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A] disabled:opacity-40"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <label className="flex items-center space-x-2 text-xs text-[#5C564B] font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded text-[#E15A42] focus:ring-0"
              />
              <span>Весь день</span>
            </label>

            {/* Выбор повторения события */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-[#8C867D]">Повтор:</span>
              <select
                value={recurrence}
                onChange={(e: any) => setRecurrence(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg bg-white border border-[#E3DFD5] text-[#1F1D1A] font-medium focus:outline-none"
              >
                <option value="none">Без повтора</option>
                <option value="yearly">🎂 Каждый год (День рождения)</option>
                <option value="monthly">Каждый месяц</option>
                <option value="weekly">Каждую неделю</option>
              </select>
            </div>
          </div>

          {/* Участники события */}
          <div>
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1.5">
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
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center ${
                      isSelected
                        ? 'bg-white border-[#E15A42] shadow-xs'
                        : 'bg-white/40 border-stone-200 opacity-60'
                    }`}
                  >
                    <MemberAvatar
                      member={member}
                      size="md"
                      className="mb-1"
                    />
                    <span className="text-[11px] font-semibold text-[#1F1D1A]">
                      {member.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Категория */}
          <div>
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1.5">
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
                      ? `${cat.color} ring-2 ring-[#E15A42]/50 font-bold`
                      : 'bg-white border border-stone-200 text-stone-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Местоположение */}
          <div>
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
              Место / Локация
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Адрес, клиника, школа или «Дома»..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
              />
            </div>
          </div>

          {/* Заметки */}
          <div>
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
              Заметки / Документы с собой
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Взять сменку, полис, номер талона..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A] resize-none"
            />
          </div>

          {/* Кнопки */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#EBE7DF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-black/5"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              {eventToEdit ? 'Сохранить' : 'Добавить в календарь'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
