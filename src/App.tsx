import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { TasksView } from './components/tasks/TasksView';
// SOS — без отложенной загрузки: экстренный экран должен открываться мгновенно
import { SOSView } from './components/sos/SOSView';
import { QuickCaptureModal } from './components/ai/QuickCaptureModal';
import { TaskModal } from './components/tasks/TaskModal';
import { EventModal } from './components/calendar/EventModal';
import { ToastContainer } from './components/common/ToastContainer';
import { OfflineStatusIndicator } from './components/common/OfflineStatusIndicator';
import { BottomNav } from './components/layout/BottomNav';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { CleanStartModal } from './components/common/CleanStartModal';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { GuidedTour } from './components/welcome/GuidedTour';
import { AssistantEngine } from './components/assistant/AssistantEngine';
import { isWelcomeSeen, markWelcomeSeen, isTourSeen, markTourSeen } from './utils/onboarding';
import { installTapFeedback, revealIn, trackScrolled } from './utils/motion';

// Тяжёлые разделы грузятся по требованию — первый запуск быстрее.
// После обновления приложения старые файлы разделов удаляются из кэша: если раздел не загрузился,
// один раз перезагружаем страницу — подтянется новая версия (без этого был бы белый экран).
const lazyRetry = <T extends React.ComponentType<any>>(load: () => Promise<{ default: T }>) =>
  React.lazy(() =>
    load().catch((err) => {
      if (!sessionStorage.getItem('dbh_chunk_reload')) {
        sessionStorage.setItem('dbh_chunk_reload', '1');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    })
  );
const CalendarView = lazyRetry(() => import('./components/calendar/CalendarView').then((m) => ({ default: m.CalendarView })));
const ShoppingView = lazyRetry(() => import('./components/shopping/ShoppingView').then((m) => ({ default: m.ShoppingView })));
const ReceiptsView = lazyRetry(() => import('./components/receipts/ReceiptsView').then((m) => ({ default: m.ReceiptsView })));
const MealsView = lazyRetry(() => import('./components/meals/MealsView').then((m) => ({ default: m.MealsView })));
const InventoryView = lazyRetry(() => import('./components/inventory/InventoryView').then((m) => ({ default: m.InventoryView })));
const DocsView = lazyRetry(() => import('./components/docs/DocsView').then((m) => ({ default: m.DocsView })));
const ContactsView = lazyRetry(() => import('./components/contacts/ContactsView').then((m) => ({ default: m.ContactsView })));
const SettingsView = lazyRetry(() => import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const FirstAidView = lazyRetry(() => import('./components/firstaid/FirstAidView').then((m) => ({ default: m.FirstAidView })));
const UtilitiesView = lazyRetry(() => import('./components/utilities/UtilitiesView').then((m) => ({ default: m.UtilitiesView })));
const FamilyScreen = lazyRetry(() => import('./components/family/FamilyScreen').then((m) => ({ default: m.FamilyScreen })));

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

  // Смена раздела въезжает сбоку: вниз по меню — справа, вверх — слева
  const TAB_ORDER: NavTab[] = ['dashboard', 'tasks', 'calendar', 'shopping', 'receipts', 'meals', 'firstaid', 'utilities', 'inventory', 'docs', 'contacts', 'settings'];
  const prevTabRef = useRef<NavTab>(activeTab);
  const pageDirRef = useRef<'right' | 'left'>('right');
  if (prevTabRef.current !== activeTab) {
    pageDirRef.current = TAB_ORDER.indexOf(activeTab) >= TAB_ORDER.indexOf(prevTabRef.current) ? 'right' : 'left';
    prevTabRef.current = activeTab;
  }
  const pageAnim = pageDirRef.current === 'right' ? 'page-in-right' : 'page-in-left';

  // Движение: появление при прокрутке, тень шапки, отклик на касание
  const mainRef = useRef<HTMLElement>(null);
  // Esc закрывает верхнее открытое окно — для всех окон приложения (на iPad с клавиатурой и Chromebook)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const overlays = [...document.querySelectorAll<HTMLElement>('.fixed.inset-0')].filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed');
      const top = overlays[overlays.length - 1];
      if (!top) return;
      const byLabel = top.querySelector<HTMLElement>('button[aria-label*="Закрыть"], button[title*="Закрыть"], button[aria-label="Отмена"]');
      const byIcon = top.querySelector<SVGElement>('button svg.lucide-x')?.closest('button') as HTMLElement | null;
      const byText = [...top.querySelectorAll<HTMLElement>('button')].find((b) => /^(Отмена|Закрыть)$/.test(b.innerText.trim())) || null;
      const close = byLabel || byIcon || byText;
      if (close) close.click();
      else top.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => installTapFeedback(), []);
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    main.scrollTop = 0;
    const offReveal = revealIn(main);
    const offScroll = trackScrolled(main);
    return () => {
      offReveal();
      offScroll();
    };
  }, [activeTab]);

  // Онбординг: приветственный экран → стартовая настройка дома → обучающий тур
  const [showWelcome, setShowWelcome] = useState(() => !isWelcomeSeen());
  const [showTour, setShowTour] = useState(false);

  const finishWelcome = useCallback(() => {
    markWelcomeSeen();
    setActiveTab('dashboard');
    setShowWelcome(false);
  }, []);

  const finishTour = useCallback(() => {
    markTourSeen();
    setShowTour(false);
  }, []);

  // Семейный экран (iPad на подставке)
  const [showFamilyScreen, setShowFamilyScreen] = useState(false);
  const closeFamilyScreen = useCallback(() => setShowFamilyScreen(false), []);
  useEffect(() => {
    const open = () => setShowFamilyScreen(true);
    window.addEventListener('dbh:family-screen', open);
    return () => window.removeEventListener('dbh:family-screen', open);
  }, []);

  // Тур можно запустить в любой момент кнопкой «?» в шапке
  useEffect(() => {
    const start = () => {
      setActiveTab('dashboard');
      window.setTimeout(() => setShowTour(true), 450);
    };
    window.addEventListener('dbh:tour', start);
    return () => window.removeEventListener('dbh:tour', start);
  }, []);

  useEffect(() => {
    if (showWelcome || isCleanStartModalOpen || isTourSeen()) return;
    const t = window.setTimeout(() => setShowTour(true), 600);
    return () => window.clearTimeout(t);
  }, [showWelcome, isCleanStartModalOpen]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)]">
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
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
          <div key={activeTab} className={pageAnim}>
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
          <React.Suspense fallback={<div className="p-10 text-center text-sm text-[var(--muted)]">Загрузка…</div>}>
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
          </React.Suspense>
          </div>
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
        isOpen={isCleanStartModalOpen && !showWelcome}
        onClose={() => setIsCleanStartModalOpen(false)}
      />

      {showFamilyScreen && (
        <React.Suspense fallback={null}>
          <FamilyScreen onClose={closeFamilyScreen} />
        </React.Suspense>
      )}

      {/* Главный ассистент: следит за всеми разделами и действует сам */}
      <AssistantEngine />

      {/* Обучающий тур с анимированным курсором */}
      {showTour && !isSOSOpen && <GuidedTour onFinish={finishTour} />}

      {/* Приветственный экран первого запуска (scroll-driven) */}
      {showWelcome && <WelcomeScreen onFinish={finishWelcome} />}

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
