import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Автономный эвристический парсер для сервера без внешних импортов
function parseWithRuleEngine(text: string, members: any[] = []) {
  const trimmed = (text || '').trim();
  const lower = trimmed.toLowerCase();
  const actions: any[] = [];

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const matchedMember = members.find((m) => m?.name && lower.includes(m.name.toLowerCase()));
  const memberId = matchedMember ? matchedMember.id : null;

  let targetDate = todayStr;
  if (lower.includes('завтра')) {
    targetDate = tomorrowStr;
  } else if (lower.includes('послезавтра')) {
    const dayAfter = new Date();
    dayAfter.setDate(today.getDate() + 2);
    targetDate = dayAfter.toISOString().split('T')[0];
  }

  const timeMatch = text.match(/(\d{1,2})[:.](\d{2})/) || text.match(/в (\d{1,2})\s*(часов|часа|утра|вечера)?/);
  let parsedTime = '12:00';
  if (timeMatch) {
    if (timeMatch[2] === 'вечера' && parseInt(timeMatch[1], 10) < 12) {
      parsedTime = `${parseInt(timeMatch[1], 10) + 12}:00`;
    } else if (timeMatch[2] && timeMatch[2].length === 2) {
      parsedTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    } else {
      parsedTime = `${timeMatch[1].padStart(2, '0')}:00`;
    }
  }

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

    const rawItems = cleanPayload
      .split(/[,;\n\r]+|\s+(?:и|да|а\s+также)\s+/i)
      .map((s) => s.replace(/^[-—–:.\s]+|[-—–:.\s]+$/g, '').trim())
      .filter(Boolean);

    rawItems.forEach((itemText) => {
      let category: any = 'other';
      const itemLower = itemText.toLowerCase();

      if (/яблок|банан|огур|помидор|картоф|морков|зелен|салат|фрукт|овощ|ягод|лимон|апельсин|чеснок|лук|перец болгар/i.test(itemLower)) {
        category = 'produce';
      } else if (/молок|сыр|творог|сметан|масло слив|йогурт|кефир|сливк|ряженк|яйц/i.test(itemLower)) {
        category = 'dairy';
      } else if (/мяс|куриц|индейк|рыб|лосос|форел|фарш|говядин|свинин|колбас|сосиск|ветчин/i.test(itemLower)) {
        category = 'meat';
      } else if (/хлеб|багет|булоч|лаваш|круассан|батон|пирог/i.test(itemLower)) {
        category = 'bakery';
      } else if (/макарон|рис|гречк|мук|масло оливк|масло подсолнеч|сахар|сол[ьия]|кофе|чай|овсянк|круп|соус|кетчуп|специ/i.test(itemLower)) {
        category = 'pantry';
      } else if (/таблетк|порошок|мыл|бумаг|салфетк|шампун|губк|фольг|пакет|паста зубн/i.test(itemLower)) {
        category = 'household';
      } else if (/витамин|пластыр|капли|спрей|лекарств|нурофен|бинт|аспирин/i.test(itemLower)) {
        category = 'pharmacy';
      } else if (/вод[аы]|сок|морс|лимонад|комбуч|квас/i.test(itemLower)) {
        category = 'drinks';
      }

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

  const isCalendarIntent =
    !isShoppingIntent &&
    (lower.includes('встреч') ||
      lower.includes('врач') ||
      lower.includes('педиатр') ||
      lower.includes('секци') ||
      lower.includes('тренировк') ||
      lower.includes('собрани') ||
      lower.includes('приём') ||
      lower.includes('день рождени') ||
      lower.includes('гост') ||
      (timeMatch && !isShoppingIntent));

  if (isCalendarIntent) {
    let cat: any = 'family';
    if (lower.includes('врач') || lower.includes('педиатр') || lower.includes('больниц')) cat = 'health';
    else if (lower.includes('школ') || lower.includes('секци') || lower.includes('детск') || lower.includes('тренировк')) cat = 'kids';
    else if (lower.includes('мастер') || lower.includes('сантехник') || lower.includes('уборк')) cat = 'home';

    actions.push({
      type: 'calendar',
      title: text.length > 50 ? text.substring(0, 47) + '...' : text,
      details: `Дата: ${targetDate}, время: ${parsedTime}, категория: ${cat}`,
      data: {
        title: text.length > 50 ? text.substring(0, 47) + '...' : text,
        date: targetDate,
        startTime: parsedTime,
        endTime: `${parseInt(parsedTime.split(':')[0], 10) + 1}:00`,
        allDay: !timeMatch,
        category: cat,
        memberIds: memberId ? [memberId] : members.map((m) => m?.id || '1'),
        reminderMinutes: 60,
      },
    });
  }

  const isTaskIntent =
    !isShoppingIntent &&
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
    let zone: any = 'Весь дом';
    if (lower.includes('посуд') || lower.includes('кухн') || lower.includes('холодильник') || lower.includes('плит')) zone = 'Кухня';
    else if (lower.includes('ванн') || lower.includes('душ') || lower.includes('стирк')) zone = 'Ванная';
    else if (lower.includes('машин') || lower.includes('авто') || lower.includes('колес')) zone = 'Авто';
    else if (lower.includes('детск') || lower.includes('игрушк')) zone = 'Детская';
    else if (lower.includes('цвет') || lower.includes('раст')) zone = 'Гостиная';

    actions.push({
      type: 'task',
      title: text.length > 50 ? text.substring(0, 47) + '...' : text,
      details: `Зона: ${zone}, Исполнитель: ${matchedMember?.name || 'Любой'}, Срок: ${targetDate}`,
      data: {
        title: text.length > 50 ? text.substring(0, 47) + '...' : text,
        zone,
        assigneeId: memberId,
        isRotation: false,
        recurrence: 'none',
        dueDate: targetDate,
        dueTime: parsedTime,
        priority: lower.includes('срочно') ? 'high' : 'medium',
        completed: false,
        points: 15,
      },
    });
  }

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
        dueTime: '12:00',
        priority: 'medium',
        completed: false,
        points: 10,
      },
    });
  }

  return {
    summary: `Распознано действий: ${actions.length}`,
    actions,
  };
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Вспомогательная функция для вызова Gemini с автоматическим каскадом моделей
// при временной недоступности (503, 429 или таймаут)
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    preferredModels?: string[];
    timeoutMs?: number;
  }
) {
  const models = options.preferredModels || [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
  ];
  let lastError: any = null;

  for (const model of models) {
    try {
      const timeoutMs = options.timeoutMs || 25000;
      const callPromise = ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeoutMs}ms for ${model}`)),
          timeoutMs
        )
      );

      const response: any = await Promise.race([callPromise, timeoutPromise]);
      if (response && response.text) {
        return { response, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Модель ${model} вернула ошибку:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('Все модели Gemini оказались временно недоступны');
}

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Базовые заголовки безопасности
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Лимит 50mb для поддержки фото чеков высокого разрешения с современных смартфонов
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==================== RATE LIMITER & ЗАЩИТА ОТ ПЕРЕБОРА (BRUTE-FORCE) ====================
  interface ClientRateRecord {
    count: number;
    resetAt: number;
    failedSyncAttempts: number;
    blockedUntil?: number;
  }
  const rateLimitMap = new Map<string, ClientRateRecord>();

  // Очистка старых записей каждые 10 минут
  setInterval(() => {
    const now = Date.now();
    for (const [ip, rec] of rateLimitMap.entries()) {
      if (now > rec.resetAt && (!rec.blockedUntil || now > rec.blockedUntil)) {
        rateLimitMap.delete(ip);
      }
    }
  }, 10 * 60 * 1000);

  const getClientIp = (req: express.Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.socket.remoteAddress || 'unknown';
  };

  // Middleware ограничения частоты запросов для AI эндпоинтов (макс 30 в минуту)
  const aiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const rec = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60000, failedSyncAttempts: 0 };

    if (now > rec.resetAt) {
      rec.count = 0;
      rec.resetAt = now + 60000;
    }

    rec.count += 1;
    rateLimitMap.set(ip, rec);

    if (rec.count > 30) {
      return res.status(429).json({
        error: 'Слишком много запросов к AI ассистенту. Пожалуйста, подождите минуту.',
      });
    }
    next();
  };

  // Middleware защиты семейного кода от брутфорса
  const syncBruteForceProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const rec = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60000, failedSyncAttempts: 0 };

    if (rec.blockedUntil && now < rec.blockedUntil) {
      const waitMinutes = Math.ceil((rec.blockedUntil - now) / 60000);
      return res.status(429).json({
        error: `Доступ временно ограничен из-за частых ошибок ввода кода. Повторите попытку через ${waitMinutes} мин.`,
      });
    }

    next();
  };

  // Эндпоинт проверки здоровья сервиса (Healthcheck & Readiness)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'onehaus-family-app',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      aiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  // Серверный endpoint для автоматического определения геолокации по IP (fallback для iframe и браузеров)
  app.get('/api/detect-location', async (req, res) => {
    try {
      const cleanIp = getClientIp(req);
      const isLocal = cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'unknown';

      const queryUrl = isLocal ? 'https://ipwho.is/?lang=ru' : `https://ipwho.is/${cleanIp}?lang=ru`;
      const ipRes = await fetch(queryUrl, {
        headers: { 'User-Agent': 'OneHausFamilyApp/1.0' },
        signal: AbortSignal.timeout(4500),
      });

      if (ipRes.ok) {
        const data = await ipRes.json();
        if (data && data.success !== false && data.latitude && data.longitude) {
          return res.json({
            id: `server_geo_${Date.now()}`,
            name: data.city || data.region || 'Определённый город',
            country: data.country || '',
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }
      }
    } catch (err: any) {
      // Тихий фолбэк без вывода PII
    }

    // Резервный безопасный ответ (Амстердам)
    return res.json({
      id: 'ams',
      name: 'Амстердам',
      country: 'Нидерланды',
      latitude: 52.374,
      longitude: 4.89,
    });
  });

  // ==================== СЕМЕЙНАЯ ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ ====================
  const familiesDir = path.resolve(__dirname, 'data', 'families');
  try {
    if (!fs.existsSync(familiesDir)) {
      fs.mkdirSync(familiesDir, { recursive: true });
    }
  } catch (_) {}

  // Отправка (push) обновлений семьи
  app.post('/api/family-sync/push', syncBruteForceProtection, (req, res) => {
    try {
      const { familyCode, data } = req.body;
      if (!familyCode || !data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Не указан корректный familyCode или data' });
      }

      const cleanCode = String(familyCode).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (cleanCode.length < 4 || cleanCode.length > 16) {
        return res.status(400).json({ error: 'Код семьи должен содержать от 4 до 16 символов' });
      }

      // Проверка размера данных (макс 25 МБ)
      const payloadString = JSON.stringify({
        familyCode: cleanCode,
        updatedAt: new Date().toISOString(),
        data,
      });

      if (payloadString.length > 25 * 1024 * 1024) {
        return res.status(413).json({ error: 'Размер данных превышает лимит 25 МБ' });
      }

      const filePath = path.resolve(familiesDir, `${cleanCode}.json`);
      fs.writeFileSync(filePath, payloadString, 'utf-8');
      return res.json({ success: true, updatedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error('[Family Sync Push Error]');
      return res.status(500).json({ error: 'Ошибка сохранения на сервере' });
    }
  });

  // Получение (pull) актуального состояния семьи
  app.get('/api/family-sync/pull/:code', syncBruteForceProtection, (req, res) => {
    const ip = getClientIp(req);
    try {
      const cleanCode = String(req.params.code).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (cleanCode.length < 4 || cleanCode.length > 16) {
        return res.status(400).json({ error: 'Некорректный формат семейного кода' });
      }

      const filePath = path.resolve(familiesDir, `${cleanCode}.json`);

      if (!fs.existsSync(filePath)) {
        // Учёт неудачной попытки для защиты от перебора
        const now = Date.now();
        const rec = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60000, failedSyncAttempts: 0 };
        rec.failedSyncAttempts = (rec.failedSyncAttempts || 0) + 1;
        if (rec.failedSyncAttempts >= 8) {
          rec.blockedUntil = now + 15 * 60 * 1000; // блокировка на 15 мин
        }
        rateLimitMap.set(ip, rec);

        return res.status(404).json({ error: 'Семья с таким кодом не найдена' });
      }

      // Сброс счетчика неудачных попыток при успехе
      const rec = rateLimitMap.get(ip);
      if (rec) {
        rec.failedSyncAttempts = 0;
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      const payload = JSON.parse(raw);
      return res.json(payload);
    } catch (err: any) {
      console.error('[Family Sync Pull Error]');
      return res.status(500).json({ error: 'Ошибка загрузки с сервера' });
    }
  });

  // Проверка статуса семейного кода
  app.get('/api/family-sync/check/:code', syncBruteForceProtection, (req, res) => {
    try {
      const cleanCode = String(req.params.code).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (cleanCode.length < 4 || cleanCode.length > 16) {
        return res.json({ exists: false });
      }

      const filePath = path.resolve(familiesDir, `${cleanCode}.json`);
      const exists = fs.existsSync(filePath);

      if (!exists) {
        return res.json({ exists: false });
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      const payload = JSON.parse(raw);
      return res.json({
        exists: true,
        updatedAt: payload.updatedAt,
        householdName: payload.data?.householdName || 'Семейное пространство',
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Ошибка проверки кода' });
    }
  });

  // Серверный endpoint для интеллектуального разбора Gemini API
  app.post('/api/ai/parse', aiRateLimiter, async (req, res) => {
    const { text, members = [], imageBase64, clientLocalDate } = req.body;

    if (!text && !imageBase64) {
      return res.status(400).json({ error: 'Text or image is required' });
    }

    // Ограничение длины текста для защиты от prompt injection и перегрузки
    const safeText = typeof text === 'string' ? text.slice(0, 4000) : '';
    const effectiveToday =
      clientLocalDate && /^\d{4}-\d{2}-\d{2}$/.test(clientLocalDate)
        ? clientLocalDate
        : new Date().toISOString().split('T')[0];

    const apiKey = process.env.GEMINI_API_KEY;

    // Если ключа нет или он плейсхолдер — мгновенный возврат через эвристический парсер
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallbackResult = parseWithRuleEngine(safeText || '', members);
      return res.json(fallbackResult);
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const membersList = members
        .map((m: any) => `${m.id}: ${m.name} (${m.role})`)
        .join(', ');

      const prompt = `Ты — встроенный интеллектуальный ассистент домашнего органайзера «Дом без хаоса» (OneHaus «Send it in»).
Пользователь передал команду, голосовую заметку или фото чека (на русском, греческом (Ελληνικά) или английском языке). Твоя цель — извлечь структурированные действия:
- shopping: позиции в список покупок (title: название товара, category: produce|dairy|meat|bakery|pantry|household|pharmacy|drinks|sweets|other, quantity: количество, listId: 'list-supermarket')
  ВАЖНО: Каждый отдельный продукт должен быть ОТДЕЛЬНОЙ позицией! Не объединяй разные продукты через «и». Но если в скобках указана дозировка или состав, например «Нурофен (Ибупрофен, 100 мг)» — это ЕДИНАЯ позиция, не разделяй её!
- task: бытовые дела и задачи (title, zone, dueDate, dueTime, priority, assigneeId).
  ВАЖНО: Если действие бытовое («помыть окна», «убрать в комнате», «починить кран») — создавай СТРОГО 'task' и НЕ создавай событие в календаре!
- calendar: события календаря, встречи, секции, врачи, поездки (title, date, startTime, endTime, category, memberIds, recurrence).
  ВАЖНО: Если пользователь упоминает день рождения («день рождения», «др») — создавай СТРОГО 'calendar' с recurrence: 'yearly', allDay: true, startTime: '09:00', и НЕ создавай задачу-дубль!
- doc: документы (title, category, documentNumber, expiryDate)
- contact: мастера и службы (name, specialty, category, phone)

Члены семьи:
${membersList}

Сегодняшняя местная дата пользователя: ${effectiveToday}

Верни ТОЛЬКО валидный JSON (без markdown блоков \`\`\`json) со следующей структурой:
{
  "summary": "Краткое дружелюбное резюме на русском языке",
  "actions": [
    {
      "type": "shopping" | "task" | "calendar" | "doc" | "contact",
      "title": "Краткое понятное название",
      "details": "Подробности (дата, категория, зона)",
      "data": { ... }
    }
  ]
}

Входные данные:
"${text || ''}"`;

      let contents: any;
      if (imageBase64) {
        const mimeType = imageBase64.startsWith('data:image/png')
          ? 'image/png'
          : 'image/jpeg';
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        contents = [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ];
      } else {
        contents = prompt;
      }

      const { response } = await callGeminiWithFallback(ai, {
        contents,
        timeoutMs: 12000,
        preferredModels: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'],
      });

      const rawText = response.text || '';
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return res.json(parsed);
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to rule engine:', err?.message || err);
      // При любой ошибке API или сети возвращаем резервный результат без сбоя
      const fallbackResult = parseWithRuleEngine(text || '', members);
      return res.json(fallbackResult);
    }
  });

  // Серверный endpoint для интеллектуального распознавания и категоризации чеков через Gemini API
  app.post('/api/ai/parse-receipt', aiRateLimiter, async (req, res) => {
    const { imageBase64, rawText, languageHint } = req.body;

    if (!imageBase64 && !rawText) {
      return res.status(400).json({ error: 'Изображение или текст чека обязательны' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(500).json({ error: 'GEMINI_API_KEY не настроен' });
    }

    const receiptPrompt = `Ты — универсальная интеллектуальная система компьютерного зрения и финансового анализа кассовых чеков.
Перед тобой реальный кассовый чек из ЛЮБОГО магазина, супермаркета, аптеки, строительного маркета, кафе или сервиса в любой стране мира (Нидерланды, Германия, Франция, Россия, Польша, Великобритания, США, Испания, Италия, Греция и др.).

Твоя цель — безупречно, математически точно извлечь все данные чека с первого раза:

1. МАГАЗИН И ДАТА:
   - storeName: Чистое, лаконичное общепринятое название сети или магазина (например Jumbo, Albert Heijn, REWE, ALDI, Lidl, ВкусВилл, Пятёрочка, Biedronka, Carrefour, SPAR, Kruidvat, Action, dm, Rossmann и т.д.). Без юридических форм (B.V., GmbH, ООО).
   - date: Дата покупки в формате YYYY-MM-DD.
   - time: Время чека в формате HH:mm.
   - currency: Валюта чека (EUR, USD, RUB, PLN, GBP, GEL, KZT и др.).
   - language: Код языка чека (nld, deu, rus, pol, eng, fra, spa, ell и др.).

2. МАТЕМАТИЧЕСКАЯ ТОЧНОСТЬ ИТОГОВ (totalAmount, taxAmount, discountTotal):
   - totalAmount: ФАКТИЧЕСКАЯ ИТОГОВАЯ СУММА К ОПЛАТЕ / ОПЛАЧЕННАЯ СУММА (строки Totaal, Total, Summe, Gesamtbetrag, Итого, К оплате, Razem, Do zapłaty, PIN, Betaald, Transactie, Card, Cash).
   - ВНИМАНИЕ: Если на чеке указан промежуточный подытог (Subtotaal / Subtotal / Zwischensumme / Netto) и скидки (Korting / Bonus / Rabatt), то totalAmount — это ФИНАЛЬНАЯ сумма к оплате ПОСЛЕ вычета всех скидок!
   - КРИТИЧНО: Никогда не путай итоговую сумму с налогами (BTW, VAT, MwSt, НДС), номерами касс или количеством позиций (Aantal artikelen).
   - Сумма цен всех товаров items обязана математически сходиться с totalAmount с точностью до цента!

3. ТОВАРЫ (items) — ПОСТРОЧНЫЙ АНАЛИЗ БЕЗ ПРОПУСКОВ И БЕЗ МУСОРА:
   - Извлеки ВСЕ реально купленные товары и услуги.
   - Поддерживай любые форматы строк:
     * Обычные товары: "НАЗВАНИЕ ЦЕНА"
     * Множители: "2 x 1.25" или "2 Stk x 0.65" (quantity: 2, unitPrice: 1.25, totalPrice: 2.50)
     * Весовой товар: "0.450 kg x 4.99/kg" (quantity: 0.45, unit: "кг", unitPrice: 4.99, totalPrice: 2.25)
     * Скидки: если к товару относится скидка (Korting, Bonus, Rabatt), укажи discount и скорректируй totalPrice строки
     * Залог за бутылки / тару: Statiegeld, Pfand, Kaucja -> категория "other"
   - СТРОГИЙ ЗАПРЕТ: НИ В КОЕМ СЛУЧАЕ НЕ ДОБАВЛЯЙ В ITEMS СЛУЖЕБНЫЕ СТРОКИ:
     Totaal, Subtotaal, Pin, Betaald, BTW/VAT, MwSt, Kassa, Filiaal, Datum, Tijd, Bon, Kvk, Bedankt, Tot ziens, Terminal, Aantal artikelen.

4. РУССКОЯЗЫЧНЫЕ НАИМЕНОВАНИЯ И КАТЕГОРИИ:
   - normalizedTitle: Сформируй чистое, понятное название на РУССКОМ ЯЗЫКЕ для семейного списка покупок (например: "Молоко 1.5% 1 л", "Бананы", "Сыр Гауда молодой", "Фарш говяжий", "Стиральный порошок", "Хлеб цельнозерновой"). Убери внутренние артикулы и технические префиксы.
   - category: Автоматически определи одну из 10 категорий:
     * produce (овощи, фрукты, ягоды, зелень, грибы, картофель)
     * dairy (молоко, сыр, масло сливочное, творог, йогурт, яйца, сливки)
     * meat (мясо, птица, фарш, колбаса, сосиски, ветчина, рыба, морепродукты)
     * bakery (хлеб, булки, багет, выпечка, тосты, круассаны)
     * pantry (бакалея, масло растительное, макароны, крупы, сахар, мука, кофе, чай, специи, консервы)
     * sweets (сладости, шоколад, печенье, десерты, конфеты, мороженое, снеки)
     * drinks (вода, соки, лимонады, пиво, вино, напитки)
     * household (бытовая химия, моющие средства, салфетки, туалетная бумага, губки)
     * pharmacy (аптека, витамины, лекарства, пластыри)
     * other (залог за тару Statiegeld/Pfand, пакеты, прочее)
   - unit: "шт", "кг", "г", "л", "уп", "бут".
${rawText ? `OCR текст чека (дополнительно):\n${rawText}\n` : ''}`;

    const receiptSchema = {
      type: Type.OBJECT,
      properties: {
        storeName: {
          type: Type.STRING,
          description: 'Название магазина (например Jumbo, Albert Heijn, REWE, ВкусВилл, ALDI)',
        },
        date: {
          type: Type.STRING,
          description: 'Дата чека в формате YYYY-MM-DD',
        },
        time: {
          type: Type.STRING,
          description: 'Время чека в формате HH:mm',
        },
        totalAmount: {
          type: Type.NUMBER,
          description: 'Фактическая итоговая сумма к оплате (Totaal, PIN, Betaald, Summe, Итого)',
        },
        taxAmount: {
          type: Type.NUMBER,
          description: 'Сумма налога (BTW, MwSt, НДС)',
        },
        discountTotal: {
          type: Type.NUMBER,
          description: 'Сумма скидки (Korting, Actie, Rabatt)',
        },
        currency: {
          type: Type.STRING,
          description: 'Валюта (EUR, RUB, PLN, USD, GBP)',
        },
        language: {
          type: Type.STRING,
          description: 'Языковой код чека (nld, deu, rus, pol, ell, eng)',
        },
        items: {
          type: Type.ARRAY,
          description: 'Список купленных товаров',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              originalText: { type: Type.STRING, description: 'Оригинальная строка из чека' },
              normalizedTitle: { type: Type.STRING, description: 'Понятное русскоязычное название товара' },
              quantity: { type: Type.NUMBER, description: 'Количество' },
              unit: { type: Type.STRING, description: 'Единица измерения (шт, кг, г, л, уп)' },
              unitPrice: { type: Type.NUMBER, description: 'Цена за единицу' },
              totalPrice: { type: Type.NUMBER, description: 'Итоговая стоимость строки' },
              discount: { type: Type.NUMBER, description: 'Скидка на позицию' },
              currency: { type: Type.STRING, description: 'Валюта' },
              category: {
                type: Type.STRING,
                description: 'Категория: produce, dairy, meat, bakery, pantry, sweets, drinks, household, pharmacy, other',
              },
              confidence: { type: Type.NUMBER, description: 'Оценка уверенности 0-100' },
            },
            required: ['normalizedTitle', 'totalPrice', 'category'],
          },
        },
      },
      required: ['storeName', 'totalAmount', 'items'],
    };

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const contents: any[] = [];
      if (imageBase64) {
        const mimeType = imageBase64.startsWith('data:image/png')
          ? 'image/png'
          : 'image/jpeg';
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        contents.push({
          role: 'user',
          parts: [
            { text: receiptPrompt },
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
          ],
        });
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: receiptPrompt }],
        });
      }

      const { response, modelUsed } = await callGeminiWithFallback(ai, {
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: receiptSchema,
        },
        timeoutMs: 15000,
        preferredModels: ['gemini-3.8-flash', 'gemini-3.1-flash-lite'],
      });

      const rawResponseText = response.text || '';
      const cleanJson = rawResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);

      console.log(`[Gemini Receipt] Processed with ${modelUsed}, items count: ${parsedData.items?.length || 0}`);

      return res.json(parsedData);
    } catch (err: any) {
      console.error('Ошибка Gemini при разборе чека:', err?.message || 'ошибка сети');

      // Если был передан rawText — пробуем серверный синтаксический разбор без сбоя
      if (rawText && typeof rawText === 'string') {
        try {
          const { parseReceiptText } = await import('./src/services/receiptParser');
          const fallbackData = parseReceiptText(rawText);
          return res.json(fallbackData);
        } catch (_) {}
      }

      return res.status(500).json({
        error: 'Не удалось разобрать чек через Gemini API: ' + (err?.message || 'ошибка сети'),
      });
    }
  });

  // Серверный endpoint для автоматического скачивания и AI-структурирования рецептов с любых сайтов/соцсетей
  app.post('/api/ai/import-recipe', aiRateLimiter, async (req, res) => {
    const { url, rawText } = req.body;

    if (!url && !rawText) {
      return res.status(400).json({ error: 'Укажите ссылку или текст рецепта' });
    }

    const safeUrl = typeof url === 'string' ? url.slice(0, 1500) : '';
    let scrapedText = typeof rawText === 'string' ? rawText.slice(0, 6000) : '';
    let metaImage = '';
    let pageTitle = '';

    // Если передан URL — пытаемся скачать страницу и извлечь meta теги, OpenGraph и Recipe Schema JSON-LD
    if (url && typeof url === 'string' && url.startsWith('http')) {
      // 1. Специальная обработка для YouTube видео
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (oembedRes.ok) {
            const oembedData: any = await oembedRes.json();
            if (oembedData && oembedData.title) {
              pageTitle = oembedData.title;
              if (oembedData.thumbnail_url) {
                metaImage = oembedData.thumbnail_url;
              }
              scrapedText = `Название кулинарного видео на YouTube: ${oembedData.title}\nАвтор/канал: ${
                oembedData.author_name || ''
              }\nСсылка: ${url}\n${rawText ? `Дополнительный текст от пользователя: ${rawText}` : ''}`;
            }
          }
        } catch (ytErr: any) {
          console.warn('[YouTube oEmbed Warning]:', ytErr?.message || ytErr);
        }
      }

      // 2. Стандартный веб-парсинг страниц (кулинарные сайты, порталы)
      if (!pageTitle) {
        try {
          const pageRes = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'ru-RU,ru;q=0.9,el;q=0.8,en;q=0.7',
            },
            signal: AbortSignal.timeout(6500),
          });

          if (pageRes.ok) {
            const html = await pageRes.text();

            // OpenGraph фото
            const ogImageMatch =
              html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
            if (ogImageMatch && ogImageMatch[1]) {
              metaImage = ogImageMatch[1];
            }

            // Заголовок страницы
            const ogTitleMatch =
              html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
              html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (ogTitleMatch && ogTitleMatch[1]) {
              pageTitle = ogTitleMatch[1].trim();
            }

            // Поиск schema.org/Recipe JSON-LD
            const jsonLdMatches = html.match(
              /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
            );
            let extractedRecipeJson = '';
            if (jsonLdMatches) {
              for (const block of jsonLdMatches) {
                const inner = block.replace(/<script[^>]*>|<\/script>/gi, '').trim();
                if (
                  inner.includes('"Recipe"') ||
                  inner.includes('recipeIngredient') ||
                  inner.includes('recipeInstructions')
                ) {
                  extractedRecipeJson = inner;
                  break;
                }
              }
            }

            // Очистка от скриптов/стилей
            const textWithoutScripts = html
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
              .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
              .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            scrapedText = `${
              extractedRecipeJson ? 'Schema JSON-LD:\n' + extractedRecipeJson + '\n\n' : ''
            }Заголовок страницы: ${pageTitle}\nСодержимое страницы:\n${textWithoutScripts.slice(
              0,
              7500
            )}\nПользовательские заметки: ${rawText || ''}`;
          }
        } catch (scrapeErr: any) {
          console.warn('[Recipe Scrape Warning]:', scrapeErr?.message || scrapeErr);
        }
      }

      // 3. Резервное извлечение названия из slug в URL, если сайт блокирует парсинг
      if (!pageTitle && url) {
        try {
          const parsedUrl = new URL(url);
          const segments = parsedUrl.pathname.split('/').filter(Boolean);
          const lastSegment = segments[segments.length - 1] || segments[segments.length - 2] || '';
          if (lastSegment) {
            const cleanSlug = decodeURIComponent(lastSegment)
              .replace(/\.html?$/i, '')
              .replace(/[-_]/g, ' ')
              .replace(/\b[A-Z0-9]{7,}\b/g, '') // удаление служебных id вроде R90025413
              .trim();
            if (cleanSlug.length > 2) {
              pageTitle = cleanSlug;
              scrapedText += `\nНазвание рецепта из веб-адреса: ${cleanSlug}`;
            }
          }
        } catch (_) {}
      }

      if (!scrapedText.trim()) {
        scrapedText = `URL источника: ${url}\n${pageTitle ? `Название блюда: ${pageTitle}\n` : ''}${rawText || ''}`;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Резервный парсер если нет ключа
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallbackRecipe = fallbackParseRecipe(scrapedText, url, pageTitle, metaImage);
      return res.json(fallbackRecipe);
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = `Ты — профессиональный кулинарный шеф и структуризатор семейных рецептов.
Пользователь передал ссылку на сайт / YouTube / Instagram или скопированный текст кулинарного рецепта.
Твоя цель — безупречно извлечь или воссоздать понятный, аппетитный, структурированный рецепт на русском языке.

Входные данные:
Ссылка: ${url || 'Не указана'}
Контент / Описание / Текст:
${scrapedText.slice(0, 7500)}

Требования к структуре JSON:
1. title: Аппетитное, точное название блюда (например: «Греческий салат Хориатики», «Паста карбонара с пармезаном»).
2. description: Лаконичное описание из 1-2 предложений (в чём изюминка блюда, с чем подавать).
3. category: Одно из: "breakfast" (завтрак) | "lunch" (обед) | "dinner" (ужин) | "snack" (перекус/десерт).
4. prepTimeMinutes: Время подготовки в минутах (число, например 15).
5. cookTimeMinutes: Время варки/жарки в минутах (число, например 20).
6. servings: Количество порций (число, по умолчанию 4).
7. calories: Примерная калорийность на 1 порцию (ккал, число, например 380).
8. image: URL фотографии блюда, если найден валидный адрес в тексте или метатегах (${metaImage ? `"${metaImage}"` : ''}). Если нет — пустая строка "".
9. tags: Массив из 3-5 актуальных тегов (например: ["Ужин", "Быстро", "Греция", "Семейное"]).
10. ingredients: Массив ингредиентов. У каждого:
    - name: понятное название продукта на русском языке (например: "Сыр Фета", "Спагетти", "Оливковое масло Extra Virgin").
    - ВАЖНО: КАЖДЫЙ ПРОДУКТ ДОЛЖЕН БЫТЬ ОТДЕЛЬНОЙ СТРОКОЙ! Никогда не объединяй продукты через «и» (например, ЗАПРЕЩЕНО писать «Соль и перец», «Морковь и лук», «Базилик и черри» — обязательно делай два отдельных ингредиента: «Морская соль» и «Черный перец»).
    - amount: количество и единицы (например: "200 г", "2 шт.", "3 ст. л.", "по вкусу").
    - category: одна из категорий покупок: "produce" (овощи/фрукты/зелень) | "dairy" (молочное, сыры, яйца) | "meat" (мясо, птица, рыба) | "bakery" (хлеб, мука) | "pantry" (крупы, масло, паста, специи, соусы) | "household" | "drinks" | "other".
11. steps: Массив пошаговых инструкций приготовления на русском языке (1-я строка, 2-я строка... лаконичные, понятные действия).

Верни ТОЛЬКО валидный JSON (без markdown блоков \`\`\`json):
{
  "title": "...",
  "description": "...",
  "category": "dinner",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 20,
  "servings": 4,
  "calories": 380,
  "image": "...",
  "tags": ["..."],
  "ingredients": [
    { "name": "...", "amount": "...", "category": "produce" }
  ],
  "steps": [
    "..."
  ]
}`;

      const { response } = await callGeminiWithFallback(ai, {
        contents: prompt,
        timeoutMs: 25000,
        preferredModels: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'],
      });

      const raw = response.text || '';
      const cleanJson = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (!parsed.image && metaImage) {
        parsed.image = metaImage;
      }

      return res.json(parsed);
    } catch (err: any) {
      console.warn('Gemini Recipe Import Warning:', err?.message || err);
      const fallback = fallbackParseRecipe(scrapedText, url, pageTitle, metaImage);
      return res.json(fallback);
    }
  });

  const httpServer = http.createServer(app);

  const distDir = path.resolve(__dirname, 'dist');
  const distIndex = path.resolve(distDir, 'index.html');
  const hasDist = fs.existsSync(distIndex);

  // Настройка Vite в dev режиме или раздача статики в prod
  if (isProd && hasDist) {
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(distIndex);
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}

function fallbackParseRecipe(
  scrapedText: string,
  url?: string,
  pageTitle?: string,
  metaImage?: string
) {
  const lines = (scrapedText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const cleanTitle = pageTitle ? pageTitle.replace(/[-|].*$/, '').trim() : '';
  const title = cleanTitle || (lines[0] ? lines[0].slice(0, 60) : 'Вкусное домашнее блюдо');

  const ingredients: Array<{ name: string; amount: string; category: string }> = [];
  const steps: string[] = [];

  for (const line of lines) {
    if (
      line.includes('-') ||
      line.includes(':') ||
      line.includes(' г') ||
      line.includes(' мл') ||
      line.includes(' шт') ||
      line.includes(' ст. л.') ||
      line.includes(' ч. л.')
    ) {
      const parts = line.split(/[-:]/);
      if (parts.length >= 2) {
        ingredients.push({
          name: parts[0].trim().replace(/^[*•-]\s*/, ''),
          amount: parts[1].trim(),
          category: 'produce',
        });
      }
    } else if (/^\d+[\.\)]/.test(line)) {
      steps.push(line.replace(/^\d+[\.\)]\s*/, ''));
    }
  }

  return {
    title: title || 'Новый рецепт из интернета',
    description: 'Импортировано из источника: ' + (url || 'интернет-рецепт'),
    category: 'dinner',
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servings: 4,
    calories: 380,
    image:
      metaImage ||
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    tags: ['Рецепт из сети', 'Семейное'],
    ingredients:
      ingredients.length > 0
        ? ingredients.slice(0, 15)
        : [
            { name: 'Свежие овощи', amount: '300 г', category: 'produce' },
            { name: 'Оливковое масло', amount: '2 ст. л.', category: 'pantry' },
            { name: 'Специи и соль', amount: 'по вкусу', category: 'pantry' },
          ],
    steps:
      steps.length > 0
        ? steps.slice(0, 10)
        : [
            'Подготовить ингредиенты, нарезать овощи.',
            'Приготовить согласно рекомендациям автора и подать к семейному столу.',
          ],
  };
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

