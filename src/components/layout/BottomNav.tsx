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

  const todayStr = new Date().toISOString().split('T')[0];
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
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    badgeColor?: string;
    description: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Сегодня',
      icon: Home,
      description: 'Сводка дня, погода и дела',
    },
    {
      id: 'tasks',
      label: 'Задачи и рутины',
      icon: CheckSquare,
      badge: pendingTasksToday > 0 ? pendingTasksToday : null,
      badgeColor: 'bg-amber-100 text-amber-800',
      description: 'Домашние дела, зоны и ротация',
    },
    {
      id: 'calendar',
      label: 'Календарь',
      icon: Calendar,
      badge: eventsToday > 0 ? eventsToday : null,
      badgeColor: 'bg-blue-100 text-blue-800',
      description: 'Общее семейное расписание',
    },
    {
      id: 'shopping',
      label: 'Покупки',
      icon: ShoppingCart,
      badge: unboughtShoppingCount > 0 ? unboughtShoppingCount : null,
      badgeColor: 'bg-rose-100 text-rose-800',
      description: 'Списки продуктов и товаров',
    },
    {
      id: 'receipts',
      label: 'Сканер чеков',
      icon: Receipt,
      description: 'OCR чеков и учет расходов',
    },
    {
      id: 'meals',
      label: 'Питание',
      icon: UtensilsCrossed,
      description: 'Меню на неделю и блюда',
    },
    {
      id: 'firstaid',
      label: 'Аптечка',
      icon: Pill,
      badge: expiringMedsCount > 0 ? expiringMedsCount : null,
      badgeColor: 'bg-emerald-100 text-emerald-800',
      description: 'Сроки годности и лекарства',
    },
    {
      id: 'utilities',
      label: 'Счётчики ЖКХ',
      icon: Gauge,
      badge: unsubmittedMetersCount > 0 ? unsubmittedMetersCount : null,
      badgeColor: 'bg-cyan-100 text-cyan-800',
      description: 'Показания счетчиков и тарифы',
    },
    {
      id: 'inventory',
      label: 'Инвентарь',
      icon: Package,
      description: 'Где что лежит, авто, техника',
    },
    {
      id: 'docs',
      label: 'Документы',
      icon: FileText,
      badge: expiringDocsCount > 0 ? expiringDocsCount : null,
      badgeColor: 'bg-red-500 text-white',
      description: 'Паспорта, договоры, полисы',
    },
    {
      id: 'contacts',
      label: 'Контакты',
      icon: Phone,
      description: 'Мастера, сантехники, электрики',
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: Settings,
      description: 'Семья, роли и резервные копии',
    },
  ];

  return (
    <>
      {/* Нижняя мобильная панель навигации (только на экранах < 768px / мобильных) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FCFBF8]/95 backdrop-blur-md border-t border-[#EBE7DF] shadow-lg px-2 py-1 flex items-center justify-around">
        {/* Кнопка 1: Сегодня */}
        <button
          onClick={() => {
            setIsDrawerOpen(false);
            onTabChange('dashboard');
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard' && !isDrawerOpen
              ? 'text-[#E15A42] font-bold'
              : 'text-[#8A8477] hover:text-[#1F1D1A]'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Сегодня</span>
        </button>

        {/* Кнопка 2: Разделы (меню) */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
            isDrawerOpen
              ? 'text-[#E15A42] font-bold'
              : 'text-[#8A8477] hover:text-[#1F1D1A]'
          }`}
        >
          <LayoutGrid className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Разделы</span>
          {(expiringMedsCount > 0 || expiringDocsCount > 0 || unsubmittedMetersCount > 0) && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        {/* Кнопка 3: Центральная кнопка «+ Ввод» */}
        <button
          onClick={onOpenQuickCapture}
          className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-tr from-[#E15A42] to-[#F28C38] text-white w-12 h-12 rounded-full shadow-lg shadow-orange-600/30 active:scale-90 transition-transform cursor-pointer border-2 border-white"
          title="Быстрый ввод: текст, фото, голос"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
        </button>

        {/* Кнопка 4: Календарь */}
        <button
          onClick={() => {
            setIsDrawerOpen(false);
            onTabChange('calendar');
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'calendar' && !isDrawerOpen
              ? 'text-blue-600 font-bold'
              : 'text-[#8A8477] hover:text-[#1F1D1A]'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Календарь</span>
          {eventsToday > 0 && (
            <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded-full font-bold">
              {eventsToday}
            </span>
          )}
        </button>

        {/* Кнопка 5: SOS Экстренно */}
        <button
          onClick={() => setIsSOSOpen(true)}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-red-600 hover:text-red-700 active:scale-95 transition-all cursor-pointer"
          title="Экстренная помощь SOS (без пароля)"
        >
          <ShieldAlert className="w-5 h-5 mb-0.5 text-red-600 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-red-600">SOS</span>
        </button>
      </nav>

      {/* Модальное окно/Drawer всех разделов дома на мобильных */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div
            className="fixed inset-0"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative bg-[#FCFBF8] rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 border-t border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBE7DF]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#E15A42] flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1F1D1A] text-base">Все разделы дома</h3>
                  <p className="text-xs text-[#8A8477]">Выберите нужный инструмент</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenVoiceCapture}
                  className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200"
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
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#F2ECE1] border-[#E15A42] text-[#1F1D1A] shadow-xs'
                        : 'bg-white border-[#EBE7DF] hover:bg-[#FAF8F3] text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isActive
                            ? 'bg-[#E15A42] text-white'
                            : 'bg-[#F5F2EB] text-stone-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {sec.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sec.badgeColor || 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {sec.badge}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs">{sec.label}</div>
                      <div className="text-[10px] text-[#8A8477] line-clamp-1">
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
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
              <span>Экстренный режим SOS (112 • ЖКХ)</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
