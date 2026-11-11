import { FamilyMember, ParsedAIResponse } from '../types';
import { parseRuDate } from '../utils/ruDate';
import { formatLocalDate } from '../utils/dateUtils';

// Резервный и автономный интеллектуальный парсер на правилах
export function parseWithRuleEngine(text: string, members: FamilyMember[]): ParsedAIResponse {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const actions: ParsedAIResponse['actions'] = [];

  // Дата, время и название без них — общий разборщик (utils/ruDate): местное время,
  // «5 декабря», «26-го», «через 2 недели», «в 9-00», «напомнить мне…»
  const parsedDate = parseRuDate(trimmed);
  const todayStr = formatLocalDate(new Date());
  const extractedDate = parsedDate.hasDate && parsedDate.datePhrase !== 'сегодня' ? parsedDate.date : null;
  const targetDate = parsedDate.date || todayStr;
  const timeMatch = parsedDate.time ? [parsedDate.time] : null;
  const parsedTime = parsedDate.time || '12:00';

  // Поиск упоминания члена семьи
  const matchedMember = members.find((m) => lower.includes(m.name.toLowerCase()));
  const memberId = matchedMember ? matchedMember.id : null;

  // 1. Аптечка и медикаменты (запиши в аптечку, парацетамол, лекарства)
  const isMedicineIntent =
    lower.includes('аптечк') ||
    lower.includes('аптека') ||
    /^(пожалуйста[, ]*)?(добавь(те)?|запиши(те)?|внеси(те)?|положи(те)?|сохрани(те)?|купи(ть)?)\s+.*(лекарств|таблетк|парацетамол|ибупрофен|нурофен|бинт|пластыр|капли|спрей)/i.test(
      trimmed
    );

  if (isMedicineIntent) {
    let cleanPayload = trimmed
      .replace(
        /^(пожалуйста[, ]*)?(добавь(те)?|запиши(те)?|внеси(те)?|положи(те)?|сохрани(те)?|занеси(те)?|купи(ть)?|докупи(ть)?)\s+(в\s+)?(?:домашн[а-я]*\s+)?(?:аптеч[а-я]*|аптек[а-я]*)\s*[:—–-]?\s*/i,
        ''
      )
      .replace(/^(в\s+)?(?:домашн[а-я]*\s+)?(?:аптеч[а-я]*|аптек[а-я]*)\s*[:—–-]?\s*/i, '')
      .replace(/^[-—–:.\s]+/, '')
      .trim();

    cleanPayload = cleanPayload.replace(/\s+(в\s+)?(?:домашн[а-я]*\s+)?(?:аптеч[а-я]*|аптек[а-я]*)$/i, '').trim();

    const rawItems = cleanPayload
      .split(/[,;\n\r]+|\s+(?:и|да|а\s+также)\s+/i)
      .map((s) => s.replace(/^[-—–:.\s]+|[-—–:.\s]+$/g, '').trim())
      .filter(Boolean);

    const defaultExpDate = new Date();
    defaultExpDate.setFullYear(defaultExpDate.getFullYear() + 2);
    const defaultExpiry = formatLocalDate(defaultExpDate);

    rawItems.forEach((itemText) => {
      const itemLower = itemText.toLowerCase();

      let quantity = '1 уп.';
      let cleanItem = itemText;
      const qtyMatch = cleanItem.match(
        /(\d+(?:[.,]\d+)?\s*(?:уп(?:аков[а-я]*)?|пач[а-я]*|шт(?:ук[а-я]*)?|фл(?:акон[а-я]*)?|таб(?:л(?:ет[а-я]*)?)?|капс(?:ул[а-я]*)?|амп(?:ул[а-я]*)?|тюб(?:ик[а-я]*)?|саше|бут(?:ыл[а-я]*)?|мл|г|грамм[а-я]*))/i
      );
      if (qtyMatch) {
        quantity = qtyMatch[1];
        cleanItem = cleanItem.replace(qtyMatch[0], ' ').trim();
      }

      let dosage: string | undefined = undefined;
      const dosageMatch = cleanItem.match(/(\d+(?:[.,]\d+)?\s*(?:мг|mg|мл|ml|мкг|mcg|г|g|МЕ|ME|%))/i);
      if (dosageMatch) {
        dosage = dosageMatch[1];
        cleanItem = cleanItem.replace(dosageMatch[0], ' ').trim();
      }

      let category: any = 'other';
      let categoryRu = 'Другое';
      if (/парацетамол|ибупрофен|нурофен|панадол|эффералган|жар|температур/i.test(itemLower)) {
        category = 'fever';
        categoryRu = 'Жаропонижающие';
      } else if (/анальгин|аспирин|цитрамон|но-шпа|дротаверин|спазмалгон|пенталгин|кетонал|найз|боль|обезбол/i.test(itemLower)) {
        category = 'painkiller';
        categoryRu = 'Обезболивающие';
      } else if (/простуд|грипп|нос|називин|снуп|тизин|оксиметазолин|кашл|ацц|лазолван|амбробене|горл|стрепсилс|граммидин|тантум|септолете|ринза|терафлю|колдрекс/i.test(itemLower)) {
        category = 'cold';
        categoryRu = 'От простуды и гриппа';
      } else if (/аллерг|супрастин|цетрин|зодак|зиртек|лоратадин|тавегил|фенистил|эриус|кларитин/i.test(itemLower)) {
        category = 'allergy';
        categoryRu = 'От аллергии';
      } else if (/живот|желудок|жкт|смекта|энтеросгель|полисорб|уголь|мезим|панкреатин|фестал|креон|омепразол|омез|лоперамид|имодиум|фосфалюгель|ренни/i.test(itemLower)) {
        category = 'digestive';
        categoryRu = 'ЖКТ и пищеварение';
      } else if (/перекис|йод|зеленк|хлоргексидин|мирамистин|бинт|пластыр|вата|септик|антисептик|банеоцин|левомеколь/i.test(itemLower)) {
        category = 'antiseptic';
        categoryRu = 'Антисептики и перевязка';
      } else if (/витамин|бад|омега|магний|кальций|цинк|d3|д3|супрадин|витрум/i.test(itemLower)) {
        category = 'vitamins';
        categoryRu = 'Витамины и БАДы';
      } else if (/давлен|сердц|давления|валидол|корвалол|каптоприл|эналаприл|бисопролол/i.test(itemLower)) {
        category = 'chronic';
        categoryRu = 'Постоянный приём';
      }

      let form: any = 'pills';
      let formRu = 'Таблетки';
      if (/сироп|суспенз|микстур/i.test(itemLower)) {
        form = 'syrup';
        formRu = 'Сироп';
      } else if (/капл/i.test(itemLower)) {
        form = 'drops';
        formRu = 'Капли';
      } else if (/спрей|аэрозол/i.test(itemLower)) {
        form = 'spray';
        formRu = 'Спрей';
      } else if (/мазь|крем|гель/i.test(itemLower)) {
        form = 'ointment';
        formRu = 'Мазь/крем';
      } else if (/порошок|саше/i.test(itemLower)) {
        form = 'powder';
        formRu = 'Порошок';
      } else if (/бинт|пластыр|повязк|салфетк|лейкопластыр/i.test(itemLower)) {
        form = 'bandage';
        formRu = 'Перевязка';
      }

      cleanItem = cleanItem.replace(/\s+/g, ' ').trim();
      if (!cleanItem) cleanItem = itemText;
      let finalTitle = cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1);
      finalTitle = finalTitle
        .replace(/парацетамола/i, 'Парацетамол')
        .replace(/ибупрофена/i, 'Ибупрофен')
        .replace(/нурофена/i, 'Нурофен')
        .replace(/аспирина/i, 'Аспирин')
        .replace(/цитрамона/i, 'Цитрамон')
        .replace(/анальгина/i, 'Анальгин')
        .replace(/дротаверина/i, 'Дротаверин');

      actions.push({
        type: 'medicine',
        title: finalTitle + (dosage ? ` ${dosage}` : ''),
        details: `Категория: ${categoryRu}, форма: ${formRu}, кол-во: ${quantity}, в Аптечку`,
        data: {
          name: finalTitle,
          category,
          form,
          quantity,
          dosage,
          location: 'Домашняя аптечка',
          forWhom: itemLower.includes('детск') ? 'Дети' : 'Вся семья',
          expiryDate: defaultExpiry,
          notes: '',
        },
      });
    });
  }

  // 2. Покупки (список покупок, в покупки, купить, докупить, пачка, кг, литр)
  const isShoppingIntent =
    !isMedicineIntent &&
    (lower.includes('список покупок') ||
      lower.includes('списке покупок') ||
      lower.includes('в покупки') ||
      lower.includes('в покупках') ||
      lower.includes('купить') ||
      lower.includes('докупить') ||
      lower.includes('взять в магазине') ||
      /^купи\b/i.test(trimmed) ||
      /^докупи\b/i.test(trimmed));

  if (isShoppingIntent) {
    // Очищаем вводные командные фразы: "Добавь в список покупок — соль", "Запиши в покупки: молоко"
    let cleanPayload = trimmed
      .replace(
        /^(пожалуйста[, ]*)?(добавь(те)?|запиши(те)?|внеси(те)?|положи(те)?|скинь(те)?)\s+(в\s+)?(список\s+покупок|списке\s+покупок|покупки|покупках)\s*[:—–-]?\s*/i,
        ''
      )
      .replace(/^(в\s+)?(список\s+покупок|покупки)\s*[:—–-]?\s*/i, '')
      .replace(/^(купить|докупить|взять\s+в\s+магазине|купи|докупи)\s*[:—–-]?\s*/i, '')
      .replace(/^[-—–:.\s]+/, '')
      .trim();

    // Разделяем элементы списка ТОЛЬКО по запятым, точкам с запятой, переводам строк или союзу "и" как отдельному слову
    const rawItems = cleanPayload
      .split(/[,;\n\r]+|\s+(?:и|да|а\s+также)\s+/i)
      .map((s) => s.replace(/^[-—–:.\s]+|[-—–:.\s]+$/g, '').trim())
      .filter(Boolean);

    rawItems.forEach((itemText) => {
      let category: any = 'other';
      const itemLower = itemText.toLowerCase();

      // Определение категории товара
      if (
        /яблок|банан|огур|помидор|картоф|морков|зелен|салат|фрукт|овощ|ягод|лимон|апельсин|чеснок|лук|перец болгар/i.test(
          itemLower
        )
      ) {
        category = 'produce';
      } else if (
        /молок|сыр|творог|сметан|масло слив|йогурт|кефир|сливк|ряженк|яйц/i.test(
          itemLower
        )
      ) {
        category = 'dairy';
      } else if (
        /мяс|куриц|индейк|рыб|лосос|форел|фарш|говядин|свинин|колбас|сосиск|ветчин/i.test(
          itemLower
        )
      ) {
        category = 'meat';
      } else if (/хлеб|багет|булоч|лаваш|круассан|батон|пирог/i.test(itemLower)) {
        category = 'bakery';
      } else if (
        /макарон|рис|гречк|мук|масло оливк|масло подсолнеч|сахар|сол[ьия]|кофе|чай|овсянк|круп|соус|кетчуп|специ/i.test(
          itemLower
        )
      ) {
        category = 'pantry';
      } else if (
        /таблетк|порошок|мыл|бумаг|салфетк|шампун|губк|фольг|пакет|паста зубн/i.test(
          itemLower
        )
      ) {
        category = 'household';
      } else if (
        /витамин|пластыр|капли|спрей|лекарств|нурофен|бинт|аспирин/i.test(
          itemLower
        )
      ) {
        category = 'pharmacy';
      } else if (/вод[аы]|сок|морс|лимонад|комбуч|квас/i.test(itemLower)) {
        category = 'drinks';
      }

      // Выделение количества (например, "2 пачки", "1 кг", "3 шт")
      let quantity = '1 шт.';
      let finalTitle = itemText;
      const qtyMatch = itemText.match(
        /(\d+(?:[.,]\d+)?\s*(?:пачк[аиу]?|кг|килограмм[а-я]*|г|грамм[а-я]*|л|литр[а-я]*|шт|штук[а-я]*|бутылк[а-я]*|уп|упаковк[а-я]*))/i
      );
      if (qtyMatch) {
        quantity = qtyMatch[1];
        finalTitle = itemText.replace(qtyMatch[0], '').trim();
      }

      if (!finalTitle) finalTitle = itemText;
      const capitalizedTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);

      actions.push({
        type: 'shopping',
        title: capitalizedTitle,
        details: `Категория: ${category}, в список «Супермаркет»`,
        data: {
          listId: 'list-supermarket',
          title: capitalizedTitle,
          category,
          quantity,
          completed: false,
          addedBy: memberId,
        },
      });
    });
  }

  // 3. Событие календаря (встреча, приём, секция, школа, врач, собрание, др, день рождения, поезд, рейс)
  // Проверяем только если это не была чисто команда покупок или лекарств
  const isBirthday = /день\s+рождени[яе]|день\s+варенья|\bдр\b|юбилей/i.test(lower);
  const isCalendarIntent =
    !isMedicineIntent &&
    !isShoppingIntent &&
    (isBirthday ||
      (Boolean(extractedDate) && !/помыть|убрать|починить|заменить|полить|протереть|сдать показания|пропылесос|постира|погладить/.test(lower)) ||
      lower.includes('встреч') ||
      lower.includes('врач') ||
      lower.includes('педиатр') ||
      lower.includes('секци') ||
      lower.includes('тренировк') ||
      lower.includes('собрани') ||
      lower.includes('приём') ||
      lower.includes('гост') ||
      (timeMatch && !isShoppingIntent && !/помыть|убрать|починить|заменить|полить|протереть|сдать показания|пропылесос|постира|погладить/.test(lower)));

  if (isCalendarIntent) {
    let cat: any = 'family';
    if (lower.includes('врач') || lower.includes('педиатр') || lower.includes('больниц')) cat = 'health';
    else if (lower.includes('школ') || lower.includes('секци') || lower.includes('детск') || lower.includes('тренировк')) cat = 'kids';
    else if (lower.includes('мастер') || lower.includes('сантехник') || lower.includes('уборк')) cat = 'home';

    let cleanTitle = parsedDate.hasDate || parsedDate.time ? parsedDate.cleanTitle : text;
    if (isBirthday) {
      cleanTitle = cleanTitle
        .replace(
          /(?:на\s+|с\s+)?\d{1,2}(?:-?[а-я]{1,3})?\s+(?:январ[а-я]*|феврал[а-я]*|март[а-я]*|апрел[а-я]*|ма[яйе][а-я]*|июн[а-я]*|июл[а-я]*|август[а-я]*|сентябр[а-я]*|октябр[а-я]*|ноябр[а-я]*|декабр[а-я]*)(?:\s+\d{4})?/gi,
          ''
        )
        .replace(/^[-—–:.\s]+|[-—–:.\s]+$/g, '')
        .trim();
      if (!cleanTitle || cleanTitle.toLowerCase() === 'день рождение' || cleanTitle.toLowerCase() === 'день рождения') {
        cleanTitle = 'День рождения';
      }
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
      cleanTitle = cleanTitle.replace(/день\s+рождение/i, 'День рождения');
    }

    actions.push({
      type: 'calendar',
      title: cleanTitle.length > 50 ? cleanTitle.substring(0, 47) + '...' : cleanTitle,
      details: `Дата: ${targetDate}, ${isBirthday ? 'весь день, День рождения' : (timeMatch ? `время: ${parsedTime}` : 'весь день')}, категория: ${cat}`,
      data: {
        title: cleanTitle,
        date: targetDate,
        startTime: isBirthday ? '00:00' : parsedTime,
        endTime: isBirthday ? '23:59' : `${parseInt(parsedTime.split(':')[0], 10) + 1}:00`,
        allDay: isBirthday || !timeMatch,
        category: cat,
        memberIds: memberId ? [memberId] : members.map((m) => m.id),
        reminderMinutes: isBirthday ? 1440 : 60,
        isHoliday: isBirthday,
        holidayType: isBirthday ? 'birthday' : undefined,
        recurringYearly: isBirthday,
        reminderDaysBefore: isBirthday ? [7, 3, 1, 0] : undefined,
        reminderTime: isBirthday ? parsedDate.reminderTime || '09:00' : undefined,
      },
    });
  }

  // 4. Бытовая задача (помыть, убрать, пропылесосить, заменить, проверить, полить, починить)
  const isTaskIntent =
    !isMedicineIntent &&
    !isShoppingIntent &&
    !isBirthday &&
    (lower.includes('помыть') ||
      lower.includes('убрать') ||
      lower.includes('починить') ||
      lower.includes('заменить') ||
      lower.includes('полить') ||
      lower.includes('протереть') ||
      lower.includes('сдать показания') ||
      lower.includes('напомни') ||
      lower.includes('задача'));

  if (isTaskIntent) {
    const tt = parsedDate.hasDate || parsedDate.time ? parsedDate.cleanTitle : trimmed;
    const taskTitle = tt.length > 50 ? tt.substring(0, 47) + '...' : tt;
    let zone: any = 'Весь дом';
    if (lower.includes('посуд') || lower.includes('кухн') || lower.includes('холодильник') || lower.includes('плит')) zone = 'Кухня';
    else if (lower.includes('ванн') || lower.includes('душ') || lower.includes('стирк')) zone = 'Ванная';
    else if (lower.includes('машин') || lower.includes('авто') || lower.includes('колес')) zone = 'Авто';
    else if (lower.includes('детск') || lower.includes('игрушк')) zone = 'Детская';
    else if (lower.includes('цвет') || lower.includes('раст')) zone = 'Гостиная';

    actions.push({
      type: 'task',
      title: taskTitle,
      details: `Зона: ${zone}, Исполнитель: ${matchedMember?.name || 'Любой'}, Срок: ${targetDate}`,
      data: {
        title: taskTitle,
        zone,
        assigneeId: memberId,
        isRotation: false,
        recurrence: 'none',
        dueDate: targetDate,
        dueTime: timeMatch ? parsedTime : undefined,
        priority: lower.includes('срочно') ? 'high' : 'medium',
        completed: false,
        points: 15,
      },
    });
  }

  // Если ничего не подошло конкретно, оформляем как задачу по умолчанию
  if (actions.length === 0) {
    actions.push({
      type: 'task',
      title: text,
      details: `Создано как бытовое поручение на ${targetDate}`,
      data: {
        title: text,
        zone: 'Весь дом',
        assigneeId: memberId,
        isRotation: false,
        recurrence: 'none',
        dueDate: targetDate,
        priority: 'medium',
        completed: false,
        points: 10,
      },
    });
  }

  return {
    summary: `Распознано действий: ${actions.length}. Готово к сохранению в соответствующие разделы.`,
    actions,
  };
}

// Запрос к серверному endpoint Gemini API с плавным fallback
export async function parseWithGemini(
  text: string,
  members: FamilyMember[],
  imageBase64?: string
): Promise<ParsedAIResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('/api/ai/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        members,
        imageBase64,
        today: formatLocalDate(new Date()),
        clientLocalDate: formatLocalDate(new Date()),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.actions) && data.actions.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend Gemini API call error or timeout, applying rule engine fallback:', err);
  }

  // Автономный надёжный разбор без падений
  return parseWithRuleEngine(text, members);
}
