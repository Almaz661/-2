/**
 * Утилиты для безопасной и точной работы с локальными датами и естественным языком.
 * Решает проблему сдвига дат из-за UTC (toISOString), распознает русскоязычные фразы
 * ("5 декабря", "в 9-00", "через 2 недели", "во вторник", "день рождения").
 */

// Месяцы в родительном и именительном падежах
const MONTHS_MAP: Record<string, number> = {
  января: 0, янв: 0, январь: 0,
  февраля: 1, фев: 1, февраль: 1,
  марта: 2, мар: 2, март: 2,
  апреля: 3, апр: 3, апрель: 3,
  мая: 4, май: 4,
  июня: 5, июн: 5, июнь: 5,
  июля: 6, июл: 6, июль: 6,
  августа: 7, авг: 7, август: 7,
  сентября: 8, сен: 8, сент: 8, сентябрь: 8,
  октября: 9, окт: 9, октябрь: 9,
  ноября: 10, ноя: 10, нояб: 10, ноябрь: 10,
  декабря: 11, дек: 11, декабрь: 11,
};

const WEEKDAYS_MAP: Record<string, number> = {
  понедельник: 1, пн: 1,
  вторник: 2, вт: 2,
  среда: 3, среду: 3, ср: 3,
  четверг: 4, чт: 4,
  пятница: 5, пятницу: 5, пт: 5,
  суббота: 6, субботу: 6, сб: 6,
  воскресенье: 0, вс: 0,
};

/**
 * Возвращает строковую дату в формате YYYY-MM-DD строго по МЕСТНОМУ времени пользователя,
 * предотвращая сдвиг на "вчера" из-за UTC-нормализации в ночные часы.
 */
export function getLocalDateString(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Возвращает текущее местное время HH:mm
 */
export function getLocalTimeString(dateInput: Date = new Date()): string {
  const h = String(dateInput.getHours()).padStart(2, '0');
  const m = String(dateInput.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export interface ParsedDateResult {
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  isAllDay: boolean;
  isBirthday: boolean;
  recurrence?: 'yearly' | 'none' | 'daily' | 'weekly' | 'monthly';
  reminderMinutes?: number;
  cleanText: string;
}

/**
 * Распознает дату, время и намерения (день рождения, напоминание) из текста на русском языке.
 * Пример: "напомнить мне 5 декабря день рождения двойняшек в 9-00"
 * -> { date: "2026-12-05", time: "09:00", isBirthday: true, recurrence: "yearly", cleanText: "День рождения двойняшек" }
 */
export function parseNaturalDate(input: string): ParsedDateResult | null {
  if (!input || typeof input !== 'string') return null;
  const original = input.trim();
  const lower = original.toLowerCase();

  const now = new Date();
  const currentYear = now.getFullYear();
  let targetDate: Date | null = null;
  let parsedTime: string | undefined = undefined;
  let isBirthday = false;
  let recurrence: 'yearly' | 'none' = 'none';
  let reminderMinutes = 60; // 1 час по умолчанию

  // 1. Проверка на день рождения
  if (/день\s+рождени[яе]|д\.?р\.?\b/i.test(lower)) {
    isBirthday = true;
    recurrence = 'yearly';
  }

  // 2. Распознавание времени: "в 9-00", "в 09:00", "в 14.30", "в 9 утра", "в 7 вечера", "18:45"
  const timeRegex = /(?:в\s+)?(\d{1,2})(?:[:.-](\d{2}))?\s*(утра|вечера|дня|ночи|ч(?:асов)?)?/i;
  const timeMatch = lower.match(timeRegex);

  // Фильтруем ложные срабатывания, если это просто число месяца ("5 декабря")
  if (timeMatch && !lower.includes(`${timeMatch[1]} ` + Object.keys(MONTHS_MAP).find(m => lower.includes(m)))) {
    let hours = parseInt(timeMatch[1], 10);
    let minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3];

    if (period && period.startsWith('вечер') && hours < 12) hours += 12;
    if (period && period.startsWith('дня') && hours < 12 && hours >= 1) hours += 12;
    if (period && period.startsWith('ночи') && hours === 12) hours = 0;

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      // Проверяем, что перед этим не стоит "через X часов"
      if (!/через\s+\d+\s+ч/i.test(lower)) {
        parsedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }
  }

  // По умолчанию для дней рождения напоминание ставится на 09:00 утра
  if (isBirthday && !parsedTime) {
    parsedTime = '09:00';
  }

  // 3. Распознавание даты:
  // А) Относительные даты: "сегодня", "завтра", "послезавтра"
  if (/(?<![\p{L}\p{N}])сегодня(?![\p{L}\p{N}])/iu.test(lower)) {
    targetDate = new Date(now);
  } else if (/(?<![\p{L}\p{N}])послезавтра(?![\p{L}\p{N}])/iu.test(lower)) {
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 2);
  } else if (/(?<![\p{L}\p{N}])завтра(?![\p{L}\p{N}])/iu.test(lower)) {
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 1);
  }

  // Б) "через N дней / недель / месяцев"
  if (!targetDate) {
    const deltaMatch = lower.match(/через\s+(\d+|одну|один|два|две|три|четыре|пять)\s+(день|дня|дней|недел[юиеь]|месяц[аев]*)/iu);
    if (deltaMatch) {
      let num = 1;
      const word = deltaMatch[1].toLowerCase();
      if (/^\d+$/.test(word)) num = parseInt(word, 10);
      else if (word === 'один' || word === 'одну') num = 1;
      else if (word === 'два' || word === 'две') num = 2;
      else if (word === 'три') num = 3;
      else if (word === 'четыре') num = 4;
      else if (word === 'пять') num = 5;

      const unit = deltaMatch[2].toLowerCase();
      targetDate = new Date(now);
      if (unit.startsWith('недел')) {
        targetDate.setDate(now.getDate() + num * 7);
      } else if (unit.startsWith('месяц')) {
        targetDate.setMonth(now.getMonth() + num);
      } else {
        targetDate.setDate(now.getDate() + num);
      }
    }
  }

  // В) Конкретный день и месяц: "5 декабря", "26-го октября", "10 янв", "1 сентября"
  if (!targetDate) {
    const dayMonthRegex = /(\d{1,2})(?:-?(?:го|е|й))?\s+(январ[яь]|феврал[яь]|март[а]?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|август[а]?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь]|янв|фев|мар|апр|июн|июл|авг|сен|окт|ноя|дек)/iu;
    const match = lower.match(dayMonthRegex);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthKey = Object.keys(MONTHS_MAP).find(k => match[2].toLowerCase().startsWith(k));
      if (monthKey !== undefined) {
        const month = MONTHS_MAP[monthKey];
        // Вычисляем целевой год: если дата уже прошла в этом году (и это не день рождения), переносим на след. год
        let year = currentYear;
        const candidate = new Date(year, month, day);
        if (!isBirthday && candidate.getTime() < now.getTime() - 24 * 3600 * 1000) {
          year += 1;
        }
        targetDate = new Date(year, month, day);
      }
    }
  }

  // Г) День недели: "во вторник", "в эту субботу", "в следующую пятницу"
  if (!targetDate) {
    for (const [weekdayName, targetDayIndex] of Object.entries(WEEKDAYS_MAP)) {
      const regex = new RegExp(`(?:в|во)?\\s*(?:эт[уо]|следующ[уие][юя])?\\s*${weekdayName}(?![\\p{L}\\p{N}])`, 'iu');
      if (regex.test(lower)) {
        const currentDay = now.getDay();
        let diff = (targetDayIndex - currentDay + 7) % 7;
        if (diff === 0 && !lower.includes('сегодня')) diff = 7;
        if (lower.includes('следующ')) diff += 7;

        targetDate = new Date(now);
        targetDate.setDate(now.getDate() + diff);
        break;
      }
    }
  }

  // Д) Просто число месяца: "26-го", "к 15 числу"
  if (!targetDate) {
    const justDayMatch = lower.match(/(?:к|до)?\s*(\d{1,2})-?(?:го|е|му)?\s*(?:числа|числу)?/iu);
    if (justDayMatch && parseInt(justDayMatch[1], 10) >= 1 && parseInt(justDayMatch[1], 10) <= 31) {
      const day = parseInt(justDayMatch[1], 10);
      targetDate = new Date(now.getFullYear(), now.getMonth(), day);
      if (targetDate.getTime() < now.getTime() - 24 * 3600 * 1000) {
        targetDate.setMonth(now.getMonth() + 1);
      }
    }
  }

  if (!targetDate) return null;

  // 4. Очистка названия: удаляем вводные слова "напомни мне", "напомнить", даты и время
  let clean = original
    .replace(/^(пожалуйста[, ]*)?(напомни(ть)?|запиши(те)?|поставь(те)?|создай(те)?)\s*(мне\s*)?/iu, '')
    .replace(/(?:в|во)\s+(?:\d{1,2}(?:[:.-]\d{2})?)\s*(?:утра|вечера|дня|ночи|ч(?:асов)?)?/giu, '')
    .replace(/(?:\d{1,2})(?:-?(?:го|е|й))?\s+(?:январ[яь]|феврал[яь]|март[а]?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|август[а]?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь]|янв|фев|мар|апр|июн|июл|авг|сен|окт|ноя|дек)/giu, '')
    .replace(/(?<![\p{L}\p{N}])(сегодня|завтра|послезавтра|через\s+\S+\s+\S+)(?![\p{L}\p{N}])/giu, '')
    .replace(/(?:в|во)?\s*(?:эт[уо]|следующ[уие][юя])?\s*(?:понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)(?![\p{L}\p{N}])/giu, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-—–:.\s]+|[-—–:.\s]+$/g, '')
    .trim();

  if (!clean) clean = original;
  // Делаем заглавной первую букву
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);

  return {
    date: getLocalDateString(targetDate),
    time: parsedTime,
    isAllDay: !parsedTime || isBirthday,
    isBirthday,
    recurrence,
    reminderMinutes,
    cleanText: clean,
  };
}

/**
 * Проверяет, наступает ли день рождения в ближайшие N дней (с учетом ежегодного повторения)
 */
export function getDaysUntilBirthday(birthdayDateStr: string): { daysLeft: number; turnsAge?: number; nextDate: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const bdate = new Date(birthdayDateStr);
  if (isNaN(bdate.getTime())) return { daysLeft: -1, nextDate: birthdayDateStr };

  const currentYear = now.getFullYear();
  const birthYear = bdate.getFullYear();

  let nextYear = currentYear;
  const thisYearBday = new Date(currentYear, bdate.getMonth(), bdate.getDate());
  if (thisYearBday.getTime() < now.getTime()) {
    nextYear += 1;
  }

  const nextBday = new Date(nextYear, bdate.getMonth(), bdate.getDate());
  const diffMs = nextBday.getTime() - now.getTime();
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const turnsAge = nextYear - birthYear;

  return {
    daysLeft,
    turnsAge: turnsAge > 0 ? turnsAge : undefined,
    nextDate: getLocalDateString(nextBday),
  };
}
