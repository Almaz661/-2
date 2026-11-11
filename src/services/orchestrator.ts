// Главный ассистент (оркестратор).
// Смотрит на все разделы дома сразу и выдаёт единый список «сигналов»: что горит, что скоро, что нужно сделать.
// Для части сигналов предлагает автоматическое действие (создать задачу, добавить в покупки).
// Модуль чистый — без React и без побочных эффектов, поэтому его легко проверять тестами.
// Сами действия выполняет AssistantEngine, а показывает сигналы «Главный обзор».

import type {
  CalendarEvent,
  DocumentItem,
  InventoryItem,
  MedicineItem,
  ShoppingItem,
  ShoppingList,
  TaskItem,
  UtilityMeter,
} from '../types';
import { formatLocalDate, nextOccurrence } from '../utils/dateUtils';

export type SignalDomain = 'docs' | 'firstaid' | 'inventory' | 'utilities' | 'tasks' | 'calendar';
export type SignalSeverity = 'danger' | 'warn' | 'info';

export type AutoAction =
  | { kind: 'task'; task: Omit<TaskItem, 'id'> }
  | { kind: 'shopping'; item: Omit<ShoppingItem, 'id' | 'createdAt'> };

export interface Signal {
  /** Стабильный ключ: по нему ассистент помнит, что уже сделал, и не дублирует действия */
  key: string;
  domain: SignalDomain;
  severity: SignalSeverity;
  title: string;
  sub: string;
  /** Короткое значение справа: «через 5 дн.», «просрочено» */
  when: string;
  /** Дата события/срока YYYY-MM-DD — для сортировки */
  date: string;
  action?: AutoAction;
}

export interface OrchestratorInput {
  today?: Date;
  tasks: TaskItem[];
  events: CalendarEvent[];
  docs: DocumentItem[];
  medicines: MedicineItem[];
  inventory: InventoryItem[];
  meters: UtilityMeter[];
  shoppingItems: ShoppingItem[];
  shoppingLists: ShoppingList[];
}

const DAY = 86400000;
const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const daysBetween = (from: string, to: string) => Math.round((parseYmd(to).getTime() - parseYmd(from).getTime()) / DAY);
const addDays = (ymd: string, n: number) => {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + n);
  return formatLocalDate(d);
};
const whenText = (days: number) =>
  days < 0 ? 'просрочено' : days === 0 ? 'сегодня' : days === 1 ? 'завтра' : `через ${days} дн.`;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
/** Ближайший понедельник (день планирования по расписанию v2), не раньше завтра */
const nextMonday = (ymd: string) => {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
  return formatLocalDate(d);
};

const autoTask = (title: string, dueDate: string, priority: TaskItem['priority'], description: string): AutoAction => ({
  kind: 'task',
  task: {
    title,
    description,
    zone: 'Весь дом',
    assigneeId: null,
    isRotation: false,
    recurrence: 'none',
    dueDate,
    priority,
    completed: false,
    packName: 'Ассистент',
  },
});

export function computeSignals(input: OrchestratorInput): Signal[] {
  const todayStr = formatLocalDate(input.today ?? new Date());
  const out: Signal[] = [];

  // ── Документы: истекают в течение 30 дней ────────────────────────────────
  for (const doc of input.docs) {
    if (!doc.expiryDate) continue;
    const d = daysBetween(todayStr, doc.expiryDate);
    if (d > 30) continue;
    // Гарантию не продлевают — только напоминаем
    const isWarranty = doc.category === 'warranties';
    out.push({
      key: `doc:${doc.id}:${doc.expiryDate}`,
      domain: 'docs',
      severity: d < 0 ? 'danger' : d <= 7 ? 'danger' : 'warn',
      title: isWarranty
        ? `Гарантия заканчивается: ${doc.title}`
        : `Продлить: ${doc.title}`,
      sub: 'Документы',
      when: whenText(d),
      date: doc.expiryDate,
      action: isWarranty ? undefined : autoTask(
        `Продлить: ${doc.title}`,
        d <= 14 ? todayStr : addDays(doc.expiryDate, -14),
        d <= 7 ? 'high' : 'medium',
        `Срок действия до ${doc.expiryDate}. Задачу создал ассистент.`
      ),
    });
  }

  // ── Аптечка: просрочено, скоро истекает, заканчивается ───────────────────
  const pharmacyList =
    input.shoppingLists.find((l) => /аптек/i.test(l.name) || l.id.includes('pharmacy')) || input.shoppingLists[0];
  const openShopping = new Set(input.shoppingItems.filter((i) => !i.completed).map((i) => norm(i.title)));
  for (const med of input.medicines) {
    const d = daysBetween(todayStr, med.expiryDate);
    if (d <= 30) {
      out.push({
        key: `med-exp:${med.id}:${med.expiryDate}`,
        domain: 'firstaid',
        severity: d < 0 ? 'danger' : 'warn',
        title: d < 0 ? `Заменить: ${med.name}` : `Скоро заменить: ${med.name}`,
        sub: 'Аптечка',
        when: whenText(d),
        date: med.expiryDate,
      });
    }
    if (med.isLow || d < 0) {
      const title = `${med.name}${med.dosage ? ` (${med.dosage})` : ''}`;
      out.push({
        key: `med-buy:${med.id}`,
        domain: 'firstaid',
        severity: 'info',
        title: `Купить: ${title}`,
        sub: d < 0 ? 'Аптечка — замена просроченного' : 'Аптечка — заканчивается',
        when: 'в покупки',
        date: todayStr,
        action:
          pharmacyList && !openShopping.has(norm(title))
            ? {
                kind: 'shopping',
                item: { listId: pharmacyList.id, title, category: 'pharmacy', quantity: '1 уп', completed: false },
              }
            : undefined,
      });
    }
  }

  // ── Имущество: обслуживание, ТО, страховка, прививки, списания, гарантия ─
  for (const it of input.inventory) {
    const checks: { label: string; date?: string; task: boolean }[] = [
      { label: 'Обслуживание', date: it.nextServiceDate, task: true },
      { label: 'Гарантия заканчивается', date: it.warrantyExpiry, task: false },
      { label: 'ТО', date: it.vehicleDetails?.nextMaintenanceDate, task: true },
      { label: 'Страховка', date: it.vehicleDetails?.insuranceExpiry, task: true },
      { label: 'Прививка', date: it.petDetails?.nextVaccinationDate, task: true },
      { label: 'Списание подписки', date: it.subscriptionDetails?.nextPaymentDate, task: false },
    ];
    for (const c of checks) {
      if (!c.date) continue;
      const d = daysBetween(todayStr, c.date);
      if (d > 14) continue;
      out.push({
        key: `inv:${it.id}:${c.label}:${c.date}`,
        domain: 'inventory',
        severity: d < 0 ? 'danger' : d <= 3 ? 'warn' : 'info',
        title: `${c.label}: ${it.name}`,
        sub: 'Имущество',
        when: whenText(d),
        date: c.date,
        action: c.task
          ? autoTask(
              `${c.label}: ${it.name}`,
              // Срочное (страховка) — сегодня; плановое обслуживание — в день планирования, чтобы не сыпалось на сегодня
              c.label === 'Страховка' && d <= 7 ? todayStr : d < 0 ? nextMonday(todayStr) : c.date,
              d <= 3 ? 'high' : 'medium',
              `Срок ${c.date}. Задачу создал ассистент.`
            )
          : undefined,
      });
    }
  }

  // ── Счётчики: окно подачи 15–25 число ────────────────────────────────────
  const day = Number(todayStr.slice(8, 10));
  const month = todayStr.slice(0, 7);
  if (day >= 15 && day <= 25 && input.meters.length > 0) {
    const missing = input.meters.filter((m) => !m.readings.some((r) => r.month === month));
    if (missing.length > 0) {
      const due = `${month}-25`;
      out.push({
        key: `meters:${month}`,
        domain: 'utilities',
        severity: day >= 22 ? 'warn' : 'info',
        title: `Передать показания счётчиков: ${missing.length}`,
        sub: 'Счётчики ЖКХ',
        when: whenText(daysBetween(todayStr, due)),
        date: due,
        action: autoTask(
          'Передать показания счётчиков',
          due,
          day >= 22 ? 'high' : 'medium',
          `Не переданы: ${missing.map((m) => m.name).join(', ')}. Задачу создал ассистент.`
        ),
      });
    }
  }

  // ── Задачи: просроченные ─────────────────────────────────────────────────
  for (const t of input.tasks) {
    if (t.completed || !t.dueDate || t.dueDate >= todayStr) continue;
    out.push({
      key: `task-overdue:${t.id}`,
      domain: 'tasks',
      severity: 'danger',
      title: t.title,
      sub: 'Задача просрочена',
      when: whenText(daysBetween(todayStr, t.dueDate)),
      date: t.dueDate,
    });
  }

  // ── Дни рождения и праздники в ближайшие 7 дней ──────────────────────────
  for (const ev of input.events) {
    if (!(ev.recurringYearly || ev.isHoliday)) continue;
    const date = nextOccurrence(ev, todayStr);
    const d = daysBetween(todayStr, date);
    if (d < 0 || d > 7) continue;
    out.push({
      key: `event:${ev.id}:${date}`,
      domain: 'calendar',
      severity: d <= 1 ? 'warn' : 'info',
      title: ev.title,
      sub: 'Календарь',
      when: whenText(d),
      date,
    });
  }

  // Страховка машины часто уже есть документом (ОСАГО) с той же датой — одна задача, а не две
  const docDates = new Set(out.filter((x) => x.domain === 'docs' && x.action).map((x) => x.date));
  for (const x of out) {
    if (x.domain === 'inventory' && x.title.startsWith('Страховка') && docDates.has(x.date)) x.action = undefined;
  }

  const rank = { danger: 0, warn: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || a.date.localeCompare(b.date));
}

/**
 * Какие автоматические действия выполнить сейчас.
 * Не повторяет то, что ассистент уже делал (по ключу), и не создаёт задачу,
 * если похожая незавершённая задача уже есть.
 */
export function pendingActions(signals: Signal[], doneKeys: Set<string>, tasks: TaskItem[]): Signal[] {
  const openTitles = new Set(tasks.filter((t) => !t.completed).map((t) => norm(t.title)));
  return signals.filter((s) => {
    if (!s.action || doneKeys.has(s.key)) return false;
    if (s.action.kind === 'task' && openTitles.has(norm(s.action.task.title))) return false;
    return true;
  });
}
