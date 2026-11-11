import { ThemeSegmented } from '../common/ThemeSwitcher';
import { HelpCircle, MoreHorizontal, Tv } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  CloudSun,
  Home,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trees,
  User,
  X,
  Search,
  Mic,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { MemberAvatar } from '../common/MemberAvatar';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { clearAllCacheAndReload } from '../../utils/cacheUtils';
import { PropertyId } from '../../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenQuickCapture: () => void;
  onOpenVoiceCapture: () => void;
  onOpenSearch: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenQuickCapture,
  onOpenVoiceCapture,
  onOpenSearch,
  onPrimaryAction,
  primaryActionLabel,
}) => {
  const {
    activeMemberId,
    setActiveMemberId,
    members,
    properties,
    activePropertyId,
    setActivePropertyId,
    setIsSOSOpen,
  } = useHousehold();

  const [isPropDropdownOpen, setIsPropDropdownOpen] = useState(false);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const propDropdownRef = useRef<HTMLDivElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  const activeMember = members.find((m) => m.id === activeMemberId);
  const activeProp =
    activePropertyId === 'all'
      ? null
      : properties.find((p) => p.id === activePropertyId) || properties[0];

  // Закрытие дропдаунов по клику снаружи
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (propDropdownRef.current && !propDropdownRef.current.contains(e.target as Node)) {
        setIsPropDropdownOpen(false);
      }
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Форматирование сегодняшней даты на русском
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  return (
    <header className="app-header relative z-20 min-h-18 py-3 px-4 sm:px-8 bg-[var(--surface-2)] border-b border-[var(--line)] flex items-center justify-between shrink-0 gap-3">
      {/* Левая часть: заголовок страницы и выбор объекта/пользователя */}
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <div className="min-w-0">
          <div className="flex items-center space-x-2.5 flex-wrap">
            {title !== 'Главный обзор' && (
              <h2 className="text-lg sm:text-xl font-semibold text-[var(--text)] tracking-tight whitespace-nowrap">{title}</h2>
            )}

            {/* Селектор объекта (Квартира, Жильё Сергея, Дача, Все объекты) */}
            <div className="relative md:hidden" ref={propDropdownRef}>
              <button
                onClick={() => setIsPropDropdownOpen(!isPropDropdownOpen)}
                className="flex items-center whitespace-nowrap space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[var(--surface)] border border-[var(--line)] text-[var(--text)] hover:bg-[var(--surface-3)] shadow-none transition-all cursor-pointer"
                title="Переключить объект дома"
              >
                {activePropertyId === 'all' ? (
                  <Building2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                ) : activePropertyId === 'dacha' ? (
                  <Trees className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Home className="w-3.5 h-3.5 text-[var(--accent)]" />
                )}
                <span>{activeProp ? activeProp.shortName : 'Все объекты'}</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isPropDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-56 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-[var(--shadow)] py-1.5 z-40">
                  <div className="px-3 py-1.5 text-[12px] font-semibold text-stone-400">
                    Объекты семьи
                  </div>
                  <button
                    onClick={() => {
                      setActivePropertyId('all');
                      setIsPropDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[var(--surface-3)] transition-colors cursor-pointer ${ activePropertyId === 'all' ? 'font-semibold text-[var(--accent)] bg-[var(--surface-2)]' : 'text-stone-700' }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-stone-400" />
                      <span>Все объекты</span>
                    </div>
                    <span className="text-[12px] text-stone-400">Сводка</span>
                  </button>

                  {properties.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => {
                        setActivePropertyId(prop.id);
                        setIsPropDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[var(--surface-3)] transition-colors cursor-pointer ${ activePropertyId === prop.id ? 'font-semibold text-[var(--accent)] bg-[var(--surface-2)]' : 'text-stone-700' }`}
                    >
                      <div className="flex items-center space-x-2">
                        {prop.id === 'dacha' ? (
                          <Trees className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Home className="w-4 h-4 text-amber-600" />
                        )}
                        <span>{prop.shortName}</span>
                      </div>
                      <span className="text-[12px] text-stone-400 truncate max-w-[120px]">
                        {prop.address || 'Адрес не указан'}
                      </span>
                    </button>
                  ))}

                  <div className="pt-1.5 mt-1 border-t border-[var(--line)] px-1">
                    <button
                      onClick={() => {
                        setIsPropDropdownOpen(false);
                        setIsSOSOpen(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent)] hover:bg-[var(--surface-3)] flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Настроить / Добавить объект</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Фильтр по члену семьи (Ольга / Сергей) */}
            <div className="relative md:hidden" ref={memberDropdownRef}>
              <button
                onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                className="flex items-center whitespace-nowrap space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border bg-[var(--surface)] border-stone-200 shadow-none hover:bg-[var(--surface-3)] transition-all cursor-pointer"
                title="Фильтр по члену семьи"
              >
                {activeMember ? (
                  <>
                    <MemberAvatar member={activeMember} size="xs" />
                    <span>{activeMember.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMemberId(null);
                      }}
                      className="text-stone-400 hover:text-stone-700 ml-1"
                      title="Показать всех"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3 text-stone-400" />
                    <span className="text-stone-600">Вся семья</span>
                    <ChevronDown className="w-3 h-3 text-stone-400" />
                  </>
                )}
              </button>

              {isMemberDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-48 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-[var(--shadow)] py-1.5 z-40">
                  <div className="px-3 py-1.5 text-[12px] font-semibold text-stone-400">
                    Члены семьи
                  </div>
                  <button
                    onClick={() => {
                      setActiveMemberId(null);
                      setIsMemberDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--surface-3)] cursor-pointer ${ activeMemberId === null ? 'font-semibold text-[var(--accent)]' : 'text-stone-700' }`}
                  >
                    Вся семья (Общий вид)
                  </button>
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setActiveMemberId(m.id);
                        setIsMemberDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center space-x-2 hover:bg-[var(--surface-3)] cursor-pointer ${ activeMemberId === m.id ? 'font-semibold text-[var(--accent)]' : 'text-stone-700' }`}
                    >
                      <MemberAvatar member={m} size="xs" />
                      <span>{m.name}</span>
                      <span className="text-[12px] text-stone-400">({m.role.split('•')[0].trim()})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {title !== 'Главный обзор' && (
            <p className="hidden sm:block text-xs text-[var(--muted)] font-medium mt-0.5 truncate">{subtitle || capitalizedDate}</p>
          )}
        </div>
      </div>

      {/* Правая часть по-японски: одно поле «найти или записать», меню «⋯» и SOS */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center h-10 rounded-full bg-[var(--surface)] border border-[var(--line)] shadow-[var(--shadow)]">
          <button
            type="button"
            data-tour="search"
            onClick={onOpenSearch}
            aria-label="Где лежит? Поиск"
            title="Где лежит? Поиск по вещам, документам, аптечке"
            className="w-10 h-10 grid place-items-center rounded-full text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-tour="capture"
            onClick={onOpenQuickCapture}
            className="hidden sm:block min-w-[12rem] lg:min-w-[15rem] h-10 pr-2 text-left text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            Найти или записать…
          </button>
          <button
            type="button"
            data-tour="voice"
            onClick={onOpenVoiceCapture}
            aria-label="Сказать голосом"
            title="Сказать голосом"
            className="w-10 h-10 grid place-items-center rounded-full text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>

        <MoreMenu onClearCache={() => setShowClearCacheModal(true)} />

        <button
          data-tour="sos"
          onClick={() => setIsSOSOpen(true)}
          className="hidden md:flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold active:scale-95 transition"
          title="Экстренная помощь SOS (без пароля)"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>SOS</span>
        </button>
      </div>

      {/* Модальное окно подтверждения очистки кэша */}
      {showClearCacheModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--surface)] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">Очистить кэш приложения?</h3>
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                Кэш браузера и старые сервисные воркеры будут удалены, а приложение перезагрузит самую актуальную версию без багов. Все ваши данные сохранятся.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearCacheModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 text-xs font-semibold text-[var(--text-2)] hover:bg-stone-50 cursor-pointer transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearCacheModal(false);
                  clearAllCacheAndReload();
                }}
                className="flex-1 py-2.5 px-3 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-xs font-semibold shadow-[var(--shadow)] cursor-pointer active:scale-95 transition-all"
              >
                Да, очистить
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};



/** Меню «⋯»: всё вспомогательное в одном месте. */
const MoreMenu: React.FC<{ onClearCache: () => void }> = ({ onClearCache }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const item =
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Ещё"
        title="Ещё"
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 grid place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-3)] active:scale-95 transition"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <div
        role="menu"
        className={`absolute right-0 top-[calc(100%+8px)] z-50 w-72 p-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] origin-top-right transition duration-150 ${
          open ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'
        }`}
      >
        <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); window.dispatchEvent(new Event('dbh:family-screen')); }}>
          <Tv className="w-4 h-4 text-[var(--muted)]" /> Семейный экран
        </button>
        <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); window.dispatchEvent(new Event('dbh:tour')); }}>
          <HelpCircle className="w-4 h-4 text-[var(--muted)]" /> Как пользоваться
        </button>
        <div className="px-3 pt-3 pb-2">
          <div className="text-xs text-[var(--muted)] mb-2">Оформление</div>
          <ThemeSegmented />
        </div>
        <div className="border-t border-[var(--line)] mt-1 pt-1">
          <PWAInstallButton variant="menu" />
          <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onClearCache(); }}>
            <RefreshCw className="w-4 h-4 text-[var(--muted)]" /> Очистить кэш и обновить
          </button>
        </div>
      </div>
    </div>
  );
};
