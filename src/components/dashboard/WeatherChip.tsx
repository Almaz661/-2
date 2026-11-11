import React, { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-react';
import { defaultWeatherCity, fetchWeather, getWeatherConditionInfo, POPULAR_CITIES, CityLocation } from '../../services/weatherService';

const ICONS = { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog };

/** Маленькая метка погоды. Если погода не загрузилась — не показывается совсем (никаких красных ошибок). */
export const WeatherChip: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [w, setW] = useState<{ t: number; label: string; icon: keyof typeof ICONS; city: string } | null>(null);
  useEffect(() => {
    let alive = true;
    const city: CityLocation = defaultWeatherCity();
    fetchWeather(city.latitude, city.longitude, city.name, city.country)
      .then((d) => {
        if (!alive) return;
        const info = getWeatherConditionInfo(d.current.weatherCode);
        setW({ t: Math.round(d.current.temperature), label: info.label, icon: info.iconName, city: d.city });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  if (!w) return null;
  const Icon = ICONS[w.icon] || CloudSun;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${w.label}, ${w.city}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/25 text-white text-[14px] backdrop-blur-md hover:bg-black/35 transition"
    >
      <Icon className="w-4 h-4" />
      {w.t}° · {w.city}
    </button>
  );
};
