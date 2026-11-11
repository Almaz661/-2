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
import { ZonesBoard } from '../zones/ZonesBoard';
import { ChecklistsBoard } from './ChecklistsBoard';
import { RoutineBoard } from './RoutineBoard';
import { CleaningMapBoard } from './CleaningMapBoard';
import { groupByRoom } from '../../utils/cleaningOrder';
import { LibraryBoard } from './LibraryBoard';
import { useStarterZones } from '../zones/useStarterZones';
import { computeZones, ZoneTask } from '../../services/zones';
import { Btn, Card, EmptyState, FilterMenu, GroupLabel, IconBtn, PageWrap, Segmented, Slide, Tag } from '../ui/mercury';
import { formatLocalDate } from '../../utils/dateUtils';

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

export const ZONE_EMOJIS: Record<string, string> = {
  'Все': '✨',
  'Весь дом': '🏡',
  'Кухня': '🍳',
  'Гостиная': '🛋️',
  'Ванная': '🛁',
  'Спальня': '🛏️',
  'Детская': '🧸',
  'Прихожая': '🚪',
  'Авто': '🚗',
  'Участок/Дача': '🌳',
};

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

  const todayStr = formatLocalDate(new Date());

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
        <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 flex items-center space-x-1">
          <Flame className="w-3 h-3 text-rose-600" />
          <span>Срочно</span>
        </span>
      );
    }
    if (priority === 'medium') {
      return (
        <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
          Обычный
        </span>
      );
    }
    return (
      <span className="text-[12px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
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

  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatLocalDate(d);
  })();
  // По дате; в один день — дела со временем по времени, остальные по комнатам и приборам (без беготни по дому)
  const roomRank = new Map(groupByRoom(filteredTasks).flatMap((g) => g.items).map((t, i) => [t.id, i]));
  const sorted = filteredTasks
    .slice()
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        (a.dueTime || '99').localeCompare(b.dueTime || '99') ||
        (roomRank.get(a.id) ?? 0) - (roomRank.get(b.id) ?? 0)
    );
  const groups: { id: string; label: string; tone?: 'danger'; items: TaskItem[] }[] =
    activeTab === 'all'
      ? [
          { id: 'overdue', label: 'Пора сделать', tone: 'danger' as const, items: sorted.filter((t) => t.dueDate < todayStr) },
          { id: 'today', label: 'Сегодня', items: sorted.filter((t) => t.dueDate === todayStr) },
          { id: 'tomorrow', label: 'Завтра', items: sorted.filter((t) => t.dueDate === tomorrowStr) },
          { id: 'later', label: 'Позже', items: sorted.filter((t) => t.dueDate > tomorrowStr) },
        ].filter((g) => g.items.length > 0)
      : [{ id: 'flat', label: '', items: sorted }];

  const formatDue = (t: TaskItem) => {
    if (t.dueDate === todayStr) return 'Сегодня';
    if (t.dueDate === tomorrowStr) return 'Завтра';
    return new Date(t.dueDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const openNew = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  // Вид «Список» или «По зонам» (как у Tody: состояние каждой зоны дома)
  const [viewMode, setViewMode] = useState<'list' | 'zones' | 'checklists' | 'map' | 'library'>(() => {
    try {
      const v = localStorage.getItem('dbh_tasks_view');
      return v === 'zones' || v === 'map' ? 'map' : v === 'checklists' || v === 'library' ? v : 'list';
    } catch {
      return 'list';
    }
  });
  const [focusZone] = useState<HouseholdZone | null>(() => {
    try {
      const z = localStorage.getItem('dbh_tasks_zone') as HouseholdZone | null;
      localStorage.removeItem('dbh_tasks_zone');
      return z;
    } catch {
      return null;
    }
  });
  const changeView = (v: 'list' | 'zones' | 'checklists' | 'map' | 'library') => {
    setViewMode(v);
    try {
      localStorage.setItem('dbh_tasks_view', v);
    } catch {
      /* нет хранилища */
    }
  };
  const visibleTasks = activeMemberId ? tasks.filter((t) => t.assigneeId === activeMemberId) : tasks;
  const zones = computeZones(visibleTasks);
  const addStarterZones = useStarterZones();
  const markDone = (zt: ZoneTask) => {
    if (!zt.task.completed) toggleTaskCompletion(zt.task.id);
    else updateTask(zt.task.id, { completedAt: new Date().toISOString() }, { silent: true });
  };

  const tabOptions = [
    { id: 'all' as TaskTab, label: 'Активные', count: tasks.filter((t) => !t.completed).length },
    { id: 'today' as TaskTab, label: 'Сегодня', count: tasks.filter((t) => !t.completed && t.dueDate === todayStr).length },
    { id: 'upcoming' as TaskTab, label: 'Предстоящие' },
    { id: 'rotation' as TaskTab, label: 'Ротация' },
    { id: 'completed' as TaskTab, label: 'Выполненные', count: tasks.filter((t) => t.completed).length },
  ];

  const renderRow = (task: TaskItem) => {
    const assignee = members.find((m) => m.id === task.assigneeId);
    const isExpanded = expandedTaskIds.includes(task.id);
    const isOverdue = !task.completed && task.dueDate < todayStr;
    const rec = getRecurrenceText(task.recurrence);
    const sub = task.subtasks || [];
    return (
      <div key={task.id} className="border-t border-[var(--line)] first:border-t-0">
        <div className="group grid grid-cols-[40px_1fr_auto_auto] md:grid-cols-[40px_1fr_130px_150px_96px_88px] items-center gap-x-3 px-2 sm:px-3 py-3 rounded-xl hover:bg-[var(--surface-3)] transition-colors">
          <button
            type="button"
            onClick={() => toggleTaskCompletion(task.id)}
            aria-label={task.completed ? 'Вернуть в работу' : 'Отметить выполненной'}
            aria-pressed={task.completed}
            className={`w-8 h-8 ml-1 rounded-full grid place-items-center border transition-colors ${
              task.completed
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-[var(--line-strong)] text-transparent hover:border-[var(--accent)] hover:text-[var(--accent)]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>

          <div
            className="min-w-0 cursor-pointer"
            role="button"
            tabIndex={0}
            title="Открыть и изменить"
            onClick={() => {
              setTaskToEdit(task);
              setIsTaskModalOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setTaskToEdit(task);
                setIsTaskModalOpen(true);
              }
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`text-[16px] font-medium line-clamp-2 md:line-clamp-1 break-words ${
                  task.completed ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'
                }`}
              >
                {task.title}
              </span>
              {task.priority === 'high' && !task.completed && (
                <Tag tone="danger" icon={<Flame className="w-3 h-3" />}>
                  Срочно
                </Tag>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[14px] text-[var(--muted)] flex-wrap">
              {task.description && <span className="truncate max-w-[28rem]">{task.description}</span>}
              {task.isRotation && (
                <Tag tone="accent" icon={<RefreshCw className="w-3 h-3" />}>
                  Ротация
                </Tag>
              )}
              {rec && <Tag>{rec}</Tag>}
              {task.packName && <Tag>{task.packName}</Tag>}
              {/* На телефоне зона и исполнитель — под названием */}
              <span className="md:hidden">
                {task.zone}
                {assignee ? `, ${assignee.name}` : ''}
              </span>
            </div>
          </div>

          <span className="hidden md:block text-sm text-[var(--text-2)] truncate">{task.zone}</span>

          <span className="hidden md:flex items-center gap-2 min-w-0">
            {assignee ? (
              <>
                <MemberAvatar member={assignee} size="xs" />
                <span className="text-sm text-[var(--text-2)] truncate">{assignee.name}</span>
              </>
            ) : (
              <span className="text-sm text-[var(--muted)]">Без исполнителя</span>
            )}
          </span>

          <span
            className={`text-sm tabular-nums text-right md:text-left ${
              isOverdue ? 'text-amber-700 font-medium' : 'text-[var(--text-2)]'
            }`}
          >
            {formatDue(task)}
            {task.dueTime && <span className="block text-[14px] text-[var(--muted)]">{task.dueTime}</span>}
          </span>

          <div className="flex items-center justify-end gap-0.5 hover-actions opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <IconBtn
              title="Редактировать"
              aria-label="Редактировать"
              onClick={() => {
                setTaskToEdit(task);
                setIsTaskModalOpen(true);
              }}
            >
              <Edit2 className="w-4 h-4" />
            </IconBtn>
            <IconBtn danger title="Удалить" aria-label="Удалить" onClick={() => deleteTask(task.id)}>
              <Trash2 className="w-4 h-4" />
            </IconBtn>
          </div>
        </div>

        {sub.length > 0 && (
          <div className="pl-[52px] sm:pl-[60px] pr-3 pb-2 -mt-1">
            <button
              type="button"
              onClick={() => toggleExpand(task.id)}
              aria-expanded={isExpanded}
              className="inline-flex items-center gap-1 text-[14px] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              Шаги {sub.filter((s) => s.completed).length} из {sub.length}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
              <div className="mt-2 space-y-1">
                {sub.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() =>
                      updateTask(task.id, {
                        subtasks: sub.map((x) => (x.id === st.id ? { ...x, completed: !x.completed } : x)),
                      })
                    }
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-sm hover:bg-[var(--surface-3)] transition-colors"
                  >
                    <span
                      className={`w-4 h-4 rounded-md border grid place-items-center ${
                        st.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--line-strong)]'
                      }`}
                    >
                      {st.completed && <CheckCircle2 className="w-3 h-3" />}
                    </span>
                    <span className={st.completed ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'}>
                      {st.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <PageWrap>
      {/* Панель: вкладки, фильтры, действия */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={viewMode}
          onChange={changeView}
          options={[
            { id: 'list', label: 'Дела' },
            { id: 'map', label: 'Уборка' },
            { id: 'checklists', label: 'Чек-листы' },
            { id: 'library', label: 'Библиотека' },
          ]}
        />
        {viewMode === 'list' && <Segmented value={activeTab} onChange={setActiveTab} options={tabOptions} />}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {(viewMode === 'list' || viewMode === 'zones') && (
          <>
          <FilterMenu
            label="Зона"
            value={selectedZone}
            allValue={'Все' as HouseholdZone | 'Все'}
            onChange={setSelectedZone}
            options={ZONES.map((z) => ({ id: z, label: z === 'Все' ? 'Все зоны' : z }))}
          />
          {!activeMemberId && (
            <FilterMenu
              label="Исполнитель"
              value={selectedAssignee}
              allValue="all"
              onChange={setSelectedAssignee}
              options={[{ id: 'all', label: 'Все участники' }, ...members.map((m) => ({ id: m.id, label: m.name }))]}
            />
          )}
          </>
          )}
          {viewMode === 'list' && (
            <Btn className="max-md:!hidden" icon={<Sparkles className="w-4 h-4" />} onClick={() => setIsPacksModalOpen(true)}>
              Пакеты задач
            </Btn>
          )}
          <Btn variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openNew}>
            Новая задача
          </Btn>
        </div>
      </div>

      {viewMode === 'map' && <CleaningMapBoard />}
      {viewMode === 'library' && <LibraryBoard />}

      {viewMode === 'checklists' && (
        <div className="space-y-10">
          <RoutineBoard />
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-1 px-1">🍂 Чек-листы по событию и по сезону</h2>
            <p className="text-[14px] text-[var(--muted)] mb-4 px-1">Гости, поездка, болезнь, праздник, непогода, отключение света, ремонт — и сезонные дела дома, дачи и техники.</p>
            <ChecklistsBoard />
          </div>
        </div>
      )}

      {viewMode === 'zones' && <ZonesBoard zones={zones} focusZone={focusZone} onDone={markDone} onAdd={openNew} onStarter={addStarterZones} />}

      {viewMode === 'list' && (
      <Card className="p-2 sm:p-3">
        {sorted.length > 0 && (
          <div className="hidden md:grid grid-cols-[40px_1fr_130px_150px_96px_88px] gap-x-3 px-3 pt-2 pb-2 text-xs text-[var(--muted)] border-b border-[var(--line)]">
            <span />
            <span>Задача</span>
            <span>Зона</span>
            <span>Исполнитель</span>
            <span>Срок</span>
            <span />
          </div>
        )}

        {sorted.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-5 h-5" />}
            title={activeTab === 'completed' ? 'Пока ничего не выполнено' : 'Задач нет'}
            text="В этой вкладке и с этими фильтрами задач нет. Создайте задачу или добавьте готовый пакет."
            action={
              <>
                <Btn onClick={() => setIsPacksModalOpen(true)}>Выбрать пакет</Btn>
                <Btn variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openNew}>
                  Новая задача
                </Btn>
              </>
            }
          />
        ) : (
          <Slide k={activeTab} index={tabOptions.findIndex((t) => t.id === activeTab)}>
          {groups.map((g) => (
            <div key={g.id}>
              {g.label && <GroupLabel label={g.label} count={g.items.length} tone={g.tone === 'danger' ? 'danger' : 'default'} />}
              {g.items.map(renderRow)}
            </div>
          ))}
          </Slide>
        )}

        {sorted.length > 0 && (
          <div className="border-t border-[var(--line)] mt-1 pt-1">
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-colors"
            >
              <span className="w-8 h-8 ml-1 rounded-full border border-dashed border-[var(--line-strong)] grid place-items-center">
                <Plus className="w-4 h-4" />
              </span>
              Добавить задачу
            </button>
          </div>
        )}
      </Card>
      )}

      {/* Модальные окна */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
      />

      <TaskPacksModal isOpen={isPacksModalOpen} onClose={() => setIsPacksModalOpen(false)} />
    </PageWrap>
  );
};
