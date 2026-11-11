import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { parseRuDate, humanDate, RuDateResult } from '../../utils/ruDate';
import { useHousehold } from '../../context/HouseholdContext';
import { HouseholdZone, PriorityLevel, RecurrenceType, TaskItem } from '../../types';
import { MemberAvatar } from '../common/MemberAvatar';
import { formatLocalDate } from '../../utils/dateUtils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TaskItem | null;
}

const ZONES: HouseholdZone[] = [
  'Весь дом',
  'Кухня',
  'Гостиная',
  'Ванная',
  'Спальня',
  'Детская',
  'Прихожая',
  'Авто',
  'Участок/Дача',
];

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, taskToEdit }) => {
  const { members, addTask, updateTask, deleteTask } = useHousehold();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [zone, setZone] = useState<HouseholdZone>(taskToEdit?.zone || 'Весь дом');
  const [assigneeId, setAssigneeId] = useState<string | null>(taskToEdit?.assigneeId ?? null);
  const [isRotation, setIsRotation] = useState<boolean>(taskToEdit?.isRotation || false);
  const [rotationOrder, setRotationOrder] = useState<string[]>(
    taskToEdit?.rotationOrder || members.map((m) => m.id)
  );
  const [recurrence, setRecurrence] = useState<RecurrenceType>(taskToEdit?.recurrence || 'none');
  const [dueDate, setDueDate] = useState(
    taskToEdit?.dueDate || formatLocalDate(new Date())
  );
  const [dueTime, setDueTime] = useState(taskToEdit?.dueTime || '');
  const [priority, setPriority] = useState<PriorityLevel>(taskToEdit?.priority || 'medium');
  const [points, setPoints] = useState<number>(taskToEdit?.points || 15);

  const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; completed: boolean }>>(
    taskToEdit?.subtasks || []
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Синхронизация состояния формы при открытии модального окна или смене редактируемой задачи
  const [dateTouched, setDateTouched] = useState(false);
  const [titleParse, setTitleParse] = useState<RuDateResult | null>(null);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (taskToEdit) return;
    const r = parseRuDate(value);
    setTitleParse(r.hasDate || r.time ? r : null);
    if (r.hasDate && !dateTouched) setDueDate(r.date);
    if (r.time) setDueTime(r.time);
  };

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title || '');
        setDescription(taskToEdit.description || '');
        setZone(taskToEdit.zone || 'Весь дом');
        setAssigneeId(taskToEdit.assigneeId ?? null);
        setIsRotation(taskToEdit.isRotation || false);
        setRotationOrder(taskToEdit.rotationOrder || members.map((m) => m.id));
        setRecurrence(taskToEdit.recurrence || 'none');
        setDueDate(taskToEdit.dueDate || formatLocalDate(new Date()));
        setDueTime(taskToEdit.dueTime || '');
        setPriority(taskToEdit.priority || 'medium');
        setPoints(taskToEdit.points || 15);
        setSubtasks(taskToEdit.subtasks || []);
      } else {
        setTitle('');
        setDescription('');
        setZone('Весь дом');
        setAssigneeId(null);
        setIsRotation(false);
        setRotationOrder(members.map((m) => m.id));
        setRecurrence('none');
        setDueDate(formatLocalDate(new Date()));
        setDueTime('');
        setPriority('medium');
        setPoints(15);
        setSubtasks([]);
      }
      setNewSubtaskTitle('');
      setDateTouched(false);
      setTitleParse(null);
    }
    // members намеренно не в зависимостях: обновление списка не должно сбрасывать ввод
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, taskToEdit]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      { id: 'st_' + Date.now(), title: newSubtaskTitle.trim(), completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (taskToEdit) {
      updateTask(taskToEdit.id, {
        title: title.trim(),
        description: description.trim(),
        zone,
        assigneeId,
        isRotation,
        rotationOrder: isRotation ? rotationOrder : undefined,
        recurrence,
        dueDate,
        dueTime: dueTime || undefined,
        priority,
        points,
        subtasks,
      });
    } else {
      addTask({
        title: (titleParse ? titleParse.cleanTitle : title).trim(),
        description: description.trim(),
        zone,
        assigneeId,
        isRotation,
        rotationOrder: isRotation ? rotationOrder : undefined,
        currentRotationIndex: 0,
        recurrence,
        dueDate,
        dueTime: dueTime || undefined,
        priority,
        completed: false,
        points,
        subtasks,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[var(--surface-2)] rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface)]">
          <h3 className="text-base font-semibold text-[var(--text)]">
            {taskToEdit ? 'Редактировать задачу' : 'Новое поручение или рутина'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Название */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">
              Что нужно сделать? *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Например: в субботу помыть окна"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
            />
            {titleParse && (
              <p className="mt-2 text-[14px] text-[var(--accent)]">
                Срок: {humanDate(dueDate)}
                {titleParse.time ? `, ${titleParse.time}` : ''}
                <span className="text-[var(--muted)]"> — сохраню как «{titleParse.cleanTitle}»</span>
              </p>
            )}
          </div>

          {/* Описание / Заметка */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">
              Заметки или детали
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Где лежат расходники, какие особенности..."
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] resize-none"
            />
          </div>

          {/* Сетка: Зона дома и Приоритет */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Зона дома
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as HouseholdZone)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)] focus:outline-none"
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Приоритет
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)] focus:outline-none"
              >
                <option value="low">Низкий (не к спеху)</option>
                <option value="medium">Обычный</option>
                <option value="high">Высокий (важно)</option>
              </select>
            </div>
          </div>

          {/* Исполнитель и Ротация (Ключевая фишка OneHaus) */}
          <div className="p-4 rounded-2xl bg-[var(--surface-3)] border border-[var(--line)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--text)]">
                Кто выполняет?
              </label>
              <label className="flex items-center space-x-1.5 text-xs text-[var(--accent)] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRotation}
                  onChange={(e) => setIsRotation(e.target.checked)}
                  className="rounded text-[var(--accent)] focus:ring-0"
                />
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Очередь по кругу (ротация)</span>
              </label>
            </div>

            {/* Выбор участника */}
            <div className="grid grid-cols-4 gap-2">
              {members.map((member) => {
                const isSelected = isRotation
                  ? rotationOrder.includes(member.id)
                  : assigneeId === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      if (isRotation) {
                        setRotationOrder((prev) =>
                          prev.includes(member.id)
                            ? prev.filter((id) => id !== member.id)
                            : [...prev, member.id]
                        );
                      } else {
                        setAssigneeId(assigneeId === member.id ? null : member.id);
                      }
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center ${ isSelected ? 'bg-[var(--surface)] border-[var(--accent)] shadow-[var(--shadow)]' : 'bg-[var(--surface)]/50 border-stone-200 hover:bg-[var(--surface)]' }`}
                  >
                    <MemberAvatar
                      member={member}
                      size="md"
                      className="mb-1"
                    />
                    <span className="text-[12px] font-semibold text-[var(--text)]">
                      {member.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {isRotation && (
              <p className="text-[12px] text-[var(--muted)]">
                Каждый раз после выполнения обязанность автоматически передаётся следующему участнику очереди.
              </p>
            )}
          </div>

          {/* Дата, Время и Повторение */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Дата срока
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setDateTouched(true);
                }}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Время (опция)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                Повторение
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
              >
                <option value="none">Разово</option>
                <option value="daily">Каждый день</option>
                <option value="weekly">Раз в неделю</option>
                <option value="biweekly">Раз в две недели</option>
                <option value="monthly">Раз в месяц</option>
              </select>
            </div>
          </div>

          {/* Подзадачи (чек-лист) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">
              Шаги выполнения (чек-лист)
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Добавить шаг..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-xs text-[var(--text)]"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 rounded-xl bg-[var(--surface-3)] hover:bg-[var(--line)] text-[var(--text)] text-xs font-semibold"
              >
                Добавить
              </button>
            </div>

            <div className="space-y-1.5">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface)] border border-stone-200 text-xs"
                >
                  <span className="text-[var(--text)]">{st.title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="text-stone-400 hover:text-stone-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Кнопки сохранения */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[var(--line)]">
            {taskToEdit && (
              <button
                type="button"
                onClick={() => {
                  if (!confirmDelete) return setConfirmDelete(true);
                  deleteTask(taskToEdit.id);
                  onClose();
                }}
                className={`mr-auto px-4 py-2.5 rounded-full text-sm font-medium transition ${confirmDelete ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50'}`}
              >
                {confirmDelete ? 'Точно удалить?' : 'Удалить задачу'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-black/5"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
            >
              {taskToEdit ? 'Сохранить изменения' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
