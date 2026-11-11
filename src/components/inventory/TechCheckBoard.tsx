import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Wrench, AlertTriangle, ListPlus } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { PERIOD_DAYS, PERIOD_LABEL, TECH_SYSTEMS, TechSystem } from '../../data/techCheck';
import { applies, subscribeHomeProfile } from '../../utils/homeProfile';
import { formatLocalDate } from '../../utils/dateUtils';
import { Btn, Card } from '../ui/mercury';

// Состояние техосмотра — на устройстве: когда осматривали систему и какие замечания открыты
interface SysState {
  last?: string;
  issues: Record<string, { note: string; taskId?: string }>;
}
const KEY = 'dbh_techcheck';
const load = (): Record<string, SysState> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

/** «Техосмотр дома»: системы дома по профилю, отметка «осмотрено», замечания → задачи. */
export const TechCheckBoard: React.FC = () => {
  const { addTask, showToast } = useHousehold();
  const [state, setState] = useState<Record<string, SysState>>(load);
  const [open, setOpen] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => subscribeHomeProfile(() => tick((x) => x + 1)), []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* нет хранилища */
    }
  }, [state]);

  const systems = TECH_SYSTEMS.filter((s) => applies(s.needs)).map((s) => ({ ...s, items: s.items.filter((i) => applies(i.needs)) }));
  const st = (id: string): SysState => state[id] || { issues: {} };
  const status = (s: TechSystem) => {
    const last = st(s.id).last;
    if (!last) return { kind: 'never' as const, text: 'ещё не осматривали' };
    const d = daysSince(last);
    const left = PERIOD_DAYS[s.period] - d;
    if (left <= 0) return { kind: 'due' as const, text: `пора · был ${d} дн. назад` };
    return { kind: 'ok' as const, text: d === 0 ? 'осмотрено сегодня' : `осмотрено ${d} дн. назад` };
  };

  const markInspected = (s: TechSystem) => {
    setState((x) => ({ ...x, [s.id]: { ...st(s.id), last: new Date().toISOString() } }));
    showToast(`Осмотрено: ${s.title}`, 'success');
  };
  const toggleIssue = (s: TechSystem, idx: number) => {
    const cur = st(s.id);
    const key = String(idx);
    const issues = { ...cur.issues };
    if (issues[key]) delete issues[key];
    else issues[key] = { note: '' };
    setState((x) => ({ ...x, [s.id]: { ...cur, issues } }));
  };
  const setNote = (s: TechSystem, idx: number, note: string) =>
    setState((x) => ({ ...x, [s.id]: { ...st(s.id), issues: { ...st(s.id).issues, [String(idx)]: { ...st(s.id).issues[String(idx)], note } } } }));
  const makeTask = (s: TechSystem, idx: number) => {
    const item = s.items[idx];
    const issue = st(s.id).issues[String(idx)];
    addTask({
      title: `${item.pro ? 'Вызвать специалиста' : 'Устранить'}: ${item.text}`,
      description: `Техосмотр — ${s.title}.${issue?.note ? ` Замечание: ${issue.note}` : ''}`,
      zone: 'Весь дом',
      assigneeId: null,
      isRotation: false,
      recurrence: 'none',
      dueDate: formatLocalDate(new Date()),
      priority: 'high',
      completed: false,
      packName: 'Техосмотр',
    });
    setState((x) => ({ ...x, [s.id]: { ...st(s.id), issues: { ...st(s.id).issues, [String(idx)]: { ...issue, taskId: 'created' } } } }));
  };

  const due = systems.filter((s) => status(s).kind !== 'ok').length;
  const openIssues = systems.reduce((n, s) => n + Object.keys(st(s.id).issues).length, 0);

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h2 className="text-lg text-[var(--text)]">Техосмотр дома</h2>
        <p className="text-[14px] text-[var(--muted)] max-w-3xl">
          Безопасный визуальный осмотр: замечать изменения, протечки, запахи, шумы. Отмеченное 🔧 делает специалист. Проблема не считается закрытой,
          пока не устранена. Систем по вашему профилю дома: {systems.length}.
        </p>
        <p className="text-sm text-[var(--text-2)] mt-2">
          {due ? `Пора осмотреть: ${due}` : 'Всё осмотрено вовремя'}
          {openIssues ? ` · открытых замечаний: ${openIssues}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {systems.map((s) => {
          const stt = status(s);
          const isOpen = open === s.id;
          const issues = st(s.id).issues;
          const n = Object.keys(issues).length;
          return (
            <Card key={s.id} className="p-2 sm:p-3">
              <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} className="w-full flex items-center gap-3 px-3 py-2 text-left">
                <span className="text-2xl leading-none">{s.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] font-medium text-[var(--text)]">{s.title}</span>
                  <span className="block text-xs text-[var(--muted)] mt-0.5">
                    {PERIOD_LABEL[s.period]} ·{' '}
                    <span className={stt.kind === 'due' ? 'text-amber-700' : stt.kind === 'ok' ? 'text-emerald-600' : ''}>{stt.text}</span>
                    {n > 0 && <span className="text-amber-700"> · замечаний: {n}</span>}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-[var(--line)] pt-1">
                  {s.items.map((it, idx) => {
                    const issue = issues[String(idx)];
                    return (
                      <div key={idx} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--surface-3)]">
                        <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: issue ? '#d97706' : 'var(--line-strong)' }} />
                        <span className="flex-1 min-w-0 text-sm text-[var(--text)]">
                          {it.text} {it.pro && <span title="Делает специалист">🔧</span>}
                          {issue && (
                            <span className="block mt-1.5">
                              <input
                                value={issue.note}
                                onChange={(e) => setNote(s, idx, e.target.value)}
                                placeholder="Что заметили? Например: капает под раковиной"
                                className="w-full px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-2)] border border-amber-300 text-[var(--text)] focus:outline-none focus:border-amber-500"
                              />
                              {issue.taskId && <span className="block text-xs text-emerald-700 mt-1">Задача создана</span>}
                            </span>
                          )}
                        </span>
                        {issue && !issue.taskId && (
                          <button type="button" onClick={() => makeTask(s, idx)} title="Создать задачу" className="shrink-0 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                            <ListPlus className="w-3.5 h-3.5" /> В задачи
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleIssue(s, idx)}
                          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition ${
                            issue ? 'border-transparent bg-emerald-50 text-emerald-700' : 'border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--surface)]'
                          }`}
                        >
                          {issue ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {issue ? 'Устранено' : 'Замечание'}
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap items-center gap-2 px-3 pt-3 pb-1 border-t border-[var(--line)] mt-1">
                    <Btn size="sm" variant="primary" icon={<Wrench className="w-3.5 h-3.5" />} onClick={() => markInspected(s)}>
                      Осмотрено
                    </Btn>
                    <span className="text-xs text-[var(--muted)]">Всё, что без замечаний, — в порядке</span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
