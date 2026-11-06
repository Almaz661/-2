export interface WeatherCurrent {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
  time: string;
}

export interface WeatherHourlyItem {
  time: string;
  hourLabel: string;
  dayLabel?: string;
  temperature: number;
  apparentTemperature?: number;
  weatherCode: number;
  precipitationProbability: number;
  isCurrentHour?: boolean;
}

export interface WeatherDailyItem {
  date: string;
  dayLabel: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationProbabilityMax: number;
}

export interface WeatherData {
  city: string;
  country?: string;
  latitude: number;
  longitude: number;
  current: WeatherCurrent;
  hourly: WeatherHourlyItem[];
  daily: WeatherDailyItem[];
  householdAdvice: string;
}

export interface CityLocation {
  id: number | string;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export const POPULAR_CITIES: CityLocation[] = [
  { id: 'ath', name: 'Афины', country: 'Греция', latitude: 37.9838, longitude: 23.7275 },
  { id: 'skg', name: 'Салоники', country: 'Греция', latitude: 40.6401, longitude: 22.9444 },
  { id: 'her', name: 'Ираклион', country: 'Греция (Крит)', latitude: 35.3387, longitude: 25.1442 },
  { id: 'ams', name: 'Амстердам', country: 'Нидерланды', latitude: 52.374, longitude: 4.89 },
  { id: 'ber', name: 'Берлин', country: 'Германия', latitude: 52.52, longitude: 13.405 },
  { id: 'mow', name: 'Москва', country: 'Россия', latitude: 55.7558, longitude: 37.6173 },
  { id: 'spb', name: 'Санкт-Петербург', country: 'Россия', latitude: 59.9343, longitude: 30.3351 },
  { id: 'ala', name: 'Алматы', country: 'Казахстан', latitude: 43.2389, longitude: 76.8897 },
  { id: 'tbs', name: 'Тбилиси', country: 'Грузия', latitude: 41.7151, longitude: 44.8271 },
  { id: 'par', name: 'Париж', country: 'Франция', latitude: 48.8566, longitude: 2.3522 },
  { id: 'lon', name: 'Лондон', country: 'Великобритания', latitude: 51.5074, longitude: -0.1278 },
  { id: 'waw', name: 'Варшава', country: 'Польша', latitude: 52.2297, longitude: 21.0122 },
];

export interface WeatherConditionInfo {
  label: string;
  iconName: 'Sun' | 'CloudSun' | 'Cloud' | 'CloudRain' | 'CloudSnow' | 'CloudLightning' | 'CloudDrizzle' | 'CloudFog';
  color: string;
  advice: string;
}

export function getWeatherConditionInfo(code: number): WeatherConditionInfo {
  switch (code) {
    case 0:
      return {
        label: 'Ясно, солнечно',
        iconName: 'Sun',
        color: 'text-amber-500',
        advice: 'Отличная погода для прогулки, проветривания и сушки белья на балконе.',
      };
    case 1:
      return {
        label: 'Преимущественно ясно',
        iconName: 'CloudSun',
        color: 'text-amber-500',
        advice: 'Приятная мягкая погода, идеально для семейных дел на свежем воздухе.',
      };
    case 2:
      return {
        label: 'Переменная облачность',
        iconName: 'CloudSun',
        color: 'text-amber-600',
        advice: 'Комфортно, солнце временами скрывается за облаками.',
      };
    case 3:
      return {
        label: 'Пасмурно',
        iconName: 'Cloud',
        color: 'text-stone-500',
        advice: 'Серое небо, уютное время для домашних дел и чтения книг.',
      };
    case 45:
    case 48:
      return {
        label: 'Туман / Иней',
        iconName: 'CloudFog',
        color: 'text-slate-400',
        advice: 'Осторожнее за рулём автомобиля — видимость на дорогах снижена.',
      };
    case 51:
    case 53:
    case 55:
      return {
        label: 'Моросящий дождь',
        iconName: 'CloudDrizzle',
        color: 'text-sky-500',
        advice: 'Влажно и моросит. Возьмите дождевик или лёгкий зонт.',
      };
    case 61:
    case 63:
    case 65:
      return {
        label: code === 61 ? 'Небольшой дождь' : code === 63 ? 'Умеренный дождь' : 'Сильный дождь',
        iconName: 'CloudRain',
        color: 'text-blue-500',
        advice: 'Обязательно захватите зонт перед выходом из дома и проверьте закрыты ли окна.',
      };
    case 71:
    case 73:
    case 75:
      return {
        label: code === 71 ? 'Небольшой снег' : 'Снегопад',
        iconName: 'CloudSnow',
        color: 'text-cyan-500',
        advice: 'Снежная погода! Одевайте детей теплее и будьте внимательны на тротуарах.',
      };
    case 80:
    case 81:
    case 82:
      return {
        label: 'Ливневый дождь',
        iconName: 'CloudRain',
        color: 'text-blue-600',
        advice: 'Ливень! Лучше переждать дома или не забыть плотный дождевик.',
      };
    case 85:
    case 86:
      return {
        label: 'Снежные заряды',
        iconName: 'CloudSnow',
        color: 'text-cyan-600',
        advice: 'Метель и снег. Тёплая обувь и шапки обязательны.',
      };
    case 95:
    case 96:
    case 99:
      return {
        label: 'Гроза с громом',
        iconName: 'CloudLightning',
        color: 'text-purple-500',
        advice: 'Грозовой фронт. Закройте форточки и отключите чувствительную технику от сети.',
      };
    default:
      return {
        label: 'Переменная погода',
        iconName: 'CloudSun',
        color: 'text-stone-500',
        advice: 'Следите за изменениями температуры в течение дня.',
      };
  }
}

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export async function fetchWeather(lat: number, lon: number, cityName: string, country?: string): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Ошибка загрузки погоды: ${response.statusText}`);
  }

  const json = await response.json();

  const current: WeatherCurrent = {
    temperature: Math.round(json.current.temperature_2m * 10) / 10,
    apparentTemperature: Math.round(json.current.apparent_temperature * 10) / 10,
    humidity: json.current.relative_humidity_2m,
    windSpeed: Math.round(json.current.wind_speed_10m),
    precipitation: json.current.precipitation || 0,
    weatherCode: json.current.weather_code,
    time: json.current.time,
  };

  // Почасовой прогноз: берем ближайшие 24 часа, начиная с ТЕКУЩЕГО часа (а не со старых часов полуночи!)
  const currentIsoHour = json.current?.time ? json.current.time.slice(0, 13) : '';
  const now = new Date();
  const todayYMD = json.current?.time ? json.current.time.split('T')[0] : now.toISOString().split('T')[0];

  const hourly: WeatherHourlyItem[] = [];
  if (json.hourly && Array.isArray(json.hourly.time)) {
    // Находим индекс текущего часа
    let startIndex = json.hourly.time.findIndex((t: string) => t.slice(0, 13) === currentIsoHour);
    if (startIndex === -1) {
      startIndex = json.hourly.time.findIndex((t: string) => t >= currentIsoHour);
    }
    if (startIndex === -1) {
      startIndex = 0;
    }

    // Собираем следующие 24 часа вперед от текущего момента
    const hoursToTake = Math.min(24, json.hourly.time.length - startIndex);
    for (let i = 0; i < hoursToTake; i++) {
      const idx = startIndex + i;
      const timeStr = json.hourly.time[idx];
      const hourPart = timeStr.split('T')[1]?.slice(0, 5) || `${i}:00`;
      const datePart = timeStr.split('T')[0];
      const isCurrent = i === 0;

      hourly.push({
        time: timeStr,
        hourLabel: isCurrent ? 'Сейчас' : hourPart,
        dayLabel: datePart === todayYMD ? 'Сегодня' : 'Завтра',
        temperature: Math.round(json.hourly.temperature_2m[idx]),
        apparentTemperature: json.hourly.apparent_temperature
          ? Math.round(json.hourly.apparent_temperature[idx])
          : undefined,
        weatherCode: json.hourly.weather_code[idx],
        precipitationProbability: json.hourly.precipitation_probability
          ? json.hourly.precipitation_probability[idx]
          : 0,
        isCurrentHour: isCurrent,
      });
    }
  }

  // 7-дневный прогноз
  const daily: WeatherDailyItem[] = [];
  if (json.daily && Array.isArray(json.daily.time)) {
    for (let i = 0; i < json.daily.time.length; i++) {
      const dateStr = json.daily.time[i];
      const d = new Date(dateStr);
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const dayLabel = isToday ? 'Сегодня' : isTomorrow ? 'Завтра' : WEEKDAYS[d.getDay()];

      daily.push({
        date: dateStr,
        dayLabel,
        tempMax: Math.round(json.daily.temperature_2m_max[i]),
        tempMin: Math.round(json.daily.temperature_2m_min[i]),
        weatherCode: json.daily.weather_code[i],
        precipitationProbabilityMax: json.daily.precipitation_probability_max ? json.daily.precipitation_probability_max[i] : 0,
      });
    }
  }

  // Формирование умного домашнего совета
  const condition = getWeatherConditionInfo(current.weatherCode);
  let advice = condition.advice;
  if (current.windSpeed > 25) {
    advice += ' Внимание: порывистый ветер до ' + current.windSpeed + ' км/ч.';
  } else if (current.temperature <= 5 && current.temperature > -5) {
    advice += ' Около нуля — возможен гололёд на ступенях и дорожках.';
  } else if (current.temperature < -10) {
    advice += ' Морозно! Проверьте отопление и одевайтесь многослойно.';
  }

  return {
    city: cityName,
    country,
    latitude: lat,
    longitude: lon,
    current,
    hourly,
    daily,
    householdAdvice: advice,
  };
}

export async function searchCities(query: string): Promise<CityLocation[]> {
  if (!query || query.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=ru`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const json = await response.json();
  if (!json.results || !Array.isArray(json.results)) return [];

  return json.results.map((r: any) => ({
    id: r.id,
    name: r.name,
    country: r.country,
    admin1: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

/**
 * Обратное геокодирование координат в название города на русском языке
 */
export async function reverseGeocode(lat: number, lon: number): Promise<{ name: string; country?: string }> {
  try {
    // 1. Попытка через BigDataCloud (клиентский свободный reverse geocode с поддержкой русского языка)
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ru`;
    const bdcRes = await fetch(bdcUrl, { signal: AbortSignal.timeout(3500) });
    if (bdcRes.ok) {
      const data = await bdcRes.json();
      const cityName = data.city || data.locality || data.principalSubdivision;
      if (cityName) {
        return {
          name: cityName,
          country: data.countryName,
        };
      }
    }
  } catch (e) {
    // игнорируем ошибку и пробуем Nominatim
  }

  try {
    // 2. Попытка через OpenStreetMap Nominatim
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ru`;
    const osmRes = await fetch(osmUrl, { signal: AbortSignal.timeout(3500) });
    if (osmRes.ok) {
      const data = await osmRes.json();
      const addr = data.address || {};
      const cityName = addr.city || addr.town || addr.village || addr.municipality || addr.county || data.name;
      if (cityName) {
        return {
          name: cityName,
          country: addr.country,
        };
      }
    }
  } catch (e) {
    // игнорируем
  }

  return { name: 'Моё местоположение' };
}

/**
 * Надежное автоматическое определение города и координат:
 * 1. Проверяет navigator.geolocation с быстрым таймаутом (3.5 сек).
 * 2. Если GPS заблокирован (iframe/запрет пользователя) — сразу использует IP-геолокацию через ipwho.is (на русском).
 * 3. Если клиентский запрос блокируется — запрашивает серверный прокси /api/detect-location.
 * 4. Если всё недоступно — безопасно возвращает дефолтный город без падения.
 */
export async function detectLocationAutomatically(): Promise<{
  location: CityLocation;
  source: 'gps' | 'ip' | 'server' | 'fallback';
}> {
  // 1. Попытка GPS через navigator.geolocation
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(err),
          { timeout: 3500, enableHighAccuracy: false, maximumAge: 60000 }
        );
      });

      const { name, country } = await reverseGeocode(coords.latitude, coords.longitude);
      return {
        location: {
          id: `gps_${Date.now()}`,
          name: name || 'Моё местоположение',
          country: country || '',
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        source: 'gps',
      };
    } catch (gpsErr) {
      console.info('Браузерная геолокация недоступна (iframe/отказ), переходим к IP-геолокации:', gpsErr);
    }
  }

  // 2. Быстрая прямая IP-геолокация (клиентская) с возвратом названия на русском
  try {
    const ipRes = await fetch('https://ipwho.is/?lang=ru', { signal: AbortSignal.timeout(4000) });
    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data && data.success !== false && data.latitude && data.longitude) {
        return {
          location: {
            id: `ip_${Date.now()}`,
            name: data.city || data.region || 'Текущее место',
            country: data.country || '',
            latitude: data.latitude,
            longitude: data.longitude,
          },
          source: 'ip',
        };
      }
    }
  } catch (ipErr) {
    console.warn('Клиентская IP-геолокация недоступна:', ipErr);
  }

  // 3. Серверная IP-геолокация через Express /api/detect-location
  try {
    const srvRes = await fetch('/api/detect-location', { signal: AbortSignal.timeout(4000) });
    if (srvRes.ok) {
      const data = await srvRes.json();
      if (data && data.latitude && data.longitude) {
        return {
          location: data,
          source: 'server',
        };
      }
    }
  } catch (srvErr) {
    console.warn('Серверная геолокация недоступна:', srvErr);
  }

  // 4. Резервный популярный город
  return {
    location: POPULAR_CITIES[0],
    source: 'fallback',
  };
}

