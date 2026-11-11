import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ShieldCheck,
  X,
  Home,
  CheckCircle2,
  Globe,
  Coins,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useHousehold, CleanHouseholdOptions } from '../../context/HouseholdContext';
import { COUNTRY_PRESETS, getCountryPresetById, CountryPreset } from '../../utils/countryPresets';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../../utils/currencyConstants';

interface CleanStartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CleanStartModal: React.FC<CleanStartModalProps> = ({ isOpen, onClose }) => {
  const { startCleanHousehold, showToast, householdRegion, householdCurrency } = useHousehold();

  // Выбранная страна из пресетов
  const [selectedCountryId, setSelectedCountryId] = useState<string>(() => {
    return householdRegion || 'RU';
  });

  const [customCountryName, setCustomCountryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Выбранная валюта
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    return householdCurrency || 'EUR';
  });
  const [customCurrencySymbol, setCustomCurrencySymbol] = useState('');

  const [homeName, setHomeName] = useState('Наш дом');
  const [ownerName, setOwnerName] = useState('Я');

  // Фильтр списка стран
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRY_PRESETS;
    const q = searchQuery.toLowerCase().trim();
    return COUNTRY_PRESETS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.regionCode.toLowerCase().includes(q) ||
        c.defaultCurrency.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectCountry = (preset: CountryPreset) => {
    setSelectedCountryId(preset.id);
    setSelectedCurrency(preset.defaultCurrency);
    if (preset.id === 'OTHER') {
      setHomeName('Наш дом');
    } else {
      setHomeName(`Наш дом (${preset.name})`);
    }
  };

  const handleCreateClean = () => {
    const isOther = selectedCountryId === 'OTHER';
    const effectiveCountryName = isOther && customCountryName.trim() ? customCountryName.trim() : undefined;
    const effectiveCurrency = customCurrencySymbol.trim() ? customCurrencySymbol.trim() : selectedCurrency;

    const options: CleanHouseholdOptions = {
      region: selectedCountryId,
      countryName: effectiveCountryName,
      currency: effectiveCurrency,
      householdName: homeName.trim() || 'Наш дом',
      ownerName: ownerName.trim() || 'Я',
    };

    startCleanHousehold(options);
    localStorage.setItem('onehaus_start_choice_done', 'true');
    onClose();
  };

  const handleKeepDemo = () => {
    localStorage.setItem('onehaus_start_choice_done', 'true');
    showToast('Загружены демонстрационные примеры для ознакомления', 'info');
    onClose();
  };

  const activePreset = getCountryPresetById(selectedCountryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[var(--surface)] rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Шапка модального окна */}
        <div className="p-5 md:p-6 bg-[var(--surface-2)] border-b border-[var(--line)] relative">
          <button
            onClick={handleKeepDemo}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-200/60 text-stone-500 transition-colors cursor-pointer"
            title="Закрыть и оставить примеры"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-white">
              <Globe className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-semibold text-xl text-[var(--text)]">
                Персональный дом в любой стране мира
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Полная автономность • Любая страна • Любая валюта
              </p>
            </div>
          </div>

          {/* Плашка полной независимости данных */}
          <div className="mt-3 p-3 bg-[var(--surface)]/90 border border-emerald-200/80 rounded-2xl shadow-none flex items-start space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[12px] text-[var(--text-2)] leading-relaxed">
              <strong className="text-[var(--text)] block mb-0.5">
                Изолированное личное пространство:
              </strong>
              Вы можете находиться в <strong>любой стране мира</strong> (Кипр, Греция, Россия, ОАЭ, страны Европы, США, Таиланд и др.). Данные каждого устройства и каждой семьи полностью автономны и <strong>никогда не объединяются между собой</strong>.
            </div>
          </div>
        </div>

        {/* Форма выбора страны и параметров */}
        <div className="p-5 md:p-6 space-y-5 overflow-y-auto max-h-[calc(94vh-180px)]">
          {/* Поиск и выбор страны */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-2)]">
                1. В какой стране находится ваш дом?
              </label>
              <span className="text-[12px] text-[var(--muted)]">
                Выбрано: <strong>{activePreset.flag} {activePreset.name}</strong>
              </span>
            </div>

            {/* Поисковая строка */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск страны (Кипр, Греция, ОАЭ, Германия, Испания, США...)"
                className="w-full pl-9 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Сетка стран */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 border border-stone-200/70 rounded-2xl bg-stone-50/50">
              {filteredCountries.map((preset) => {
                const isSelected = selectedCountryId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectCountry(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${ isSelected ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]/20 shadow-[var(--shadow)]' : 'border-stone-200/80 bg-[var(--surface)] hover:border-stone-300' }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xl">{preset.flag}</span>
                      <span className="text-[12px] font-semibold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
                        {preset.defaultCurrency}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-[var(--text)] line-clamp-1">
                      {preset.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Если выбрана "Любая другая страна" */}
            {selectedCountryId === 'OTHER' && (
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-1.5 animate-in fade-in">
                <label className="text-xs font-semibold text-amber-900 block">
                  Укажите название вашей страны:
                </label>
                <input
                  type="text"
                  value={customCountryName}
                  onChange={(e) => setCustomCountryName(e.target.value)}
                  placeholder="Например: Португалия, Австрия, Бразилия, Япония..."
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-amber-300 rounded-lg text-xs font-semibold text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}
          </div>

          {/* Шаг 2: Валюта дома */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text-2)]">
                2. Валюта для расходов, чеков и коммуналки:
              </label>
              <span className="text-xs font-semibold text-[var(--accent)]">
                {getCurrencySymbol(selectedCurrency)} ({selectedCurrency})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-xl text-xs font-semibold text-[var(--text)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={customCurrencySymbol}
                  onChange={(e) => setCustomCurrencySymbol(e.target.value)}
                  placeholder="Свой символ (если нужен, напр. kr, Fr, zł)"
                  className="w-full px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-xl text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          </div>

          {/* Шаг 3: Название дома и имя владельца */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-2)]">
                Название пространства:
              </label>
              <input
                type="text"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                placeholder="Например: Наш дом"
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-xl text-xs font-semibold text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--text-2)]">
                Ваше имя (владелец):
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Например: Ольга или Я"
                className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-xl text-xs font-semibold text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Карточка главного действия */}
          <div className="p-4 rounded-2xl bg-[var(--surface-2)] border-2 border-[var(--accent)] shadow-[var(--shadow)] space-y-3">
            <div className="flex items-start space-x-2.5">
              <Sparkles className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-[var(--text)]">
                  Создать чистое персональное пространство
                </h3>
                <p className="text-xs text-[var(--text-2)] mt-0.5 leading-relaxed">
                  Будут удалены все чужие демонстрационные имена, обнулены счетчики (с 0 м³ и тарифами выбранной страны), настроены экстренные службы и созданы чистые списки покупок.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateClean}
              className="w-full py-3 px-4 rounded-full bg-[var(--accent)] hover:brightness-105 active:scale-98 text-white font-semibold text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Создать чистое пространство для моей семьи ({selectedCurrency})</span>
            </button>
          </div>

          {/* Вариант 2: Оставить примеры */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={handleKeepDemo}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] hover:underline font-medium cursor-pointer"
            >
              Оставить демонстрационные шаблоны (посмотреть возможности)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
