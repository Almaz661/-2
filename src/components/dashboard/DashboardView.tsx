import React from 'react';
import { applies } from '../../utils/homeProfile';
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
  ChevronRight,
  ShieldAlert,
  Camera,
  Receipt,
  Pill,
  Gauge,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { NavTab } from '../layout/Sidebar';
import { MemberAvatar } from '../common/MemberAvatar';
import { WeatherWidget } from './WeatherWidget';
import { WeatherChip } from './WeatherChip';
import { TodayWeather } from './TodayWeather';
import { HomeProfilePrompt } from '../home/HomeProfilePrompt';
import { seasonOf, sekkiOf } from '../../utils/season';
import { MINUTES, planForDate } from '../../services/cleaningPlan';
import { groupItems } from '../../utils/cleaningOrder';
import { WEEK } from '../../data/homeRoutine';
import { useRoutine } from '../../services/routine';
import { markCleanItem, readCleanMap, subscribeCleanMap, markDay } from '../../services/cleanMapStore';
import { MAP_ITEMS, SECTORS } from '../../data/cleaningMap';
import { CountUp, Slide } from '../ui/mercury';
import { occursOn } from '../../utils/dateUtils';
import { useAssistantSignals } from '../assistant/useAssistant';
import { useStarterZones } from '../zones/useStarterZones';
import { computeZones } from '../../services/zones';
import { PhotoBanner } from '../ui/PhotoBanner';
import { timeOfDayPhoto } from '../../utils/photos';
import { formatLocalDate } from '../../utils/dateUtils';

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
    showToast,
    taskPacks,
  } = useHousehold();

  const todayStr = formatLocalDate(new Date());
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

  const todayEvents = events.filter((e) => {
    if (!occursOn(e, todayStr)) return false;
    if (activeMemberId && !e.memberIds.includes(activeMemberId)) return false;
    return true;
  });

  // Ближайшие праздники и семейные события (в ближайшие 7 дней)
  const upcomingHolidays = events
    .filter((e) => e.isHoliday || e.category === 'holiday')
    .map((e) => {
      const eDate = new Date(e.date + 'T00:00:00');
      const todayZero = new Date(todayStr + 'T00:00:00');
      const diffDays = Math.round((eDate.getTime() - todayZero.getTime()) / (1000 * 3600 * 24));
      return { event: e, diffDays };
    })
    .filter((item) => item.diffDays >= 0 && item.diffDays <= 7)
    .sort((a, b) => a.diffDays - b.diffDays);

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
  let greeting = 'Добрый день';
  if (currentHour >= 5 && currentHour < 12) greeting = 'Доброе утро';
  else if (currentHour >= 18 && currentHour < 23) greeting = 'Добрый вечер';
  else if (currentHour >= 23 || currentHour < 5) greeting = 'Доброй ночи';

  const activeMember = members.find((m) => m.id === activeMemberId);
  const dateLabel = (() => {
    const d = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    return d.charAt(0).toUpperCase() + d.slice(1);
  })();
  const openShopping = shoppingItems.filter((i) => !i.completed);
  const assistantSignals = useAssistantSignals();
  const urgentCount = assistantSignals.filter((sg) => sg.severity !== 'info').length;
  const zones = computeZones(tasks);
  const addStarterZones = useStarterZones();
  const openZone = (zone: string) => {
    try {
      localStorage.setItem('dbh_tasks_view', 'zones');
      localStorage.setItem('dbh_tasks_zone', zone);
    } catch {
      /* нет хранилища */
    }
    onNavigate('tasks');
  };

  // Единая лента «Сегодня»: задачи, события и сроки в одном списке
  type FeedKind = 'task' | 'event' | 'deadline';
  interface FeedRow {
    key: string;
    kind: FeedKind;
    title: string;
    sub?: string;
    right?: string;
    done?: boolean;
    warn?: boolean;
    rotation?: boolean;
    onOpen: () => void;
    onToggle?: () => void;
  }
  const [filter, setFilter] = React.useState<'all' | FeedKind>('all');

  const feed: FeedRow[] = [
    ...todayEvents
      .slice()
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      .map((ev) => ({
        key: `e-${ev.id}`,
        kind: 'event' as const,
        title: ev.title,
        sub: [ev.location, ev.memberIds.map((id) => members.find((m) => m.id === id)?.name).filter(Boolean).join(', ')]
          .filter(Boolean)
          .join(' — '),
        right: ev.startTime || 'Весь день',
        onOpen: () => onNavigate('calendar'),
      })),
    ...todayTasks
      .slice()
      .sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueTime || '99').localeCompare(b.dueTime || '99'))
      .map((task) => ({
        key: `t-${task.id}`,
        kind: 'task' as const,
        title: task.title,
        sub: [task.zone, members.find((m) => m.id === task.assigneeId)?.name].filter(Boolean).join(' — '),
        right: task.dueTime || '',
        done: task.completed,
        rotation: task.isRotation,
        onOpen: () => toggleTaskCompletion(task.id),
        onToggle: () => toggleTaskCompletion(task.id),
      })),
    // Сигналы главного ассистента по всем разделам (сроки, аптечка, имущество, счётчики, просрочки)
    ...assistantSignals
      .filter((sg) => sg.domain !== 'calendar')
      .map((sg) => ({
        key: `a-${sg.key}`,
        kind: 'deadline' as const,
        title: sg.title,
        sub: sg.sub,
        right: sg.when,
        warn: sg.severity !== 'info',
        onOpen: () => onNavigate(sg.domain as NavTab),
      })),
  ];
  const visibleFeed = filter === 'all' ? feed : feed.filter((r) => r.kind === filter);
  const counts = {
    all: feed.length,
    task: feed.filter((r) => r.kind === 'task').length,
    event: feed.filter((r) => r.kind === 'event').length,
    deadline: feed.filter((r) => r.kind === 'deadline').length,
  };

  const notices: { key: string; text: string; action: string; onClick: () => void }[] = [];
  if (unsubmittedMeters.length > 0)
    notices.push({
      key: 'meters',
      text: `Пора передать показания счётчиков: осталось ${unsubmittedMeters.length}`,
      action: 'Ввести',
      onClick: () => onNavigate('utilities'),
    });
  if (upcomingHolidays.length > 0) {
    const h = upcomingHolidays[0];
    notices.push({
      key: 'holiday',
      text:
        h.diffDays === 0
          ? `Сегодня: ${h.event.title}`
          : h.diffDays === 1
          ? `Завтра: ${h.event.title}`
          : `Через ${h.diffDays} дн.: ${h.event.title}`,
      action: 'Календарь',
      onClick: () => onNavigate('calendar'),
    });
  }

  const kpis = [
    { id: 'tasks' as NavTab, label: 'Задачи сегодня', Icon: CheckSquare, value: pendingTodayTasks.length, sub: `из ${todayTasks.length}` },
    { id: 'calendar' as NavTab, label: 'События', Icon: Calendar, value: todayEvents.length, sub: todayEvents[0]?.startTime ? `первое в ${todayEvents[0].startTime}` : 'свободный день' },
    { id: 'shopping' as NavTab, label: 'Купить', Icon: ShoppingCart, value: openShopping.length, sub: 'позиций в списках' },
    { id: 'tasks' as NavTab, label: 'Ассистент заметил', Icon: AlertTriangle, value: urgentCount, sub: 'сроки и дела, требующие внимания', warn: urgentCount > 0 },
  ];

  // ── Японская версия главного экрана: 4 блока, ничего лишнего ─────────────
  const plan = planForDate(new Date());
  const [cleanMarks, setCleanMarks] = React.useState(readCleanMap);
  React.useEffect(() => subscribeCleanMap(() => setCleanMarks(readCleanMap())), []);
  const cleanDoneToday = (id: string) => markDay(cleanMarks[id]) === todayStr;
  const cleaningToday = [...plan.detailed, ...plan.rare];
  const cleaningLeft = cleaningToday.filter((i) => !cleanDoneToday(i.id)).length;
  const [showAll, setShowAll] = React.useState(false);
  const [showWeather, setShowWeather] = React.useState(false);

  // День — только на сегодня и в одной части дома: события, задача дня (одной строкой), редкая уборка дня, дела на сегодня.
  // Просроченное и сроки от ассистента — не списком, а тихой строкой внизу.
  type DayRow = { key: string; title: string; sub: string; right?: string; done?: boolean; tone?: 'warn' | 'theme'; onClick: () => void; check?: boolean };
  const urgent = assistantSignals.filter((sg) => sg.severity !== 'info' && sg.domain !== 'calendar' && sg.domain !== 'tasks');
  const overdue = filteredTasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr);
  const dueToday = filteredTasks.filter((t) => !t.completed && t.dueDate === todayStr).sort((a, b) => (a.dueTime || '99').localeCompare(b.dueTime || '99'));
  const dayClean = [...plan.detailed, ...plan.rare];
  const detailedLeft = dayClean.filter((i) => !cleanDoneToday(i.id)).length;
  const [planOpen, setPlanOpen] = React.useState(true);
  // В дни без уборки (пн, чт, выходные) — список дел темы дня из расписания v2 и подсказка о ближайшей уборке
  const themeDay = WEEK.find((w) => w.day === new Date().getDay())!;
  const themeItems = themeDay.items;
  const routine = useRoutine();
  const nextCleaning = (() => {
    for (let k = 1; k <= 7; k++) {
      const d = new Date();
      d.setDate(d.getDate() + k);
      const p = planForDate(d);
      if (p.detailed.length + p.rare.length) return { p, d, n: p.detailed.length + p.rare.length };
    }
    return null;
  })();
  const openRoutine = () => {
    try {
      localStorage.setItem('dbh_tasks_view', 'checklists');
    } catch {
      /* нет хранилища */
    }
    onNavigate('tasks');
  };
  const dayRows: DayRow[] = [
    ...todayEvents
      .slice()
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      .map((ev) => ({
        key: `e-${ev.id}`,
        title: ev.title,
        sub: ev.location || 'Календарь',
        right: ev.allDay || !ev.startTime ? 'весь день' : ev.startTime,
        onClick: () => onNavigate('calendar'),
      })),
    {
      key: 'theme',
      title: `${plan.zoneIcon} ${plan.isRestDay ? plan.zoneTitle : `Задача дня: ${plan.zoneTitle}`}`,
      sub: plan.isRestDay
        ? 'Облегчённый день — только небольшие дела по необходимости'
        : dayClean.length
        ? `${detailedLeft ? `Осталось ${detailedLeft} из ${dayClean.length}` : 'Всё сделано'} · ≈ ${plan.detailed.length * MINUTES.detailed + plan.rare.length * MINUTES.rare} мин · ${planOpen ? 'свернуть' : 'нажмите — план по порядку'}`
        : `${themeItems.length} дел по теме дня · ${planOpen ? 'свернуть' : 'нажмите — открыть список'}`,
      tone: 'theme' as const,
      onClick: () => setPlanOpen((v) => !v),
    },
    ...dueToday.map((t) => ({
      key: `t-${t.id}`,
      title: t.title,
      sub: [t.zone, members.find((m) => m.id === t.assigneeId)?.name].filter(Boolean).join(' · '),
      right: t.dueTime || '',
      check: true,
      onClick: () => toggleTaskCompletion(t.id),
    })),
  ];
  const shownRows = showAll ? dayRows : dayRows.slice(0, 7);
  const backlog = [
    overdue.length ? { key: 'od', label: `Отложенные дела: ${overdue.length}`, go: () => onNavigate('tasks') } : null,
    urgent.length ? { key: 'as', label: `Сроки от ассистента: ${urgent.length}`, go: () => onNavigate(urgent[0].domain as NavTab) } : null,
  ].filter(Boolean) as { key: string; label: string; go: () => void }[];

  // Состояние дома — по «Карте уборки» (4 зоны)
  const mapZones = SECTORS.map((sec) => {
    const items = MAP_ITEMS.filter((i) => i.sector === sec.id && applies(i.needs) && cleanMarks[i.id]);
    const need = items.reduce((mx, i) => {
      const d = new Date(cleanMarks[i.id]);
      const days = Math.round((new Date(todayStr + 'T00:00:00').getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
      return Math.max(mx, days / i.intervalDays);
    }, 0);
    return { ...sec, marked: items.length, need, level: (need >= 1 ? 'due' : need >= 0.7 ? 'soon' : 'fresh') as 'due' | 'soon' | 'fresh' };
  });
  const openMap = () => {
    try {
      localStorage.setItem('dbh_tasks_view', 'map');
    } catch {
      /* нет хранилища */
    }
    onNavigate('tasks');
  };
  const card = 'bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-[var(--shadow)]';
  // Кисэцукан: время года, японский сезон «сэкки» и сезонные чек-листы
  const season = seasonOf();
  const sekki = sekkiOf();
  const seasonPacks = taskPacks.filter((p) => p.season === season.id && applies(p.needs));
  const openChecklists = () => {
    try {
      localStorage.setItem('dbh_tasks_view', 'checklists');
    } catch {
      /* нет хранилища */
    }
    onNavigate('tasks');
  };

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 max-w-5xl mx-auto space-y-8">
      {/* 1. Приветствие: число дня крупно, как на листке отрывного календаря; рядом — день, сезон и тема */}
      <PhotoBanner photo={timeOfDayPhoto()} slot="home" className="h-[240px] sm:h-[280px]" onError={(msg) => showToast(msg, 'error')}>
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9 text-white">
          <div className="flex items-end gap-5 sm:gap-7">
            <div
              className="font-[family-name:var(--font-display)] font-light leading-[0.8] tracking-[-0.04em] text-[88px] sm:text-[120px] tabular-nums"
              aria-hidden="true"
            >
              {new Date().getDate()}
            </div>
            <div className="pb-1.5 min-w-0">
              <div className="text-[15px] text-white/80">
                {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }).replace(/^\d+\s*/, '')}, {new Date().toLocaleDateString('ru-RU', { weekday: 'long' })} · {sekki.ru.toLowerCase()}
              </div>
              <h1 className="text-[28px] sm:text-[36px] leading-[1.1] mt-1">
                {greeting}
                {activeMember ? `, ${activeMember.name}` : ''}
              </h1>
              <p className="text-[16px] text-white/85 mt-1.5">
                {plan.zoneIcon}{' '}
                {plan.isRestDay ? `Сегодня ${plan.zoneTitle.toLowerCase()}.` : `Сегодня — ${plan.zoneTitle.toLowerCase()}${cleaningLeft ? `, по уборке ${cleaningLeft}` : ''}.`}
              </p>
            </div>
            <div className="ml-auto pb-2 hidden sm:block">
              <WeatherChip onClick={() => setShowWeather((v) => !v)} />
            </div>
          </div>
        </div>
      </PhotoBanner>
      {/* Прогноз на сегодня; «на неделю» — подробный виджет с выбором города */}
      <TodayWeather card={card} onMore={() => setShowWeather((v) => !v)} />
      {showWeather && <WeatherWidget />}

      {/* Профиль дома — пока не заполнен */}
      <HomeProfilePrompt card={card} />

      {/* 2. День — 5–7 главных дел */}
      <section>
        <div className="flex items-baseline justify-between px-1 mb-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">Сегодня</h2>
          <button type="button" onClick={() => onNavigate('tasks')} className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors px-2 py-2 -mr-2 -my-2 rounded-lg">
            Все дела
          </button>
        </div>
        <div className={`${card} p-2`}>
          {dayRows.length === 0 ? (
            <p className="px-4 py-10 text-center text-[16px] text-[var(--text-2)]">Сегодня тихий день. Всё под контролем.</p>
          ) : (
            shownRows.map((r) => (
              <React.Fragment key={r.key}>
              <button
                key={r.key}
                type="button"
                onClick={r.onClick}
                className="group w-full flex items-center gap-4 px-3 py-3.5 rounded-xl text-left hover:bg-[var(--surface-3)] transition-colors border-b border-[var(--line)] last:border-b-0"
              >
                {r.check ? (
                  <span
                    className={`w-6 h-6 shrink-0 rounded-full border grid place-items-center transition-colors ${
                      r.done ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--line-strong)] text-transparent group-hover:border-[var(--accent)]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className={`w-6 h-6 shrink-0 grid place-items-center ${r.tone === 'warn' ? 'text-amber-600' : r.tone === 'theme' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
                    <span className={r.tone === 'theme' ? 'w-2.5 h-2.5 rounded-full bg-current' : 'w-1.5 h-1.5 rounded-full bg-current'} />
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className={`block text-[16px] truncate ${r.done ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'} ${r.tone === 'theme' ? 'font-medium' : ''}`}>{r.title}</span>
                  <span className="block text-[14px] text-[var(--muted)] truncate mt-0.5">{r.sub}</span>
                </span>
                {r.right && <span className={`text-sm tabular-nums shrink-0 ${r.tone ? 'text-amber-600' : 'text-[var(--text-2)]'}`}>{r.right}</span>}
              </button>
              {r.key === 'theme' && planOpen && !dayClean.length && (
                <div className="ml-10 mr-2 mb-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] p-2">
                  {themeItems.map((i) => {
                    const ok = !!routine.checks[i.id];
                    return (
                      <button key={i.id} type="button" onClick={() => routine.toggle(i.id)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-[var(--surface-3)]">
                        <span className={`w-5 h-5 shrink-0 rounded-full border grid place-items-center ${ok ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--line-strong)] text-transparent'}`}>
                          <CheckCircle2 className="w-3 h-3" />
                        </span>
                        <span className={`flex-1 text-sm ${ok ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'}`}>{i.title}</span>
                      </button>
                    );
                  })}
                  {nextCleaning && (
                    <p className="px-2 pt-2 pb-1 text-[14px] text-[var(--muted)]">
                      Уборки сегодня нет. Следующая —{' '}
                      {nextCleaning.d.toLocaleDateString('ru-RU', { weekday: 'long' })}: {nextCleaning.p.zoneTitle.toLowerCase()}, {nextCleaning.n} дел по порядку.
                    </p>
                  )}
                </div>
              )}
              {r.key === 'theme' && planOpen && dayClean.length > 0 && (
                <div className="ml-10 mr-2 mb-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] p-2">
                  {groupItems(dayClean).map(({ group, items }) => (
                    <div key={group.key} className="py-1">
                      <div className="px-2 pt-1 pb-0.5 text-[13px] font-medium text-[var(--muted)]">
                        {group.icon} {group.label}
                      </div>
                      {items.map((i) => {
                        const ok = cleanDoneToday(i.id);
                        return (
                          <button key={i.id} type="button" onClick={() => markCleanItem(i.id)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-[var(--surface-3)]">
                            <span className={`w-5 h-5 shrink-0 rounded-full border grid place-items-center ${ok ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--line-strong)] text-transparent'}`}>
                              <CheckCircle2 className="w-3 h-3" />
                            </span>
                            <span className={`flex-1 text-sm ${ok ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'}`}>{i.title}</span>
                            
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
              </React.Fragment>
            ))
          )}
          {backlog.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 px-3 py-3 border-t border-[var(--line)] text-[14px] text-[var(--muted)]">
              <span>Не на сегодня, но ждёт:</span>
              {backlog.map((b) => (
                <button key={b.key} type="button" onClick={b.go} className="text-[var(--text-2)] hover:text-[var(--text)] underline-offset-4 hover:underline py-1 -my-1">
                  {b.label}
                </button>
              ))}
            </div>
          )}
          {dayRows.length > 7 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full px-3 py-3 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              {showAll ? 'Свернуть' : `Ещё ${dayRows.length - 7}`}
            </button>
          )}
        </div>
      </section>

      {/* 3. Состояние дома — одна строка */}
      <section>
        <div className="flex items-baseline justify-between px-1 mb-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">Дом</h2>
          <button type="button" onClick={openMap} className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors px-2 py-2 -mr-2 -my-2 rounded-lg">
            Карта уборки
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {mapZones.map((z) => (
            <button key={z.id} type="button" onClick={openMap} className={`${card} p-4 text-left hover:bg-[var(--surface-3)] transition-colors`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[16px] font-medium text-[var(--text)]">{z.title}</span>
                <span className={`text-xs ${!z.marked ? 'text-[var(--muted)]' : z.level === 'due' ? 'text-amber-700' : z.level === 'soon' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {!z.marked ? '—' : z.level === 'due' ? 'пора' : z.level === 'soon' ? 'скоро' : 'порядок'}
                </span>
              </div>
              <div className="mt-3 h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ${z.level === 'due' ? 'bg-amber-500' : z.level === 'soon' ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: z.marked ? `${Math.max(6, Math.min(100, z.need * 100))}%` : '0%' }}
                />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Сезон: тихая строка с сезонными чек-листами */}
      {seasonPacks.length > 0 && (
        <button
          type="button"
          onClick={openChecklists}
          className={`${card} w-full p-4 sm:p-5 text-left flex items-start gap-4 hover:bg-[var(--surface-3)] transition-colors`}
          style={{ borderLeft: '3px solid var(--season)' }}
        >
          <span className="text-2xl leading-none">{season.icon}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-[16px] font-medium text-[var(--text)]">
              {season.title}: {season.phrase}
            </span>
            <span className="block text-[14px] text-[var(--muted)] mt-1">
              {seasonPacks
                .map((p) => {
                  const live = tasks.filter((t) => t.packName === p.title);
                  return live.length ? `${p.title} — ${live.filter((t) => t.completed).length} из ${live.length}` : p.title;
                })
                .join(' · ')}
            </span>
          </span>
          <span className="text-sm shrink-0" style={{ color: 'var(--season)' }}>
            Чек-листы
          </span>
        </button>
      )}

      {/* 4. Одна тихая строка: ужин и покупки */}
      <p className="text-[16px] text-[var(--text-2)] px-1 flex flex-wrap gap-x-6 gap-y-2">
        <button type="button" onClick={() => onNavigate('meals')} className="hover:text-[var(--text)] transition-colors py-2 -my-2 text-left">
          🍽 Ужин: <span className="font-medium text-[var(--text)]">{dinnerTitle}</span>
        </button>
        <button type="button" onClick={() => onNavigate('shopping')} className="hover:text-[var(--text)] transition-colors py-2 -my-2 text-left">
          🛒 Купить: <span className="font-medium text-[var(--text)]">{openShopping.length}</span>
        </button>
      </p>
    </div>
  );
};
