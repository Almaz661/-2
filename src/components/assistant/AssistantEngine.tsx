import { useEffect, useRef } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { pendingActions } from '../../services/orchestrator';
import { tasksToReopen } from '../../services/zones';
import { morningMessage, planForDate } from '../../services/cleaningPlan';
import { showSystemNotification } from '../../services/notificationService';
import { formatLocalDate } from '../../utils/dateUtils';
import { assistantStore, useAssistantSignals } from './useAssistant';

/**
 * Невидимый «мотор» главного ассистента.
 * При любом изменении данных (и раз в 30 минут) пересчитывает сигналы по всем разделам,
 * сам создаёт нужные задачи и покупки (один раз на каждый случай) и присылает уведомления о горящих сроках.
 */
export function AssistantEngine() {
  const { tasks, addTask, addShoppingItems, updateTask, showToast } = useHousehold();
  const signals = useAssistantSignals();
  const latest = useRef({ signals, tasks, addTask, addShoppingItems, updateTask, showToast });
  latest.current = { signals, tasks, addTask, addShoppingItems, updateTask, showToast };

  useEffect(() => {
    const run = (manual = false) => {
      const { signals, tasks, addTask, addShoppingItems, updateTask, showToast } = latest.current;
      const settings = assistantStore.getSettings();
      const log: string[] = [];

      // Повторяющиеся дела, которым снова пора, возвращаются в работу с новым сроком
      for (const r of tasksToReopen(tasks)) {
        const t = tasks.find((x) => x.id === r.id);
        updateTask(r.id, { completed: false, dueDate: r.dueDate }, { silent: true });
        if (t) log.push(`Снова пора: ${t.title}`);
      }

      if (settings.autoActions) {
        const done = new Set(Object.keys(assistantStore.getDone()));
        const todo = pendingActions(signals, done, tasks);
        if (todo.length) {
          assistantStore.markDone(todo.map((s) => s.key)); // сначала отмечаем — без повторов
          const shopping = todo.flatMap((s) => (s.action?.kind === 'shopping' ? [s.action.item] : []));
          if (shopping.length) {
            addShoppingItems(shopping, { silent: true });
            shopping.forEach((i) => log.push(`Добавил в покупки: ${i.title}`));
          }
          todo.forEach((s) => {
            if (s.action?.kind === 'task') {
              addTask(s.action.task, { silent: true });
              log.push(`Создал задачу: ${s.action.task.title}`);
            }
          });
        }
      }

      if (settings.notify) {
        const today = formatLocalDate(new Date());
        const notified = assistantStore.getNotified();
        const urgent = signals.filter((s) => s.severity !== 'info' && notified[s.key] !== today);
        if (urgent.length) {
          const first = urgent[0];
          const sent = showSystemNotification('Дом без хаоса', {
            body: urgent.length === 1 ? `${first.title} — ${first.when}` : `${first.title} и ещё ${urgent.length - 1}`,
            tag: 'dbh-assistant',
          });
          if (sent) {
            urgent.forEach((s) => (notified[s.key] = today));
            assistantStore.setNotified(notified);
          }
        }
      }

      assistantStore.addLog(log);
      const plural = (n: number) =>
        n % 10 === 1 && n % 100 !== 11 ? 'действие' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'действия' : 'действий';
      // Тихий режим: сделанное записывается в журнал, без всплывающих сообщений; отклик — только на «Проверить сейчас»
      if (manual && log.length)
        showToast(log.length === 1 ? `Ассистент: ${log[0]}` : `Ассистент выполнил ${log.length} ${plural(log.length)}`, 'info');
      else if (manual) showToast('Ассистент проверил все разделы: новых действий нет', 'success');
    };

    // Утреннее сообщение: один раз в день, как только наступило выбранное время
    const morning = () => {
      const st = assistantStore.getSettings();
      if (!st.morning) return;
      const now = new Date();
      const today = formatLocalDate(now);
      const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (hm < st.morningTime || assistantStore.getMorningSent() === today) return;
      const msg = morningMessage(planForDate(now));
      assistantStore.setMorningSent(today);
      showSystemNotification(msg.title, { body: msg.body, tag: 'dbh-morning' });
      assistantStore.addLog([`Утреннее сообщение: ${msg.body}`]);
    };
    const mTimer = window.setInterval(morning, 60 * 1000);
    window.setTimeout(morning, 2500);

    const t = window.setTimeout(() => run(), 1500);
    const timer = window.setInterval(() => run(), 30 * 60 * 1000);
    const onManual = () => run(true);
    const onVisible = () => document.visibilityState === 'visible' && run();
    window.addEventListener('dbh:assistant-run', onManual);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(timer);
      window.clearInterval(mTimer);
      window.removeEventListener('dbh:assistant-run', onManual);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // Перезапуск при изменении данных: сигналы зависят от всех разделов
  }, [signals]);

  return null;
}
