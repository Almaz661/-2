import { describe, expect, it } from 'vitest';
import { computeSignals, pendingActions } from '../src/services/orchestrator';

const base = {
  today: new Date(2026, 10, 18),
  tasks: [] as any[],
  events: [] as any[],
  docs: [] as any[],
  medicines: [] as any[],
  inventory: [] as any[],
  meters: [] as any[],
  shoppingItems: [] as any[],
  shoppingLists: [{ id: 'list-pharmacy', name: 'Аптека', icon: '' }] as any[],
};

describe('главный ассистент', () => {
  it('документ, истекающий через 10 дней, → задача «Продлить» на сегодня', () => {
    const s = computeSignals({ ...base, docs: [{ id: 'd1', title: 'Страховка квартиры', expiryDate: '2026-11-28' }] as any });
    expect(s[0].title).toBe('Продлить: Страховка квартиры');
    expect(s[0].action).toMatchObject({ kind: 'task', task: { dueDate: '2026-11-18' } });
  });
  it('заканчивающееся лекарство → в список «Аптека», без дублей', () => {
    const med = { id: 'm1', name: 'Супрастин', dosage: '25 мг', expiryDate: '2027-05-01', isLow: true };
    const s = computeSignals({ ...base, medicines: [med] as any });
    expect(s.find((x) => x.action?.kind === 'shopping')?.action).toMatchObject({ item: { title: 'Супрастин (25 мг)', listId: 'list-pharmacy' } });
    const already = computeSignals({ ...base, medicines: [med] as any, shoppingItems: [{ title: 'Супрастин (25 мг)', completed: false }] as any });
    expect(already.find((x) => x.key === 'med-buy:m1')?.action).toBeUndefined();
  });
  it('с 15 по 25 число без показаний → задача «Передать показания»', () => {
    const s = computeSignals({ ...base, meters: [{ id: 'w', name: 'Холодная вода', readings: [] }] as any });
    expect(s.some((x) => x.key === 'meters:2026-11')).toBe(true);
  });
  it('день рождения через 3 дня попадает в сигналы каждый год', () => {
    const s = computeSignals({ ...base, events: [{ id: 'e', title: 'День рождения двойняшек', date: '2025-11-21', recurringYearly: true }] as any });
    expect(s.find((x) => x.domain === 'calendar')).toMatchObject({ date: '2026-11-21', when: 'через 3 дн.' });
  });
  it('действие не повторяется и не дублирует существующую задачу', () => {
    const s = computeSignals({ ...base, docs: [{ id: 'd1', title: 'Паспорт', expiryDate: '2026-11-20' }] as any });
    expect(pendingActions(s, new Set(), [])).toHaveLength(1);
    expect(pendingActions(s, new Set([s[0].key]), [])).toHaveLength(0);
    expect(pendingActions(s, new Set(), [{ title: 'Продлить: Паспорт', completed: false }] as any)).toHaveLength(0);
  });
});
