// Флаги первого запуска: приветственный экран и обучающий тур.
// localStorage может быть недоступен (iframe, приватный режим) — поэтому всё в try/catch.

const WELCOME_KEY = 'dbh_welcome_seen';
const TOUR_KEY = 'dbh_tour_seen';

const read = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return true; // без хранилища не показываем онбординг при каждом запуске
  }
};

const write = (key: string) => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* хранилище недоступно — пропускаем */
  }
};

export const isWelcomeSeen = () => read(WELCOME_KEY);
export const markWelcomeSeen = () => write(WELCOME_KEY);
export const isTourSeen = () => read(TOUR_KEY);
export const markTourSeen = () => write(TOUR_KEY);

/** Сбросить онбординг: приветствие и тур покажутся при следующем запуске. */
export const resetOnboarding = () => {
  try {
    localStorage.removeItem(WELCOME_KEY);
    localStorage.removeItem(TOUR_KEY);
  } catch {
    /* хранилище недоступно */
  }
};

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
