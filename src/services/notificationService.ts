/**
 * Сервис системных и in-app напоминаний (Web Notifications API + Web Audio API Chime)
 * Гарантирует воспроизведение звукового сигнала и визуального уведомления в браузере и PWA.
 */

import { CalendarEvent } from '../types';
import { formatLocalDate, getDiffDays, nextOccurrence } from '../utils/dateUtils';

export type NotificationSupportStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Воспроизведение чистого гармоничного колокольчика через Web Audio API
 * Не требует загрузки внешних mp3/wav файлов, работает мгновенно
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Первый тон (F#5 - 739.99 Гц)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(739.99, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    // Второй высокий тон (A5 - 880 Гц) со смещением для перелива
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.2);

    // Закрываем контекст после затухания
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch (err) {
    console.debug('Web Audio not allowed or failed:', err);
  }
}

export function getNotificationPermission(): NotificationSupportStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (error) {
    console.warn('Ошибка запроса разрешения на уведомления:', error);
    return false;
  }
}

export function showSystemNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification(title, {
      icon: '/assets/icon.png',
      badge: '/assets/icon.png',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (error) {
    console.warn('Ошибка создания системного уведомления:', error);
    return false;
  }
}

/**
 * Проверка предстоящих праздников и отправка напоминаний
 * Учитывает напоминания: в день праздника (0 дней), за 1 день, за 3 дня, за 7 дней
 */
export function checkUpcomingHolidayReminders(
  events: CalendarEvent[],
  onReminderTrigger?: (event: CalendarEvent, message: string) => void,
  forceCheck = false
): void {
  if (typeof window === 'undefined') return;

  const today = new Date();
  const todayStr = formatLocalDate(today);

  const notifiedKey = `onehaus_notified_holidays_${todayStr}`;
  let notifiedMap: Record<string, boolean> = {};
  if (!forceCheck) {
    try {
      const stored = sessionStorage.getItem(notifiedKey);
      if (stored) notifiedMap = JSON.parse(stored);
    } catch (_) {}
  }

  // Проверяем события с пометкой праздника или категории holiday/family
  const holidayEvents = events.filter(
    (ev) => ev.isHoliday || ev.category === 'holiday' || ev.holidayType || ev.recurringYearly
  );

  let hasTriggeredSound = false;

  holidayEvents.forEach((ev) => {
    // Точный расчет разницы в днях с учетом локального времени
    // Для ежегодных дат (дни рождения) считаем до ближайшей годовщины
    const diffDays = getDiffDays(nextOccurrence(ev, formatLocalDate(today)), today);

    // Проверяем, настроены ли дни напоминаний
    const reminderDays =
      ev.reminderDaysBefore && ev.reminderDaysBefore.length > 0
        ? ev.reminderDaysBefore
        : [0, 1, 3]; // По умолчанию напоминаем в день праздника, за 1 день и за 3 дня

    if (reminderDays.includes(diffDays)) {
      const triggerKey = `${ev.id}_days_${diffDays}`;
      if (!forceCheck && notifiedMap[triggerKey]) return; // Уже отправляли сегодня

      let message = '';
      if (diffDays === 0) {
        message = `🎉 Сегодня праздник: «${ev.title}»! Поздравляем!`;
      } else if (diffDays === 1) {
        message = `⏳ Завтра праздник: «${ev.title}»! Не забудьте подготовиться и поздравить.`;
      } else if (diffDays === 3) {
        message = `🗓️ Через 3 дня праздник: «${ev.title}». Самое время подготовить сюрприз или подарки.`;
      } else if (diffDays === 7) {
        message = `🎁 Через неделю событие: «${ev.title}». Напоминание запланировать праздник.`;
      } else if (diffDays > 0) {
        message = `🗓️ Через ${diffDays} дн. праздник: «${ev.title}».`;
      }

      if (message) {
        // 1. Звуковой сигнал колокольчика
        if (!hasTriggeredSound) {
          playNotificationSound();
          hasTriggeredSound = true;
        }

        // 2. Системное push-уведомление (если разрешено браузером)
        showSystemNotification(ev.title, {
          body: message,
          tag: triggerKey,
        });

        // 3. Вызываем коллбэк для красивого in-app баннера / тоста
        if (onReminderTrigger) {
          onReminderTrigger(ev, message);
        }

        notifiedMap[triggerKey] = true;
      }
    }
  });

  try {
    sessionStorage.setItem(notifiedKey, JSON.stringify(notifiedMap));
  } catch (_) {}
}
