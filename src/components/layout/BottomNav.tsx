import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  FileText,
  Home,
  LayoutGrid,
  Package,
  Phone,
  Receipt,
  Settings,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  Pill,
  Gauge,
  ShieldAlert,
  X,
  Mic,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { useHousehold } from '../../context/HouseholdContext';
import { formatLocalDate } from '../../utils/dateUtils';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenQuickCapture: () => void;
  onOpenVoiceCapture: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenQuickCapture,
  onOpenVoiceCapture,
}) => {
  const {
    tasks,
    events,
    shoppingItems,
    docs,
    medicines,
    meters,
    setIsSOSOpen,
    visibleModules,
  } = useHousehold();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const todayStr = formatLocalDate(new Date());
  const pendingTasksToday = tasks.filter(
    (t) => !t.completed && (t.dueDate <= todayStr || !t.dueDate)
  ).length;
  const eventsToday = events.filter((e) => e.date === todayStr).length;
  const unboughtShoppingCount = shoppingItems.filter((i) => !i.completed).length;

  const expiringDocsCount = docs.filter((d) => {
    if (!d.expiryDate) return false;
    const expiry = new Date(d.expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;

  const expiringMedsCount = medicines.filter((m) => {
    if (!m.expiryDate) return false;
    const exp = new Date(m.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return diffDays <= 45;
  }).length;

  const currentMonthStr = todayStr.substring(0, 7);
  const unsubmittedMetersCount = meters.filter((m) => {
    const curReading = m.readings.find((r) => r.month === currentMonthStr);
    return !curReading || !curReading.submitted;
  }).length;

  const allSections: Array<{
    id: NavTab;
    label: string;
    emoji: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    badgeColor?: string;
    description: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Сегодня',
      emoji: '🏠',
      icon: Home,
      description: 'Сводка дня, погода и дела',
    },
    {
      id: 'tasks',
      label: 'Задачи и рутины',
      emoji: '✅',
      icon: CheckSquare,
      badge: pendingTasksToday > 0 ? pendingTasksToday : null,
      badgeColor: 'bg-amber-100 text-amber-800',
      description: 'Домашние дела, зоны и ротация',
    },
    {
      id: 'calendar',
      label: 'Календарь',
      emoji: '📅',
      icon: Calendar,
      badge: eventsToday > 0 ? eventsToday : null,
      badgeColor: 'bg-[var(--accent-soft)] text-[var(--accent)]',
      description: 'Общее семейное расписание',
    },
    {
      id: 'shopping',
      label: 'Покупки',
      emoji: '🛒',
      icon: ShoppingCart,
      badge: unboughtShoppingCount > 0 ? unboughtShoppingCount : null,
      badgeColor: 'bg-rose-100 text-rose-800',
      description: 'Списки продуктов и товаров',
    },
    {
      id: 'meals',
      label: 'Питание',
      emoji: '🍳',
      icon: UtensilsCrossed,
      description: 'Меню на неделю и блюда',
    },
    {
      id: 'firstaid',
      label: 'Аптечка',
      emoji: '💊',
      icon: Pill,
      badge: expiringMedsCount > 0 ? expiringMedsCount : null,
      badgeColor: 'bg-emerald-100 text-emerald-800',
      description: 'Сроки годности и лекарства',
    },
    {
      id: 'utilities',
      label: 'Счётчики ЖКХ',
      emoji: '💧',
      icon: Gauge,
      badge: unsubmittedMetersCount > 0 ? unsubmittedMetersCount : null,
      badgeColor: 'bg-cyan-100 text-cyan-800',
      description: 'Показания счетчиков и тарифы',
    },
    {
      id: 'inventory',
      label: 'Инвентарь',
      emoji: '📦',
      icon: Package,
      description: 'Где что лежит, авто, техника',
    },
    {
      id: 'docs',
      label: 'Документы',
      emoji: '📑',
      icon: FileText,
      badge: expiringDocsCount > 0 ? expiringDocsCount : null,
      badgeColor: 'bg-red-500 text-white',
      description: 'Паспорта, договоры, полисы',
    },
    {
      id: 'contacts',
      label: 'Контакты',
      emoji: '📞',
      icon: Phone,
      description: 'Мастера, сантехники, электрики',
    },
    {
      id: 'settings',
      label: 'Настройки',
      emoji: '⚙️',
      icon: Settings,
      description: 'Семья, роли и резервные копии',
    },
  ];

  return (
    <>
      {/* Нижняя мобильная панель навигации (только на экранах < 768px / мобильных) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--surface-2)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-[var(--shadow)] px-2 py-1 flex items-center justify-around">
        {/* Кнопка 1: Сегодня */}
        <button
          onClick={() => {
            setIsDrawerOpen(false);
            onTabChange('dashboard');
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${ activeTab === 'dashboard' && !isDrawerOpen ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--text)]' }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[12px]">Сегодня</span>
        </button>

        {/* Кнопка 2: Разделы (меню) */}
        <button
          data-tour="sections"
          onClick={() => setIsDrawerOpen(true)}
          className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${ isDrawerOpen ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--text)]' }`}
        >
          <LayoutGrid className="w-5 h-5 mb-0.5" />
          <span className="text-[12px]">Разделы</span>
          {(expiringMedsCount > 0 || expiringDocsCount > 0 || unsubmittedMetersCount > 0) && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        {/* Кнопка 3: Центральная кнопка «+ Ввод» */}
        <button
          data-tour="capture"
          onClick={onOpenQuickCapture}
          className="flex flex-col items-center justify-center -mt-5 bg-[var(--accent)] text-white w-12 h-12 rounded-full active:scale-90 transition-transform cursor-pointer border-2 border-[var(--surface)]"
          title="Быстрый ввод: текст, фото, голос"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Кнопка 4: Календарь */}
        <button
          onClick={() => {
            setIsDrawerOpen(false);
            onTabChange('calendar');
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${ activeTab === 'calendar' && !isDrawerOpen ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--text)]' }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-[12px]">Календарь</span>
          {eventsToday > 0 && (
            <span className="text-[12px] bg-[var(--accent-soft)] text-[var(--accent)] px-1 rounded-full font-semibold">
              {eventsToday}
            </span>
          )}
        </button>

        {/* Кнопка 5: SOS Экстренно */}
        <button
          data-tour="sos"
          onClick={() => setIsSOSOpen(true)}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-red-600 hover:text-red-700 active:scale-95 transition-all cursor-pointer"
          title="Экстренная помощь SOS (без пароля)"
        >
          <ShieldAlert className="w-5 h-5 mb-0.5 text-red-600" />
          <span className="text-[12px] font-semibold text-red-600">SOS</span>
        </button>
      </nav>

      {/* Модальное окно/Drawer всех разделов дома на мобильных */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div
            className="fixed inset-0"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative bg-[var(--surface-2)] rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 border-t border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[var(--accent)] flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text)] text-base">Все разделы дома</h3>
                  <p className="text-xs text-[var(--muted)]">Выберите нужный инструмент</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenVoiceCapture}
                  className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--line)]"
                  title="Голосовой ввод"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Сетка модулей */}
            <div className="grid grid-cols-2 gap-2.5">
              {allSections
                .filter((sec) => {
                  if (sec.id === 'dashboard' || sec.id === 'settings') return true;
                  return visibleModules[sec.id as keyof typeof visibleModules] !== false;
                })
                .map((sec) => {
                const Icon = sec.icon;
                const isActive = activeTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      onTabChange(sec.id);
                      setIsDrawerOpen(false);
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${ isActive ? 'bg-[var(--surface-3)] border-[var(--accent)] text-[var(--text)] shadow-[var(--shadow)]' : 'bg-[var(--surface)] border-[var(--line)] hover:bg-[var(--surface-2)] text-stone-700' }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${ isActive ? 'bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/30' : 'bg-[var(--surface-3)]' }`}
                      >
                        <span className="select-none">{sec.emoji}</span>
                      </div>
                      {sec.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[12px] font-semibold ${ sec.badgeColor || 'bg-stone-200 text-stone-700' }`}
                        >
                          {sec.badge}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-xs">{sec.label}</div>
                      <div className="text-[12px] text-[var(--muted)] line-clamp-1">
                        {sec.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Красная кнопка SOS внизу дровера */}
            <button
              onClick={() => {
                setIsDrawerOpen(false);
                setIsSOSOpen(true);
              }}
              className="w-full py-3 px-4 rounded-2xl bg-red-600 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-[var(--shadow)] cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-white" />
              <span>Экстренный режим SOS (112 • ЖКХ)</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
