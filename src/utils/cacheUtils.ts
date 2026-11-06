/**
 * Утилита полной очистки кэша приложения, Service Worker и локального хранилища.
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

    // 3. Очистка LocalStorage и SessionStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
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
