// Тема оформления: светлая, тёмная или как в системе.
// Выбор хранится в localStorage, применяется атрибутом data-theme на <html>.
// Начальное значение выставляет скрипт в index.html до отрисовки — без вспышки.

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'dbh_theme';
const listeners = new Set<(p: ThemePref) => void>();
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export const getThemePref = (): ThemePref => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

const resolve = (p: ThemePref) => (p === 'system' ? (media?.matches ? 'dark' : 'light') : p);

export const applyTheme = (p: ThemePref = getThemePref()) => {
  const mode = resolve(p);
  document.documentElement.dataset.theme = mode;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', mode === 'dark' ? '#161614' : '#F5F2EA');
};

export const setThemePref = (p: ThemePref) => {
  try {
    if (p === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch {
    /* хранилище недоступно — тема действует до перезагрузки */
  }
  applyTheme(p);
  listeners.forEach((fn) => fn(p));
};

export const subscribeTheme = (fn: (p: ThemePref) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

media?.addEventListener('change', () => {
  if (getThemePref() === 'system') applyTheme('system');
});
