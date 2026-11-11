// Распознавание дат и времени в русском тексте.
// «5 декабря день рождения двойняшек» → дата 5 декабря, весь день, каждый год, название без даты.
// Используется в умном вводе, в окнах «Событие» и «Задача».

import { formatLocalDate } from './dateUtils';

export interface RuDateResult {
  /** Найдена ли дата в тексте */
  hasDate: boolean;
  /** YYYY-MM-DD (если даты нет — сегодня) */
  date: string;
  /** HH:MM, если указано время */
  time?: string;
  /** Текст без даты и времени, с заглавной буквы */
  cleanTitle: string;
  /** День рождения / годовщина / юбилей — повторять ежегодно */
  isBirthday: boolean;
  /** Найденный фрагмент даты, для подсказки */
  datePhrase: string;
  /** Просили напомнить («напомни мне в 10:00») — время напоминания */
  reminderTime?: string;
  /** В тексте есть «напомни» */
  wantsReminder: boolean;
}

// Русские, нидерландские и английские названия месяцев (письма из гемеенте, школы, приглашения)
const MONTHS: [RegExp, number][] = [
  [/^(янв|jan)/, 0], [/^(фев|feb)/, 1], [/^(мар|maa|mar)/, 2], [/^(апр|apr)/, 3], [/^(ма[йя]|mei|may)/, 4], [/^(июн|jun)/, 5],
  [/^(июл|jul)/, 6], [/^(авг|aug)/, 7], [/^(сен|sep)/, 8], [/^(окт|okt|oct)/, 9], [/^(ноя|nov)/, 10], [/^(дек|dec)/, 11],
];
const LATIN_MONTH =
  'januari|january|jan\\.?|februari|february|feb\\.?|maart|march|mrt\\.?|april|apr\\.?|mei|may|juni|june|juli|july|augustus|august|aug\\.?|september|sept?\\.?|oktober|october|okt\\.?|oct\\.?|november|nov\\.?|december|dec\\.?';
const WEEKDAYS: [RegExp, number][] = [
  [/(?:в|во)\s+понедельник|понедельник/, 1], [/во\s+вторник|вторник/, 2], [/в\s+среду|среда/, 3],
  [/в\s+четверг|четверг/, 4], [/в\s+пятницу|пятница/, 5], [/в\s+субботу|суббота/, 6], [/в\s+воскресенье|воскресенье/, 0],
];
const NUM_WORDS: Record<string, number> = { один: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7 };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** «December 5, 2026» — месяц перед числом (английский формат). */
function monthMatchFallback(lower: string): RegExpMatchArray | null {
  const m = lower.match(new RegExp(`(${LATIN_MONTH})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?(?:\\s+(\\d{4}))?`));
  if (!m) return null;
  // Приводим к виду [фраза, день, месяц, год], как у основного шаблона
  const out = [m[0], m[2], m[1], m[3]] as unknown as RegExpMatchArray;
  out.index = m.index;
  return out;
}

export function parseRuDate(text: string, now: Date = new Date()): RuDateResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };
  const fromParts = (day: number, month: number, year?: number) => {
    let y = year ?? today.getFullYear();
    if (y < 100) y += 2000;
    const d = new Date(y, month, day);
    if (year === undefined && d < today) d.setFullYear(y + 1);
    return d.getMonth() === month && d.getDate() === day ? d : null;
  };

  let date = formatLocalDate(today);
  let hasDate = false;
  let datePhrase = '';

  const monthMatch = lower.match(
    new RegExp(String.raw`(\d{1,2})\s+(январ[а-я]*|янв\.?|феврал[а-я]*|фев\.?|март[а-я]*|мар\.?|апрел[а-я]*|апр\.?|ма[йя]|июн[а-я]*|июл[а-я]*|август[а-я]*|авг\.?|сентябр[а-я]*|сен\.?|октябр[а-я]*|окт\.?|ноябр[а-я]*|ноя\.?|декабр[а-я]*|дек\.?|${LATIN_MONTH})(?:\s+(\d{4}))?(?:\s*г(?:ода|\.)?)?`)
  );
  const latinFirst = monthMatchFallback(lower);
  const numericMatch = lower.match(
    /(?<![\d:])(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?![\d:])|(?<![\d:])(\d{1,2})\/(\d{1,2})(?![\d:])/
  );
  const bareDay =
    lower.match(/(?<![\d:.])(\d{1,2})(?:-?го|\s+числа)(?![\d])/) ||
    lower.match(
      /^(\d{1,2})(?=\s+(?!(?:шт|штук|кг|г|гр|грамм|л|литр|пач|уп|бут|раз|мин|минут|час|дн(?!ей\s+рожд)|день(?!\s+рожд)|дня|недел|месяц|янв|фев|мар|апр|ма[йя]|июн|июл|авг|сен|окт|ноя|дек|человек|порц)))/
    );
  const inDays = lower.match(/через\s+(\d+|один|одну|два|две|три|четыре|пять|шесть|семь)?\s*(дн[а-я]*|день|недел[а-я]*|месяц[а-я]*)/);

  const mm = monthMatch || latinFirst;
  if (mm) {
    const monthMatch = mm;
    const mon = MONTHS.find(([re]) => re.test(monthMatch[2]))?.[1];
    const d = mon !== undefined ? fromParts(+monthMatch[1], mon, monthMatch[3] ? +monthMatch[3] : undefined) : null;
    if (d) {
      date = formatLocalDate(d);
      hasDate = true;
      datePhrase = monthMatch[0];
    }
  } else if (numericMatch) {
    const day = +(numericMatch[1] ?? numericMatch[4]);
    const mon = +(numericMatch[2] ?? numericMatch[5]) - 1;
    const d = mon >= 0 && mon < 12 ? fromParts(day, mon, numericMatch[3] ? +numericMatch[3] : undefined) : null;
    if (d) {
      date = formatLocalDate(d);
      hasDate = true;
      datePhrase = numericMatch[0];
    }
  } else if (bareDay) {
    // «26 день рождения…», «26-го», «26 числа» — число этого месяца (если прошло — следующего)
    const day = +bareDay[1];
    let d = new Date(today.getFullYear(), today.getMonth(), day);
    if (d < today || d.getDate() !== day) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
    if (d.getDate() === day) {
      date = formatLocalDate(d);
      hasDate = true;
      datePhrase = bareDay[0].trim();
    }
  } else if (lower.includes('послезавтра')) {
    date = formatLocalDate(addDays(2));
    hasDate = true;
    datePhrase = 'послезавтра';
  } else if (lower.includes('завтра')) {
    date = formatLocalDate(addDays(1));
    hasDate = true;
    datePhrase = 'завтра';
  } else if (/\bсегодня\b/.test(lower)) {
    hasDate = true;
    datePhrase = 'сегодня';
  } else if (inDays) {
    const n = inDays[1] ? (/\d/.test(inDays[1]) ? +inDays[1] : NUM_WORDS[inDays[1]] || 1) : 1;
    const unit = inDays[2];
    date = formatLocalDate(addDays(unit.startsWith('недел') ? n * 7 : unit.startsWith('месяц') ? n * 30 : n));
    hasDate = true;
    datePhrase = inDays[0];
  } else {
    const wd = WEEKDAYS.find(([re]) => re.test(lower));
    if (wd) {
      date = formatLocalDate(addDays((wd[1] - today.getDay() + 7) % 7 || 7));
      hasDate = true;
      datePhrase = (lower.match(wd[0]) || [''])[0];
    }
  }

  // Время ищем в тексте без даты, чтобы «05.12» не стало временем 05:12
  const timeSource = datePhrase ? lower.replace(datePhrase, ' ') : lower;
  const tm =
    // «9:00», «9.00», «в 9-00», «в 9-00т» (лишняя буква-опечатка тоже съедается)
    timeSource.match(/(?<![\d./-])(\d{1,2})[:.](\d{2})(?:[а-яё]{1,2}(?=\s|$|[,.!]))?(?![\d./])/) ||
    timeSource.match(/(?:в|к|на)\s+(\d{1,2})[-\s](\d{2})(?:[а-яё]{1,2}(?=\s|$|[,.!]))?(?![\d./])/) ||
    timeSource.match(/в (\d{1,2})\s*(часов|часа|час|утра|вечера|дня)?(?![\d./])/);
  let time: string | undefined;
  if (tm) {
    const h = parseInt(tm[1], 10);
    if (h <= 23) {
      if ((tm[2] === 'вечера' || tm[2] === 'дня') && h < 12) time = `${String(h + 12).padStart(2, '0')}:00`;
      else if (tm[2] && /^\d{2}$/.test(tm[2])) time = `${String(h).padStart(2, '0')}:${tm[2]}`;
      else time = `${String(h).padStart(2, '0')}:00`;
    }
  }

  let t = trimmed;
  if (datePhrase) t = t.replace(new RegExp(esc(datePhrase), 'i'), ' ');
  if (tm && time) t = t.replace(new RegExp('(?:(?:в|к|на)\\s+)?' + esc(tm[0].replace(/^(?:в|к|на)\s+/, '')), 'i'), ' ');
  // Остатки вокруг вырезанной даты: дни недели и предлоги («op zaterdag … om», «on … at», «uur»)
  if (hasDate || time) {
    t = t
      .replace(/(^|[\s,])(понедельник|вторник|среда|среду|четверг|пятница|пятницу|суббота|субботу|воскресенье|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?=[\s,.]|$)/gi, '$1')
      .replace(/(^|\s)(op|om|on|at|uur|в|во)(?=\s*(?:[,.]|$))/gi, '$1')
      .replace(/(^|\s)(op|om|on|at)(\s+(?:op|om|on|at))+(?=\s|$)/gi, '$1');
    for (let i = 0; i < 2; i++) t = t.replace(/(^|\s)(op|om|on|at|uur)\s*(?=,|$)/gi, '$1').replace(/\s+,/g, ',');
  }
  const wantsReminder = /напомн/.test(lower);
  // «…двойняшек напомни мне поздравить их» → «…двойняшек — поздравить их»
  t = t.replace(/\s*,?\s*напомн(?:ить|ите|и)(?:\s+(?:мне|нам|об этом|про|о|об))?(?![а-яё])\s*/i, ' — ');
  t = t
    .replace(/\s+—\s+—\s+/g, ' — ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.:;—–-]+|[\s,.:;—–-]+$/g, '')
    .trim() || trimmed;
  const cleanTitle = t.charAt(0).toUpperCase() + t.slice(1);

  return {
    hasDate,
    date,
    time,
    cleanTitle,
    isBirthday: /день рожд|\bдр\b|годовщин|юбиле/.test(lower),
    datePhrase,
    wantsReminder,
    reminderTime: wantsReminder ? time : undefined,
  };
}

/** «5 декабря 2026, суббота» — для подсказок. */
export const humanDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
};
