import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyTheme } from './utils/theme';
import { applySeason } from './utils/season';

applyTheme();
applySeason();

// Любая неудачная запись в память устройства (переполнение) — сигнал для предупреждения пользователю
const nativeSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function (key: string, value: string) {
  try {
    return nativeSetItem.call(this, key, value);
  } catch (e) {
    window.dispatchEvent(new CustomEvent('dbh:storage-error', { detail: key }));
    throw e;
  }
};
import { registerSW } from 'virtual:pwa-register';

// В среде разработки снимаем устаревшие dev service workers, чтобы код не застревал в старом кэше браузера
if (import.meta.env.DEV) {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    });
  }
} else {
  // Автоматическая регистрация и обновление Service Worker для оффлайн-работы в production
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[PWA] Доступна новая версия приложения');
    },
    onOfflineReady() {
      console.log('[PWA] Приложение готово к полной автономной оффлайн-работе');
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);

