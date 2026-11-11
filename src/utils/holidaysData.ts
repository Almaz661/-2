/**
 * База данных государственных, традиционных и семейных праздников для разных стран мира
 * Включает расчет дат для 2025, 2026 и 2027 годов с поддержкой переходящих праздников (Пасха, Масленица, Курбан и др.)
 */

import { FamilyMember } from '../types';

export interface HolidayItem {
  id: string;
  title: string;
  originalTitle?: string;
  description: string;
  date: string; // YYYY-MM-DD
  category: 'holiday' | 'family';
  holidayType: 'public' | 'family' | 'birthday' | 'anniversary' | 'tradition';
  countryCode?: string;
  emoji: string;
  isOfficialDayOff?: boolean;
  suggestedReminderDays: number[];
}

export interface FamilyHolidayTemplate {
  id: string;
  title: string;
  description: string;
  defaultMonthDay: string; // MM-DD
  emoji: string;
  holidayType: 'family' | 'birthday' | 'anniversary' | 'tradition';
  suggestedReminderDays: number[];
}

/**
 * Расчет православной Пасхи (Meeus/Jones/Butcher алгоритм)
 */
function getOrthodoxEasterDate(year: number): { month: number; day: number } {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  // Конвертация по юлианскому календарю к григорианскому (+13 дней для 1900-2099 гг.)
  const julianDate = new Date(year, month - 1, day);
  julianDate.setDate(julianDate.getDate() + 13);
  return { month: julianDate.getMonth() + 1, day: julianDate.getDate() };
}

/**
 * Расчет католической/западной Пасхи
 */
function getWesternEasterDate(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function formatDateStr(year: number, month: number, day: number): string {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function addDaysToDate(baseDateStr: string, days: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatDateStr(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Получить государственные праздники по коду страны и году
 */
export function getHolidaysForCountry(countryCode: string, year: number): HolidayItem[] {
  const code = (countryCode || 'RU').toUpperCase();
  const holidays: HolidayItem[] = [];

  const defaultReminders = [7, 3, 1, 0];

  // 1. РОССИЯ (RU)
  if (code === 'RU') {
    holidays.push(
      {
        id: `ru-ny-${year}`,
        title: 'Новый год и новогодние каникулы',
        description: 'Официальные всенародные праздничные дни и каникулы',
        date: formatDateStr(year, 1, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'RU',
        emoji: '🎄',
        isOfficialDayOff: true,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `ru-xmas-${year}`,
        title: 'Рождество Христово',
        description: 'Праздник Рождества, официальный выходной день',
        date: formatDateStr(year, 1, 7),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'RU',
        emoji: '✨',
        isOfficialDayOff: true,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `ru-old-ny-${year}`,
        title: 'Старый Новый год',
        description: 'Традиционный праздник в кругу семьи',
        date: formatDateStr(year, 1, 14),
        category: 'holiday',
        holidayType: 'tradition',
        countryCode: 'RU',
        emoji: '❄️',
        isOfficialDayOff: false,
        suggestedReminderDays: [3, 1, 0],
      },
      {
        id: `ru-feb23-${year}`,
        title: 'День защитника Отечества',
        description: 'Официальный праздничный день, поздравления мужчин и защитников',
        date: formatDateStr(year, 2, 23),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'RU',
        emoji: '🎖️',
        isOfficialDayOff: true,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `ru-mar8-${year}`,
        title: 'Международный женский день',
        description: 'Праздник весны, цветов и женственности, официальный выходной',
        date: formatDateStr(year, 3, 8),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'RU',
        emoji: '💐',
        isOfficialDayOff: true,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `ru-space-${year}`,
        title: 'День космонавтики',
        description: 'Первый полет человека в космос (Юрий Гагарин, 1961)',
        date: formatDateStr(year, 4, 12),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'RU',
        emoji: '🚀',
        isOfficialDayOff: false,
        suggestedReminderDays: [1, 0],
      },
      {
        id: `ru-may1-${year}`,
        title: 'Праздник Весны и Труда',
        description: 'Первомайские праздники, открытие дачного сезона',
        date: formatDateStr(year, 5, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'RU',
        emoji: '🌷',
        isOfficialDayOff: true,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `ru-may9-${year}`,
        title: 'День Победы',
        description: 'Всенародный великий праздник Победы, парад и салюты',
        date: formatDateStr(year, 5, 9),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'RU',
        emoji: '⭐',
        isOfficialDayOff: true,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `ru-jun12-${year}`,
        title: 'День России',
        description: 'Государственный праздник Российской Федерации',
        date: formatDateStr(year, 6, 12),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'RU',
        emoji: '🇷🇺',
        isOfficialDayOff: true,
        suggestedReminderDays: [3, 1, 0],
      },
      {
        id: `ru-family-${year}`,
        title: 'День семьи, любви и верности',
        description: 'День Петра и Февронии Муромских, символ ромашки',
        date: formatDateStr(year, 7, 8),
        category: 'family',
        holidayType: 'family',
        countryCode: 'RU',
        emoji: '🌼',
        isOfficialDayOff: false,
        suggestedReminderDays: [3, 1, 0],
      },
      {
        id: `ru-sep1-${year}`,
        title: 'День знаний (1 сентября)',
        description: 'Начало нового учебного года, школьные линейки и цветы учителям',
        date: formatDateStr(year, 9, 1),
        category: 'family',
        holidayType: 'family',
        countryCode: 'RU',
        emoji: '🔔',
        isOfficialDayOff: false,
        suggestedReminderDays: [14, 7, 3, 1, 0],
      },
      {
        id: `ru-teacher-${year}`,
        title: 'День учителя',
        description: 'Поздравление классных руководителей и школьных педагогов',
        date: formatDateStr(year, 10, 5),
        category: 'family',
        holidayType: 'tradition',
        countryCode: 'RU',
        emoji: '📚',
        isOfficialDayOff: false,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `ru-nov4-${year}`,
        title: 'День народного единства',
        description: 'Государственный праздничный выходной день',
        date: formatDateStr(year, 11, 4),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'RU',
        emoji: '🕊️',
        isOfficialDayOff: true,
        suggestedReminderDays: [3, 1, 0],
      },
      {
        id: `ru-mother-${year}`,
        title: 'День матери в России',
        description: 'Последнее воскресенье ноября — теплый день признания мамам',
        date: year === 2025 ? '2025-11-30' : year === 2026 ? '2026-11-29' : '2027-11-28',
        category: 'family',
        holidayType: 'family',
        countryCode: 'RU',
        emoji: '💖',
        isOfficialDayOff: false,
        suggestedReminderDays: [7, 3, 1, 0],
      }
    );

    // Добавляем Пасху для RU
    const orthodoxEaster = getOrthodoxEasterDate(year);
    const easterDateStr = formatDateStr(year, orthodoxEaster.month, orthodoxEaster.day);
    holidays.push({
      id: `ru-easter-${year}`,
      title: 'Светлое Христово Воскресение (Пасха)',
      description: 'Главный христианский праздник, куличи, крашенки и семейная трапеза',
      date: easterDateStr,
      category: 'holiday',
      holidayType: 'tradition',
      countryCode: 'RU',
      emoji: '🥚',
      isOfficialDayOff: false,
      suggestedReminderDays: [7, 3, 1, 0],
    });
  }

  // 2. КИПР (CY)
  else if (code === 'CY') {
    const orthodoxEaster = getOrthodoxEasterDate(year);
    const easterStr = formatDateStr(year, orthodoxEaster.month, orthodoxEaster.day);
    const greenMonday = addDaysToDate(easterStr, -48);
    const goodFriday = addDaysToDate(easterStr, -2);
    const easterMonday = addDaysToDate(easterStr, 1);
    const easterTuesday = addDaysToDate(easterStr, 2);
    const kataklysmos = addDaysToDate(easterStr, 50); // Whit Monday

    holidays.push(
      {
        id: `cy-ny-${year}`,
        title: "Новый год (New Year's Day)",
        originalTitle: "Πρωτοχρονιά",
        description: 'Официальный государственный выходной на Кипре',
        date: formatDateStr(year, 1, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🎉',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-epiphany-${year}`,
        title: 'Богоявление / Крещение (Theophany)',
        originalTitle: 'Θεοφάνεια',
        description: 'Освящение вод, освящение моря крестом, официальный выходной',
        date: formatDateStr(year, 1, 6),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🕊️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-green-mon-${year}`,
        title: 'Зеленый понедельник / Чистый понедельник (Green Monday)',
        originalTitle: 'Καθαρά Δευτέρα',
        description: 'Начало Великого поста, семейные пикники на природе и запуск воздушных змеев',
        date: greenMonday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🪁',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-gr-indep-${year}`,
        title: 'День независимости Греции (Greek Independence Day)',
        originalTitle: 'Εθνική Επέτειος της 25ης Μαρτίου',
        description: 'Национальный праздник, парады и выходной день на Кипре',
        date: formatDateStr(year, 3, 25),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🇬🇷',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-eoka-${year}`,
        title: 'Национальный день Кипра (Cyprus National Day)',
        originalTitle: 'Επέτειος της 1ης Απριλίου (ΕΟΚΑ)',
        description: 'Государственный праздник Республики Кипр',
        date: formatDateStr(year, 4, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🇨🇾',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-good-fri-${year}`,
        title: 'Страстная пятница (Good Friday)',
        originalTitle: 'Μεγάλη Παρασκευή',
        description: 'Официальный церковный и государственный выходной',
        date: goodFriday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🕯️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-easter-${year}`,
        title: 'Пасха на Кипре (Orthodox Easter Sunday)',
        originalTitle: 'Κυριακή του Πάσχα',
        description: 'Главный праздник на Кипре, запеченный барашек Сувла и флаунес',
        date: easterStr,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🥚',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-easter-mon-${year}`,
        title: 'Светлый понедельник (Easter Monday)',
        originalTitle: 'Δευτέρα του Πάσχα',
        description: 'Официальный выходной день после Пасхи',
        date: easterMonday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🌿',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-easter-tue-${year}`,
        title: 'Светлый вторник (Easter Tuesday)',
        originalTitle: 'Τρίτη του Πάσχα',
        description: 'Банковский и школьный выходной на Кипре',
        date: easterTuesday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🌸',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-labour-${year}`,
        title: 'День труда (Labour Day)',
        originalTitle: 'Εργατική Πρωτομαγιά',
        description: 'Первое мая, официальный праздник и отдых',
        date: formatDateStr(year, 5, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🌺',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-kataklysmos-${year}`,
        title: 'Катаклизмос / Духов день (Kataklysmos / Whit Monday)',
        originalTitle: 'Αγίου Πνεύματος (Κατακλυσμός)',
        description: 'Праздник воды, морские фестивали, концерты и выходной день',
        date: kataklysmos,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🌊',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-dormition-${year}`,
        title: 'Успение Богородицы (Assumption of the Virgin Mary)',
        originalTitle: 'Κοίμηση της Θεοτόκου (15 Αυγούστου)',
        description: '«Летняя Пасха» Кипра, большой выходной по всей стране',
        date: formatDateStr(year, 8, 15),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '⛪',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-indep-${year}`,
        title: 'День независимости Кипра (Cyprus Independence Day)',
        originalTitle: 'Ημέρα Ανεξαρτησίας της Κύπρου',
        description: 'Военный парад в Никосии, государственный выходной день',
        date: formatDateStr(year, 10, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🇨🇾',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-ohi-${year}`,
        title: 'День «Охи» (Ohi Day)',
        originalTitle: 'Ημέρα του Όχι',
        description: 'День отказа Греции и Кипра фашистскому ультиматуму 1940 г.',
        date: formatDateStr(year, 10, 28),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🇬🇷',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-xmas-eve-${year}`,
        title: 'Сочельник (Christmas Eve)',
        originalTitle: 'Παραμονή Χριστουγέννων',
        description: 'Подготовка к Рождеству, пение каланд',
        date: formatDateStr(year, 12, 24),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '✨',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-xmas-${year}`,
        title: 'Рождество Христово (Christmas Day)',
        originalTitle: 'Χριστούγεννα',
        description: 'Официальный всенародный праздник',
        date: formatDateStr(year, 12, 25),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🎄',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `cy-boxing-${year}`,
        title: 'Второй день Рождества (Boxing Day)',
        originalTitle: 'Σύναξις της Θεοτόκου',
        description: 'Официальный выходной день',
        date: formatDateStr(year, 12, 26),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'CY',
        emoji: '🎁',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      }
    );
  }

  // 3. ГРЕЦИЯ (GR)
  else if (code === 'GR') {
    const orthodoxEaster = getOrthodoxEasterDate(year);
    const easterStr = formatDateStr(year, orthodoxEaster.month, orthodoxEaster.day);
    const cleanMonday = addDaysToDate(easterStr, -48);
    const goodFriday = addDaysToDate(easterStr, -2);
    const easterMonday = addDaysToDate(easterStr, 1);
    const holySpirit = addDaysToDate(easterStr, 50);

    holidays.push(
      {
        id: `gr-ny-${year}`,
        title: 'Новый год (Πρωτοχρονιά)',
        description: 'Государственный праздник Греции',
        date: formatDateStr(year, 1, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🎉',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-theophany-${year}`,
        title: 'Богоявление (Θεοφάνεια)',
        description: 'Праздник освящения вод и креста',
        date: formatDateStr(year, 1, 6),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🕊️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-clean-mon-${year}`,
        title: 'Чистый понедельник (Καθαρά Δευτέρα)',
        description: 'Начало Великого Поста, запуск воздушных змеев и лагана',
        date: cleanMonday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🪁',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-indep-${year}`,
        title: 'День независимости и Благовещение (25 Μαρτίου)',
        description: 'Главный национальный праздник Греции, парады и бакальярос со скордальей',
        date: formatDateStr(year, 3, 25),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🇬🇷',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-good-fri-${year}`,
        title: 'Страстная пятница (Μεγάλη Παρασκευή)',
        description: 'Траурные церковные процессии эпитафиос',
        date: goodFriday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🕯️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-easter-${year}`,
        title: 'Пасха в Греции (Κυριακή του Πάσχα)',
        description: 'Праздник Воскресения, традиционный вертел и магерица',
        date: easterStr,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🥚',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-easter-mon-${year}`,
        title: 'Светлый понедельник (Δευτέρα του Πάσχα)',
        description: 'Официальный праздничный день',
        date: easterMonday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🌿',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-labour-${year}`,
        title: 'День труда (Εργατική Πρωτομαγιά)',
        description: 'Праздник трудящихся и весенних венков',
        date: formatDateStr(year, 5, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🌺',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-holy-spirit-${year}`,
        title: 'День Святого Духа (Αγίου Πνεύματος)',
        description: 'Официальный церковный и государственный праздник',
        date: holySpirit,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🕊️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-dormition-${year}`,
        title: 'Успение Богородицы (Δεκαπενταύγουστος)',
        description: 'Всегреческий праздник «Пасха лета»',
        date: formatDateStr(year, 8, 15),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '⛪',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-ohi-${year}`,
        title: 'День «Охи» (Επέτειος του «Όχι»)',
        description: 'День национального достоинства Греции',
        date: formatDateStr(year, 10, 28),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🇬🇷',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-xmas-${year}`,
        title: 'Рождество Христово (Χριστούγεννα)',
        description: 'Рождественский праздник',
        date: formatDateStr(year, 12, 25),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '🎄',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `gr-boxing-${year}`,
        title: 'Второй день Рождества (Σύναξις της Θεοτόκου)',
        description: 'Официальный выходной день',
        date: formatDateStr(year, 12, 26),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GR',
        emoji: '✨',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      }
    );
  }

  // 3b. НИДЕРЛАНДЫ (NL)
  else if (code === 'NL') {
    const westernEaster = getWesternEasterDate(year);
    const easterStr = formatDateStr(year, westernEaster.month, westernEaster.day);
    const goodFriday = addDaysToDate(easterStr, -2);
    const easterMonday = addDaysToDate(easterStr, 1);
    const ascensionDay = addDaysToDate(easterStr, 39);
    const whitSunday = addDaysToDate(easterStr, 49);
    const whitMonday = addDaysToDate(easterStr, 50);

    // День Короля: 27 апреля (если вс, то переносится на сб 26 апреля)
    const apr27 = new Date(year, 3, 27);
    const kingsDayStr =
      apr27.getDay() === 0
        ? formatDateStr(year, 4, 26)
        : formatDateStr(year, 4, 27);

    holidays.push(
      {
        id: `nl-ny-${year}`,
        title: 'Новый год (Nieuwjaarsdag)',
        originalTitle: 'Nieuwjaarsdag',
        description: 'Официальный государственный выходной день в Нидерландах',
        date: formatDateStr(year, 1, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '🎉',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `nl-good-fri-${year}`,
        title: 'Страстная пятница (Goede Vrijdag)',
        originalTitle: 'Goede Vrijdag',
        description: 'Праздничный день перед Пасхой, выходной в школах и госучреждениях',
        date: goodFriday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '🕯️',
        isOfficialDayOff: false,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `nl-easter-${year}`,
        title: 'Пасха — 1-й день (Eerste Paasdag)',
        originalTitle: 'Eerste Paasdag',
        description: 'Семейный пасхальный бранч (Paasontbijt) и поиск шоколадных яиц',
        date: easterStr,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '🥚',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `nl-easter-mon-${year}`,
        title: 'Пасхальный понедельник — 2-й день (Tweede Paasdag)',
        originalTitle: 'Tweede Paasdag',
        description: 'Официальный всенародный выходной день в Нидерландах',
        date: easterMonday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '🐰',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `nl-kings-day-${year}`,
        title: 'День Короля (Koningsdag)',
        originalTitle: 'Koningsdag',
        description: 'Главный национальный праздник Нидерландов! Оранжевые гуляния, ярмарки Vrijmarkt и фестивали',
        date: kingsDayStr,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '👑',
        isOfficialDayOff: true,
        suggestedReminderDays: [14, 7, 3, 1, 0],
      },
      {
        id: `nl-remembrance-${year}`,
        title: 'Национальный день поминовения (Dodenherdenking)',
        originalTitle: 'Dodenherdenking',
        description: 'Память погибших во Второй мировой войне, 2 минуты молчания по всей стране в 20:00',
        date: formatDateStr(year, 5, 4),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '🕊️',
        isOfficialDayOff: false,
        suggestedReminderDays: [3, 1, 0],
      },
      {
        id: `nl-liberation-${year}`,
        title: 'День освобождения Нидерландов (Bevrijdingsdag)',
        originalTitle: 'Bevrijdingsdag',
        description: 'Праздник свободы от оккупации 1945 года, музыкальные фестивали по всей стране',
        date: formatDateStr(year, 5, 5),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '🇳🇱',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `nl-ascension-${year}`,
        title: 'Вознесение Господне (Hemelvaartsdag)',
        originalTitle: 'Hemelvaartsdag',
        description: 'Официальный государственный выходной (четверг), длинные выходные и прогулки',
        date: ascensionDay,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '⛪',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `nl-whit-sun-${year}`,
        title: 'Троица / Пятидесятница — 1-й день (Eerste Pinksterdag)',
        originalTitle: 'Eerste Pinksterdag',
        description: 'Праздник Троицы и весенних фестивалей Pinkpop',
        date: whitSunday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '🌸',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `nl-whit-mon-${year}`,
        title: 'Духов день — 2-й день Троицы (Tweede Pinksterdag)',
        originalTitle: 'Tweede Pinksterdag',
        description: 'Официальный государственный выходной понедельник',
        date: whitMonday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '🌿',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `nl-sinterklaas-${year}`,
        title: 'Вечер Синтерклааса / Пакьесавонд (Sinterklaasavond)',
        originalTitle: 'Pakjesavond / Sinterklaas',
        description: 'Главный семейный вечер подарков, шоколадных букв, пепанотов (pepernoten) и стихов-сюрпризов!',
        date: formatDateStr(year, 12, 5),
        category: 'family',
        holidayType: 'family',
        countryCode: 'NL',
        emoji: '🎁',
        isOfficialDayOff: false,
        suggestedReminderDays: [14, 7, 3, 1, 0],
      },
      {
        id: `nl-xmas1-${year}`,
        title: 'Рождество — 1-й день (Eerste Kerstdag)',
        originalTitle: 'Eerste Kerstdag',
        description: 'Официальный праздник, семейное застолье гурмет (gourmetten) и подарки у ёлки',
        date: formatDateStr(year, 12, 25),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '🎄',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `nl-xmas2-${year}`,
        title: 'Рождество — 2-й день (Tweede Kerstdag)',
        originalTitle: 'Tweede Kerstdag',
        description: 'Официальный семейный выходной день в Нидерландах',
        date: formatDateStr(year, 12, 26),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'NL',
        emoji: '✨',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `nl-nye-${year}`,
        title: 'Канун Нового года (Oudejaarsavond)',
        originalTitle: 'Oudejaarsavond',
        description: 'Праздничный вечер, традиционные горячие пончики Олиболлен (Oliebollen) и салюты',
        date: formatDateStr(year, 12, 31),
        category: 'holiday',
        holidayType: 'tradition',
        countryCode: 'NL',
        emoji: '🎆',
        isOfficialDayOff: false,
        suggestedReminderDays: [7, 3, 1, 0],
      }
    );
  }

  // 4. ЕВРОСОЮЗ / ГЕРМАНИЯ (EU)
  else if (code === 'EU' || code === 'DE') {
    const westernEaster = getWesternEasterDate(year);
    const easterStr = formatDateStr(year, westernEaster.month, westernEaster.day);
    const goodFriday = addDaysToDate(easterStr, -2);
    const easterMonday = addDaysToDate(easterStr, 1);
    const ascensionDay = addDaysToDate(easterStr, 39);
    const whitMonday = addDaysToDate(easterStr, 50);

    holidays.push(
      {
        id: `eu-ny-${year}`,
        title: "Новый год (Neujahr / New Year's Day)",
        description: 'Официальный выходной день в странах Европы',
        date: formatDateStr(year, 1, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'EU',
        emoji: '🎉',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `eu-good-fri-${year}`,
        title: 'Страстная пятница (Good Friday / Karfreitag)',
        description: 'Официальный банковский и государственный выходной',
        date: goodFriday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'EU',
        emoji: '🕯️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `eu-easter-mon-${year}`,
        title: 'Пасхальный понедельник (Easter Monday / Ostermontag)',
        description: 'Европейский пасхальный выходной день',
        date: easterMonday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'EU',
        emoji: '🐰',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `eu-labour-${year}`,
        title: 'День труда (Labour Day / Tag der Arbeit)',
        description: 'Первое мая, общеевропейский выходной день',
        date: formatDateStr(year, 5, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'EU',
        emoji: '🌷',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `eu-ascension-${year}`,
        title: 'Вознесение (Ascension Day / Christi Himmelfahrt)',
        description: 'Официальный выходной в Германии, Франции и др. странах ЕС',
        date: ascensionDay,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'EU',
        emoji: '⛪',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `eu-whit-mon-${year}`,
        title: 'Троицкий понедельник (Whit Monday / Pfingstmontag)',
        description: 'Официальный выходной день в ЕС',
        date: whitMonday,
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'EU',
        emoji: '🕊️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `eu-german-unity-${year}`,
        title: 'День немецкого единства (Tag der Deutschen Einheit)',
        description: 'Национальный праздник объединения Германии',
        date: formatDateStr(year, 10, 3),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'EU',
        emoji: '🇩🇪',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `eu-xmas-${year}`,
        title: 'Рождество (Christmas Day / 1. Weihnachtstag)',
        description: 'Главный семейный праздник Европы',
        date: formatDateStr(year, 12, 25),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'EU',
        emoji: '🎄',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `eu-xmas2-${year}`,
        title: 'Второй день Рождества (St. Stephen / 2. Weihnachtstag)',
        description: 'Официальный праздничный день',
        date: formatDateStr(year, 12, 26),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'EU',
        emoji: '🎁',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      }
    );
  }

  // 5. США (US)
  else if (code === 'US') {
    holidays.push(
      {
        id: `us-ny-${year}`,
        title: "New Year's Day",
        description: 'Federal holiday',
        date: formatDateStr(year, 1, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'US',
        emoji: '🎆',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `us-mlk-${year}`,
        title: 'Martin Luther King Jr. Day',
        description: 'Federal holiday (3rd Monday in January)',
        date: year === 2025 ? '2025-01-20' : year === 2026 ? '2026-01-19' : '2027-01-18',
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'US',
        emoji: '🗽',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `us-presidents-${year}`,
        title: "Presidents' Day",
        description: "Washington's Birthday federal holiday (3rd Monday in February)",
        date: year === 2025 ? '2025-02-17' : year === 2026 ? '2026-02-16' : '2027-02-15',
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'US',
        emoji: '🏛️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `us-memorial-${year}`,
        title: 'Memorial Day',
        description: 'Federal holiday honoring military service (last Monday of May)',
        date: year === 2025 ? '2025-05-26' : year === 2026 ? '2026-05-25' : '2027-05-31',
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'US',
        emoji: '🎖️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `us-juneteenth-${year}`,
        title: 'Juneteenth National Independence Day',
        description: 'Federal holiday celebrating freedom',
        date: formatDateStr(year, 6, 19),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'US',
        emoji: '⭐',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `us-indep-${year}`,
        title: 'Independence Day (4th of July)',
        description: 'US National Independence Day, fireworks and parades',
        date: formatDateStr(year, 7, 4),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'US',
        emoji: '🇺🇸',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `us-labor-${year}`,
        title: 'Labor Day',
        description: 'Federal holiday (1st Monday in September)',
        date: year === 2025 ? '2025-09-01' : year === 2026 ? '2026-09-07' : '2027-09-06',
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'US',
        emoji: '🛠️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `us-halloween-${year}`,
        title: 'Halloween',
        description: 'Trick or treat, costumes and pumpkin carvings',
        date: formatDateStr(year, 10, 31),
        category: 'holiday',
        holidayType: 'tradition',
        countryCode: 'US',
        emoji: '🎃',
        isOfficialDayOff: false,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `us-thanksgiving-${year}`,
        title: 'Thanksgiving Day',
        description: 'National Day of Thanks (4th Thursday in November), turkey and family feast',
        date: year === 2025 ? '2025-11-27' : year === 2026 ? '2026-11-26' : '2027-11-25',
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'US',
        emoji: '🦃',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `us-xmas-${year}`,
        title: 'Christmas Day',
        description: 'Federal holiday and family celebration',
        date: formatDateStr(year, 12, 25),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'US',
        emoji: '🎄',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      }
    );
  }

  // 6. ТУРЦИЯ (TR)
  else if (code === 'TR') {
    holidays.push(
      {
        id: `tr-ny-${year}`,
        title: 'Yılbaşı (Новый год)',
        description: 'Официальный праздничный выходной день в Турции',
        date: formatDateStr(year, 1, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'TR',
        emoji: '🎉',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `tr-child-${year}`,
        title: 'Ulusal Egemenlik ve Çocuk Bayramı (День детей)',
        description: 'День национального суверенитета и защиты детей (23 апреля)',
        date: formatDateStr(year, 4, 23),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'TR',
        emoji: '🎈',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `tr-labour-${year}`,
        title: 'Emek ve Dayanışma Günü (День труда)',
        description: 'Праздник труда и солидарности (1 мая)',
        date: formatDateStr(year, 5, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'TR',
        emoji: '🌺',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `tr-ataturk-${year}`,
        title: 'Atatürk’ü Anma, Gençlik ve Spor Bayramı',
        description: 'День памяти Ататюрка, праздник молодежи и спорта (19 мая)',
        date: formatDateStr(year, 5, 19),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'TR',
        emoji: '🏃‍♂️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `tr-democracy-${year}`,
        title: 'Demokrasi ve Milli Birlik Günü (День демократии)',
        description: 'Государственный праздник Турции (15 июля)',
        date: formatDateStr(year, 7, 15),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'TR',
        emoji: '🇹🇷',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `tr-victory-${year}`,
        title: 'Zafer Bayramı (День Победы)',
        description: 'День победы в битве при Думлупынаре (30 августа)',
        date: formatDateStr(year, 8, 30),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'TR',
        emoji: '⭐',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `tr-republic-${year}`,
        title: 'Cumhuriyet Bayramı (День Республики)',
        description: 'Главный национальный праздник Турции — провозглашение республики (29 октября)',
        date: formatDateStr(year, 10, 29),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'TR',
        emoji: '🇹🇷',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      }
    );
  }

  // 7. КАЗАХСТАН (KZ)
  else if (code === 'KZ') {
    holidays.push(
      {
        id: `kz-ny-${year}`,
        title: 'Новый год в Казахстане',
        description: 'Государственные выходные дни (1-2 января)',
        date: formatDateStr(year, 1, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'KZ',
        emoji: '🎄',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `kz-mar8-${year}`,
        title: 'Международный женский день',
        description: 'Государственный праздничный день (8 марта)',
        date: formatDateStr(year, 3, 8),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'KZ',
        emoji: '🌷',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `kz-nauryz-${year}`,
        title: 'Наурыз мейрамы (Наурыз)',
        description: 'Главный весенний праздник обновления и равноденствия (21-23 марта)',
        date: formatDateStr(year, 3, 21),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'KZ',
        emoji: '☀️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `kz-unity-${year}`,
        title: 'Праздник единства народа Казахстана',
        description: 'Государственный праздник дружбы и единства (1 мая)',
        date: formatDateStr(year, 5, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'KZ',
        emoji: '🤝',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `kz-defender-${year}`,
        title: 'День защитника Отечества Казахстана',
        description: 'Государственный праздник Вооруженных Сил РК (7 мая)',
        date: formatDateStr(year, 5, 7),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'KZ',
        emoji: '🎖️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `kz-victory-${year}`,
        title: 'День Победы',
        description: 'Великий всенародный праздник (9 мая)',
        date: formatDateStr(year, 5, 9),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'KZ',
        emoji: '⭐',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `kz-capital-${year}`,
        title: 'День Столицы',
        description: 'Государственный праздник Казахстана (6 июля)',
        date: formatDateStr(year, 7, 6),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'KZ',
        emoji: '🏙️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `kz-constitution-${year}`,
        title: 'День Конституции Республики Казахстан',
        description: 'Государственный праздник (30 августа)',
        date: formatDateStr(year, 8, 30),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'KZ',
        emoji: '📜',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `kz-republic-${year}`,
        title: 'День Республики',
        description: 'Национальный праздник Республики Казахстан (25 октября)',
        date: formatDateStr(year, 10, 25),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'KZ',
        emoji: '🇰🇿',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `kz-indep-${year}`,
        title: 'День Независимости Казахстана',
        description: 'Государственный праздник (16 декабря)',
        date: formatDateStr(year, 12, 16),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'KZ',
        emoji: '🦅',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      }
    );
  }

  // 8. ГРУЗИЯ (GE)
  else if (code === 'GE') {
    holidays.push(
      {
        id: `ge-ny-${year}`,
        title: 'Новый год в Грузии (ახალი წელი)',
        description: 'Государственные праздники (1-2 января)',
        date: formatDateStr(year, 1, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GE',
        emoji: '🎉',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `ge-xmas-${year}`,
        title: 'Рождество Христово (ქრისტეშობა)',
        description: 'Праздник Рождества и шествие Алило (7 января)',
        date: formatDateStr(year, 1, 7),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GE',
        emoji: '✨',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `ge-epiphany-${year}`,
        title: 'Крещение Господне (ნათლისღება)',
        description: 'Официальный праздничный день (19 января)',
        date: formatDateStr(year, 1, 19),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GE',
        emoji: '🕊️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `ge-mother-${year}`,
        title: 'День матери в Грузии (დედის დღე)',
        description: 'Официальный праздничный день (3 марта)',
        date: formatDateStr(year, 3, 3),
        category: 'family',
        holidayType: 'family',
        countryCode: 'GE',
        emoji: '💖',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `ge-indep-${year}`,
        title: 'День независимости Грузии (დამოუკიდებლობის დღე)',
        description: 'Главный государственный праздник Сакартвело (26 мая)',
        date: formatDateStr(year, 5, 26),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GE',
        emoji: '🇬🇪',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `ge-mariamoba-${year}`,
        title: 'Мариамоба — Успение Богородицы (მარიამობა)',
        description: 'Большой всенародный праздник (28 августа)',
        date: formatDateStr(year, 8, 28),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GE',
        emoji: '⛪',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `ge-svetitskhovloba-${year}`,
        title: 'Светицховлоба / Мцхетоба (სვეტიცხოვლობა)',
        description: 'Праздник Животворящего Столпа в древней Мцхете (14 октября)',
        date: formatDateStr(year, 10, 14),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GE',
        emoji: '🍇',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `ge-giorgoba-${year}`,
        title: 'Гиоргоба — День Святого Георгия (გიორგობა)',
        description: 'День небесного покровителя Грузии (23 ноября)',
        date: formatDateStr(year, 11, 23),
        category: 'holiday',
        holidayType: 'public',
        countryCode: 'GE',
        emoji: '⚔️',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      }
    );
  }

  // 9. ВСЕ ДРУГИЕ СТРАНЫ И УНИВЕРСАЛЬНЫЙ НАБОР (DEFAULT / OTHER)
  else {
    holidays.push(
      {
        id: `intl-ny-${year}`,
        title: 'Новый год (New Year’s Day)',
        description: 'Всемирный праздник встречи Нового года',
        date: formatDateStr(year, 1, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: code,
        emoji: '🎄',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `intl-xmas-jan-${year}`,
        title: 'Рождество Христово',
        description: 'Рождественские празднования и семейный ужин',
        date: formatDateStr(year, 1, 7),
        category: 'holiday',
        holidayType: 'public',
        countryCode: code,
        emoji: '✨',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `intl-mar8-${year}`,
        title: 'Международный женский день (8 Марта)',
        description: 'Всемирный день чествования женщин, цветы и подарки',
        date: formatDateStr(year, 3, 8),
        category: 'holiday',
        holidayType: 'public',
        countryCode: code,
        emoji: '💐',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `intl-earth-${year}`,
        title: 'Международный день Земли',
        description: 'Всемирный день заботы о природе и доме',
        date: formatDateStr(year, 4, 22),
        category: 'holiday',
        holidayType: 'tradition',
        countryCode: code,
        emoji: '🌍',
        isOfficialDayOff: false,
        suggestedReminderDays: [3, 1, 0],
      },
      {
        id: `intl-labour-${year}`,
        title: 'Международный день труда (1 Мая)',
        description: 'Праздник весны и труда',
        date: formatDateStr(year, 5, 1),
        category: 'holiday',
        holidayType: 'public',
        countryCode: code,
        emoji: '🌷',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      },
      {
        id: `intl-family-${year}`,
        title: 'Международный день семей (ООН)',
        description: 'День ценности и тепла домашнего очага (15 мая)',
        date: formatDateStr(year, 5, 15),
        category: 'family',
        holidayType: 'family',
        countryCode: code,
        emoji: '👨‍👩‍👧‍👦',
        isOfficialDayOff: false,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `intl-children-${year}`,
        title: 'Международный день защиты детей',
        description: 'Первый день лета, подарки и радость детям (1 июня)',
        date: formatDateStr(year, 6, 1),
        category: 'family',
        holidayType: 'family',
        countryCode: code,
        emoji: '🧸',
        isOfficialDayOff: false,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `intl-knowledge-${year}`,
        title: 'День знаний (1 сентября)',
        description: 'Начало школьного учебного года',
        date: formatDateStr(year, 9, 1),
        category: 'family',
        holidayType: 'family',
        countryCode: code,
        emoji: '🔔',
        isOfficialDayOff: false,
        suggestedReminderDays: [14, 7, 3, 1, 0],
      },
      {
        id: `intl-halloween-${year}`,
        title: 'Хэллоуин (Halloween)',
        description: 'Канун Дня всех святых, сладости и тыквы (31 октября)',
        date: formatDateStr(year, 10, 31),
        category: 'holiday',
        holidayType: 'tradition',
        countryCode: code,
        emoji: '🎃',
        isOfficialDayOff: false,
        suggestedReminderDays: [7, 3, 1, 0],
      },
      {
        id: `intl-xmas-dec-${year}`,
        title: 'Рождество (Christmas 25 декабря)',
        description: 'Рождественские праздники и подарки',
        date: formatDateStr(year, 12, 25),
        category: 'holiday',
        holidayType: 'public',
        countryCode: code,
        emoji: '🎄',
        isOfficialDayOff: true,
        suggestedReminderDays: defaultReminders,
      }
    );
  }

  return holidays;
}

/**
 * Заготовки семейных праздников и дат на основе состава семьи
 */
export function getFamilyHolidayPresets(
  members: FamilyMember[],
  year: number
): HolidayItem[] {
  const list: HolidayItem[] = [];

  // 1. Дни рождения каждого члена семьи
  members.forEach((member) => {
    // Если дата дня рождения не задана, по умолчанию ставим примерное распределение
    const month = (parseInt(member.id.replace(/\D/g, '') || '3', 10) % 12) + 1;
    const day = (parseInt(member.id.replace(/\D/g, '') || '15', 10) % 25) + 1;
    const dateStr = formatDateStr(year, month, day);

    list.push({
      id: `birthday-${member.id}-${year}`,
      title: `🎂 День рождения: ${member.name}`,
      description: `День рождения (${member.role || 'Член семьи'}). Подготовить подарок, торт и поздравления!`,
      date: dateStr,
      category: 'family',
      holidayType: 'birthday',
      emoji: '🎂',
      isOfficialDayOff: false,
      suggestedReminderDays: [14, 7, 3, 1, 0],
    });
  });

  // 2. Годовщина свадьбы / союза
  list.push({
    id: `family-anniversary-${year}`,
    title: '💍 Годовщина семьи / свадьбы',
    description: 'Памятный день нашей семьи. Забронировать столик или романтический вечер',
    date: formatDateStr(year, 6, 18),
    category: 'family',
    holidayType: 'anniversary',
    emoji: '💍',
    isOfficialDayOff: false,
    suggestedReminderDays: [14, 7, 3, 1, 0],
  });

  // 3. День матери
  list.push({
    id: `family-mothers-day-${year}`,
    title: '💖 День матери',
    description: 'Порадовать маму цветами, вниманием и теплыми словами благодарности',
    date: year === 2025 ? '2025-11-30' : year === 2026 ? '2026-11-29' : '2027-11-28',
    category: 'family',
    holidayType: 'family',
    emoji: '💐',
    isOfficialDayOff: false,
    suggestedReminderDays: [7, 3, 1, 0],
  });

  // 4. День отца
  list.push({
    id: `family-fathers-day-${year}`,
    title: '👔 День отца',
    description: 'Поздравить папу с Днем отца и провести время вместе',
    date: year === 2025 ? '2025-10-19' : year === 2026 ? '2026-10-18' : '2027-10-17',
    category: 'family',
    holidayType: 'family',
    emoji: '👔',
    isOfficialDayOff: false,
    suggestedReminderDays: [7, 3, 1, 0],
  });

  // 5. День знаний (1 сентября)
  list.push({
    id: `family-school-sep1-${year}`,
    title: '🔔 1 Сентября — День знаний',
    description: 'Школьная линейка, букет цветов учителям, праздничный десерт',
    date: formatDateStr(year, 9, 1),
    category: 'family',
    holidayType: 'family',
    emoji: '🎒',
    isOfficialDayOff: false,
    suggestedReminderDays: [14, 7, 3, 1, 0],
  });

  // 6. Семейная новогодняя фотосессия
  list.push({
    id: `family-photo-session-${year}`,
    title: '📸 Семейная новогодняя фотосессия',
    description: 'Традиционная ежегодная фотосессия у елки в уютных свитерах',
    date: formatDateStr(year, 12, 12),
    category: 'family',
    holidayType: 'tradition',
    emoji: '📷',
    isOfficialDayOff: false,
    suggestedReminderDays: [14, 7, 3, 0],
  });

  // 7. День рождения домашнего любимца
  list.push({
    id: `family-pet-birthday-${year}`,
    title: '🐾 День рождения питомца',
    description: 'Порадовать четвероногого любимца новой игрушкой и лакомством',
    date: formatDateStr(year, 4, 15),
    category: 'family',
    holidayType: 'family',
    emoji: '🐾',
    isOfficialDayOff: false,
    suggestedReminderDays: [3, 1, 0],
  });

  return list;
}
