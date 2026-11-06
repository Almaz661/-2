import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  RefreshCw,
  Sparkles,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { HouseholdZone, TaskItem } from '../../types';
import { TaskModal } from './TaskModal';
import { TaskPacksModal } from './TaskPacksModal';
import { MemberAvatar } from '../common/MemberAvatar';

type TaskTab = 'all' | 'today' | 'upcoming' | 'rotation' | 'completed';

const ZONES: Array<HouseholdZone | 'Все'> = [
  'Все',
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

export const TasksView: React.FC = () => {
  const {
    tasks,
    toggleTaskCompletion,
    deleteTask,
    updateTask,
    members,
    activeMemberId,
  } = useHousehold();

  const [activeTab, setActiveTab] = useState<TaskTab>('all');
  const [selectedZone, setSelectedZone] = useState<HouseholdZone | 'Все'>('Все');
  const [selectedAssignee, setSelectedAssignee] = useState<string | 'all'>(
    activeMemberId || 'all'
  );
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskItem | null>(null);
  const [isPacksModalOpen, setIsPacksModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const toggleExpand = (id: string) => {
    setExpandedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Фильтрация
  const filteredTasks = tasks.filter((t) => {
    // 1. По активному табу
    if (activeTab === 'today') {
      if (t.completed || t.dueDate !== todayStr) return false;
    } else if (activeTab === 'upcoming') {
      if (t.completed || t.dueDate <= todayStr) return false;
    } else if (activeTab === 'rotation') {
      if (!t.isRotation) return false;
    } else if (activeTab === 'completed') {
      if (!t.completed) return false;
    } else if (activeTab === 'all') {
      if (t.completed) return false;
    }

    // 2. По зоне
    if (selectedZone !== 'Все' && t.zone !== selectedZone) {
      return false;
    }

    // 3. По исполнителю
    const effectiveAssignee = activeMemberId || (selectedAssignee !== 'all' ? selectedAssignee : null);
    if (effectiveAssignee && t.assigneeId !== effectiveAssignee) {
      return false;
    }

    return true;
  });

  const getPriorityBadge = (priority: TaskItem['priority']) => {
    if (priority === 'high') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 flex items-center space-x-1">
          <Flame className="w-3 h-3 text-rose-600" />
          <span>Срочно</span>
        </span>
      );
    }
    if (priority === 'medium') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
          Обычный
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
        Низкий
      </span>
    );
  };

  const getRecurrenceText = (rec: TaskItem['recurrence']) => {
    switch (rec) {
      case 'daily':
        return 'Каждый день';
      case 'weekly':
        return 'Раз в неделю';
      case 'biweekly':
        return 'Раз в 2 недели';
      case 'monthly':
        return 'Раз в месяц';
      default:
        return null;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Верхняя панель управления: Табы и кнопки действий */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Вкладки состояния */}
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-[#EFECE4] border border-[#E3DFD5]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-[#1F1D1A] shadow-xs'
                : 'text-[#6B6456] hover:text-[#1F1D1A]'
            }`}
          >
            Все активные ({tasks.filter((t) => !t.completed).length})
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'today'
                ? 'bg-white text-[#1F1D1A] shadow-xs'
                : 'text-[#6B6456] hover:text-[#1F1D1A]'
            }`}
          >
            Сегодня ({tasks.filter((t) => !t.completed && t.dueDate === todayStr).length})
          </button>
          <button
            onClick={() => setActiveTab('rotation')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'rotation'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-[#6B6456] hover:text-[#1F1D1A]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ротация</span>
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-white text-[#1F1D1A] shadow-xs'
                : 'text-[#6B6456] hover:text-[#1F1D1A]'
            }`}
          >
            Предстоящие
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'completed'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-[#6B6456] hover:text-[#1F1D1A]'
            }`}
          >
            Выполненные ({tasks.filter((t) => t.completed).length})
          </button>
        </div>

        {/* Кнопки вызова модалок */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPacksModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white border border-[#E3DFD5] text-[#1F1D1A] text-xs font-semibold hover:bg-[#F7F5EE] active:scale-[0.98] transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#E15A42]" />
            <span>Пакеты задач</span>
          </button>

          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Новая задача</span>
          </button>
        </div>
      </div>

      {/* Горизонтальные фильтры по зонам дома */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-[#8A8477] uppercase tracking-wider shrink-0 mr-1">
          Зона:
        </span>
        {ZONES.map((zone) => (
          <button
            key={zone}
            onClick={() => setSelectedZone(zone)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedZone === zone
                ? 'bg-[#1F1D1A] text-white font-semibold shadow-xs'
                : 'bg-white border border-[#E5DFD1] text-[#5C564B] hover:bg-[#F3EFE6]'
            }`}
          >
            {zone}
          </button>
        ))}
      </div>

      {/* Список задач */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#EBE7DF] shadow-xs">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 stroke-[1.5] mb-3" />
            <h3 className="text-base font-bold text-[#1F1D1A]">Задачи не найдены</h3>
            <p className="text-xs text-[#8A8477] mt-1 max-w-sm mx-auto">
              В выбранной категории или зоне нет активных поручений. Можно создать новую задачу или применить готовый пакет!
            </p>
            <div className="mt-4 flex items-center justify-center space-x-3">
              <button
                onClick={() => setIsPacksModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#F7F4EC] text-[#8C522C] text-xs font-semibold hover:bg-[#EFEADF]"
              >
                Выбрать пакет задач
              </button>
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setIsTaskModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#E15A42] text-white text-xs font-semibold"
              >
                + Создать задачу
              </button>
            </div>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const assignee = members.find((m) => m.id === task.assigneeId);
            const isExpanded = expandedTaskIds.includes(task.id);
            const isOverdue = !task.completed && task.dueDate < todayStr;

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border transition-all ${
                  task.completed
                    ? 'border-[#EAE6DE] bg-[#FAF8F5] opacity-65'
                    : isOverdue
                    ? 'border-rose-300 shadow-xs'
                    : 'border-[#E5DFD1] hover:border-[#E15A42]/50 hover:shadow-xs'
                }`}
              >
                <div className="p-4 flex items-start justify-between gap-3">
                  {/* Чекбокс и текст задачи */}
                  <div className="flex items-start space-x-3 flex-1 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleTaskCompletion(task.id)}
                      className={`mt-0.5 w-6 h-6 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-stone-300 hover:border-[#E15A42] bg-white'
                      }`}
                    >
                      {task.completed && <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
                    </button>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                        <span
                          className={`text-sm font-bold truncate ${
                            task.completed
                              ? 'line-through text-stone-400'
                              : 'text-[#1F1D1A]'
                          }`}
                        >
                          {task.title}
                        </span>

                        {getPriorityBadge(task.priority)}

                        {task.isRotation && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 flex items-center space-x-1">
                            <RefreshCw className="w-3 h-3 text-blue-600" />
                            <span>Ротация</span>
                          </span>
                        )}

                        {getRecurrenceText(task.recurrence) && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F2EFE8] text-[#5C564B]">
                            {getRecurrenceText(task.recurrence)}
                          </span>
                        )}

                        {task.packName && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-orange-50 text-orange-700">
                            {task.packName}
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-[#8A8477] mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Мета-информация: Зона, Срок, Исполнитель */}
                      <div className="flex items-center space-x-3 mt-2 text-xs text-[#8A8477] flex-wrap gap-y-1">
                        <span className="font-semibold text-[#5C564B] bg-[#F7F4EC] px-2 py-0.5 rounded-md">
                          🏠 {task.zone}
                        </span>

                        <span
                          className={`flex items-center space-x-1 font-medium ${
                            isOverdue ? 'text-rose-600 font-bold' : ''
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {task.dueDate === todayStr
                              ? 'Сегодня'
                              : new Date(task.dueDate).toLocaleDateString('ru-RU')}
                          </span>
                        </span>

                        {task.dueTime && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{task.dueTime}</span>
                          </span>
                        )}

                        {assignee ? (
                          <div className="flex items-center space-x-1.5 pl-2 border-l border-stone-200">
                            <MemberAvatar member={assignee} size="xs" />
                            <span className="font-medium text-[#1F1D1A]">
                              {assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">Без исполнителя</span>
                        )}

                        {task.isRotation && task.rotationOrder && task.rotationOrder.length > 0 && (
                          <div
                            className="flex items-center space-x-1 pl-2 border-l border-stone-200"
                            title="Очередь исполнителей"
                          >
                            <span className="text-[10px] text-stone-400">Очередь:</span>
                            <div className="flex items-center -space-x-1">
                              {task.rotationOrder.map((mId) => {
                                const m = members.find((x) => x.id === mId);
                                if (!m) return null;
                                return (
                                  <MemberAvatar
                                    key={mId}
                                    member={m}
                                    size="2xs"
                                    className="ring-1 ring-white"
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Кнопки действий над задачей */}
                  <div className="flex items-center space-x-1 shrink-0">
                    {task.subtasks && task.subtasks.length > 0 && (
                      <button
                        onClick={() => toggleExpand(task.id)}
                        className="p-1.5 rounded-xl hover:bg-[#F3EFE6] text-stone-500 hover:text-stone-800 transition-colors"
                        title="Показать шаги"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <div className="flex items-center space-x-1 text-xs">
                            <span className="font-semibold text-stone-600">
                              {task.subtasks.filter((s) => s.completed).length}/
                              {task.subtasks.length}
                            </span>
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setTaskToEdit(task);
                        setIsTaskModalOpen(true);
                      }}
                      className="p-1.5 rounded-xl hover:bg-[#F3EFE6] text-stone-400 hover:text-stone-700 transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Раскрывающийся чек-лист подзадач */}
                {isExpanded && task.subtasks && task.subtasks.length > 0 && (
                  <div className="px-5 pb-4 pt-1 border-t border-stone-100 bg-[#FAF9F6] rounded-b-2xl space-y-2">
                    <div className="text-[11px] font-bold text-[#8A8477] uppercase tracking-wider">
                      Шаги выполнения
                    </div>
                    {task.subtasks.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => {
                          const updated = task.subtasks?.map((item) =>
                            item.id === st.id ? { ...item, completed: !item.completed } : item
                          );
                          updateTask(task.id, { subtasks: updated });
                        }}
                        className="flex items-center space-x-2 text-xs cursor-pointer group"
                      >
                        <span
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            st.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-stone-300 bg-white group-hover:border-[#E15A42]'
                          }`}
                        >
                          {st.completed && <CheckCircle2 className="w-3 h-3" />}
                        </span>
                        <span
                          className={st.completed ? 'line-through text-stone-400' : 'text-[#1F1D1A]'}
                        >
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Модальные окна */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
      />

      <TaskPacksModal
        isOpen={isPacksModalOpen}
        onClose={() => setIsPacksModalOpen(false)}
      />
    </div>
  );
};
