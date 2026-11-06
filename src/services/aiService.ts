import { FamilyMember, ParsedAIResponse } from '../types';
import { getLocalDateString, parseNaturalDate } from '../utils/dateUtils';
import { parseShoppingInput } from '../utils/shoppingParser';

/**
 * Автономный интеллектуальный парсер на правилах.
 * Работает 100% оффлайн без интернета.
 * Точно распознает сложные фразы:
 * - «напомнить мне 5 декабря день рождения двойняшек в 9-00» -> строго календарь с ежегодным повтором в 9:00, без дубликата-задачи!
 * - «Помыть окна 10 января» -> строго задача на 10 января, без дубликата в календаре!
 * - «Купить Нурофен (Ибупрофен, 100 мг) и яблоки 2 кг» -> 2 товара без разрыва названия в скобках.
 * - «Показания холодной воды 145» -> ЖКХ.
 */
export function parseWithRuleEngine(text: string, members: FamilyMember[] = []): ParsedAIResponse {
  const trimmed = (text || '').trim();
  const lower = trimmed.toLowerCase();
  const actions: ParsedAIResponse['actions'] = [];

  const todayStr = getLocalDateString();
  const parsedDate = parseNaturalDate(trimmed);

  // Определение члена семьи
  const matchedMember = members.find((m) => m?.name && lower.includes(m.name.toLowerCase()));
  const memberId = matchedMember ? matchedMember.id : null;

  // Базовые параметры даты и времени
  const targetDate = parsedDate ? parsedDate.date : todayStr;
  const targetTime = parsedDate?.time || '12:00';

  // ==================== 1. ПОКУПКИ ====================
  const isShoppingIntent =
    lower.includes('список покупок') ||
    lower.includes('списке покупок') ||
    lower.includes('в покупки') ||
    lower.includes('в покупках') ||
    lower.includes('купить') ||
    lower.includes('докупить') ||
    lower.includes('взять в магазине') ||
    /^купи\b/i.test(trimmed) ||
    /^докупи\b/i.test(trimmed);

  if (isShoppingIntent) {
    let cleanPayload = trimmed
      .replace(
        /^(пожалуйста[, ]*)?(добавь(те)?|запиши(те)?|внеси(те)?|положи(те)?|скинь(те)?)\s+(в\s+)?(список\s+покупок|списке\s+покупок|покупки|покупках)\s*[:—–-]?\s*/i,
        ''
      )
      .replace(/^(в\s+)?(список\s+покупок|покупки)\s*[:—–-]?\s*/i, '')
      .replace(/^(купить|докупить|взять\s+в\s+магазине|купи|докупи)\s*[:—–-]?\s*/i, '')
      .replace(/^[-—–:.\s]+/, '')
      .trim();

    const items = parseShoppingInput(cleanPayload);
    items.forEach((item) => {
      actions.push({
        type: 'shopping',
        title: item.title,
        details: `Категория: ${item.category}, в список «Супермаркет»`,
        data: {
          listId: 'list-supermarket',
          title: item.title,
          category: item.category,
          quantity: item.quantity || '1 шт.',
          completed: false,
          addedBy: memberId,
        },
      });
    });

    if (actions.length > 0) {
      return {
        summary: `Распознано товаров для покупки: ${actions.length}`,
        actions,
      };
    }
  }

  // ==================== 2. СЧЁТЧИКИ ЖКХ ====================
  const isUtilityIntent =
    /показани[яе]|сч[её]тчик|сдать\s+показания|холодн[аяую]+ вод|горяч[аяую]+ вод|электричеств|киловатт/i.test(
      lower
    );

  if (isUtilityIntent) {
    const valueMatch = trimmed.match(/(\d+(?:[.,]\d+)?)/);
    const value = valueMatch ? parseFloat(valueMatch[1].replace(',', '.')) : undefined;

    let meterType = 'cold_water';
    let meterTitle = 'Холодная вода';
    if (/горяч/i.test(lower)) {
      meterType = 'hot_water';
      meterTitle = 'Горячая вода';
    } else if (/электр|свет|квт/i.test(lower)) {
      meterType = 'electricity';
      meterTitle = 'Электроэнергия';
    } else if (/газ/i.test(lower)) {
      meterType = 'gas';
      meterTitle = 'Газ';
    }

    actions.push({
      type: 'task',
      title: `Передать показания: ${meterTitle}${value !== undefined ? ` (${value})` : ''}`,
      details: `ЖКХ: ${meterTitle}, значение: ${value ?? 'уточнить'}, срок: ${targetDate}`,
      data: {
        title: `Внести показания: ${meterTitle}${value !== undefined ? ` (${value})` : ''}`,
        zone: 'Весь дом',
        assigneeId: memberId,
        isRotation: false,
        recurrence: 'monthly',
        dueDate: targetDate,
        dueTime: targetTime,
        priority: 'high',
        completed: false,
        points: 10,
      },
    });

    return {
      summary: `Распознано показание счетчика: ${meterTitle}`,
      actions,
    };
  }

  // ==================== 3. ДЕНЬ РОЖДЕНИЯ ИЛИ ПРАЗДНИК ====================
  // Имеет наивысший приоритет над задачами, исключая создание задач-дублей
  if (parsedDate?.isBirthday || /день\s+рождени[яе]|д\.?р\.?\b|юбилей|годовщин/i.test(lower)) {
    const cleanEventTitle = parsedDate?.cleanText || trimmed;
    actions.push({
      type: 'calendar',
      title: cleanEventTitle,
      details: `Дата: ${targetDate}, ежегодно, напоминание в 09:00`,
      data: {
        title: cleanEventTitle,
        date: targetDate,
        startTime: parsedDate?.time || '09:00',
        endTime: '10:00',
        allDay: true,
        category: 'family',
        memberIds: memberId ? [memberId] : members.map((m) => m?.id || '1'),
        reminderMinutes: 60 * 24 * 7, // за 7 дней
        recurrence: 'yearly',
      },
    });

    return {
      summary: `Запланирован день рождения: ${cleanEventTitle} (${targetDate}, ежегодно)`,
      actions,
    };
  }

  // ==================== 4. БЫТОВАЯ ЗАДАЧА ====================
  // Если во фразе есть глагол действия по дому: "помыть", "убрать", "починить", "полить", "протереть"
  const isTaskVerb =
    lower.includes('помыть') ||
    lower.includes('убрать') ||
    lower.includes('починить') ||
    lower.includes('заменить') ||
    lower.includes('полить') ||
    lower.includes('протереть') ||
    lower.includes('пропылесосить') ||
    lower.includes('постирать') ||
    lower.includes('погладить') ||
    lower.includes('вынести мусор') ||
    lower.includes('задача') ||
    (lower.includes('напомни') && !lower.includes('встреч') && !lower.includes('врач') && !lower.includes('секци'));

  if (isTaskVerb) {
    let zone = 'Весь дом';
    if (/посуд|кухн|холодильник|плит|духовк/i.test(lower)) zone = 'Кухня';
    else if (/ванн|душ|стирк|санузел|туалет/i.test(lower)) zone = 'Ванная';
    else if (/машин|авто|колес|шиномонтаж/i.test(lower)) zone = 'Авто';
    else if (/детск|игрушк/i.test(lower)) zone = 'Детская';
    else if (/цвет|раст|гостин|диван/i.test(lower)) zone = 'Гостиная';
    else if (/окн|окна|балкон/i.test(lower)) zone = 'Весь дом';

    const cleanTaskTitle = parsedDate?.cleanText || trimmed;
    actions.push({
      type: 'task',
      title: cleanTaskTitle,
      details: `Зона: ${zone}, Исполнитель: ${matchedMember?.name || 'Любой'}, Срок: ${targetDate}`,
      data: {
        title: cleanTaskTitle,
        zone,
        assigneeId: memberId,
        isRotation: false,
        recurrence: 'none',
        dueDate: targetDate,
        dueTime: targetTime,
        priority: lower.includes('срочно') ? 'high' : 'medium',
        completed: false,
        points: 15,
      },
    });

    return {
      summary: `Создана задача: ${cleanTaskTitle} на ${targetDate}`,
      actions,
    };
  }

  // ==================== 5. КАЛЕНДАРНОЕ СОБЫТИЕ ====================
  // Встреча, врач, секция, тренировка, собрание, концерт, поездка
  const isCalendarIntent =
    lower.includes('встреч') ||
    lower.includes('врач') ||
    lower.includes('педиатр') ||
    lower.includes('секци') ||
    lower.includes('тренировк') ||
    lower.includes('собрани') ||
    lower.includes('приём') ||
    lower.includes('рейс') ||
    lower.includes('поезд') ||
    lower.includes('билет') ||
    lower.includes('гост') ||
    Boolean(parsedDate);

  if (isCalendarIntent) {
    let cat = 'family';
    if (/врач|педиатр|больниц|поликлиник|стоматолог|анализ/i.test(lower)) cat = 'health';
    else if (/школ|секци|детск|тренировк|урок|кружок/i.test(lower)) cat = 'kids';
    else if (/мастер|сантехник|электрик|уборк|доставк/i.test(lower)) cat = 'home';
    else if (/совещани|рабоч|митинг|звонок|клиент/i.test(lower)) cat = 'work';

    const cleanTitle = parsedDate?.cleanText || trimmed;
    actions.push({
      type: 'calendar',
      title: cleanTitle,
      details: `Дата: ${targetDate}, время: ${targetTime}, категория: ${cat}`,
      data: {
        title: cleanTitle,
        date: targetDate,
        startTime: targetTime,
        endTime: `${parseInt(targetTime.split(':')[0], 10) + 1}:00`,
        allDay: parsedDate?.isAllDay ?? false,
        category: cat,
        memberIds: memberId ? [memberId] : members.map((m) => m?.id || '1'),
        reminderMinutes: parsedDate?.reminderMinutes || 60,
      },
    });

    return {
      summary: `Создано событие в календаре: ${cleanTitle} на ${targetDate}`,
      actions,
    };
  }

  // ==================== 6. ДЕФОЛТ: БЫТОВОЕ ПОРУЧЕНИЕ ====================
  actions.push({
    type: 'task',
    title: trimmed,
    details: `Создано как поручение на ${targetDate}`,
    data: {
      title: trimmed,
      zone: 'Весь дом',
      assigneeId: memberId,
      isRotation: false,
      recurrence: 'none',
      dueDate: targetDate,
      dueTime: targetTime,
      priority: 'medium',
      completed: false,
      points: 10,
    },
  });

  return {
    summary: `Распознано: ${trimmed}`,
    actions,
  };
}

/**
 * Запрос к серверному endpoint Gemini API с плавным переключением на локальный Rule Engine
 */
export async function parseWithGemini(
  text: string,
  members: FamilyMember[],
  imageBase64?: string
): Promise<ParsedAIResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    // Передаем клиентом МЕСТНУЮ дату пользователя, чтобы сервер не рассчитывал "сегодня" по Гринвичу
    const clientLocalDate = getLocalDateString();

    const response = await fetch('/api/ai/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        members,
        imageBase64,
        clientLocalDate,
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
    console.warn('Серверный Gemini API недоступен или таймаут, применяем локальный Rule Engine:', err);
  }

  // Автономный надёжный разбор без падений
  return parseWithRuleEngine(text, members);
}
