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
  Sparkles,
  Volume2,
  Bell,
  Camera,
  MoreHorizontal,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { CalendarEvent } from '../../types';
import { EventModal } from './EventModal';
import { HolidayImportModal } from './HolidayImportModal';
import { MemberAvatar } from '../common/MemberAvatar';
import { CleaningCalendar } from './CleaningCalendar';
import { dayItems } from '../../services/dayItems';
import { occursOn, nextOccurrence } from '../../utils/dateUtils';
import { Btn, Card, EmptyState, GroupLabel, IconBtn, PageWrap, Segmented, Slide, Tag } from '../ui/mercury';
import { formatLocalDate } from '../../utils/dateUtils';
import {
  playNotificationSound,
  checkUpcomingHolidayReminders,
} from '../../services/notificationService';

type CalendarViewMode = 'month' | 'week' | 'agenda' | 'cleaning';

const getHolidayFlag = (countryCode?: string) => {
  if (!countryCode) return '';
  switch (countryCode.toUpperCase()) {
    case 'RU':
      return '🇷🇺';
    case 'NL':
      return '🇳🇱';
    case 'GR':
      return '🇬🇷';
    case 'CY':
      return '🇨🇾';
    case 'EU':
      return '🇪🇺';
    default:
      return '';
  }
};

const DAYS_OF_WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const CalendarView: React.FC = () => {
  const { events, deleteEvent, members, exportCalendarIcs, activeMemberId, showToast, tasks } =
    useHousehold();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    try {
      const v = localStorage.getItem('dbh_calendar_view');
      localStorage.removeItem('dbh_calendar_view');
      return v === 'cleaning' ? 'cleaning' : 'month';
    } catch {
      return 'month';
    }
  });
  const [visibleMemberIds, setVisibleMemberIds] = useState<string[]>(
    members.map((m) => m.id)
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
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
      dateStr: formatLocalDate(d),
      dayNum: prevMonthDays - i,
      isCurrentMonth: false,
    });
  }

  // Дни текущего месяца
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    calendarDays.push({
      dateStr: formatLocalDate(d),
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // Дни следующего месяца для завершения сетки (до кратного 7)
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    calendarDays.push({
      dateStr: formatLocalDate(d),
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  const todayStr = formatLocalDate(new Date());

  return (
    <PageWrap className="max-w-7xl">
      {/* Навигация по месяцам, вид и действия */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <IconBtn aria-label="Назад" onClick={handlePrev} className="border border-[var(--line)] bg-[var(--surface)] !w-9 !h-9 !rounded-full">
              <ChevronLeft className="w-4 h-4" />
            </IconBtn>
            <IconBtn aria-label="Вперёд" onClick={handleNext} className="border border-[var(--line)] bg-[var(--surface)] !w-9 !h-9 !rounded-full">
              <ChevronRight className="w-4 h-4" />
            </IconBtn>
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text)]">{capitalizedMonthTitle}</h2>
          <Btn size="sm" onClick={handleToday}>
            Сегодня
          </Btn>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { id: 'month', label: 'Месяц' },
              { id: 'week', label: 'Неделя' },
              { id: 'agenda', label: 'Список' },
              { id: 'cleaning', label: 'План' },
            ]}
          />
          <Btn icon={<Sparkles className="w-4 h-4" />} onClick={() => setIsHolidayModalOpen(true)} title="Импорт праздников с напоминаниями">
            <span className="hidden sm:inline">Праздники</span>
          </Btn>
          <CalendarMore
            onSound={() => {
              playNotificationSound();
              checkUpcomingHolidayReminders(events, (_ev, msg) => showToast(msg, 'info'), true);
              showToast('Звук и напоминания работают', 'success');
            }}
            onExport={exportCalendarIcs}
          />
          <Btn
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEventToEdit(null);
              setSelectedCellDate(undefined);
              setIsModalOpen(true);
            }}
          >
            Событие
          </Btn>
        </div>
      </div>

      {/* Чьё расписание показывать */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[14px] text-[var(--muted)] shrink-0 mr-1">Показывать:</span>
        {members.map((member) => {
          const isVisible = visibleMemberIds.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              aria-pressed={isVisible}
              onClick={() => toggleMemberFilter(member.id)}
              className={`inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-[14px] font-medium border transition whitespace-nowrap ${
                isVisible
                  ? 'bg-[var(--surface)] border-[var(--line-strong)] text-[var(--text)]'
                  : 'border-transparent text-[var(--muted)] opacity-50 hover:opacity-80'
              }`}
            >
              <MemberAvatar member={member} size="xs" />
              {member.name}
            </button>
          );
        })}
      </div>

      {/* 1. Режим: Сетка месяца */}
      {viewMode === 'month' && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] overflow-hidden shadow-[var(--shadow)]">
          {/* Дни недели */}
          <div className="grid grid-cols-7 border-b border-[var(--line)]">
            {DAYS_OF_WEEK.map((day, idx) => (
              <div
                key={day}
                className={`py-3 px-3 text-left text-xs font-medium ${
                  idx >= 5 ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Ячейки дней */}
          <Slide k={capitalizedMonthTitle} index={currentDate.getFullYear() * 12 + currentDate.getMonth()}>
          <div className="grid grid-cols-7 divide-x divide-y divide-[var(--line)]">
            {calendarDays.map((cell, idx) => {
              const dayEvents = filteredEvents.filter((e) => occursOn(e, cell.dateStr));
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedCellDate(cell.dateStr);
                    setEventToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className={`group min-h-[112px] p-2 transition-colors cursor-pointer flex flex-col ${
                    cell.isCurrentMonth ? 'hover:bg-[var(--surface-3)]' : 'bg-[var(--surface-2)] text-[var(--muted)] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[14px] font-medium w-7 h-7 rounded-full flex items-center justify-center tabular-nums ${
                        isToday ? 'bg-[var(--accent)] text-white' : 'text-[var(--text)]'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Дела дня — уборка и задачи; нажатие открывает полный план дня */}
                  {(() => {
                    const di = dayItems(new Date(cell.dateStr + 'T12:00:00'), tasks, []);
                    if (!di.count) return null;
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            localStorage.setItem('dbh_plan_day', cell.dateStr);
                          } catch {
                            /* нет места */
                          }
                          setViewMode('cleaning');
                        }}
                        className="mb-1 w-full text-left px-2 py-0.5 rounded-md text-[12px] text-[var(--text-2)] bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] tabular-nums"
                        title="Открыть план дня"
                      >
                        {di.important > 0 && <span className="text-amber-700">★{di.important} </span>}
                        дел: {di.count}
                      </button>
                    );
                  })()}
                  {/* Плашки событий */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] pr-0.5">
                    {dayEvents.map((ev) => {
                      const firstMember = members.find((m) => ev.memberIds.includes(m.id));
                      const isHol = ev.isHoliday || ev.category === 'holiday';
                      const flag = getHolidayFlag(ev.holidayCountry);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventToEdit(ev);
                            setIsModalOpen(true);
                          }}
                          className={`px-2 py-1 rounded-md text-[13px] font-medium truncate flex items-center gap-1.5 transition hover:brightness-95 ${
                            isHol ? 'bg-amber-50 text-amber-700' : 'text-[var(--text)]'
                          }`}
                          style={
                            isHol
                              ? undefined
                              : { backgroundColor: firstMember ? firstMember.color.hex + '1f' : 'var(--surface-3)' }
                          }
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: isHol ? '#D97706' : firstMember?.color.hex || 'var(--muted)',
                            }}
                          />
                          <span className="truncate">
                            {flag ? `${flag} ` : ''}
                            {ev.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          </Slide>
        </div>
      )}

      {/* На телефоне клетки месяца маленькие — ниже список ближайших 7 дней */}
      {viewMode === 'month' && (() => {
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const ymd = formatLocalDate(d);
          return { ymd, d, evs: filteredEvents.filter((e) => occursOn(e, ymd)).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')) };
        }).filter((x) => x.evs.length);
        return (
          <Card className="md:hidden p-2">
            <div className="px-3 pt-2 pb-1 text-[16px] font-medium text-[var(--text)]">Ближайшие 7 дней</div>
            {days.length === 0 ? (
              <p className="px-3 py-4 text-sm text-[var(--muted)]">Событий нет.</p>
            ) : (
              days.map((x) => (
                <div key={x.ymd} className="border-t border-[var(--line)] first:border-t-0">
                  <div className="px-3 pt-3 pb-1 text-[14px] text-[var(--muted)]">
                    {x.ymd === todayStr ? 'Сегодня' : x.d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  {x.evs.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => { setEventToEdit(ev); setIsModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[var(--surface-3)]"
                    >
                      <span className="w-14 shrink-0 text-sm tabular-nums text-[var(--text-2)]">{ev.allDay || !ev.startTime ? 'день' : ev.startTime}</span>
                      <span className="flex-1 min-w-0 text-[16px] text-[var(--text)] truncate">{ev.title}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </Card>
        );
      })()}

      {/* 2. Режим: Неделя */}
      {viewMode === 'week' && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--line)] overflow-hidden shadow-[var(--shadow)] p-3 sm:p-4">
          <Slide k={currentDate.toDateString()} index={Math.floor(currentDate.getTime() / 86400000)}>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((dayName, idx) => {
              const weekStartDate = new Date(currentDate);
              const currentDayOfWeek = (weekStartDate.getDay() + 6) % 7;
              weekStartDate.setDate(weekStartDate.getDate() - currentDayOfWeek + idx);
              const dateStr = formatLocalDate(weekStartDate);
              const dayEvents = filteredEvents.filter((e) => occursOn(e, dateStr));
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border flex flex-col min-h-[300px] ${
                    isToday ? 'bg-[var(--accent-soft)] border-transparent' : 'bg-[var(--surface-2)] border-[var(--line)]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200 mb-2">
                    <span className="text-xs font-semibold text-[var(--muted)]">{dayName}</span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isToday ? 'bg-[var(--accent)] text-white' : 'text-[var(--text)]'
                      }`}
                    >
                      {weekStartDate.getDate()}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {(() => {
                      const di = dayItems(new Date(dateStr + 'T12:00:00'), tasks, []);
                      const list = [...di.cleaning.map((c) => c.title), ...di.themeItems.map((t) => t.title), ...di.tasks.filter((t) => !t.completed).map((t) => (t.priority === 'high' ? '★ ' : '') + t.title)];
                      if (!list.length) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              localStorage.setItem('dbh_plan_day', dateStr);
                            } catch {
                              /* нет места */
                            }
                            setViewMode('cleaning');
                          }}
                          className="w-full text-left p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] hover:bg-[var(--accent-soft)]"
                          title="Открыть план дня"
                        >
                          <div className="text-[12px] font-medium text-[var(--muted)] mb-1">Дела: {list.length}</div>
                          {list.slice(0, 5).map((t, i) => (
                            <div key={i} className="text-[13px] text-[var(--text)] truncate">
                              {t}
                            </div>
                          ))}
                          {list.length > 5 && <div className="text-[12px] text-[var(--muted)]">ещё {list.length - 5}</div>}
                        </button>
                      );
                    })()}
                    {dayEvents.length === 0 ? null : (
                      dayEvents.map((ev) => {
                      const flag = getHolidayFlag(ev.holidayCountry);
                      return (
                        <div
                          key={ev.id}
                          onClick={() => {
                            setEventToEdit(ev);
                            setIsModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-[var(--surface)] border border-stone-200 shadow-none hover:shadow-[var(--shadow)] transition-all cursor-pointer space-y-1"
                        >
                          <div className="text-xs font-semibold text-[var(--text)] truncate">
                            {flag ? `${flag} ` : ''}
                            {ev.title}
                          </div>
                          <div className="flex items-center justify-between text-[12px] text-[var(--muted)] tabular-nums pt-0.5">
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
                                    className="ring-1 ring-[var(--surface)]"
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  </div>

                  <button
                    onClick={() => {
                    setSelectedCellDate(dateStr);
                    setEventToEdit(null);
                    setIsModalOpen(true);
                  }}
                  className="w-full mt-2 py-1.5 text-center text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--surface)] rounded-lg transition-colors"
                >
                  + Добавить
                </button>
              </div>
            );
          })}
        </div>
          </Slide>
      </div>
    )}

    {/* 3. Режим: Повестка дня (Agenda) */}
      {viewMode === 'agenda' && (() => {
        const list = filteredEvents
          .map((ev) => (ev.recurringYearly ? { ...ev, date: nextOccurrence(ev, todayStr) } : ev))
          .filter((ev) => ev.date >= todayStr)
          .sort((x, y) => x.date.localeCompare(y.date) || (x.startTime || '').localeCompare(y.startTime || ''));
        const byDate: Record<string, typeof list> = {};
        list.forEach((ev) => (byDate[ev.date] = [...(byDate[ev.date] || []), ev]));
        return (
          <Card className="p-2 sm:p-3">
            {list.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-5 h-5" />}
                title="Событий нет"
                text="Добавьте встречу, кружок или праздник — напомним заранее."
                action={
                  <Btn variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { setEventToEdit(null); setIsModalOpen(true); }}>
                    Событие
                  </Btn>
                }
              />
            ) : (
              Object.entries(byDate).map(([date, evs]) => {
                const d = new Date(date + 'T00:00:00');
                const label =
                  date === todayStr
                    ? 'Сегодня'
                    : d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
                return (
                  <div key={date}>
                    <GroupLabel label={label.charAt(0).toUpperCase() + label.slice(1)} count={evs.length} />
                    {evs.map((ev) => {
                      const isHol = ev.isHoliday || ev.category === 'holiday';
                      const flag = getHolidayFlag(ev.holidayCountry);
                      return (
                        <div
                          key={ev.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => { setEventToEdit(ev); setIsModalOpen(true); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setEventToEdit(ev); setIsModalOpen(true); } }}
                          className="group grid grid-cols-[72px_1fr_auto] items-center gap-3 px-3 py-3 rounded-xl border-t border-[var(--line)] first:border-t-0 hover:bg-[var(--surface-3)] transition-colors cursor-pointer outline-none focus-visible:bg-[var(--surface-3)]"
                        >
                          <span className="text-sm tabular-nums text-[var(--text-2)]">{ev.allDay || !ev.startTime ? 'Весь день' : ev.startTime}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[16px] font-medium text-[var(--text)] truncate">
                                {flag ? `${flag} ` : ''}
                                {ev.title}
                              </span>
                              {isHol && <Tag tone="warn">Праздник</Tag>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[14px] text-[var(--muted)] min-w-0">
                              {ev.location && (
                                <span className="inline-flex items-center gap-1 truncate">
                                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                                  {ev.location}
                                </span>
                              )}
                              {ev.reminderDaysBefore && ev.reminderDaysBefore.length > 0 && (
                                <span className="truncate">
                                  Напомнить {ev.reminderDaysBefore.map((x) => (x === 0 ? 'в день' : `за ${x} дн.`)).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5">
                              {ev.memberIds.map((mId) => {
                                const m = members.find((x) => x.id === mId);
                                return m ? <MemberAvatar key={mId} member={m} size="xs" className="ring-2 ring-[var(--surface)]" /> : null;
                              })}
                            </div>
                            <IconBtn
                              danger
                              aria-label="Удалить"
                              title="Удалить"
                              className="hover-actions opacity-0 group-hover:opacity-100 focus:opacity-100"
                              onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </IconBtn>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </Card>
        );
      })()}

      {viewMode === 'cleaning' && <CleaningCalendar currentDate={currentDate} />}

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

      {/* Модальное окно импорта государственных и семейных праздников */}
      <HolidayImportModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
      />
    </PageWrap>
  );
};


/** «⋯» в календаре: редкие действия. */
const CalendarMore: React.FC<{ onSound: () => void; onExport: () => void }> = ({ onSound, onExport }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  const item = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left text-[var(--text)] hover:bg-[var(--surface-3)]';
  return (
    <div ref={ref} className="relative">
      <IconBtn aria-label="Ещё" title="Ещё" onClick={() => setOpen((v) => !v)} className="border border-[var(--line)] bg-[var(--surface)] !w-10 !h-10 !rounded-full">
        <MoreHorizontal className="w-4 h-4" />
      </IconBtn>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 p-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
          <button type="button" className={item} onClick={() => { setOpen(false); onExport(); }}>
            <Download className="w-4 h-4 text-[var(--muted)]" /> Экспорт в Apple / Google Календарь
          </button>
          <button type="button" className={item} onClick={() => { setOpen(false); onSound(); }}>
            <Volume2 className="w-4 h-4 text-[var(--muted)]" /> Проверить звук напоминаний
          </button>
        </div>
      )}
    </div>
  );
};
