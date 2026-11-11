import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { DAILY_BLOCKS } from '../../data/homeRoutine';
import { dayItems } from '../../services/dayItems';
import { markCleanItem, readCleanMap, markDay } from '../../services/cleanMapStore';
import { useRoutine } from '../../services/routine';
import { groupByRoom, groupItems } from '../../utils/cleaningOrder';
import { formatLocalDate } from '../../utils/dateUtils';
import { applies } from '../../utils/homeProfile';
import { Card } from '../ui/mercury';

const Box: React.FC<{ on: boolean }> = ({ on }) => (
  <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border grid place-items-center ${on ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--line-strong)] text-transparent'}`}>
    <Check className="w-3.5 h-3.5" />
  </span>
);

/** План выбранного дня — один список без повторов: события, уборка (или тема дня), дела; ежедневный график свёрнут. */
export const DayAgenda: React.FC<{ ymd: string }> = ({ ymd }) => {
  const { events, tasks, toggleTaskCompletion } = useHousehold();
  const routine = useRoutine();
  const [openDaily, setOpenDaily] = useState(false);
  const date = new Date(ymd + 'T12:00:00');
  const isToday = ymd === formatLocalDate(new Date());
  const d = dayItems(date, tasks, events);
  const marks = readCleanMap();
  const cleanDone = (id: string) => markDay(marks[id]) === ymd;
  const daily = DAILY_BLOCKS.map((b) => ({ ...b, items: b.items.filter((i) => applies(i.needs)) }));

  const head = (title: string) => <div className="px-3 pt-3 pb-1 border-t border-[var(--line)] text-[14px] font-semibold text-[var(--text)]">{title}</div>;

  return (
    <Card className="p-2 sm:p-3">
      <div className="px-3 pt-2 pb-3">
        <div className="text-[14px] text-[var(--muted)]">{date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <h3 className="text-[16px] font-semibold text-[var(--text)]">
          {d.themeIcon} {d.themeTitle}
        </h3>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          {d.count ? `Дел на день: ${d.count}${d.important ? `, из них важных: ${d.important}` : ''}` : 'Дел на этот день нет'}
          {d.light && ' · облегчённый день'}
        </p>
      </div>

      {d.events.length > 0 && (
        <>
          {head('📅 События')}
          {d.events.map((e) => (
            <div key={e.id} className="flex gap-3 px-3 py-1.5 text-sm">
              <span className="w-12 shrink-0 tabular-nums text-[var(--text-2)]">{e.allDay || !e.startTime ? 'весь день' : e.startTime}</span>
              <span className="text-[var(--text)]">{e.title}</span>
            </div>
          ))}
        </>
      )}

      {d.cleaning.length > 0 && (
        <>
          {head('🧹 Уборка — по порядку')}
          {groupItems(d.cleaning).map(({ group, items }) => (
            <div key={group.key}>
              <div className="px-3 pt-1 text-[13px] text-[var(--muted)]">
                {group.icon} {group.label}
              </div>
              {items.map((i) => (
                <button key={i.id} type="button" disabled={!isToday} onClick={() => markCleanItem(i.id)} className="w-full flex items-start gap-3 px-3 py-1.5 text-left disabled:cursor-default">
                  <Box on={cleanDone(i.id)} />
                  <span className="text-sm text-[var(--text)]">{i.title}</span>
                </button>
              ))}
            </div>
          ))}
        </>
      )}

      {d.themeItems.length > 0 && (
        <>
          {head(`🎯 ${d.themeTitle}`)}
          {d.themeItems.map((i) => (
            <button key={i.id} type="button" disabled={!isToday} onClick={() => routine.toggle(i.id)} className="w-full flex items-start gap-3 px-3 py-1.5 text-left disabled:cursor-default">
              <Box on={isToday && !!routine.checks[i.id]} />
              <span className="text-sm text-[var(--text)]">{i.title}</span>
            </button>
          ))}
        </>
      )}

      {d.tasks.length > 0 && (
        <>
          {head('✅ Дела')}
          {groupByRoom(d.tasks).map(({ room, icon, items }) => (
            <div key={room}>
              <div className="px-3 pt-1 text-[13px] text-[var(--muted)]">
                {icon} {room}
              </div>
              {items.map((t) => (
                <button
                  key={t.id + (t.virtual ? ymd : '')}
                  type="button"
                  disabled={t.virtual}
                  onClick={() => toggleTaskCompletion(t.id)}
                  className="w-full flex items-start gap-3 px-3 py-1.5 text-left disabled:cursor-default"
                >
                  <Box on={t.completed} />
                  <span className={`text-sm ${t.completed ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'}`}>
                    {t.priority === 'high' && <span className="text-amber-700">★ </span>}
                    {t.title}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </>
      )}

      {/* Ежедневное — одно и то же каждый день, поэтому свёрнуто и не входит в счёт дел дня */}
      <div className="border-t border-[var(--line)]">
        <button type="button" onClick={() => setOpenDaily((v) => !v)} aria-expanded={openDaily} className="w-full flex items-center gap-2 px-3 pt-3 pb-2 text-left">
          <span className="flex-1 text-[14px] font-semibold text-[var(--text)]">☀️ Каждый день</span>
          <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform ${openDaily ? 'rotate-180' : ''}`} />
        </button>
        {openDaily && (
          <div className="pb-2">
            {daily.map((b) => (
              <div key={b.id} className="px-3">
                <div className="text-xs text-[var(--muted)] pt-1">
                  {b.icon} {b.title}
                </div>
                {b.items.map((i) => (
                  <button key={i.id} type="button" disabled={!isToday} onClick={() => routine.toggle(i.id)} className="w-full flex items-start gap-3 py-1.5 text-left disabled:cursor-default">
                    <Box on={isToday && !!routine.checks[i.id]} />
                    <span className="text-sm text-[var(--text)]">{i.title}</span>
                  </button>
                ))}
              </div>
            ))}
            {d.dailyTasks.length > 0 && (
              <div className="px-3">
                <div className="text-xs text-[var(--muted)] pt-1">🔁 Ваши ежедневные дела</div>
                {d.dailyTasks.map((t) => (
                  <div key={t.id} className="text-sm text-[var(--text)] py-1.5 pl-8">
                    {t.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
