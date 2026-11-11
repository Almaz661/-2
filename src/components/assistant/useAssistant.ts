import { useEffect, useMemo, useState } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { computeSignals, Signal } from '../../services/orchestrator';

// Настройки и журнал главного ассистента — только на этом устройстве.
const SETTINGS_KEY = 'dbh_assistant';
const LOG_KEY = 'dbh_assistant_log';
const DONE_KEY = 'dbh_assistant_done';
const NOTIFIED_KEY = 'dbh_assistant_notified';

export interface AssistantSettings {
  /** Создавать задачи и покупки автоматически */
  autoActions: boolean;
  /** Системные уведомления о горящих сроках */
  notify: boolean;
  /** Утреннее сообщение с планом уборки */
  morning: boolean;
  /** Время утреннего сообщения, ЧЧ:ММ */
  morningTime: string;
}
export interface AssistantLogEntry {
  at: string;
  text: string;
}

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* нет места или хранилище недоступно */
  }
  window.dispatchEvent(new Event('dbh:assistant-changed'));
};

export const assistantStore = {
  getSettings: (): AssistantSettings => ({ autoActions: true, notify: true, morning: true, morningTime: '08:00', ...read<Partial<AssistantSettings>>(SETTINGS_KEY, {}) }),
  setSettings: (s: AssistantSettings) => write(SETTINGS_KEY, s),
  getLog: (): AssistantLogEntry[] => read<AssistantLogEntry[]>(LOG_KEY, []),
  addLog: (texts: string[]) => {
    if (!texts.length) return;
    const at = new Date().toISOString();
    write(LOG_KEY, [...texts.map((text) => ({ at, text })), ...assistantStore.getLog()].slice(0, 60));
  },
  clearLog: () => write(LOG_KEY, []),
  getDone: (): Record<string, string> => read<Record<string, string>>(DONE_KEY, {}),
  markDone: (keys: string[]) => {
    const done = assistantStore.getDone();
    const at = new Date().toISOString();
    keys.forEach((k) => (done[k] = at));
    write(DONE_KEY, done);
  },
  getMorningSent: (): string => read<string>('dbh_assistant_morning', ''),
  setMorningSent: (d: string) => write('dbh_assistant_morning', d),
  getNotified: (): Record<string, string> => read<Record<string, string>>(NOTIFIED_KEY, {}),
  setNotified: (n: Record<string, string>) => write(NOTIFIED_KEY, n),
};

/** Сигналы главного ассистента по всем разделам дома (пересчитываются при любом изменении данных). */
export function useAssistantSignals(): Signal[] {
  const { tasks, events, docs, medicines, inventory, meters, shoppingItems, shoppingLists } = useHousehold();
  return useMemo(
    () => computeSignals({ tasks, events, docs, medicines, inventory, meters, shoppingItems, shoppingLists }),
    [tasks, events, docs, medicines, inventory, meters, shoppingItems, shoppingLists]
  );
}

/** Подписка на настройки и журнал (обновляются, когда ассистент что-то сделал). */
export function useAssistantState() {
  const [state, setState] = useState(() => ({ settings: assistantStore.getSettings(), log: assistantStore.getLog() }));
  useEffect(() => {
    const on = () => setState({ settings: assistantStore.getSettings(), log: assistantStore.getLog() });
    window.addEventListener('dbh:assistant-changed', on);
    return () => window.removeEventListener('dbh:assistant-changed', on);
  }, []);
  return state;
}
