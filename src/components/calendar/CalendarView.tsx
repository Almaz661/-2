import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Clock,
  MapPin,
  Trash2,
  Edit2,
  User,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { CalendarEvent } from '../../types';
import { EventModal } from './EventModal';
import { MemberAvatar } from '../common/MemberAvatar';
import { getLocalDateString } from '../../utils/dateUtils';

type CalendarViewMode = 'month' | 'week' | 'agenda';

const DAYS_OF_WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const isEventOnDate = (ev: CalendarEvent, targetDateStr: string): boolean => {
  if (ev.date === targetDateStr) return true;
  if (ev.recurrence === 'yearly' || ev.isBirthday || /день\s+рождени|д\.?р\./i.test(ev.title)) {
    return ev.date.slice(5) === targetDateStr.slice(5);
  }
  if (ev.recurrence === 'monthly') {
    return ev.date.slice(8) === targetDateStr.slice(8);
  }
  return false;
};

export const CalendarView: React.FC = () => {
  const { events, deleteEvent, members, exportCalendarIcs, activeMemberId } = useHousehold();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [visibleMemberIds, setVisibleMemberIds] = useState<string[]>(
    members.map((m) => m.id)
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [selectedCellDate, setSelectedCellDate] = useState<string | undefined>(undefined);

  // Переключение видимости участника в календаре
  const toggleMemberFilter = (memberId: string) => {
    setVisibleMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  // Фильтрация событий
  const filteredEvents = events.filter((ev) => {
    if (activeMemberId && !ev.memberIds.includes(activeMemberId)) return false;
    // Проверка, есть ли хотя бы один выбранный в фильтре участник
    return ev.memberIds.some((id) => visibleMemberIds.includes(id));
  });

  // Навигация по датам
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 30);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 30);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Месячный заголовок на русском
  const monthTitle = currentDate.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
  const capitalizedMonthTitle = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  // Расчёт ячеек сетки месяца
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1; // 0 for Mon, 6 for Sun
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

  // Дни предыдущего месяца
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    calendarDays.push({
      dateStr: getLocalDateString(d),
      dayNum: prevMonthDays - i,
      isCurrentMonth: false,
    });
  }

  // Дни текущего месяца
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    calendarDays.push({
      dateStr: getLocalDateString(d),
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // Дни следующего месяца для завершения сетки (до кратного 7)
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    calendarDays.push({
      dateStr: getLocalDateString(d),
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  const todayStr = getLocalDateString(new Date());

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Верхняя строка управления календарем */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Навигация и заголовок месяца */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl bg-white border border-[#E3DFD5] text-[#1F1D1A] hover:bg-[#F7F5EE] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl bg-white border border-[#E3DFD5] text-[#1F1D1A] hover:bg-[#F7F5EE] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs font-semibold text-[#1F1D1A] hover:bg-[#F7F5EE]"
            >
              Сегодня
            </button>
          </div>

          <h2 className="text-xl font-extrabold text-[#1F1D1A]">
            {capitalizedMonthTitle}
          </h2>
        </div>

        {/* Переключатель вида и экспорт */}
        <div className="flex items-center space-x-3">
          {/* Режимы представления */}
          <div className="flex items-center space-x-1 p-1 rounded-2xl bg-[#EFECE4] border border-[#E3DFD5]">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-[#1F1D1A] shadow-xs'
                  : 'text-[#6B6456] hover:text-[#1F1D1A]'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-[#1F1D1A] shadow-xs'
                  : 'text-[#6B6456] hover:text-[#1F1D1A]'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === 'agenda'
                  ? 'bg-white text-[#1F1D1A] shadow-xs'
                  : 'text-[#6B6456] hover:text-[#1F1D1A]'
              }`}
            >
              Повестка
            </button>
          </div>

          {/* Экспорт в .ics */}
          <button
            onClick={exportCalendarIcs}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs font-semibold text-[#5C564B] hover:bg-[#F7F5EE] shadow-xs transition-all cursor-pointer"
            title="Экспорт в Apple / Google Calendar"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Экспорт .ics</span>
          </button>

          {/* Добавить событие */}
          <button
            onClick={() => {
              setEventToEdit(null);
              setSelectedCellDate(undefined);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Событие</span>
          </button>
        </div>
      </div>

      {/* Полоса фильтрации по участникам (цветовые чипы) */}
      <div className="flex items-center space-x-2 p-2.5 rounded-2xl bg-white border border-[#EBE7DF] overflow-x-auto shadow-2xs">
        <span className="text-[11px] font-bold text-[#8A8477] uppercase tracking-wider shrink-0 mr-1">
          Расписание участников:
        </span>
        {members.map((member) => {
          const isVisible = visibleMemberIds.includes(member.id);
          return (
            <button
              key={member.id}
              onClick={() => toggleMemberFilter(member.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isVisible
                  ? 'bg-[#FAF8F3] border border-stone-300 shadow-2xs'
                  : 'opacity-40 border border-transparent hover:opacity-70'
              }`}
            >
              <MemberAvatar member={member} size="xs" />
              <span className="text-[#1F1D1A]">{member.name}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Режим: Сетка месяца */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-3xl border border-[#EBE7DF] overflow-hidden shadow-xs">
          {/* Дни недели */}
          <div className="grid grid-cols-7 border-b border-[#EBE7DF] bg-[#FAF8F3]">
            {DAYS_OF_WEEK.map((day, idx) => (
              <div
                key={day}
                className={`py-3 text-center text-xs font-bold ${
                  idx >= 5 ? 'text-rose-600' : 'text-[#8A8477]'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Ячейки дней */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#F0ECE1]">
            {calendarDays.map((cell, idx) => {
              const dayEvents = filteredEvents.filter((e) => isEventOnDate(e, cell.dateStr));
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedCellDate(cell.dateStr);
                    setEventToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className={`min-h-[105px] p-2 transition-all cursor-pointer flex flex-col justify-between ${
                    cell.isCurrentMonth ? 'bg-white hover:bg-[#FDFBF7]' : 'bg-[#FAF9F6] opacity-45'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-[#E15A42] text-white shadow-xs'
                          : 'text-[#1F1D1A]'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-[#8A8477]">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Плашки событий */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] pr-0.5">
                    {dayEvents.map((ev) => {
                      const firstMember = members.find((m) => ev.memberIds.includes(m.id));
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventToEdit(ev);
                            setIsModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold truncate flex items-center space-x-1.5 hover:brightness-95 transition-all shadow-2xs border border-stone-200/50"
                          style={{
                            backgroundColor: firstMember
                              ? firstMember.color.hex + '18'
                              : '#F3F4F6',
                            color: firstMember ? firstMember.color.hex : '#1F2937',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: firstMember?.color.hex || '#6B7280' }}
                          />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Режим: Неделя */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-3xl border border-[#EBE7DF] overflow-hidden shadow-xs p-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {DAYS_OF_WEEK.map((dayName, idx) => {
              const weekStartDate = new Date(currentDate);
              const currentDayOfWeek = (weekStartDate.getDay() + 6) % 7;
              weekStartDate.setDate(weekStartDate.getDate() - currentDayOfWeek + idx);
              const dateStr = getLocalDateString(weekStartDate);
              const dayEvents = filteredEvents.filter((e) => isEventOnDate(e, dateStr));
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border flex flex-col min-h-[300px] ${
                    isToday ? 'bg-amber-50/40 border-[#E15A42]/40' : 'bg-[#FAF8F5] border-[#EBE7DF]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200 mb-2">
                    <span className="text-xs font-bold text-[#8A8477]">{dayName}</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isToday ? 'bg-[#E15A42] text-white' : 'text-[#1F1D1A]'
                      }`}
                    >
                      {weekStartDate.getDate()}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {dayEvents.length === 0 ? (
                      <p className="text-[11px] text-stone-400 text-center py-4">Нет дел</p>
                    ) : (
                      dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => {
                            setEventToEdit(ev);
                            setIsModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-white border border-stone-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-1"
                        >
                          <div className="text-xs font-bold text-[#1F1D1A] truncate">
                            {ev.title}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-blue-600 font-semibold pt-0.5">
                            <span className="flex items-center space-x-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{ev.startTime}</span>
                            </span>
                            <div className="flex items-center -space-x-1">
                              {ev.memberIds.map((mId) => {
                                const m = members.find((x) => x.id === mId);
                                if (!m) return null;
                                return (
                                  <MemberAvatar
                                    key={mId}
                                    member={m}
                                    size="2xs"
                                    className="ring-1 ring-white"
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => {
                    setSelectedCellDate(dateStr);
                    setEventToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className="w-full mt-2 py-1.5 text-center text-[11px] font-semibold text-[#E15A42] hover:bg-white rounded-lg transition-colors"
                >
                  + Добавить
                </button>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* 3. Режим: Повестка дня (Agenda) */}
    {viewMode === 'agenda' && (
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-bold text-[#1F1D1A] pb-2 border-b border-[#F0ECE1]">
          Предстоящие события дома
        </h3>

        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <p className="text-xs text-[#8A8477] py-8 text-center">
              Нет запланированных событий
            </p>
          ) : (
            filteredEvents
              .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
              .map((ev) => {
                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EBE7DF] hover:bg-white hover:shadow-xs transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-14 text-center">
                        <div className="text-xs font-bold text-blue-600 bg-blue-50 py-1 rounded-xl">
                          {ev.startTime}
                        </div>
                        <div className="text-[10px] text-stone-500 mt-1">
                          {new Date(ev.date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-[#1F1D1A]">{ev.title}</h4>
                        {ev.location && (
                          <p className="text-xs text-[#8A8477] flex items-center space-x-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span>{ev.location}</span>
                          </p>
                        )}
                        <div className="flex items-center space-x-1.5 mt-1.5">
                          {ev.memberIds.map((mId) => {
                            const member = members.find((m) => m.id === mId);
                            if (!member) return null;
                            return (
                              <span
                                key={mId}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1"
                                style={{
                                  backgroundColor: member.color.hex + '20',
                                  color: member.color.hex,
                                }}
                              >
                                <MemberAvatar member={member} size="2xs" />
                                <span>{member.name}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setEventToEdit(ev);
                            setIsModalOpen(true);
                          }}
                          className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-black/5"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEvent(ev.id)}
                          className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Модальное окно создания/редактирования */}
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEventToEdit(null);
          setSelectedCellDate(undefined);
        }}
        eventToEdit={eventToEdit}
        initialDate={selectedCellDate}
      />
    </div>
  );
};
