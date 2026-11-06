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
  Sun,
  Moon,
  Laptop,
  AlertTriangle,
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
    theme,
    setTheme,
    storageWarning,
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
    <header className="h-18 px-4 sm:px-8 bg-[#FCFBF8] border-b border-[#EBE7DF] flex items-center justify-between shrink-0 gap-3">
      {/* Левая часть: заголовок страницы и выбор объекта/пользователя */}
      <div className="flex items-center space-x-3 min-w-0">
        <div>
          <div className="flex items-center space-x-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-[#1F1D1A] tracking-tight">{title}</h2>

            {/* Селектор объекта (Квартира, Жильё Сергея, Дача, Все объекты) */}
            <div className="relative" ref={propDropdownRef}>
              <button
                onClick={() => setIsPropDropdownOpen(!isPropDropdownOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white border border-[#E3DFD5] text-[#1F1D1A] hover:bg-[#F4F1EA] shadow-2xs transition-all cursor-pointer"
                title="Переключить объект дома"
              >
                {activePropertyId === 'all' ? (
                  <Building2 className="w-3.5 h-3.5 text-[#E15A42]" />
                ) : activePropertyId === 'dacha' ? (
                  <Trees className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Home className="w-3.5 h-3.5 text-[#E15A42]" />
                )}
                <span>{activeProp ? activeProp.shortName : 'Все объекты'}</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isPropDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-56 rounded-2xl bg-white border border-[#E3DFD5] shadow-lg py-1.5 z-40">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Объекты семьи
                  </div>
                  <button
                    onClick={() => {
                      setActivePropertyId('all');
                      setIsPropDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#F7F5EE] transition-colors cursor-pointer ${
                      activePropertyId === 'all' ? 'font-bold text-[#E15A42] bg-[#FBF9F4]' : 'text-stone-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-stone-400" />
                      <span>Все объекты</span>
                    </div>
                    <span className="text-[10px] text-stone-400">Сводка</span>
                  </button>

                  {properties.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => {
                        setActivePropertyId(prop.id);
                        setIsPropDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#F7F5EE] transition-colors cursor-pointer ${
                        activePropertyId === prop.id ? 'font-bold text-[#E15A42] bg-[#FBF9F4]' : 'text-stone-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {prop.id === 'dacha' ? (
                          <Trees className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Home className="w-4 h-4 text-amber-600" />
                        )}
                        <span>{prop.shortName}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 truncate max-w-[120px]">
                        {prop.address || 'Адрес не указан'}
                      </span>
                    </button>
                  ))}

                  <div className="pt-1.5 mt-1 border-t border-[#E3DFD5] px-1">
                    <button
                      onClick={() => {
                        setIsPropDropdownOpen(false);
                        setIsSOSOpen(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#E15A42] hover:bg-[#F7F5EE] flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Настроить / Добавить объект</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Фильтр по члену семьи (Ольга / Сергей) */}
            <div className="relative" ref={memberDropdownRef}>
              <button
                onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border bg-white border-stone-200 shadow-2xs hover:bg-[#F4F1EA] transition-all cursor-pointer"
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
                <div className="absolute left-0 mt-1.5 w-48 rounded-2xl bg-white border border-[#E3DFD5] shadow-lg py-1.5 z-40">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Члены семьи
                  </div>
                  <button
                    onClick={() => {
                      setActiveMemberId(null);
                      setIsMemberDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#F7F5EE] cursor-pointer ${
                      activeMemberId === null ? 'font-bold text-[#E15A42]' : 'text-stone-700'
                    }`}
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
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center space-x-2 hover:bg-[#F7F5EE] cursor-pointer ${
                        activeMemberId === m.id ? 'font-bold text-[#E15A42]' : 'text-stone-700'
                      }`}
                    >
                      <MemberAvatar member={m} size="xs" />
                      <span>{m.name}</span>
                      <span className="text-[10px] text-stone-400">({m.role.split('•')[0].trim()})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-[#8A8477] font-medium mt-0.5 truncate">
            {subtitle || capitalizedDate}
          </p>
        </div>
      </div>

      {/* Правая часть: Где лежит? (поиск), Микрофон (синяя), Очистить кэш, SOS, Умный ввод, Экшен */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
        {/* КНОПКА «ГДЕ ЛЕЖИТ?» (ПОИСК) */}
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white border border-[#E3DFD5] text-[#1F1D1A] text-xs font-semibold hover:bg-[#F7F5EE] active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
          title="Где лежит? Поиск по вещам, аптечке, мастерам и документам"
        >
          <Search className="w-3.5 h-3.5 text-[#E15A42]" />
          <span className="hidden sm:inline">Где лежит?</span>
        </button>

        {/* СИНЯЯ КНОПКА С МИКРОФОНОМ (ГОЛОСОВОЙ ВВОД) */}
        <button
          onClick={onOpenVoiceCapture}
          className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer border border-blue-500"
          title="Голосовой ввод: надиктуйте задачу, покупку или событие"
        >
          <Mic className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden md:inline">Голос</span>
        </button>

        {/* ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ (СВЕТЛАЯ / ТЕМНАЯ / СИСТЕМНАЯ) */}
        <button
          onClick={() => {
            const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
            setTheme(nextTheme);
          }}
          className="flex items-center space-x-1 px-2.5 py-1.5 sm:py-2 rounded-xl bg-white border border-[#E3DFD5] text-[#6B6456] hover:text-[#1F1D1A] text-xs font-semibold hover:bg-[#F7F5EE] active:scale-95 transition-all cursor-pointer shadow-2xs"
          title={`Тема оформления: ${theme === 'dark' ? 'Тёмная' : theme === 'light' ? 'Светлая' : 'Системная'} (кликните для переключения)`}
        >
          {theme === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
          ) : theme === 'system' ? (
            <Laptop className="w-3.5 h-3.5 text-stone-500" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className="hidden xl:inline text-[11px]">
            {theme === 'dark' ? 'Тёмная' : theme === 'light' ? 'Светлая' : 'Авто'}
          </span>
        </button>

        {/* ПРЕДУПРЕЖДЕНИЕ О ПАМЯТИ БРАУЗЕРА */}
        {storageWarning && (
          <div
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-bold"
            title={storageWarning}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden xl:inline">Память 80%+</span>
          </div>
        )}

        {/* КНОПКА ОЧИСТКИ КЭША И СБРОСА БАГОВ */}
        <button
          onClick={() => setShowClearCacheModal(true)}
          className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white border border-[#E3DFD5] text-[#6B6456] hover:text-[#1F1D1A] text-xs font-semibold hover:bg-[#F7F5EE] active:scale-95 transition-all cursor-pointer shadow-2xs"
          title="Очистить кэш браузера и перезагрузить свежую версию"
        >
          <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
          <span className="hidden lg:inline text-[11px]">Кэш</span>
        </button>

        {/* КРАСНАЯ ГЛОБАЛЬНАЯ КНОПКА SOS — ВСЕГДА ДОСТУПНА */}
        <button
          onClick={() => setIsSOSOpen(true)}
          className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black shadow-md hover:shadow-red-500/30 active:scale-95 transition-all cursor-pointer border border-red-500 group"
          title="Экстренная помощь SOS (без пароля)"
        >
          <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
          <span className="tracking-wide uppercase font-extrabold">SOS</span>
        </button>

        {/* Погода дома */}
        <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#F4F0E8] text-xs text-[#6B6456]">
          <CloudSun className="w-4 h-4 text-amber-500" />
          <span>+19°C • Дома порядок</span>
        </div>

        {/* Кнопка установки PWA */}
        <PWAInstallButton variant="outline" className="hidden lg:flex" />

        {/* Быстрое действие текущей страницы */}
        {onPrimaryAction && primaryActionLabel && (
          <button
            onClick={onPrimaryAction}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-[#1F1D1A] text-xs font-semibold hover:bg-[#F7F5EE] active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#E15A42]" />
            <span>{primaryActionLabel}</span>
          </button>
        )}

        {/* Кнопка умного ввода в шапке */}
        <button
          onClick={onOpenQuickCapture}
          className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#E15A42] to-[#EA7038] text-white text-xs font-semibold shadow-xs hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Умный ввод</span>
        </button>
      </div>

      {/* Модальное окно подтверждения очистки кэша */}
      {showClearCacheModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F1E1C]">Очистить кэш приложения?</h3>
              <p className="text-xs text-[#7A746B] mt-1 leading-relaxed">
                Кэш браузера и старые сервисные воркеры будут удалены, а приложение перезагрузит самую актуальную версию без багов. Все ваши данные сохранятся.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearCacheModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 text-xs font-semibold text-[#5A554D] hover:bg-stone-50 cursor-pointer transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearCacheModal(false);
                  clearAllCacheAndReload();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
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

