import { describe, expect, it } from 'vitest';
import { computeZones, tasksToReopen } from '../src/services/zones';

const today = new Date(2026, 10, 10);
const t = (o: any) => ({ id: o.id || Math.random().toString(), title: 'x', zone: 'Кухня', assigneeId: null, isRotation: false, recurrence: 'weekly', dueDate: '2026-11-10', priority: 'medium', completed: false, ...o });

describe('Дом по зонам', () => {
  it('только что сделанное еженедельное дело — зона «в порядке»', () => {
    const z = computeZones([t({ completed: true, completedAt: '2026-11-09T10:00:00' })] as any, today);
    expect(z[0].level).toBe('fresh');
  });
  it('просроченное дело делает зону красной', () => {
    const z = computeZones([t({ dueDate: '2026-11-07' }), t({ zone: 'Ванная', dueDate: '2026-11-15' })] as any, today);
    expect(z[0]).toMatchObject({ zone: 'Кухня', level: 'due', dueCount: 1 });
    expect(z[0].tasks[0].hint).toBe('пора, 3 дн.');
  });
  it('повторяющееся дело, сделанное неделю назад, возвращается в работу', () => {
    expect(tasksToReopen([t({ id: 'a', completed: true, completedAt: '2026-11-03T09:00:00' })] as any, today)).toEqual([
      { id: 'a', dueDate: '2026-11-10' },
    ]);
  });
  it('разовое выполненное дело в зонах не учитывается', () => {
    expect(computeZones([t({ recurrence: 'none', completed: true, completedAt: '2026-11-09T10:00:00' })] as any, today)).toHaveLength(0);
  });
});
