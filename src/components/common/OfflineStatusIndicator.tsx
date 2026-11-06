import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Database, Check, AlertCircle } from 'lucide-react';
import { getOfflineDbStats, OfflineDbStats } from '../../services/offlineDatabase';

export const OfflineStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnectedBanner, setShowReconnectedBanner] = useState(false);
  const [dbStats, setDbStats] = useState<OfflineDbStats | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedBanner(true);
      const timer = setTimeout(() => setShowReconnectedBanner(false), 4500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedBanner(false);
      // При переходе в оффлайн обновляем статистику IndexedDB
      getOfflineDbStats().then(setDbStats).catch(() => {});
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Первичный опрос статистики IndexedDB
    getOfflineDbStats().then(setDbStats).catch(() => {});

    // Периодический опрос раз в 15 секунд
    const interval = setInterval(() => {
      getOfflineDbStats().then(setDbStats).catch(() => {});
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Если оффлайн — показываем постоянную аккуратную плашку
  if (!isOnline) {
    return (
      <div className="bg-amber-500 text-stone-900 px-4 py-2 border-b border-amber-600/30 flex items-center justify-between text-xs font-semibold shadow-xs select-none animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center space-x-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-900 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-stone-900"></span>
          </span>
          <WifiOff className="w-4 h-4 text-stone-900" />
          <span>
            Оффлайн-режим активен • Центр управления работает полностью автономно
          </span>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-[11px] bg-amber-600/20 px-2.5 py-1 rounded-lg">
          <Database className="w-3.5 h-3.5" />
          <span>
            IndexedDB: {dbStats ? `${dbStats.taskCount} задач, ${dbStats.eventCount} событий` : 'активна'}
          </span>
        </div>
      </div>
    );
  }

  // При восстановлении связи — уведомление о реконнекте
  if (showReconnectedBanner) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2 border-b border-emerald-700 flex items-center justify-between text-xs font-semibold shadow-xs select-none animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center space-x-2">
          <Wifi className="w-4 h-4 text-emerald-100" />
          <span>Подключение к интернету восстановлено • Данные синхронизированы с локальным хранилищем</span>
        </div>
        <button
          onClick={() => setShowReconnectedBanner(false)}
          className="text-emerald-100 hover:text-white px-2 py-0.5 rounded cursor-pointer"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
};
