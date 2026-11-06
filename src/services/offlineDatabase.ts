/**
 * Полноценный сервис IndexedDB для автономного оффлайн-хранения данных
 * центра управления домом (Задачи и Календарь событий).
 *
 * Преимущества перед localStorage:
 * - Нет 5 МБ лимита
 * - Асинхронные неблокирующие транзакции
 * - Индексирование по дате, исполнителю и статусу
 * - Доступен в Service Worker и оффлайн-контексте
 */

import { TaskItem, CalendarEvent } from '../types';

const DB_NAME = 'onehaus_offline_db';
const DB_VERSION = 1;

export const STORES = {
  TASKS: 'tasks',
  EVENTS: 'calendar_events',
  METADATA: 'sync_metadata',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Инициализация подключения к базе данных IndexedDB
 */
export function getOfflineDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      dbPromise = null;
      return reject(new Error('IndexedDB не поддерживается вашим браузером'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Хранилище задач
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
        taskStore.createIndex('dueDate', 'dueDate', { unique: false });
        taskStore.createIndex('completed', 'completed', { unique: false });
        taskStore.createIndex('assigneeId', 'assigneeId', { unique: false });
      }

      // 2. Хранилище событий календаря
      if (!db.objectStoreNames.contains(STORES.EVENTS)) {
        const eventStore = db.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
        eventStore.createIndex('date', 'date', { unique: false });
      }

      // 3. Хранилище метаданных
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event: Event) => {
      console.warn('Ошибка при открытии IndexedDB offline DB:', (event.target as IDBOpenDBRequest).error);
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

// ==========================================
// TASKS (Задачи)
// ==========================================

/**
 * Загрузить все задачи из IndexedDB
 */
export async function loadTasksFromIDB(): Promise<TaskItem[]> {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.TASKS], 'readonly');
      const store = tx.objectStore(STORES.TASKS);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Ошибка загрузки задач:', error);
    return [];
  }
}

/**
 * Сохранить весь список задач в IndexedDB (пакетная транзакция)
 */
export async function saveAllTasksToIDB(tasks: TaskItem[]): Promise<void> {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.TASKS, STORES.METADATA], 'readwrite');
      const store = tx.objectStore(STORES.TASKS);
      const metaStore = tx.objectStore(STORES.METADATA);

      // Очищаем текущее хранилище перед записью актуального массива
      store.clear();

      for (const task of tasks) {
        store.put(task);
      }

      metaStore.put({
        key: 'tasks_last_saved',
        timestamp: new Date().toISOString(),
        count: tasks.length,
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Ошибка сохранения задач:', error);
  }
}

/**
 * Добавить или обновить одну задачу в IndexedDB
 */
export async function saveTaskToIDB(task: TaskItem): Promise<void> {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.TASKS], 'readwrite');
      const store = tx.objectStore(STORES.TASKS);
      store.put(task);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Ошибка сохранения отдельной задачи:', error);
  }
}

/**
 * Удалить задачу из IndexedDB по id
 */
export async function deleteTaskFromIDB(taskId: string): Promise<void> {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.TASKS], 'readwrite');
      const store = tx.objectStore(STORES.TASKS);
      store.delete(taskId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Ошибка удаления задачи:', error);
  }
}

// ==========================================
// CALENDAR EVENTS (События календаря)
// ==========================================

/**
 * Загрузить все события календаря из IndexedDB
 */
export async function loadEventsFromIDB(): Promise<CalendarEvent[]> {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.EVENTS], 'readonly');
      const store = tx.objectStore(STORES.EVENTS);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Ошибка загрузки событий календаря:', error);
    return [];
  }
}

/**
 * Сохранить все события календаря в IndexedDB (пакетная транзакция)
 */
export async function saveAllEventsToIDB(events: CalendarEvent[]): Promise<void> {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.EVENTS, STORES.METADATA], 'readwrite');
      const store = tx.objectStore(STORES.EVENTS);
      const metaStore = tx.objectStore(STORES.METADATA);

      store.clear();

      for (const event of events) {
        store.put(event);
      }

      metaStore.put({
        key: 'events_last_saved',
        timestamp: new Date().toISOString(),
        count: events.length,
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Ошибка сохранения событий календаря:', error);
  }
}

/**
 * Добавить или обновить одно событие в IndexedDB
 */
export async function saveEventToIDB(event: CalendarEvent): Promise<void> {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.EVENTS], 'readwrite');
      const store = tx.objectStore(STORES.EVENTS);
      store.put(event);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Ошибка сохранения отдельного события:', error);
  }
}

/**
 * Удалить событие календаря из IndexedDB по id
 */
export async function deleteEventFromIDB(eventId: string): Promise<void> {
  try {
    const db = await getOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.EVENTS], 'readwrite');
      const store = tx.objectStore(STORES.EVENTS);
      store.delete(eventId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[IndexedDB] Ошибка удаления события:', error);
  }
}

// ==========================================
// СТАТИСТИКА И ДИАГНОСТИКА
// ==========================================

export interface OfflineDbStats {
  isSupported: boolean;
  taskCount: number;
  eventCount: number;
  lastTasksSaved: string | null;
  lastEventsSaved: string | null;
}

/**
 * Получить сводную статистику оффлайн-базы IndexedDB
 */
export async function getOfflineDbStats(): Promise<OfflineDbStats> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return {
      isSupported: false,
      taskCount: 0,
      eventCount: 0,
      lastTasksSaved: null,
      lastEventsSaved: null,
    };
  }

  try {
    const db = await getOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.TASKS, STORES.EVENTS, STORES.METADATA], 'readonly');
      const taskStore = tx.objectStore(STORES.TASKS);
      const eventStore = tx.objectStore(STORES.EVENTS);
      const metaStore = tx.objectStore(STORES.METADATA);

      const taskReq = taskStore.count();
      const eventReq = eventStore.count();
      const metaTaskReq = metaStore.get('tasks_last_saved');
      const metaEventReq = metaStore.get('events_last_saved');

      tx.oncomplete = () => {
        resolve({
          isSupported: true,
          taskCount: taskReq.result || 0,
          eventCount: eventReq.result || 0,
          lastTasksSaved: metaTaskReq.result?.timestamp || null,
          lastEventsSaved: metaEventReq.result?.timestamp || null,
        });
      };

      tx.onerror = () => {
        resolve({
          isSupported: true,
          taskCount: 0,
          eventCount: 0,
          lastTasksSaved: null,
          lastEventsSaved: null,
        });
      };
    });
  } catch (e) {
    return {
      isSupported: false,
      taskCount: 0,
      eventCount: 0,
      lastTasksSaved: null,
      lastEventsSaved: null,
    };
  }
}
