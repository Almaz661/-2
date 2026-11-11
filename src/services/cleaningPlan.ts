// План уборки по дням: раскладывает «Карту уборки», недельный цикл и сезонные чек-листы на конкретные даты.
// Логика: каждый день — поддерживающая уборка и зона дня; подробная уборка зоны — в её день недели
// (раз в 2 недели — по чётным неделям); редкая — в «свою» неделю месяца; сезонные — в первую субботу сезона.

import { MAP_ITEMS, MapItem, MapSector } from '../data/cleaningMap';
import { applies } from '../utils/homeProfile';
import { orderItems } from '../utils/cleaningOrder';
import { WEEK } from '../data/homeRoutine';
import { INITIAL_TASK_PACKS } from '../data/initialData';
import type { TaskPack } from '../types';

export interface DayPlan {
  date: Date;
  zoneTitle: string;
  zoneIcon: string;
  isRestDay: boolean;
  daily: MapItem[];
  detailed: MapItem[];
  rare: MapItem[];
  seasonal: TaskPack[];
}

// Распределение по «Расписанию домашних дел — версия 2» — и по месту в доме, чтобы не бегать по всему дому:
//   вторник — ванная и санузлы; среда — стирка, спальни, текстиль и пыль «над полом» по всему дому;
//   пятница — кухня (вся кухонная техника вместе) и полы.
// Понедельник (планирование) и четверг (закупки) — без уборки; выходные облегчённые.
// Редкие дела раскладываются равномерно: ежемесячные — по одной неделе месяца, раз в 2 месяца — через месяц,
// раз в квартал — по одному из трёх месяцев, раз в полгода — по одному из шести; не больше трёх редких дел в день.
const LAUNDRY_RE = /стиральн|сушильн|коврик в ванной/i;
const BEDROOM_TEXTILE_RE = /штор|матрас|кроват|постел|одежд/i;
export const weekdayFor = (i: MapItem): number => {
  if (i.sector === 'kitchen') return 5; // вся кухня и кухонная техника — в один день
  if (i.sector === 'bath') return LAUNDRY_RE.test(i.title) ? 3 : 2;
  if (/ванн|туалет/i.test(i.title)) return 2;
  if (BEDROOM_TEXTILE_RE.test(i.title)) return 3;
  // «Над полом»: пыль, зеркала, окна, двери, светильники — в среду вместе с пылью в спальнях; полы — в пятницу
  if (i.sector === 'above') return 3;
  return 5;
};
export const RARE_PER_DAY = 3;
const SEASON_MONTHS: Record<NonNullable<TaskPack['season']>, number[]> = {
  spring: [2, 3],
  summer: [5],
  autumn: [8, 9],
  winter: [11],
  all: [],
};
/** Ориентировочное время: подробное дело ~5 мин (протереть, сменить, помыть ведро), редкое ~15 мин */
export const MINUTES = { detailed: 5, rare: 15 } as const;
export const DAY_BUDGET = 80;

const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
};
/** Какой по счёту этот день недели в месяце (1-й вторник, 2-й вторник…) */
const nth = (d: Date) => Math.ceil(d.getDate() / 7);

type Slot = { months: number[]; week: number };
/**
 * Постоянное «место» каждого редкого дела в году. Жадно и равномерно: каждое дело получает такую неделю месяца
 * (и сдвиг по месяцам для дел раз в 2–6 месяцев), где у этого дня недели меньше всего редких дел.
 */
function rareSlots(items: MapItem[]): Map<string, Slot> {
  const slots = new Map<string, Slot>();
  // загрузка: день недели → месяц → неделя → число дел
  const load = new Map<number, number[][]>();
  const get = (wd: number) => {
    if (!load.has(wd)) load.set(wd, Array.from({ length: 12 }, () => [0, 0, 0, 0]));
    return load.get(wd)!;
  };
  const rare = items.filter((x) => x.level === 'rare').sort((a, b) => a.intervalDays - b.intervalDays);
  for (const i of rare) {
    const wd = weekdayFor(i);
    const L = get(wd);
    const step = i.intervalDays <= 31 ? 1 : i.intervalDays <= 60 ? 2 : i.intervalDays <= 120 ? 3 : 6;
    const twice = i.intervalDays <= 25;
    let best: { off: number; week: number; score: number } | null = null;
    for (let off = 0; off < step; off++) {
      const months = Array.from({ length: 12 }, (_, m) => m).filter((m) => m % step === off);
      for (let w = 0; w < (twice ? 2 : 4); w++) {
        const weeks = twice ? [w, w + 2] : [w];
        const score = Math.max(...months.flatMap((m) => weeks.map((x) => L[m][x])));
        if (!best || score < best.score) best = { off, week: w, score };
      }
    }
    const months = Array.from({ length: 12 }, (_, m) => m).filter((m) => m % step === best!.off);
    const weeks = twice ? [best!.week, best!.week + 2] : [best!.week];
    months.forEach((m) => weeks.forEach((x) => L[m][x]++));
    weeks.forEach((x, k) => slots.set(k === 0 ? i.id : `${i.id}#2`, { months, week: x + 1 }));
  }
  return slots;
}

/**
 * Точные даты редких дел — как просила владелица: если дело стоит 10 ноября, следующий раз — 10 декабря.
 * День месяца выбирается один раз (равномерно по месяцу и в день «своей» комнаты в опорном 2026 году)
 * и дальше повторяется: раз в месяц — каждое это число; раз в 2, 3, 6 месяцев — это число через 2, 3, 6 месяцев;
 * дела «1–2 раза в месяц» — это число и через 14 дней.
 */
const REF_YEAR = 2026;
let anchorCache: { key: string; map: Map<string, { days: number[]; step: number; m0: number }> } | null = null;
function rareAnchors(items: MapItem[]) {
  const key = items.map((i) => i.id).join(',');
  if (anchorCache?.key === key) return anchorCache.map;
  const slots = rareSlots(items);
  const map = new Map<string, { days: number[]; step: number; m0: number }>();
  for (const i of items.filter((x) => x.level === 'rare')) {
    const sl = slots.get(i.id);
    if (!sl) continue;
    const step = i.intervalDays <= 31 ? 1 : i.intervalDays <= 60 ? 2 : i.intervalDays <= 120 ? 3 : 6;
    // Опорный месяц — первый подходящий начиная с ноября 2026 (с него план и начался)
    let refIdx = REF_YEAR * 12 + 10;
    while (!sl.months.includes(refIdx % 12)) refIdx++;
    const m0 = refIdx - REF_YEAR * 12;
    // День: такая-то неделя месяца, день недели «своей» комнаты, в опорном месяце
    const wd = weekdayFor(i);
    const first = new Date(REF_YEAR, m0, 1);
    const offset = (wd - first.getDay() + 7) % 7;
    let day = 1 + offset + (sl.week - 1) * 7;
    if (day > 28) day -= 7;
    const days = i.intervalDays <= 25 ? [day, day + 14 > 28 ? day - 14 : day + 14].sort((a, b) => a - b) : [day];
    map.set(i.id, { days, step, m0 });
  }
  anchorCache = { key, map };
  return map;
}

/** Точная дата следующего раза для дела карты уборки (после указанного дня) */
export function nextDateOf(itemId: string, after: Date): Date | null {
  for (let k = 1; k <= 400; k++) {
    const d = new Date(after.getFullYear(), after.getMonth(), after.getDate() + k);
    const p = planForDate(d);
    if ([...p.detailed, ...p.rare].some((x) => x.id === itemId)) return d;
  }
  return null;
}

const planCache = new Map<string, DayPlan>();
export function planForDate(date: Date): DayPlan {
  // Кэш: план дня зависит только от даты и набора дел (профиля дома)
  const itemsKey = MAP_ITEMS.filter((i) => applies(i.needs)).map((i) => i.id).join(',');
  const ck = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}|${itemsKey}`;
  const hit = planCache.get(ck);
  if (hit) return { ...hit, date };
  const res = computePlan(date);
  if (planCache.size > 1500) planCache.clear();
  planCache.set(ck, res);
  return res;
}

function computePlan(date: Date): DayPlan {
  const wd = date.getDay();
  const zone = WEEK.find((w) => w.day === wd)!;
  const isLight = wd === 0 || wd === 6;
  const month = date.getMonth();
  const ITEMS = MAP_ITEMS.filter((i) => applies(i.needs));
  const daily = ITEMS.filter((i) => i.level === 'support');
  const cleaningDay = wd === 2 || wd === 3 || wd === 5;

  let detailed: MapItem[] = [];
  let rare: MapItem[] = [];
  if (cleaningDay) {
    const evenWeek = isoWeek(date) % 2 === 0;
    detailed = ITEMS.filter((i) => i.level === 'detailed' && weekdayFor(i) === wd && (i.intervalDays <= 7 || evenWeek));
  }
  // Редкие дела — в свои точные числа месяца
  const anchors = rareAnchors(ITEMS);
  const monthIdx = date.getFullYear() * 12 + month;
  rare = ITEMS.filter((i) => {
    const a = i.level === 'rare' ? anchors.get(i.id) : null;
    if (!a) return false;
    if ((((monthIdx - (REF_YEAR * 12 + a.m0)) % a.step) + a.step) % a.step !== 0) return false;
    return a.days.includes(date.getDate());
  });

  // Сезонные чек-листы — подсказка на месяц в понедельник первой недели (день планирования)
  const planningDay = wd === 1 && date.getDate() <= 7;
  const seasonal = planningDay
    ? INITIAL_TASK_PACKS.filter((p) => !p.trigger && applies(p.needs)).filter((p) => {
        const s = p.season || 'all';
        if (s === 'all') return p.id === 'pack-deep-cleaning' ? [2, 8].includes(month) : p.id === 'pack-appliance-service' && [0, 3, 6, 9].includes(month);
        return SEASON_MONTHS[s].includes(month);
      })
    : [];

  // Внутри дня — по месту и прибору: всё по стиральной машине подряд, потом холодильник… полы в конце
  return { date, zoneTitle: zone.title, zoneIcon: zone.icon, isRestDay: isLight, daily, detailed: orderItems(detailed), rare: orderItems(rare), seasonal };
}

/** Текст утреннего сообщения главного ассистента. */
export function morningMessage(plan: DayPlan): { title: string; body: string } {
  const day = plan.date.toLocaleDateString('ru-RU', { weekday: 'long' });
  if (plan.isRestDay)
    return { title: `Доброе утро! Сегодня ${day} — облегчённый день`, body: `${plan.zoneTitle}. Только небольшие дела по необходимости.` };
  const parts = [
    `Задача дня: ${plan.zoneTitle}.`,
    plan.detailed.length ? `Подробно: ${plan.detailed.map((i) => i.title).join(', ')}.` : '',
    plan.rare.length ? `Редкое: ${plan.rare.map((i) => i.title).join(', ')}.` : '',
    plan.seasonal.length ? `На этот месяц: ${plan.seasonal.map((p) => p.title).join(', ')}.` : '',
  ].filter(Boolean);
  return { title: `Доброе утро! Сегодня ${day}`, body: parts.join(' ') };
}
