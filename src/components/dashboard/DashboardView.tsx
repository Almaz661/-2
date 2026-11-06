import React from 'react';
import {
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Heart,
  Plus,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Camera,
  Receipt,
  Pill,
  Gauge,
  Gift,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { NavTab } from '../layout/Sidebar';
import { MemberAvatar } from '../common/MemberAvatar';
import { WeatherWidget } from './WeatherWidget';
import { getLocalDateString, getDaysUntilBirthday } from '../../utils/dateUtils';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenQuickCapture: () => void;
  onNewTask: () => void;
  onNewEvent: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuickCapture,
  onNewTask,
  onNewEvent,
}) => {
  const {
    householdName,
    members,
    activeMemberId,
    tasks,
    toggleTaskCompletion,
    events,
    shoppingItems,
    toggleShoppingItem,
    mealPlan,
    recipes,
    docs,
    inventory,
    medicines,
    meters,
    setIsSOSOpen,
    assistantLogs,
  } = useHousehold();

  const todayStr = getLocalDateString(new Date());
  const currentMonthStr = todayStr.substring(0, 7);

  // Счётчики, по которым ещё не переданы показания за текущий месяц
  const unsubmittedMeters = meters.filter((m) => {
    const r = m.readings.find((rd) => rd.month === currentMonthStr);
    return !r || !r.submitted;
  });

  // Фильтрация с учётом активного участника
  const filteredTasks = tasks.filter((t) => {
    if (activeMemberId && t.assigneeId !== activeMemberId) return false;
    return true;
  });

  const todayTasks = filteredTasks.filter(
    (t) => t.dueDate === todayStr || (!t.dueDate && !t.completed)
  );
  const pendingTodayTasks = todayTasks.filter((t) => !t.completed);
  const completedTodayTasks = todayTasks.filter((t) => t.completed);

  // Дни рождения и повторяющиеся события сегодняшнего дня
  const todayEvents = events.filter((e) => {
    const isToday =
      e.date === todayStr ||
      ((e.isBirthday || e.recurrence === 'yearly' || /день\s+рождени|д\.?р\./i.test(e.title)) &&
        e.date.slice(5) === todayStr.slice(5));
    if (!isToday) return false;
    if (activeMemberId && !e.memberIds.includes(activeMemberId)) return false;
    return true;
  });

  // Ближайшие дни рождения семьи (в течение 7 дней)
  const upcomingBirthdays = events
    .filter((e) => e.isBirthday || e.recurrence === 'yearly' || /день\s+рождени|д\.?р\./i.test(e.title))
    .map((e) => {
      const bday = getDaysUntilBirthday(e.date);
      return {
        event: e,
        ...bday,
      };
    })
    .filter((b) => b.daysLeft >= 0 && b.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // План на ужин сегодня
  const todayMeal = mealPlan.find((m) => m.date === todayStr);
  const dinnerRecipe = todayMeal?.dinner?.recipeId
    ? recipes.find((r) => r.id === todayMeal.dinner?.recipeId)
    : null;
  const dinnerTitle =
    dinnerRecipe?.title || todayMeal?.dinner?.customTitle || 'Ужин ещё не запланирован';

  // Экспресс-покупки (первые 5 некупленных товаров)
  const quickShoppingItems = shoppingItems.filter((i) => !i.completed).slice(0, 5);

  // Документы, лекарства и ТО со скорым истечением
  const criticalItems = [
    ...docs
      .filter((d) => {
        if (!d.expiryDate) return false;
        const diffDays = Math.ceil(
          (new Date(d.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
        );
        return diffDays >= 0 && diffDays <= 30;
      })
      .map((d) => ({
        type: 'doc',
        title: d.title,
        info: `Истекает: ${new Date(d.expiryDate!).toLocaleDateString('ru-RU')}`,
      })),
    ...medicines
      .filter((m) => {
        if (!m.expiryDate) return false;
        const diffDays = Math.ceil(
          (new Date(m.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
        );
        return diffDays <= 45;
      })
      .map((m) => {
        const diffDays = Math.ceil(
          (new Date(m.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
        );
        return {
          type: 'medicine',
          title: `Аптечка: ${m.name}`,
          info:
            diffDays < 0
              ? `Просрочено на ${Math.abs(diffDays)} дн. (выбросить)`
              : `Истекает через ${diffDays} дн.`,
        };
      }),
    ...inventory
      .filter((i) => {
        if (!i.vehicleDetails?.insuranceExpiry) return false;
        const diffDays = Math.ceil(
          (new Date(i.vehicleDetails.insuranceExpiry).getTime() - new Date().getTime()) /
            (1000 * 3600 * 24)
        );
        return diffDays >= 0 && diffDays <= 30;
      })
      .map((i) => ({
        type: 'vehicle',
        title: `${i.name} (ОСАГО)`,
        info: `Истекает: ${new Date(i.vehicleDetails!.insuranceExpiry!).toLocaleDateString('ru-RU')}`,
      })),
  ];

  // Приветствие по времени суток
  const currentHour = new Date().getHours();
  let greeting = 'Добрый день!';
  if (currentHour >= 5 && currentHour < 12) greeting = 'Доброе утро!';
  else if (currentHour >= 18 && currentHour < 23) greeting = 'Уютного вечера!';
  else if (currentHour >= 23 || currentHour < 5) greeting = 'Доброй ночи!';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Приветственный баннер с быстрой статистикой */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FAF6EE] via-[#F4EFE5] to-[#EFE7D8] p-6 sm:p-8 border border-[#E8E2D4] shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur-xs text-xs font-semibold text-[#8C522C] mb-2.5 border border-[#EADFCF]">
              <Heart className="w-3.5 h-3.5 text-[#E15A42] fill-[#E15A42]" />
              <span>{householdName} • Гармония в каждом дне</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F1D1A] tracking-tight">
              {greeting}{' '}
              <span className="text-[#8A8477] font-medium text-lg sm:text-xl block sm:inline">
                Сегодня под контролем:
              </span>
            </h1>
          </div>

          {/* Быстрые карточки сводки: Задачи, События, Покупки, SOS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div
              onClick={() => onNavigate('tasks')}
              className="bg-white/80 backdrop-blur-xs px-3.5 py-3 rounded-2xl border border-stone-200/60 shadow-2xs hover:bg-white transition-all cursor-pointer"
            >
              <div className="text-[11px] font-semibold text-[#8A8477]">Задачи на сегодня</div>
              <div className="text-xl font-bold text-[#1F1D1A] mt-0.5">
                {pendingTodayTasks.length}{' '}
                <span className="text-xs font-normal text-stone-500">
                  / {todayTasks.length}
                </span>
              </div>
            </div>

            <div
              onClick={() => onNavigate('calendar')}
              className="bg-white/80 backdrop-blur-xs px-3.5 py-3 rounded-2xl border border-stone-200/60 shadow-2xs hover:bg-white transition-all cursor-pointer"
            >
              <div className="text-[11px] font-semibold text-[#8A8477]">События дня</div>
              <div className="text-xl font-bold text-[#1F1D1A] mt-0.5">
                {todayEvents.length}
              </div>
            </div>

            <div
              onClick={() => onNavigate('shopping')}
              className="bg-white/80 backdrop-blur-xs px-3.5 py-3 rounded-2xl border border-stone-200/60 shadow-2xs hover:bg-white transition-all cursor-pointer"
            >
              <div className="text-[11px] font-semibold text-[#8A8477]">К покупке</div>
              <div className="text-xl font-bold text-[#1F1D1A] mt-0.5">
                {shoppingItems.filter((i) => !i.completed).length}
              </div>
            </div>

            {/* Плитка быстрого перехода в SOS */}
            <div
              onClick={() => setIsSOSOpen(true)}
              className="bg-gradient-to-br from-red-600 to-rose-700 text-white px-3.5 py-3 rounded-2xl shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer border border-red-500/50 flex flex-col justify-between"
              title="Открыть экстренный режим SOS (без пароля)"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-red-100 uppercase tracking-wider">Экстренно</span>
                <ShieldAlert className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
              <div className="text-lg font-black mt-0.5 tracking-tight flex items-baseline justify-between">
                <span>SOS</span>
                <span className="text-[11px] font-semibold text-red-100">112 • ЖКХ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Интерактивный виджет прогноза погоды */}
      <WeatherWidget />

      {/* Напоминания о днях рождения в семье (сегодня, завтра, за 7 дней) */}
      {upcomingBirthdays.length > 0 && (
        <div className="space-y-2.5">
          {upcomingBirthdays.map(({ event: bEvent, daysLeft, turnsAge, nextDate }) => {
            const isToday = daysLeft === 0;
            const isTomorrow = daysLeft === 1;
            return (
              <div
                key={bEvent.id}
                onClick={() => onNavigate('calendar')}
                className={`p-4 rounded-3xl border transition-all cursor-pointer shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isToday
                    ? 'bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 border-pink-300 ring-2 ring-pink-400/20'
                    : isTomorrow
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300'
                    : 'bg-gradient-to-r from-[#FAF8F3] to-[#F5EFE3] border-[#E8E2D4]'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                      isToday ? 'bg-pink-100 text-pink-600 animate-bounce' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <Gift className="w-5 h-5 text-[#E15A42]" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="text-xs font-black text-[#1F1D1A]">
                        {isToday
                          ? '🎉 Сегодня день рождения!'
                          : isTomorrow
                          ? '🎂 Завтра день рождения!'
                          : `🎁 Через ${daysLeft} ${daysLeft >= 2 && daysLeft <= 4 ? 'дня' : 'дней'} день рождения`}
                      </span>
                      {turnsAge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-stone-700 border border-stone-200">
                          Исполняется {turnsAge} лет
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#554F44] font-medium mt-0.5">
                      <strong>{bEvent.title}</strong> • {nextDate} {bEvent.startTime ? `в ${bEvent.startTime}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#E15A42] shrink-0 self-end sm:self-auto">
                  <span>В календарь</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Напоминание о передаче показаний счётчиков ЖКХ */}
      {unsubmittedMeters.length > 0 && (
        <div
          onClick={() => onNavigate('utilities')}
          className="bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 border border-cyan-200/80 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-cyan-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-700 flex items-center justify-center shrink-0">
              <Gauge className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-[#1F1E1C]">
                  Пора передать показания счётчиков ЖКХ (15–25 число)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-[10px] font-bold">
                  Осталось: {unsubmittedMeters.length}
                </span>
              </div>
              <p className="text-xs text-[#6B655B] mt-0.5">
                Холодная/горячая вода, электричество и отопление за текущий месяц. Нажмите для быстрой записи.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-xs font-bold text-cyan-700 group-hover:text-cyan-900 shrink-0">
            <span>Ввести показания</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      )}

      {/* Основная сетка виджетов (iPad Landscape: 3 колонки) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Колонка 1: Задачи и рутины на сегодня (5 колонок) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#1F1D1A] text-sm">Задачи и рутины</h3>
                <p className="text-[11px] text-[#8A8477]">
                  {pendingTodayTasks.length > 0
                    ? `Осталось выполнить: ${pendingTodayTasks.length}`
                    : 'Все задачи на сегодня выполнены!'}
                </p>
              </div>
            </div>
            <button
              onClick={onNewTask}
              className="p-1.5 rounded-xl hover:bg-[#F3EFE6] text-[#E15A42] transition-colors cursor-pointer"
              title="Добавить задачу"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Список задач */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {todayTasks.length === 0 ? (
              <div className="text-center py-10 px-4 text-[#8A8477]">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 stroke-[1.5]" />
                <p className="text-xs font-medium">На сегодня задач нет</p>
                <button
                  onClick={onNewTask}
                  className="mt-2 text-xs text-[#E15A42] font-semibold hover:underline"
                >
                  + Назначить поручение
                </button>
              </div>
            ) : (
              todayTasks.map((task) => {
                const assignee = members.find((m) => m.id === task.assigneeId);
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTaskCompletion(task.id)}
                    className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                      task.completed
                        ? 'bg-[#F9F8F5] border-[#EBE7DF] opacity-60'
                        : 'bg-white border-[#E6E1D6] hover:border-[#E15A42]/50 hover:shadow-xs'
                    }`}
                  >
                    <button
                      type="button"
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-stone-300 group-hover:border-[#E15A42]'
                      }`}
                    >
                      {task.completed && <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-semibold truncate ${
                            task.completed
                              ? 'line-through text-stone-400'
                              : 'text-[#1F1D1A]'
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.isRotation && (
                          <span
                            title="Ротация обязанностей"
                            className="inline-flex items-center text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-md font-medium"
                          >
                            <RefreshCw className="w-2.5 h-2.5 mr-0.5" />
                            Очередь
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mt-1 text-[11px] text-[#8A8477]">
                        <span className="font-medium px-1.5 py-0.2 rounded bg-[#F2EFE8] text-[#5C564B]">
                          {task.zone}
                        </span>
                        {task.dueTime && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{task.dueTime}</span>
                          </span>
                        )}
                        {assignee && (
                          <div className="flex items-center space-x-1.5">
                            <MemberAvatar member={assignee} size="2xs" />
                            <span>{assignee.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => onNavigate('tasks')}
            className="w-full py-2.5 text-center text-xs font-semibold text-[#8C522C] hover:bg-[#FAF7F0] rounded-xl transition-colors flex items-center justify-center space-x-1"
          >
            <span>Смотреть все задачи и пакеты</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Колонка 2: Календарь на сегодня + Ужин (4 колонки) */}
        <div className="lg:col-span-4 space-y-6">
          {/* События дня */}
          <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1F1D1A] text-sm">Расписание дня</h3>
                  <p className="text-[11px] text-[#8A8477]">
                    {todayEvents.length > 0
                      ? `${todayEvents.length} событий запланировано`
                      : 'На сегодня встреч нет'}
                  </p>
                </div>
              </div>
              <button
                onClick={onNewEvent}
                className="p-1.5 rounded-xl hover:bg-[#F3EFE6] text-blue-600 transition-colors cursor-pointer"
                title="Добавить событие"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {todayEvents.length === 0 ? (
                <div className="text-center py-6 text-[#8A8477]">
                  <p className="text-xs">Свободный день без записей</p>
                </div>
              ) : (
                todayEvents.map((ev) => {
                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-2xl bg-[#FBF9F5] border border-[#EBE7DF] hover:bg-white transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1F1D1A] truncate">
                          {ev.title}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {ev.startTime}
                        </span>
                      </div>
                      {ev.location && (
                        <p className="text-[11px] text-[#8A8477] truncate">📍 {ev.location}</p>
                      )}
                      {/* Участники события */}
                      <div className="flex items-center space-x-1 pt-1">
                        {ev.memberIds.map((mId) => {
                          const member = members.find((m) => m.id === mId);
                          if (!member) return null;
                          return (
                            <MemberAvatar
                              key={mId}
                              member={member}
                              size="xs"
                              className="ring-1 ring-white"
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => onNavigate('calendar')}
              className="w-full py-2 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center space-x-1"
            >
              <span>Открыть полный календарь</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Виджет «Ужин сегодня» */}
          <div
            onClick={() => onNavigate('meals')}
            className="bg-gradient-to-br from-[#FAF5EE] to-[#F5ECE0] rounded-3xl p-5 border border-[#E9DFD0] shadow-xs hover:border-[#E15A42]/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E653A] flex items-center space-x-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#E15A42]" />
                <span>Ужин сегодня</span>
              </span>
              <span className="text-[11px] font-medium text-[#E15A42] group-hover:underline">
                К меню недели →
              </span>
            </div>
            <h4 className="text-sm font-bold text-[#1F1D1A] group-hover:text-[#E15A42] transition-colors leading-snug">
              {dinnerTitle}
            </h4>
            {dinnerRecipe && (
              <p className="text-xs text-[#8A8477] mt-1">
                ⏱ {dinnerRecipe.prepTimeMinutes + dinnerRecipe.cookTimeMinutes} мин •{' '}
                {dinnerRecipe.servings} порции
              </p>
            )}
          </div>
        </div>

        {/* Колонка 3: Быстрые покупки + Важные сроки дома (3 колонки) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Экспресс-список покупок */}
          <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE1]">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-rose-500" />
                <h3 className="font-bold text-[#1F1D1A] text-sm">Срочно купить</h3>
              </div>
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {shoppingItems.filter((i) => !i.completed).length}
              </span>
            </div>

            <div className="space-y-2">
              {quickShoppingItems.length === 0 ? (
                <p className="text-xs text-[#8A8477] py-4 text-center">
                  Все покупки сделаны!
                </p>
              ) : (
                quickShoppingItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleShoppingItem(item.id)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF8F3] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <span className="w-4 h-4 rounded border border-stone-300 group-hover:border-rose-500 flex items-center justify-center shrink-0" />
                      <span className="text-xs text-[#1F1D1A] truncate">{item.title}</span>
                    </div>
                    {item.quantity && (
                      <span className="text-[10px] text-[#8A8477] bg-[#F2EFE8] px-1.5 py-0.5 rounded shrink-0">
                        {item.quantity}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => onNavigate('shopping')}
              className="w-full py-2 text-center text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center space-x-1"
            >
              <span>Все списки покупок</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Быстрый доступ к сканеру чеков */}
          <div
            onClick={() => onNavigate('receipts')}
            className="bg-gradient-to-tr from-[#FFF5F2] to-[#FFF0EB] rounded-3xl p-5 border border-[#F5D5CB] shadow-xs hover:border-[#E15A42] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E15A42] flex items-center space-x-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>Быстрый ввод расходов</span>
              </span>
              <span className="text-[11px] font-semibold text-[#E15A42] group-hover:underline flex items-center">
                <span>Сканировать</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
            <h4 className="text-sm font-bold text-[#1F1D1A] group-hover:text-[#E15A42] transition-colors leading-snug">
              Сканировать чек с покупками
            </h4>
            <p className="text-xs text-[#8A8477] mt-1">
              Распознавание чека камерой, проверка строк и сохранение расходов
            </p>
          </div>

          {/* Важные сроки (страховки, ТО, документы) */}
          {criticalItems.length > 0 && (
            <div className="bg-amber-50/80 rounded-3xl p-5 border border-amber-200 shadow-xs space-y-2.5">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Напоминания о сроках</span>
              </div>
              <div className="space-y-2">
                {criticalItems.map((c, i) => (
                  <div
                    key={i}
                    onClick={() =>
                      onNavigate(c.type === 'doc' ? 'docs' : c.type === 'medicine' ? 'firstaid' : 'inventory')
                    }
                    className="p-2.5 rounded-xl bg-white border border-amber-200/70 hover:shadow-xs transition-all cursor-pointer"
                  >
                    <div className="text-xs font-bold text-[#1F1D1A] truncate">
                      {c.title}
                    </div>
                    <div className="text-[11px] text-amber-700 font-medium">{c.info}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
