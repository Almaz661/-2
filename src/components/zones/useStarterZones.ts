import { useHousehold } from '../../context/HouseholdContext';
import { STARTER_ZONE_TASKS } from '../../services/zones';
import { formatLocalDate } from '../../utils/dateUtils';

/** Добавить типовые повторяющиеся дела по зонам (пропуская те, что уже есть). */
export function useStarterZones() {
  const { tasks, addTask, showToast, activeMemberId } = useHousehold();
  return () => {
    const existing = new Set(tasks.map((t) => t.title.toLowerCase()));
    const todo = STARTER_ZONE_TASKS.filter((s) => !existing.has(s.title.toLowerCase()));
    todo.forEach((s) => {
      const d = new Date();
      d.setDate(d.getDate() + s.inDays);
      addTask(
        {
          title: s.title,
          zone: s.zone,
          assigneeId: activeMemberId,
          isRotation: false,
          recurrence: s.recurrence,
          dueDate: formatLocalDate(d),
          priority: 'medium',
          completed: false,
          packName: 'Дом по зонам',
        },
        { silent: true }
      );
    });
    showToast(
      todo.length ? `Добавлено типовых дел: ${todo.length}. Их можно изменить или удалить в «Задачах»` : 'Типовые дела уже добавлены',
      'success'
    );
  };
}
