import {
  DocumentItem,
  MedicineItem,
  InventoryItem,
  UtilityMeter,
  TaskItem,
  ShoppingItem,
  CalendarEvent,
} from '../types';
import { getLocalDateString, getDaysUntilBirthday } from '../utils/dateUtils';

export interface AssistantActionLog {
  id: string;
  timestamp: string;
  category: 'docs' | 'pharmacy' | 'inventory' | 'utilities' | 'calendar' | 'tasks';
  title: string;
  description: string;
  actionType: 'created_task' | 'added_shopping' | 'alert';
  type?: 'docs' | 'pharmacy' | 'inventory' | 'utilities' | 'calendar' | 'tasks';
}

export interface AssistantSettings {
  enabled: boolean;
  autoCreateTasks: boolean;
  autoAddShopping: boolean;
  notifyDaysBeforeDocExpiry: number; // по умолчанию 14
  utilityReminderDaysStart: number; // 15
  utilityReminderDaysEnd: number; // 25
  birthdayDaysAhead: number; // 7
}

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  enabled: true,
  autoCreateTasks: true,
  autoAddShopping: true,
  notifyDaysBeforeDocExpiry: 14,
  utilityReminderDaysStart: 15,
  utilityReminderDaysEnd: 25,
  birthdayDaysAhead: 7,
};

const LOGS_STORAGE_KEY = 'onehaus_assistant_action_logs';
const SETTINGS_STORAGE_KEY = 'onehaus_assistant_settings';
const DEDUPLICATION_SET_KEY = 'onehaus_assistant_dedup_keys';

/**
 * Загружает журнал действий ассистента из хранилища
 */
export function getAssistantLogs(): AssistantActionLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Сохраняет журнал действий ассистента
 */
export function saveAssistantLogs(logs: AssistantActionLog[]) {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 100))); // последние 100 записей
  } catch {}
}

/**
 * Загружает настройки ассистента
 */
export function getAssistantSettings(): AssistantSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_ASSISTANT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_ASSISTANT_SETTINGS;
  } catch {
    return DEFAULT_ASSISTANT_SETTINGS;
  }
}

/**
 * Сохраняет настройки ассистента
 */
export function saveAssistantSettings(settings: AssistantSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

/**
 * Проверяет и регистрирует ключ дедупликации (защита от повторного создания)
 */
function isAlreadyHandled(dedupKey: string): boolean {
  try {
    const raw = localStorage.getItem(DEDUPLICATION_SET_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    return set.includes(dedupKey);
  } catch {
    return false;
  }
}

function markAsHandled(dedupKey: string) {
  try {
    const raw = localStorage.getItem(DEDUPLICATION_SET_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(dedupKey)) {
      set.push(dedupKey);
      // Храним последние 500 ключей
      localStorage.setItem(DEDUPLICATION_SET_KEY, JSON.stringify(set.slice(-500)));
    }
  } catch {}
}

export interface AssistantCheckResult {
  newTasks: Omit<TaskItem, 'id'>[];
  newShoppingItems: Omit<ShoppingItem, 'id' | 'createdAt'>[];
  newLogs: AssistantActionLog[];
  alerts: string[];
}

/**
 * Главный проактивный цикл ассистента: проверяет все разделы дома и генерирует действия
 */
export function runAssistantAudit(context: {
  documents: DocumentItem[];
  medicines: MedicineItem[];
  inventory: InventoryItem[];
  utilityMeters: UtilityMeter[];
  tasks: TaskItem[];
  events: CalendarEvent[];
  settings?: AssistantSettings;
}): AssistantCheckResult {
  const settings = context.settings || getAssistantSettings();
  const result: AssistantCheckResult = {
    newTasks: [],
    newShoppingItems: [],
    newLogs: [],
    alerts: [],
  };

  if (!settings.enabled) {
    return result;
  }

  const today = new Date();
  const todayStr = getLocalDateString(today);
  const currentDayOfMonth = today.getDate();
  const currentYearMonth = todayStr.slice(0, 7); // YYYY-MM

  // ==================== 1. ДОКУМЕНТЫ ====================
  // Срок истекает в течение 30 дней -> задача «Продлить: ...» за 14 дней до срока
  context.documents.forEach((doc) => {
    if (!doc.expiryDate) return;
    const expDate = new Date(doc.expiryDate);
    if (isNaN(expDate.getTime())) return;

    const diffDays = Math.round((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays > 0 && diffDays <= 30) {
      const dedupKey = `doc_expiry_${doc.id}_${doc.expiryDate}`;
      if (!isAlreadyHandled(dedupKey)) {
        const title = `Продлить: ${doc.title}`;
        if (settings.autoCreateTasks) {
          result.newTasks.push({
            title,
            zone: 'Весь дом',
            assigneeId: null,
            priority: diffDays <= 7 ? 'high' : 'medium',
            dueDate: getLocalDateString(new Date(today.getTime() + Math.min(diffDays, 14) * 24 * 3600 * 1000)),
            dueTime: '12:00',
            completed: false,
            points: 15,
            recurrence: 'none',
            isRotation: false,
          });
        }

        const log: AssistantActionLog = {
          id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          timestamp: new Date().toISOString(),
          category: 'docs',
          title: `Истекает срок документа: ${doc.title}`,
          description: `Осталось ${diffDays} дн. (до ${doc.expiryDate}). Создана задача на продление.`,
          actionType: 'created_task',
        };
        result.newLogs.push(log);
        result.alerts.push(`Документ «${doc.title}» истекает через ${diffDays} дн.`);
        markAsHandled(dedupKey);
      }
    }
  });

  // ==================== 2. АПТЕЧКА ====================
  // Заканчивается, просрочено или истекает в ближайшие 30 дней -> добавить в список «Аптека»
  context.medicines.forEach((med) => {
    const isLow = med.isLow;
    let isExpiredOrCritical = false;
    let daysToExpiry = 999;

    if (med.expiryDate) {
      const expDate = new Date(med.expiryDate);
      if (!isNaN(expDate.getTime())) {
        daysToExpiry = Math.round((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (daysToExpiry <= 30) {
          isExpiredOrCritical = true;
        }
      }
    }

    if (isLow || isExpiredOrCritical) {
      const dedupKey = `med_shopping_${med.id}_${isLow ? 'low' : 'exp_' + med.expiryDate}`;
      if (!isAlreadyHandled(dedupKey)) {
        if (settings.autoAddShopping) {
          result.newShoppingItems.push({
            listId: 'list-pharmacy',
            title: med.name + (med.form ? ` (${med.form})` : ''),
            category: 'pharmacy',
            quantity: '1 уп.',
            completed: false,
          });
        }

        const reason = isLow
          ? 'Заканчивается запас'
          : daysToExpiry <= 0
          ? 'Препарат просрочен'
          : `Срок годности истекает через ${daysToExpiry} дн.`;

        const log: AssistantActionLog = {
          id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          timestamp: new Date().toISOString(),
          category: 'pharmacy',
          title: `Аптечка: ${med.name}`,
          description: `${reason}. Добавлено в список покупок «Аптека».`,
          actionType: 'added_shopping',
        };
        result.newLogs.push(log);
        result.alerts.push(`Аптечка: ${med.name} (${reason})`);
        markAsHandled(dedupKey);
      }
    }
  });

  // ==================== 3. ИМУЩЕСТВО И АВТО ====================
  // ТО, сервисное обслуживание, гарантия
  context.inventory.forEach((item) => {
    if (item.nextServiceDate) {
      const sDate = new Date(item.nextServiceDate);
      if (!isNaN(sDate.getTime())) {
        const diffDays = Math.round((sDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (diffDays >= 0 && diffDays <= 21) {
          const dedupKey = `inv_service_${item.id}_${item.nextServiceDate}`;
          if (!isAlreadyHandled(dedupKey)) {
            const title = `Сервис/ТО: ${item.name}`;
            if (settings.autoCreateTasks) {
              result.newTasks.push({
                title,
                zone: item.category === 'vehicles' ? 'Авто' : 'Весь дом',
                assigneeId: null,
                priority: diffDays <= 7 ? 'high' : 'medium',
                dueDate: item.nextServiceDate,
                dueTime: '11:00',
                completed: false,
                points: 20,
                recurrence: 'none',
                isRotation: false,
              });
            }

            const log: AssistantActionLog = {
              id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              timestamp: new Date().toISOString(),
              category: 'inventory',
              title: `Плановое ТО: ${item.name}`,
              description: `Дата сервиса: ${item.nextServiceDate} (через ${diffDays} дн.). Создана задача.`,
              actionType: 'created_task',
            };
            result.newLogs.push(log);
            markAsHandled(dedupKey);
          }
        }
      }
    }
  });

  // ==================== 4. СЧЁТЧИКИ ЖКХ ====================
  // С 15 по 25 число месяца не переданы показания -> создать задачу «Передать показания ЖКХ»
  if (
    currentDayOfMonth >= settings.utilityReminderDaysStart &&
    currentDayOfMonth <= settings.utilityReminderDaysEnd
  ) {
    const dedupKey = `utility_submission_${currentYearMonth}`;
    if (!isAlreadyHandled(dedupKey)) {
      // Проверяем, есть ли счётчики без показаний за текущий месяц
      const hasUnsubmitted = context.utilityMeters.some((meter) => {
        const hasCurrentReading = (meter.readings || []).some(
          (r) => r.month === currentYearMonth
        );
        return !hasCurrentReading;
      });

      if (hasUnsubmitted) {
        if (settings.autoCreateTasks) {
          result.newTasks.push({
            title: 'Передать показания счётчиков ЖКХ',
            zone: 'Весь дом',
            assigneeId: null,
            priority: 'high',
            dueDate: getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 25)),
            dueTime: '12:00',
            completed: false,
            points: 15,
            recurrence: 'monthly',
            isRotation: true,
          });
        }

        const log: AssistantActionLog = {
          id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          timestamp: new Date().toISOString(),
          category: 'utilities',
          title: 'Период передачи показаний ЖКХ',
          description: `Идет период с 15 по 25 число. Создана задача для семьи.`,
          actionType: 'created_task',
        };
        result.newLogs.push(log);
        result.alerts.push('Период передачи показаний ЖКХ (до 25 числа)');
        markAsHandled(dedupKey);
      }
    }
  }

  // ==================== 5. КАЛЕНДАРЬ И ДНИ РОЖДЕНИЯ ====================
  context.events.forEach((evt) => {
    if (evt.recurrence === 'yearly' || /день\s+рождени/i.test(evt.title)) {
      const bdayInfo = getDaysUntilBirthday(evt.date);
      if (bdayInfo.daysLeft >= 0 && bdayInfo.daysLeft <= settings.birthdayDaysAhead) {
        const dedupKey = `bday_alert_${evt.id}_${bdayInfo.nextDate}`;
        if (!isAlreadyHandled(dedupKey)) {
          const turnsText = bdayInfo.turnsAge ? ` (исполняется ${bdayInfo.turnsAge} лет)` : '';
          const whenText =
            bdayInfo.daysLeft === 0
              ? 'Сегодня!'
              : bdayInfo.daysLeft === 1
              ? 'Завтра'
              : `через ${bdayInfo.daysLeft} дн.`;

          const log: AssistantActionLog = {
            id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            timestamp: new Date().toISOString(),
            category: 'calendar',
            title: `Скоро день рождения: ${evt.title}${turnsText}`,
            description: `${whenText} (${bdayInfo.nextDate}). Проверьте подарки и поздравления!`,
            actionType: 'alert',
          };
          result.newLogs.push(log);
          result.alerts.push(`🎂 ${evt.title}: ${whenText}`);
          markAsHandled(dedupKey);
        }
      }
    }
  });

  return result;
}
