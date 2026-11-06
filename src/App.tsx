import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { TasksView } from './components/tasks/TasksView';
import { CalendarView } from './components/calendar/CalendarView';
import { ShoppingView } from './components/shopping/ShoppingView';
import { ReceiptsView } from './components/receipts/ReceiptsView';
import { MealsView } from './components/meals/MealsView';
import { InventoryView } from './components/inventory/InventoryView';
import { DocsView } from './components/docs/DocsView';
import { ContactsView } from './components/contacts/ContactsView';
import { SettingsView } from './components/settings/SettingsView';
import { FirstAidView } from './components/firstaid/FirstAidView';
import { UtilitiesView } from './components/utilities/UtilitiesView';
import { SOSView } from './components/sos/SOSView';
import { QuickCaptureModal } from './components/ai/QuickCaptureModal';
import { TaskModal } from './components/tasks/TaskModal';
import { EventModal } from './components/calendar/EventModal';
import { ToastContainer } from './components/common/ToastContainer';
import { OfflineStatusIndicator } from './components/common/OfflineStatusIndicator';
import { BottomNav } from './components/layout/BottomNav';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { CleanStartModal } from './components/common/CleanStartModal';

const MainApp: React.FC = () => {
  const { isSOSOpen, setIsSOSOpen } = useHousehold();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCleanStartModalOpen, setIsCleanStartModalOpen] = useState(
    () => !localStorage.getItem('onehaus_start_choice_done')
  );

  // Определение заголовка текущей вкладки
  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Главный обзор', subtitle: undefined };
      case 'tasks':
        return { title: 'Задачи и рутины', subtitle: 'Обязанности дома, ротация и пакеты задач' };
      case 'calendar':
        return { title: 'Семейный календарь', subtitle: 'Общее расписание всех членов семьи' };
      case 'shopping':
        return { title: 'Списки покупок', subtitle: 'Совместные списки товаров и продуктов' };
      case 'receipts':
        return { title: 'Сканер кассовых чеков', subtitle: 'Локальное оптическое распознавание (OCR), сверка и история покупок' };
      case 'meals':
        return { title: 'Питание и рецепты', subtitle: 'Недельный план и база домашних блюд' };
      case 'inventory':
        return { title: 'Инвентарь и имущество', subtitle: 'Техника, автомобили, питомцы и гарантии' };
      case 'firstaid':
        return { title: 'Домашняя аптечка', subtitle: 'Каталог лекарств, сроки годности, дозировки и инструкции' };
      case 'utilities':
        return { title: 'Счётчики ЖКХ', subtitle: 'Ввод показаний за месяц, тарифы и аналитика коммунальных расходов' };
      case 'docs':
        return { title: 'Документы дома', subtitle: 'Страховки, договоры, чеки и контроль сроков' };
      case 'contacts':
        return { title: 'Контакты и мастера', subtitle: 'Проверенные специалисты и аварийные службы' };
      case 'settings':
        return { title: 'Настройки домохозяйства', subtitle: 'Участники, роли и резервное копирование' };
    }
  };

  const { title, subtitle } = getTabTitle(activeTab);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F6F0]">
      {/* Левый сайдбар (iPad Landscape rail) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
      />

      {/* Основная рабочая область */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Индикатор статуса оффлайн/онлайн и IndexedDB */}
        <OfflineStatusIndicator />

        <Header
          title={title}
          subtitle={subtitle}
          onOpenQuickCapture={() => {
            setIsVoiceMode(false);
            setIsQuickCaptureOpen(true);
          }}
          onOpenVoiceCapture={() => {
            setIsVoiceMode(true);
            setIsQuickCaptureOpen(true);
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          onPrimaryAction={
            activeTab === 'tasks'
              ? () => setIsTaskModalOpen(true)
              : activeTab === 'calendar'
              ? () => setIsEventModalOpen(true)
              : undefined
          }
          primaryActionLabel={
            activeTab === 'tasks'
              ? 'Новая задача'
              : activeTab === 'calendar'
              ? 'Новое событие'
              : undefined
          }
        />

        {/* Скроллируемый контент с отступом под мобильную навигацию pb-20 md:pb-0 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={setActiveTab}
              onOpenQuickCapture={() => {
                setIsVoiceMode(false);
                setIsQuickCaptureOpen(true);
              }}
              onNewTask={() => setIsTaskModalOpen(true)}
              onNewEvent={() => setIsEventModalOpen(true)}
            />
          )}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'shopping' && <ShoppingView />}
          {activeTab === 'receipts' && <ReceiptsView />}
          {activeTab === 'meals' && <MealsView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'firstaid' && <FirstAidView />}
          {activeTab === 'utilities' && <UtilitiesView />}
          {activeTab === 'docs' && <DocsView />}
          {activeTab === 'contacts' && <ContactsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Мобильная нижняя навигация BottomNav */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenQuickCapture={() => {
          setIsVoiceMode(false);
          setIsQuickCaptureOpen(true);
        }}
        onOpenVoiceCapture={() => {
          setIsVoiceMode(true);
          setIsQuickCaptureOpen(true);
        }}
      />

      {/* Глобальный поиск «Где лежит?» */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setIsSearchOpen(false);
        }}
      />

      {/* Глобальное модальное окно «Send it in» / Умный ввод */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        initialVoice={isVoiceMode}
        onClose={() => {
          setIsQuickCaptureOpen(false);
          setIsVoiceMode(false);
        }}
      />

      {/* Быстрое модальное окно создания задачи */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />

      {/* Быстрое модальное окно создания события */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
      />

      {/* Экран экстренной помощи SOS (без пароля, полноэкранный режим) */}
      {isSOSOpen && (
        <SOSView
          onClose={() => setIsSOSOpen(false)}
          onNavigateToFirstAid={() => {
            setIsSOSOpen(false);
            setActiveTab('firstaid');
          }}
        />
      )}

      {/* Стартовое окно выбора режима (чистый старт / подключение к семье) */}
      <CleanStartModal
        isOpen={isCleanStartModalOpen}
        onClose={() => setIsCleanStartModalOpen(false)}
      />

      {/* Всплывающие уведомления (Тосты) */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <HouseholdProvider>
      <MainApp />
    </HouseholdProvider>
  );
}
