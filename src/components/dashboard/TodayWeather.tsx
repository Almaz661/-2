import React, { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplets, Sun, Wind } from 'lucide-react';
import { defaultWeatherCity, fetchWeather, getWeatherConditionInfo, POPULAR_CITIES, CityLocation, WeatherData } from '../../services/weatherService';

const ICONS = { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog };
const iconFor = (code: number) => ICONS[getWeatherConditionInfo(code).iconName as keyof typeof ICONS] || CloudSun;

/** Прогноз погоды на сегодня: сейчас, мин/макс, осадки, ветер, по часам и совет по дому. Без интернета — не показывается. */
export const TodayWeather: React.FC<{ card: string; onMore?: () => void }> = ({ card, onMore }) => {
  const [w, setW] = useState<WeatherData | null>(null);
  useEffect(() => {
    let alive = true;
    const city: CityLocation = defaultWeatherCity();
    fetchWeather(city.latitude, city.longitude, city.name, city.country)
      .then((d) => alive && setW(d))
      .catch(() => undefined);
    const t = window.setInterval(() => {
      fetchWeather(city.latitude, city.longitude, city.name, city.country).then((d) => alive && setW(d)).catch(() => undefined);
    }, 30 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);
  if (!w) return null;

  const today = w.daily[0];
  const info = getWeatherConditionInfo(w.current.weatherCode);
  const Now = iconFor(w.current.weatherCode);
  // Ближайшие часы — каждые 3 часа (вечером захватывает утро завтра)
  const hours = w.hourly.filter((_, i) => i > 0 && i % 3 === 0).slice(0, 6);

  return (
    <section>
      <div className="flex items-baseline justify-between px-1 mb-3">
        <h2 className="text-lg font-semibold text-[var(--text)]">Погода сегодня</h2>
        <button type="button" onClick={onMore} className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors px-2 py-2 -mr-2 -my-2 rounded-lg">
          {w.city} · на неделю
        </button>
      </div>
      <div className={`${card} p-5`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <Now className="w-10 h-10 text-[var(--accent)]" />
            <div>
              <div className="text-3xl font-semibold tabular-nums text-[var(--text)]">{Math.round(w.current.temperature)}°</div>
              <div className="text-[14px] text-[var(--muted)]">
                {info.label}, ощущается {Math.round(w.current.apparentTemperature)}°
              </div>
            </div>
          </div>
          {today && (
            <div className="text-sm text-[var(--text-2)] space-y-1">
              <div>
                Днём до <span className="font-medium text-[var(--text)]">{Math.round(today.tempMax)}°</span>, ночью {Math.round(today.tempMin)}°
              </div>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1">
                  <Droplets className="w-4 h-4" /> дождь {today.precipitationProbabilityMax}%
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wind className="w-4 h-4" /> {Math.round(w.current.windSpeed)} км/ч
                </span>
              </div>
            </div>
          )}
          {hours.length > 0 && (
            <div className="flex gap-4 ml-auto">
              {hours.map((h) => {
                const I = iconFor(h.weatherCode);
                return (
                  <div key={h.time} className="text-center text-xs text-[var(--text-2)]">
                    <div className="text-[var(--muted)]">{h.dayLabel === 'Завтра' ? `завтра ${h.hourLabel}` : h.hourLabel}</div>
                    <I className="w-5 h-5 mx-auto my-1" />
                    <div className="tabular-nums font-medium text-[var(--text)]">{Math.round(h.temperature)}°</div>
                    {h.precipitationProbability >= 30 && <div className="text-[var(--accent)] tabular-nums">{h.precipitationProbability}%</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {w.householdAdvice && <p className="mt-4 pt-3 border-t border-[var(--line)] text-sm text-[var(--text-2)]">🏠 {w.householdAdvice}</p>}
      </div>
    </section>
  );
};
