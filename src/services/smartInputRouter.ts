import { parseRuDate } from '../utils/ruDate';
import { formatLocalDate } from '../utils/dateUtils';
import {
  ParsedAIResponse,
  ParsedEntityAction,
  MedicineCategory,
  MedicineForm,
  MedicineItem,
  DocumentCategory,
  ContactCategory,
} from '../types';

/**
 * Извлечение целевой даты из русского текста (например "5 декабря", "05.12", "завтра", "в пятницу", "15 января 2027")
 */
export function extractRussianTargetDate(text: string, refDate: Date = new Date()): string | null {
  // Единый разборщик дат (utils/ruDate): местное время, месяцы, «26-го», «через N дней», дни недели
  const r = parseRuDate(text, refDate);
  return r.hasDate ? r.date : null;
}

/**
 * Определение ключевых слов аптечки и медикаментов
 */
export function detectApothecaryKeyword(text: string): string | null {
  const lower = text.toLowerCase();

  // 1. Прямые упоминания домашней аптечки (включая опечатки и склонения: аптечка, аптечку, аптечке, аптечек, аптека)
  if (/аптеч[а-я]*/i.test(lower)) return 'аптечка';
  if (/аптек[а-я]*/i.test(lower)) return 'аптека';

  // 2. Общие термины медикаментов
  if (/лекарств[а-я]*/i.test(lower)) return 'лекарства';
  if (/медикамент[а-я]*/i.test(lower)) return 'медикаменты';
  if (/препарат[а-я]*/i.test(lower)) return 'препараты';

  // 3. Популярные препараты и фармакология
  if (/парацетамол[а-я]*/i.test(lower)) return 'парацетамол';
  if (/ибупрофен[а-я]*/i.test(lower)) return 'ибупрофен';
  if (/нурофен[а-я]*/i.test(lower)) return 'нурофен';
  if (/аспирин[а-я]*/i.test(lower)) return 'аспирин';
  if (/анальгин[а-я]*/i.test(lower)) return 'анальгин';
  if (/цитрамон[а-я]*/i.test(lower)) return 'цитрамон';
  if (/дротаверин[а-я]*|но-шп[а-я]*/i.test(lower)) return 'но-шпа';
  if (/смект[а-я]*|энтеросгель|полисорб/i.test(lower)) return 'сорбенты';
  if (/супрастин[а-я]*|зодак|зиртек|цетрин|лоратадин/i.test(lower)) return 'от аллергии';
  if (/називин|снуп|тизин|оксиметазолин/i.test(lower)) return 'капли в нос';
  if (/хлоргексидин|мирамистин|перекись|йод\b|зеленк[а-я]*/i.test(lower)) return 'антисептик';
  if (/бинт[а-я]*|лейкопластыр[а-я]*|пластыр[а-я]*/i.test(lower)) return 'перевязка';
  if (/градусник|термометр/i.test(lower)) return 'градусник';

  return null;
}

/**
 * Определение ключевых слов документов
 */
export function detectDocumentKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  if (/паспорт|загранпаспорт/i.test(lower)) return 'паспорт';
  if (/снилс/i.test(lower)) return 'снилс';
  if (/инн/i.test(lower)) return 'инн';
  if (/полис\s+омс|медполис|полис/i.test(lower)) return 'полис';
  if (/страховк[а-я]*|осаго|каско/i.test(lower)) return 'страховка';
  if (/водительск[а-я]*\s+прав[а-я]*|права/i.test(lower)) return 'права';
  if (/свидетельств[а-я]*\s+о\s+рождени/i.test(lower)) return 'свидетельство';
  if (/договор[а-я]*|выписк[а-я]*/i.test(lower)) return 'договор';
  if (/гарантийн[а-я]*\s+талон/i.test(lower)) return 'гарантия';
  return null;
}

/**
 * Определение ключевых слов контактов и служб
 */
export function detectContactKeyword(text: string): string | null {
  const lower = text.toLowerCase();
  if (/сантехник[а-я]*/i.test(lower)) return 'сантехник';
  if (/электрик[а-я]*/i.test(lower)) return 'электрик';
  if (/мастер[а-я]*\s+по|слесар[а-я]*/i.test(lower)) return 'мастер';
  if (/педиатр[а-я]*|терапевт[а-я]*|стоматолог[а-я]*/i.test(lower) && /телефон|номер|\+?\d/i.test(lower)) {
    return 'врач';
  }
  if (/клининг|уборщиц[а-я]*/i.test(lower) && /телефон|номер|\+?\d/i.test(lower)) return 'клининг';
  if (/ветеринар[а-я]*/i.test(lower) && /телефон|номер|\+?\d/i.test(lower)) return 'ветеринар';
  return null;
}

/**
 * Построение сущности лекарства из произвольного текста
 */
export function buildMedicineItemFromText(rawText: string): Omit<MedicineItem, 'id'> {
  let clean = rawText
    .replace(
      /^(пожалуйста[, ]*)?(добавь(те)?|запиши(те)?|внеси(те)?|положи(те)?|сохрани(те)?|занеси(те)?|купи(ть)?|докупи(ть)?)\s+(в\s+)?(?:домашн[а-я]*\s+)?(?:аптеч[а-я]*|аптек[а-я]*)\s*[:—–-]?\s*/i,
      ''
    )
    .replace(/^(в\s+)?(?:домашн[а-я]*\s+)?(?:аптеч[а-я]*|аптек[а-я]*)\s*[:—–-]?\s*/i, '')
    .replace(/\s+(в\s+)?(?:домашн[а-я]*\s+)?(?:аптеч[а-я]*|аптек[а-я]*)$/i, '')
    .replace(/^[-—–:.\s]+/, '')
    .trim();

  // 1. Выделение количества (например 2 уп, 1 шт, 10 таб)
  let quantity = '1 уп.';
  const qtyMatch = clean.match(
    /(\d+(?:[.,]\d+)?\s*(?:уп(?:аков[а-я]*)?|пач[а-я]*|шт(?:ук[а-я]*)?|фл(?:акон[а-я]*)?|таб(?:л(?:ет[а-я]*)?)?|капс(?:ул[а-я]*)?|амп(?:ул[а-я]*)?|тюб(?:ик[а-я]*)?|саше|бут(?:ыл[а-я]*)?|мл|г|грамм[а-я]*))/i
  );
  if (qtyMatch) {
    quantity = qtyMatch[1];
    clean = clean.replace(qtyMatch[0], ' ').trim();
  }

  // 2. Выделение дозировки (например 500 мг, 100 мл, 5%)
  let dosage: string | undefined = undefined;
  const dosageMatch = clean.match(/(\d+(?:[.,]\d+)?\s*(?:мг|mg|мл|ml|мкг|mcg|г|g|МЕ|ME|%))/i);
  if (dosageMatch) {
    dosage = dosageMatch[1];
    clean = clean.replace(dosageMatch[0], ' ').trim();
  }

  const lower = rawText.toLowerCase();

  // 3. Определение категории
  let category: MedicineCategory = 'other';
  if (/парацетамол|ибупрофен|нурофен|панадол|эффералган|жар|температур/i.test(lower)) {
    category = 'fever';
  } else if (/анальгин|аспирин|цитрамон|но-шпа|дротаверин|спазмалгон|пенталгин|кетонал|найз|боль|обезбол/i.test(lower)) {
    category = 'painkiller';
  } else if (/простуд|грипп|нос|називин|снуп|тизин|оксиметазолин|кашл|ацц|лазолван|амбробене|горл|стрепсилс|граммидин|тантум|септолете|ринза|терафлю|колдрекс/i.test(lower)) {
    category = 'cold';
  } else if (/аллерг|супрастин|цетрин|зодак|зиртек|лоратадин|тавегил|фенистил|эриус|кларитин/i.test(lower)) {
    category = 'allergy';
  } else if (/живот|желудок|жкт|смекта|энтеросгель|полисорб|уголь|мезим|панкреатин|фестал|креон|омепразол|омез|лоперамид|имодиум|фосфалюгель|ренни/i.test(lower)) {
    category = 'digestive';
  } else if (/перекис|йод|зеленк|хлоргексидин|мирамистин|бинт|пластыр|вата|септик|антисептик|банеоцин|левомеколь/i.test(lower)) {
    category = 'antiseptic';
  } else if (/витамин|бад|омега|магний|кальций|цинк|d3|д3|супрадин|витрум/i.test(lower)) {
    category = 'vitamins';
  } else if (/давлен|сердц|давления|валидол|корвалол|каптоприл|эналаприл|бисопролол/i.test(lower)) {
    category = 'chronic';
  }

  // 4. Определение формы выпуска
  let form: MedicineForm = 'pills';
  if (/сироп|суспенз|микстур/i.test(lower)) {
    form = 'syrup';
  } else if (/капл/i.test(lower)) {
    form = 'drops';
  } else if (/спрей|аэрозол/i.test(lower)) {
    form = 'spray';
  } else if (/мазь|крем|гель/i.test(lower)) {
    form = 'ointment';
  } else if (/порошок|саше/i.test(lower)) {
    form = 'powder';
  } else if (/бинт|пластыр|повязк|салфетк|лейкопластыр/i.test(lower)) {
    form = 'bandage';
  } else if (/градусник|термометр/i.test(lower)) {
    form = 'other';
  }

  clean = clean.replace(/\s+/g, ' ').trim();
  if (!clean) clean = rawText;
  let finalTitle = clean.charAt(0).toUpperCase() + clean.slice(1);
  finalTitle = finalTitle
    .replace(/парацетамола/i, 'Парацетамол')
    .replace(/ибупрофена/i, 'Ибупрофен')
    .replace(/нурофена/i, 'Нурофен')
    .replace(/аспирина/i, 'Аспирин')
    .replace(/цитрамона/i, 'Цитрамон')
    .replace(/анальгина/i, 'Анальгин')
    .replace(/дротаверина/i, 'Дротаверин');

  const defaultExp = new Date();
  defaultExp.setFullYear(defaultExp.getFullYear() + 2);

  return {
    name: finalTitle,
    category,
    form,
    quantity,
    dosage,
    location: 'Домашняя аптечка',
    forWhom: lower.includes('детск') ? 'Дети' : 'Вся семья',
    expiryDate: formatLocalDate(defaultExp),
    notes: '',
  };
}

const CATEGORY_RU: Record<MedicineCategory, string> = {
  painkiller: 'Обезболивающие',
  fever: 'Жаропонижающие',
  cold: 'От простуды и гриппа',
  allergy: 'От аллергии',
  digestive: 'ЖКТ и пищеварение',
  antiseptic: 'Антисептики и перевязка',
  vitamins: 'Витамины и БАДы',
  chronic: 'Постоянный приём',
  other: 'Другое',
};

const FORM_RU: Record<MedicineForm, string> = {
  pills: 'Таблетки',
  syrup: 'Сироп',
  drops: 'Капли',
  spray: 'Спрей',
  ointment: 'Мазь/крем',
  powder: 'Порошок',
  bandage: 'Перевязка',
  other: 'Средство',
};

/**
 * Строгая автоматическая маршрутизация умного ввода:
 * Гарантирует, что сущности с ключевыми словами (аптечка, документы, контакты, покупки)
 * никогда не попадут в общий список задач по ошибке ИИ или по умолчанию.
 */
export function applyStrictKeywordRouting(
  response: ParsedAIResponse,
  rawInput: string
): ParsedAIResponse {
  if (!response || !Array.isArray(response.actions)) {
    return response;
  }

  const rawKeyword = detectApothecaryKeyword(rawInput);
  let reroutedCount = 0;

  const routedActions: ParsedEntityAction[] = response.actions.map((act) => {
    const actText = `${act.title || ''} ${act.details || ''} ${act.data?.title || ''} ${act.data?.name || ''}`;
    const actionApothecaryKey = detectApothecaryKeyword(actText) || rawKeyword;

    // 1. СТРОГИЙ МАРШРУТ В АПТЕЧКУ:
    // Если упомянута аптечка/лекарство, а действие было ошибочно помечено как задача (task) или покупка (shopping)
    if (actionApothecaryKey && (act.type === 'task' || act.type === 'shopping')) {
      const sourceText = act.data?.title || act.title || rawInput;
      const medicineData = buildMedicineItemFromText(sourceText);

      // Сохраняем имя из данных, если модель уже успела его распознать
      if (act.data?.name && typeof act.data.name === 'string' && act.data.name.length > 2) {
        medicineData.name = act.data.name;
      }
      if (act.data?.dosage) medicineData.dosage = act.data.dosage;
      if (act.data?.quantity) medicineData.quantity = act.data.quantity;
      if (act.data?.category && act.data.category in CATEGORY_RU) {
        medicineData.category = act.data.category;
      }
      if (act.data?.form && act.data.form in FORM_RU) {
        medicineData.form = act.data.form;
      }

      reroutedCount++;
      return {
        type: 'medicine',
        originalType: act.type,
        routedByKeyword: actionApothecaryKey,
        title: medicineData.name + (medicineData.dosage ? ` ${medicineData.dosage}` : ''),
        details: `Категория: ${CATEGORY_RU[medicineData.category]}, форма: ${FORM_RU[medicineData.form]}, кол-во: ${medicineData.quantity}, в Аптечку`,
        data: medicineData,
      };
    }

    // 2. СТРОГИЙ МАРШРУТ В ДОКУМЕНТЫ:
    const docKey = detectDocumentKeyword(actText) || detectDocumentKeyword(rawInput);
    if (docKey && act.type === 'task') {
      const title = act.title || act.data?.title || rawInput;
      let cat: DocumentCategory = 'personal';
      if (/полис|мед|страховк/i.test(title)) cat = 'insurance';
      else if (/авто|права|птс|стс/i.test(title)) cat = 'auto';
      else if (/гарант/i.test(title)) cat = 'warranties';

      reroutedCount++;
      return {
        type: 'doc',
        originalType: 'task',
        routedByKeyword: docKey,
        title,
        details: `Категория: ${cat}, маршрутизировано по слову «${docKey}»`,
        data: {
          title,
          category: cat,
          notes: 'Добавлено через умный ввод',
        },
      };
    }

    // 3. СТРОГИЙ МАРШРУТ В КОНТАКТЫ МАСТЕРОВ:
    const contactKey = detectContactKeyword(actText) || detectContactKeyword(rawInput);
    if (contactKey && act.type === 'task') {
      const phoneMatch = (rawInput + ' ' + actText).match(/(\+?\d[\d\s-]{7,}\d)/);
      const title = act.title || act.data?.title || `Мастер (${contactKey})`;
      let cat: ContactCategory = 'other';
      if (contactKey === 'сантехник') cat = 'plumber';
      else if (contactKey === 'электрик') cat = 'electrician';
      else if (contactKey === 'врач') cat = 'doctor';
      else if (contactKey === 'клининг') cat = 'cleaning';
      else if (contactKey === 'ветеринар') cat = 'vet';

      reroutedCount++;
      return {
        type: 'contact',
        originalType: 'task',
        routedByKeyword: contactKey,
        title,
        details: `Специальность: ${contactKey}, телефон: ${phoneMatch ? phoneMatch[0] : 'не указан'}`,
        data: {
          name: title,
          specialty: contactKey.charAt(0).toUpperCase() + contactKey.slice(1),
          category: cat,
          phone: phoneMatch ? phoneMatch[0] : '',
          notes: 'Сохранено из голосовой заметки',
        },
      };
    }

    // 4. СТРОГИЙ МАРШРУТ В КАЛЕНДАРЬ И ПРОВЕРКА ДАТЫ:
    const targetDateFromInput = extractRussianTargetDate(rawInput) || extractRussianTargetDate(act.title);
    const isBirthday =
      /день\s+рождени[яе]|день\s+варенья|\bдр\b|юбилей/i.test(actText) ||
      /день\s+рождени[яе]|день\s+варенья|\bдр\b|юбилей/i.test(rawInput);
    const isCalendarEventKeyword =
      isBirthday ||
      /встреч[а-я]*|приём\s+у|вебинар|собрани[а-я]*|концерт|годовщин[а-я]*/i.test(actText) ||
      /встреч[а-я]*|приём\s+у|вебинар|собрани[а-я]*|концерт|годовщин[а-я]*/i.test(rawInput);

    if (
      act.type === 'calendar' ||
      ((targetDateFromInput || isCalendarEventKeyword) &&
        act.type === 'task' &&
        !actionApothecaryKey)
    ) {
      const finalDate =
        targetDateFromInput || act.data?.date || formatLocalDate(new Date());
      const origTitle = act.data?.title || act.title || rawInput;

      let cleanTitle = origTitle;
      if (isBirthday) {
        cleanTitle = cleanTitle
          .replace(
            /(?:на\s+|с\s+)?\d{1,2}(?:-?[а-я]{1,3})?\s+(?:январ[а-я]*|феврал[а-я]*|март[а-я]*|апрел[а-я]*|ма[яйе][а-я]*|июн[а-я]*|июл[а-я]*|август[а-я]*|сентябр[а-я]*|октябр[а-я]*|ноябр[а-я]*|декабр[а-я]*)(?:\s+\d{4})?/gi,
            ''
          )
          .replace(/^[-—–:.\s]+|[-—–:.\s]+$/g, '')
          .trim();
        if (
          !cleanTitle ||
          cleanTitle.toLowerCase() === 'день рождение' ||
          cleanTitle.toLowerCase() === 'день рождения'
        ) {
          cleanTitle = 'День рождения';
        }
        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
        cleanTitle = cleanTitle.replace(/день\s+рождение/i, 'День рождения');
      }

      const eventData = {
        title: cleanTitle,
        date: finalDate,
        startTime: isBirthday ? '00:00' : (act.data?.startTime || '12:00'),
        endTime: isBirthday ? '23:59' : (act.data?.endTime || '13:00'),
        allDay: isBirthday || act.data?.allDay || false,
        category: isBirthday ? 'family' : (act.data?.category || 'family'),
        memberIds: act.data?.memberIds || [],
        reminderMinutes: isBirthday ? 1440 : (act.data?.reminderMinutes || 60),
        isHoliday: isBirthday || act.data?.isHoliday || false,
        holidayType: isBirthday ? 'birthday' : act.data?.holidayType,
        recurringYearly: isBirthday || act.data?.recurringYearly || false,
        reminderDaysBefore: isBirthday ? [7, 3, 1, 0] : undefined,
      };

      if (act.type !== 'calendar' || act.data?.date !== finalDate) {
        reroutedCount++;
      }

      return {
        type: 'calendar',
        originalType: act.type === 'calendar' ? undefined : act.type,
        routedByKeyword: isBirthday ? 'день рождения' : (targetDateFromInput ? 'дата' : 'календарь'),
        title: cleanTitle,
        details: `Дата: ${finalDate}, ${isBirthday ? 'весь день, День рождения' : (eventData.allDay ? 'весь день' : eventData.startTime)}`,
        data: eventData,
      };
    }

    return act;
  });

  let summary = response.summary;
  if (reroutedCount > 0) {
    summary = `${response.summary} (применена автоматическая маршрутизация в профильный сервис: ${reroutedCount} поз.)`;
  }

  return {
    summary,
    actions: routedActions,
  };
}
