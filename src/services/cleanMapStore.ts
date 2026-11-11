// Общие отметки «Карты уборки»: когда пункт делали последний раз. Нужны карте, плану по дням и утреннему сообщению.
const KEY = 'dbh_cleanmap';
const EVT = 'dbh:cleanmap-changed';

export const readCleanMap = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};

export const writeCleanMap = (v: Record<string, string>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* нет хранилища */
  }
  window.dispatchEvent(new Event(EVT));
};

export const markCleanItem = (id: string) => writeCleanMap({ ...readCleanMap(), [id]: new Date().toISOString() });

export const subscribeCleanMap = (fn: () => void) => {
  window.addEventListener(EVT, fn);
  return () => window.removeEventListener(EVT, fn);
};

/** День отметки по местному времени (отметки хранятся в UTC — иначе после полуночи «сегодня» сбивалось на вчера) */
export const markDay = (iso?: string): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
