import { describe, expect, it } from 'vitest';
import { parseRuDate } from '../src/utils/ruDate';

const now = new Date(2026, 10, 1, 20, 0); // 1 ноября 2026, вечер

describe('parseRuDate — даты и время из русского текста', () => {
  it('«напомнить мне 5 декабря день рождения двойняшек в 9-00т»', () => {
    const r = parseRuDate('напомнить мне 5 декабря день рождения двойняшек в 9-00т', now);
    expect(r.date).toBe('2026-12-05');
    expect(r.time).toBe('09:00');
    expect(r.cleanTitle).toBe('День рождения двойняшек');
    expect(r.isBirthday).toBe(true);
    expect(r.reminderTime).toBe('09:00');
  });
  it('дата без года, уже прошедшая, — на следующий год', () => {
    expect(parseRuDate('день рождения мамы 3 марта', now).date).toBe('2027-03-03');
  });
  it('число без месяца — этот или следующий месяц', () => {
    expect(parseRuDate('26 день рождения двойняшек', now).date).toBe('2026-11-26');
  });
  it('числовые даты и время', () => {
    const r = parseRuDate('Врач 05.12.2026 в 14:30', now);
    expect([r.date, r.time, r.cleanTitle]).toEqual(['2026-12-05', '14:30', 'Врач']);
  });
  it('завтра / послезавтра / через N недель / день недели', () => {
    expect(parseRuDate('завтра встреча', now).date).toBe('2026-11-02');
    expect(parseRuDate('послезавтра собрание', now).date).toBe('2026-11-03');
    expect(parseRuDate('через 2 недели стоматолог', now).date).toBe('2026-11-15');
    expect(parseRuDate('в пятницу гости в 7 вечера', now)).toMatchObject({ date: '2026-11-06', time: '19:00' });
  });
  it('количества не считаются датами', () => {
    expect(parseRuDate('2 пачки творога', now).hasDate).toBe(false);
    expect(parseRuDate('3 дня отдыха', now).hasDate).toBe(false);
  });
});

import { parseWithRuleEngine } from '../src/services/aiService';
describe('умный ввод без интернета', () => {
  const members = [{ id: 'o', name: 'Ольга' }] as any;
  it('день рождения — одно событие на весь день, каждый год, без лишней задачи', () => {
    const a = parseWithRuleEngine('напомнить мне 5 декабря день рождения двойняшек в 9-00т', members).actions;
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ type: 'calendar', title: 'День рождения двойняшек' });
    expect(a[0].data).toMatchObject({ allDay: true, recurringYearly: true, reminderTime: '09:00' });
  });
  it('бытовое дело с датой — задача, а не событие', () => {
    const a = parseWithRuleEngine('Помыть окна 10 января', members).actions;
    expect(a.map((x) => x.type)).toEqual(['task']);
    expect(a[0].title).toBe('Помыть окна');
  });
});
