import React from 'react';
import {
  Calendar,
  CheckSquare,
  FileText,
  Home,
  Package,
  Phone,
  Receipt,
  Settings,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  Users,
  Pill,
  Gauge,
  ShieldAlert,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { MemberAvatar } from '../common/MemberAvatar';
import { PWAInstallButton } from '../common/PWAInstallButton';

export type NavTab =
  | 'dashboard'
  | 'tasks'
  | 'calendar'
  | 'shopping'
  | 'receipts'
  | 'meals'
  | 'inventory'
  | 'firstaid'
  | 'utilities'
  | 'docs'
  | 'contacts'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenQuickCapture: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenQuickCapture,
}) => {
  const {
    householdName,
    members,
    activeMemberId,
    setActiveMemberId,
    tasks,
    events,
    shoppingItems,
    docs,
    medicines,
    meters,
    setIsSOSOpen,
    familyCode,
    cloudSyncStatus,
    syncWithCloud,
    visibleModules,
  } = useHousehold();

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasksToday = tasks.filter(
    (t) => !t.completed && (t.dueDate <= todayStr || !t.dueDate)
  ).length;
  const eventsToday = events.filter((e) => e.date === todayStr).length;
  const unboughtShoppingCount = shoppingItems.filter((i) => !i.completed).length;

  // Документы, истекающие в ближайшие 30 дней
  const expiringDocsCount = docs.filter((d) => {
    if (!d.expiryDate) return false;
    const expiry = new Date(d.expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;

  // Лекарства, истекающие в ближайшие 45 дней или просроченные
  const expiringMedsCount = medicines.filter((m) => {
    if (!m.expiryDate) return false;
    const exp = new Date(m.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return diffDays <= 45;
  }).length;

  // Счётчики, по которым не переданы показания за текущий месяц
  const currentMonthStr = todayStr.substring(0, 7);
  const unsubmittedMetersCount = meters.filter((m) => {
    const curReading = m.readings.find((r) => r.month === currentMonthStr);
    return !curReading || !curReading.submitted;
  }).length;

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Сегодня',
      icon: Home,
      badge: null,
    },
    {
      id: 'tasks' as NavTab,
      label: 'Задачи',
      icon: CheckSquare,
      badge: pendingTasksToday > 0 ? pendingTasksToday : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'calendar' as NavTab,
      label: 'Календарь',
      icon: Calendar,
      badge: eventsToday > 0 ? eventsToday : null,
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'shopping' as NavTab,
      label: 'Покупки',
      icon: ShoppingCart,
      badge: unboughtShoppingCount > 0 ? unboughtShoppingCount : null,
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    {
      id: 'receipts' as NavTab,
      label: 'Сканер чеков',
      icon: Receipt,
      badge: null,
    },
    {
      id: 'meals' as NavTab,
      label: 'Питание',
      icon: UtensilsCrossed,
      badge: null,
    },
    {
      id: 'firstaid' as NavTab,
      label: 'Аптечка',
      icon: Pill,
      badge: expiringMedsCount > 0 ? expiringMedsCount : null,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'utilities' as NavTab,
      label: 'Счётчики ЖКХ',
      icon: Gauge,
      badge: unsubmittedMetersCount > 0 ? unsubmittedMetersCount : null,
      badgeColor: 'bg-cyan-100 text-cyan-800',
    },
    {
      id: 'inventory' as NavTab,
      label: 'Инвентарь',
      icon: Package,
      badge: null,
    },
    {
      id: 'docs' as NavTab,
      label: 'Документы',
      icon: FileText,
      badge: expiringDocsCount > 0 ? expiringDocsCount : null,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'contacts' as NavTab,
      label: 'Контакты',
      icon: Phone,
      badge: null,
    },
    {
      id: 'settings' as NavTab,
      label: 'Настройки',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="hidden md:flex w-64 bg-[#FCFBF8] border-r border-[#EBE7DF] flex-col justify-between h-screen shrink-0 select-none">
      {/* Верхняя часть: Логотип и переключатель семьи */}
      <div className="p-4 border-b border-[#EBE7DF]">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E15A42] to-[#F28C38] flex items-center justify-center text-white shadow-md shadow-orange-500/15">
            <Home className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="overflow-hidden flex-1">
            <h1 className="font-bold text-[#1F1D1A] text-base leading-tight truncate">
              Дом без хаоса
            </h1>
            <p className="text-xs text-[#8A8477] font-medium truncate">
              {householdName}
            </p>
          </div>
        </div>

        {/* Индикатор семейной синхронизации */}
        <div className="mb-3">
          {familyCode ? (
            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800">
              <span className="flex items-center gap-1.5 font-bold text-xs tracking-wide">
                <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'syncing' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                {familyCode}
              </span>
              <button
                onClick={() => syncWithCloud()}
                title="Синхронизировать сейчас"
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
              >
                {cloudSyncStatus === 'syncing' ? 'Синхр...' : 'Обновить'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-[#F3EFE6] rounded-xl text-[#8A8477]">
              <span className="text-[11px] font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A8477]" />
                Локально
              </span>
              <button
                onClick={() => onTabChange('settings')}
                className="text-[11px] text-[#E15A42] hover:underline font-semibold cursor-pointer"
              >
                Вкл. облако
              </button>
            </div>
          )}
        </div>

        {/* Быстрый выбор члена семьи / Фильтр */}
        <div className="bg-[#F3EFE6] p-1.5 rounded-xl">
          <div className="text-[11px] font-semibold text-[#8A8477] px-2 py-0.5 mb-1 flex items-center justify-between">
            <span>ФИЛЬТР УЧАСТНИКА</span>
            {activeMemberId && (
              <button
                onClick={() => setActiveMemberId(null)}
                className="text-[10px] text-[#E15A42] hover:underline"
              >
                Сбросить
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => setActiveMemberId(null)}
              title="Все члены семьи"
              className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                activeMemberId === null
                  ? 'bg-white text-[#1F1D1A] shadow-xs font-semibold'
                  : 'text-[#8A8477] hover:bg-white/50'
              }`}
            >
              <Users className="w-4 h-4 mb-0.5" />
              <span>Все</span>
            </button>
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() =>
                  setActiveMemberId(activeMemberId === member.id ? null : member.id)
                }
                title={`${member.name} (${member.role})`}
                className={`relative flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
                  activeMemberId === member.id
                    ? 'bg-white shadow-xs ring-1 ring-black/5'
                    : 'hover:bg-white/50'
                }`}
              >
                <MemberAvatar
                  member={member}
                  size="sm"
                  className="ring-1 ring-white"
                />
                <span className="text-[10px] font-medium text-[#1F1D1A] truncate max-w-[40px] mt-0.5">
                  {member.name}
                </span>
                {activeMemberId === member.id && (
                  <span
                    className="absolute bottom-0.5 w-1 h-1 rounded-full"
                    style={{ backgroundColor: member.color.hex }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Навигационное меню */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => {
            if (item.id === 'dashboard' || item.id === 'settings') return true;
            return visibleModules[item.id as keyof typeof visibleModules] !== false;
          })
          .map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#EFECE4] text-[#1F1D1A] font-semibold shadow-xs'
                  : 'text-[#5C564B] hover:bg-[#F3EFE6] hover:text-[#1F1D1A]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#E15A42] stroke-[2.2]' : 'text-[#8A8477]'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    item.badgeColor || 'bg-[#E3DFD5] text-[#5C564B]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Красная кнопка экстренного режима SOS */}
      <div className="px-3 pt-2 pb-1">
        <button
          onClick={() => setIsSOSOpen(true)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-md border border-red-500 hover:shadow-red-600/30 active:scale-[0.98] transition-all cursor-pointer group"
          title="Открыть экстренный экран SOS (без пароля)"
        >
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
            <span className="tracking-wider uppercase font-black">SOS Помощь</span>
          </div>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            112 • ЖКХ
          </span>
        </button>
      </div>

      {/* Кнопка установки приложения PWA */}
      <div className="px-3 pt-1 pb-1">
        <PWAInstallButton variant="sidebar" />
      </div>

      {/* Нижняя кнопка «+ Умный ввод» (Send it in) */}
      <div className="p-3 border-t border-[#EBE7DF] bg-[#F7F5EE]">
        <button
          onClick={onOpenQuickCapture}
          className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-[#E15A42] to-[#EA7038] text-white font-medium text-sm shadow-md shadow-orange-600/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>+ Умный ввод</span>
        </button>
        <p className="text-[11px] text-center text-[#8A8477] mt-2">
          Текст, фото чека или голосовая заметка
        </p>
      </div>
    </aside>
  );
};
