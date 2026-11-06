import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
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

