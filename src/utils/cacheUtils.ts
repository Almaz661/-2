/**
 * Очистка кэша приложения и Service Worker с перезагрузкой. Данные пользователя (localStorage) сохраняются.
 */

export async function clearAllCacheAndReload() {
  try {
    // 1. Очистка CacheStorage
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // 2. Снятие Service Worker
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }

    // 3. ДАННЫЕ НЕ ТРОГАЕМ: задачи, документы, паспорт дома и всё остальное хранятся в localStorage.
    //    Раньше здесь был localStorage.clear() — он молча стирал все данные, хотя окно обещало «данные сохранятся».
    //    Полный сброс данных — только в «Настройки → Данные → Сброс», с отдельным подтверждением.
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch (err) {
    console.error('Ошибка при очистке кэша:', err);
  } finally {
    // 4. Перезагрузка страницы с очисткой
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
