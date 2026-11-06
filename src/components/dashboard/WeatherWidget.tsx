import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Wind,
  Droplets,
  Umbrella,
  Thermometer,
  MapPin,
  Search,
  RefreshCw,
  Navigation,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';
import {
  WeatherData,
  fetchWeather,
  searchCities,
  CityLocation,
  POPULAR_CITIES,
  getWeatherConditionInfo,
  detectLocationAutomatically,
} from '../../services/weatherService';

const WEATHER_STORAGE_KEY = 'onehaus_weather_location';

export const WeatherWidget: React.FC = () => {
  // Выбранный город (по умолчанию Амстердам или из localStorage)
  const [currentCity, setCurrentCity] = useState<CityLocation>(() => {
    try {
      const saved = localStorage.getItem(WEATHER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Ошибка чтения города погоды:', e);
    }
    return POPULAR_CITIES[0]; // Амстердам
  });

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Режим прогноза: 'hourly' | 'daily'
  const [forecastTab, setForecastTab] = useState<'hourly' | 'daily'>('hourly');

  // Модалка/попап смены города
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityLocation[]>([]);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);
  const [detectSuccess, setDetectSuccess] = useState<boolean | null>(null);
  const [detectToast, setDetectToast] = useState<string | null>(null);

  // Ссылка на скролл-контейнер почасового прогноза
  const hourlyScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollHourly = (direction: 'left' | 'right') => {
    if (hourlyScrollRef.current) {
      const offset = direction === 'left' ? -280 : 280;
      hourlyScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Загрузка данных погоды
  const loadWeatherData = async (loc: CityLocation) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(loc.latitude, loc.longitude, loc.name, loc.country);
      setWeather(data);
    } catch (err: any) {
      console.error('Ошибка получения погоды:', err);
      setError('Не удалось обновить погоду');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeatherData(currentCity);
  }, [currentCity]);

  // Выбор города
  const handleSelectCity = (city: CityLocation) => {
    setCurrentCity(city);
    try {
      localStorage.setItem(WEATHER_STORAGE_KEY, JSON.stringify(city));
    } catch (e) {
      console.warn(e);
    }
    setIsCityModalOpen(false);
    setCitySearchQuery('');
    setSearchResults([]);
  };

  // Поиск городов
  useEffect(() => {
    if (!citySearchQuery.trim() || citySearchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingCities(true);
      try {
        const res = await searchCities(citySearchQuery);
        setSearchResults(res);
      } catch (e) {
        console.warn('Ошибка поиска города:', e);
      } finally {
        setIsSearchingCities(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [citySearchQuery]);

  // Надежное автоматическое определение местоположения (GPS + IP-геолокация)
  const handleDetectLocation = async () => {
    setIsLocating(true);
    setDetectStatus('Определяем ваше местоположение...');
    setDetectSuccess(null);
    try {
      const { location: detectedLoc, source } = await detectLocationAutomatically();

      let sourceLabel = '';
      if (source === 'gps') sourceLabel = 'по GPS';
      else if (source === 'ip' || source === 'server') sourceLabel = 'по сети';

      const successMsg = `Местоположение определено${sourceLabel ? ` (${sourceLabel})` : ''}: ${detectedLoc.name}${
        detectedLoc.country ? `, ${detectedLoc.country}` : ''
      }`;

      setDetectSuccess(true);
      setDetectStatus(successMsg);
      setDetectToast(successMsg);
      setTimeout(() => setDetectToast(null), 4500);

      // Применяем выбранный город
      handleSelectCity(detectedLoc);

      // Закрываем окно после короткой паузы с подтверждением
      setTimeout(() => {
        setIsCityModalOpen(false);
        setDetectStatus(null);
        setDetectSuccess(null);
      }, 900);
    } catch (err: any) {
      console.error('Ошибка автоопределения местоположения:', err);
      setDetectSuccess(false);
      setDetectStatus('Не удалось автоматически определить город. Выберите город из списка ниже.');
    } finally {
      setIsLocating(false);
    }
  };

  // Рендер иконки погоды
  const renderWeatherIcon = (iconName: string, className = 'w-6 h-6') => {
    switch (iconName) {
      case 'Sun':
        return <Sun className={`${className} text-amber-500`} />;
      case 'CloudSun':
        return <CloudSun className={`${className} text-amber-500`} />;
      case 'Cloud':
        return <Cloud className={`${className} text-stone-400`} />;
      case 'CloudDrizzle':
        return <CloudDrizzle className={`${className} text-sky-400`} />;
      case 'CloudRain':
        return <CloudRain className={`${className} text-blue-500`} />;
      case 'CloudSnow':
        return <CloudSnow className={`${className} text-cyan-400`} />;
      case 'CloudLightning':
        return <CloudLightning className={`${className} text-purple-500`} />;
      case 'CloudFog':
        return <CloudFog className={`${className} text-slate-400`} />;
      default:
        return <CloudSun className={`${className} text-amber-500`} />;
    }
  };

  const currentCondition = weather ? getWeatherConditionInfo(weather.current.weatherCode) : null;

  return (
    <>
      <div className="bg-gradient-to-br from-[#FAF7F2] via-white to-[#F7F2E9] rounded-3xl p-5 md:p-6 border border-[#E8E2D4] shadow-xs space-y-4 relative overflow-hidden transition-all">
        {/* Декоративный световой ореол */}
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Верхняя строка: Локация, температура и кнопка выбора города */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsCityModalOpen(true)}
              className="group flex items-center space-x-2 text-left bg-white/90 hover:bg-white border border-[#E5DFD3] px-3 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer"
              title="Нажмите, чтобы сменить город"
            >
              <MapPin className="w-4 h-4 text-[#E15A42] shrink-0" />
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-[#1F1E1C] group-hover:text-[#E15A42] transition-colors truncate block">
                  {currentCity.name}
                </span>
                {currentCity.country && (
                  <span className="text-[10px] text-[#8C867D] block leading-none truncate">
                    {currentCity.country}
                  </span>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#8C867D] group-hover:text-[#1F1E1C] shrink-0 ml-1" />
            </button>

            <button
              type="button"
              onClick={() => handleDetectLocation()}
              disabled={isLocating}
              className="p-2 text-[#8C867D] hover:text-[#E15A42] hover:bg-white rounded-xl border border-transparent hover:border-[#E5DFD3] transition-colors cursor-pointer"
              title="Определить моё местоположение"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-[#E15A42]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => loadWeatherData(currentCity)}
              disabled={isLoading}
              className="p-2 text-[#8C867D] hover:text-[#1F1E1C] hover:bg-white rounded-xl border border-transparent hover:border-[#E5DFD3] transition-colors cursor-pointer"
              title="Обновить прогноз погоды"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E15A42]' : ''}`} />
            </button>
          </div>

          {/* Переключатель вкладок: Почасовой / 7 дней */}
          <div className="flex items-center bg-[#F2EDE2] p-1 rounded-xl self-start sm:self-auto border border-[#E5DFD3]">
            <button
              type="button"
              onClick={() => setForecastTab('hourly')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                forecastTab === 'hourly'
                  ? 'bg-white text-[#E15A42] shadow-2xs'
                  : 'text-[#6D675E] hover:text-[#1F1E1C]'
              }`}
            >
              Сегодня по часам
            </button>
            <button
              type="button"
              onClick={() => setForecastTab('daily')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                forecastTab === 'daily'
                  ? 'bg-white text-[#E15A42] shadow-2xs'
                  : 'text-[#6D675E] hover:text-[#1F1E1C]'
              }`}
            >
              На 7 дней
            </button>
          </div>
        </div>

        {/* Уведомление об успешном определении местоположения */}
        {detectToast && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-medium">{detectToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setDetectToast(null)}
              className="text-emerald-600 hover:text-emerald-900 ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Текущее состояние погоды */}
        {weather && currentCondition && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-1">
            {/* Левый блок: Основная температура и статус */}
            <div className="md:col-span-5 flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-[#EBE5DA] flex items-center justify-center shrink-0">
                {renderWeatherIcon(currentCondition.iconName, 'w-10 h-10')}
              </div>
              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl sm:text-4xl font-black text-[#1F1E1C] tracking-tight">
                    {weather.current.temperature > 0 ? `+${weather.current.temperature}` : weather.current.temperature}°
                  </span>
                  <span className="text-xs font-medium text-[#7A746B]">
                    ощущается как{' '}
                    <strong className="text-[#3D3A36]">
                      {weather.current.apparentTemperature > 0
                        ? `+${weather.current.apparentTemperature}`
                        : weather.current.apparentTemperature}°
                    </strong>
                  </span>
                </div>
                <div className="text-xs font-bold text-[#1F1E1C] mt-0.5">
                  {currentCondition.label}
                </div>
              </div>
            </div>

            {/* Правый блок: 3 ключевых параметра */}
            <div className="md:col-span-7 grid grid-cols-3 gap-2.5">
              <div className="bg-white/80 p-2.5 rounded-2xl border border-[#EAE4D8] flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Droplets className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] text-[#8C867D] block leading-none">Влажность</span>
                  <span className="text-xs font-bold text-[#1F1E1C] mt-0.5 block truncate">
                    {weather.current.humidity}%
                  </span>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-2xl border border-[#EAE4D8] flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <Wind className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] text-[#8C867D] block leading-none">Ветер</span>
                  <span className="text-xs font-bold text-[#1F1E1C] mt-0.5 block truncate">
                    {weather.current.windSpeed} км/ч
                  </span>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-2xl border border-[#EAE4D8] flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Umbrella className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] text-[#8C867D] block leading-none">Осадки</span>
                  <span className="text-xs font-bold text-[#1F1E1C] mt-0.5 block truncate">
                    {weather.current.precipitation} мм
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Домашняя рекомендация по погоде */}
        {weather?.householdAdvice && (
          <div className="bg-[#FFF9F2] rounded-2xl p-3 border border-orange-200/80 flex items-center space-x-2.5 text-xs text-[#8C4A1D]">
            <Sparkles className="w-4 h-4 text-[#E15A42] shrink-0" />
            <span className="font-medium leading-relaxed">
              <strong>Совет для дома:</strong> {weather.householdAdvice}
            </span>
          </div>
        )}

        {/* Прогноз: Почасовой слайдер (на 24 часа вперёд) */}
        {forecastTab === 'hourly' && weather && weather.hourly.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-[#7A746B]">
              <span className="font-semibold flex items-center space-x-1.5">
                <span>Почасовой прогноз</span>
                <span className="text-[#8C867D] font-normal">
                  ({weather.hourly.length} ч вперёд)
                </span>
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => scrollHourly('left')}
                  className="w-6 h-6 rounded-lg bg-white border border-[#EAE4D8] hover:border-[#E15A42] flex items-center justify-center text-[#7A746B] hover:text-[#E15A42] transition-colors cursor-pointer"
                  title="Прокрутить назад"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollHourly('right')}
                  className="w-6 h-6 rounded-lg bg-white border border-[#EAE4D8] hover:border-[#E15A42] flex items-center justify-center text-[#7A746B] hover:text-[#E15A42] transition-colors cursor-pointer"
                  title="Прокрутить вперёд"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div
              ref={hourlyScrollRef}
              className="flex items-center space-x-2.5 overflow-x-auto pb-2 scroll-smooth scrollbar-thin"
            >
              {weather.hourly.map((item, idx) => {
                const cond = getWeatherConditionInfo(item.weatherCode);
                const isCurrent = item.isCurrentHour;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-between p-2.5 rounded-2xl border min-w-[76px] shrink-0 text-center space-y-1 transition-all ${
                      isCurrent
                        ? 'bg-orange-50/90 border-[#E15A42] ring-2 ring-[#E15A42]/20 shadow-xs'
                        : 'bg-white border-[#EAE4D8] hover:border-orange-200'
                    }`}
                  >
                    <div className="flex flex-col items-center leading-none">
                      {item.dayLabel && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${
                            item.dayLabel === 'Завтра'
                              ? 'text-indigo-600'
                              : isCurrent
                              ? 'text-[#E15A42]'
                              : 'text-[#8C867D]'
                          }`}
                        >
                          {item.dayLabel}
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-bold ${
                          isCurrent ? 'text-[#E15A42]' : 'text-[#3D3A36]'
                        }`}
                      >
                        {item.hourLabel}
                      </span>
                    </div>

                    <div className="my-0.5">{renderWeatherIcon(cond.iconName, 'w-5 h-5')}</div>

                    <span className="text-xs font-black text-[#1F1E1C]">
                      {item.temperature > 0 ? `+${item.temperature}` : item.temperature}°
                    </span>

                    {item.precipitationProbability > 0 ? (
                      <span className="text-[9px] font-bold text-blue-600 flex items-center space-x-0.5">
                        <Droplets className="w-2.5 h-2.5" />
                        <span>{item.precipitationProbability}%</span>
                      </span>
                    ) : (
                      <span className="text-[9px] text-stone-300">0%</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Прогноз: На 7 дней */}
        {forecastTab === 'daily' && weather && weather.daily.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
            {weather.daily.map((item, idx) => {
              const cond = getWeatherConditionInfo(item.weatherCode);
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border text-center flex flex-col justify-between space-y-1.5 transition-all ${
                    idx === 0
                      ? 'bg-[#FFF5F2] border-[#E15A42]/30 shadow-2xs'
                      : 'bg-white border-[#EAE4D8]'
                  }`}
                >
                  <span className={`text-[11px] font-bold ${idx === 0 ? 'text-[#E15A42]' : 'text-[#7A746B]'}`}>
                    {item.dayLabel}
                  </span>
                  <div className="flex justify-center my-0.5">
                    {renderWeatherIcon(cond.iconName, 'w-6 h-6')}
                  </div>
                  <div className="flex items-center justify-center space-x-1.5 text-xs">
                    <span className="font-black text-[#1F1E1C]">
                      {item.tempMax > 0 ? `+${item.tempMax}` : item.tempMax}°
                    </span>
                    <span className="text-[11px] text-[#8C867D]">
                      {item.tempMin > 0 ? `+${item.tempMin}` : item.tempMin}°
                    </span>
                  </div>
                  {item.precipitationProbabilityMax > 15 && (
                    <span className="text-[10px] text-blue-600 font-bold block">
                      {item.precipitationProbabilityMax}% дожд.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
            {error}. Проверьте соединение с интернетом или выберите другой город.
          </div>
        )}
      </div>

      {/* Модальное окно выбора / поиска города */}
      {isCityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full border border-[#E5DFD3] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-[#E15A42]" />
                <h3 className="font-bold text-base text-[#1F1E1C]">Выбор города для прогноза</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCityModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#EDE8DC] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Кнопка автоопределения по GPS / Сети */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="w-full py-2.5 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#E15A42] text-xs font-bold border border-orange-200 flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>
                  {isLocating ? 'Определяем местоположение...' : 'Определить моё местоположение (GPS / Сеть)'}
                </span>
              </button>

              {detectStatus && (
                <div
                  className={`text-xs p-2.5 rounded-xl border flex items-center space-x-2 animate-in fade-in duration-150 ${
                    detectSuccess
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : detectSuccess === false
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <span className="shrink-0 font-bold">{detectSuccess ? '✓' : 'ℹ'}</span>
                  <span className="leading-snug">{detectStatus}</span>
                </div>
              )}
            </div>

            {/* Строка поиска любого города мира */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8C867D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                placeholder="Поиск города (например: Рим, Казань, Дубай)..."
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-[#DDD7CB] rounded-xl focus:outline-none focus:border-[#E15A42]"
                autoFocus
              />
            </div>

            {/* Результаты живого поиска */}
            {searchResults.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                <span className="text-[11px] font-bold text-[#8C867D] uppercase">Найдено:</span>
                {searchResults.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    className="w-full text-left p-2.5 rounded-xl bg-white border border-[#E8E2D4] hover:border-[#E15A42] hover:bg-[#FFF5F2] transition-colors flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold text-[#1F1E1C]">{city.name}</span>
                    <span className="text-[#8C867D] text-[11px]">
                      {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Популярные города */}
            <div className="space-y-2 pt-1 border-t border-[#E8E2D4]">
              <span className="text-[11px] font-bold text-[#8C867D] uppercase">Популярные города:</span>
              <div className="grid grid-cols-3 gap-2">
                {POPULAR_CITIES.map((c) => {
                  const isSelected = c.name === currentCity.name;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCity(c)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E15A42] text-white border-[#E15A42]'
                          : 'bg-white border-[#E5DFD3] text-[#3D3A36] hover:border-[#E15A42] hover:bg-orange-50/50'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
