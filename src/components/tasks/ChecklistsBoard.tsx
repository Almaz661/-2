import React, { useState } from 'react';
import { applies } from '../../utils/homeProfile';
import { groupByRoom } from '../../utils/cleaningOrder';
import { Check, ChevronDown, RotateCcw, Play } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import type { TaskPack } from '../../types';
import { Btn, Card } from '../ui/mercury';

type Season = NonNullable<TaskPack['season']>;
const SEASON_LABEL: Record<Season, string> = {
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
  winter: 'Зима',
  all: 'Круглый год',
};
const currentSeason = (d = new Date()): Season => {
  const m = d.getMonth();
  return m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
};
const ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

/**
 * Чек-листы по сезонам — на основе наборов задач приложения.
 * «Начать» добавляет пункты в задачи; галочки отмечают те же задачи; прогресс виден на карточке.
 */
export const ChecklistsBoard: React.FC = () => {
  const { taskPacks, tasks, applyTaskPack, toggleTaskCompletion, deleteTask } = useHousehold();
  const now = currentSeason();
  const seasons: Season[] = [now, ...ORDER.filter((s) => s !== now), 'all'];
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-8">
      {(['event', ...seasons] as (Season | 'event')[]).map((season) => {
        const packs =
          season === 'event'
            ? taskPacks.filter((p) => p.trigger && applies(p.needs))
            : taskPacks.filter((p) => !p.trigger && (p.season || 'all') === season && applies(p.needs));
        if (!packs.length) return null;
        return (
          <section key={season}>
            <div className="flex items-baseline gap-3 mb-3 px-1">
              <h2 className="text-lg font-semibold text-[var(--text)]">{season === 'event' ? '🎯 По событию' : SEASON_LABEL[season]}</h2>
              {season === 'event' && <span className="text-[14px] text-[var(--muted)]">начинайте, когда случилось — не по календарю</span>}
              {season === now && <span className="text-[14px] font-medium" style={{ color: 'var(--season)' }}>сейчас</span>}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {packs.map((pack) => {
                const live = tasks.filter((t) => t.packName === pack.title);
                const started = live.length > 0;
                const done = live.filter((t) => t.completed).length;
                const isOpen = open[pack.id] ?? (season === now || started);
                return (
                  <Card key={pack.id} className="p-2 sm:p-3">
                    <button
                      type="button"
                      onClick={() => setOpen({ ...open, [pack.id]: !isOpen })}
                      aria-expanded={isOpen}
                      className="w-full flex items-start gap-3 px-3 pt-2 pb-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-semibold text-[var(--text)]">{pack.title}</h3>
                        <p className="text-[14px] text-[var(--muted)] mt-0.5">{pack.description}</p>
                        {started && (
                          <div className="flex items-center gap-2 mt-2.5">
                            <div className="h-1.5 flex-1 max-w-[220px] rounded-full bg-[var(--surface-3)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                                style={{ width: `${(done / live.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-[var(--muted)]">
                              {done} из {live.length}
                            </span>
                          </div>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 mt-1 text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="border-t border-[var(--line)]">
                        {/* По комнатам: закончили в ванной — перешли на кухню; внутри — прибор целиком */}
                        {started
                          ? groupByRoom(live).map(({ room, icon, items }) => (
                              <div key={room}>
                                {groupByRoom(live).length > 1 && (
                                  <div className="px-3 pt-3 pb-1 text-[13px] font-medium text-[var(--muted)]">
                                    {icon} {room}
                                  </div>
                                )}
                                {items.map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => toggleTaskCompletion(t.id)}
                                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[var(--surface-3)] transition-colors"
                                  >
                                    <span
                                      className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border grid place-items-center transition-colors ${
                                        t.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--line-strong)] text-transparent'
                                      }`}
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className={`block text-sm ${t.completed ? 'line-through text-[var(--muted)]' : 'text-[var(--text)]'}`}>{t.title}</span>
                                      {t.subtasks && t.subtasks.length > 0 && (
                                        <span className="block text-xs text-[var(--muted)] mt-0.5">{t.subtasks.map((st) => st.title).join(' · ')}</span>
                                      )}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ))
                          : groupByRoom(pack.tasks.filter((t) => applies(t.needs))).map(({ room, icon, items }, _, all) => (
                              <div key={room}>
                                {all.length > 1 && (
                                  <div className="px-3 pt-3 pb-1 text-[13px] font-medium text-[var(--muted)]">
                                    {icon} {room}
                                  </div>
                                )}
                                {items.map((t) => (
                                  <div key={t.title} className="flex items-start gap-3 px-3 py-2.5">
                                    <span className="mt-0.5 w-5 h-5 shrink-0 rounded-md border border-dashed border-[var(--line-strong)]" />
                                    <span className="min-w-0">
                                      <span className="block text-sm text-[var(--text-2)]">{t.title}</span>
                                      {t.subtasks && t.subtasks.length > 0 && (
                                        <span className="block text-xs text-[var(--muted)] mt-0.5">{t.subtasks.join(' · ')}</span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ))}
                        <div className="flex flex-wrap gap-2 px-3 pt-3 pb-1 border-t border-[var(--line)] mt-1">
                          {started ? (
                            <Btn
                              size="sm"
                              variant="ghost"
                              icon={<RotateCcw className="w-3.5 h-3.5" />}
                              onClick={() => {
                                live.forEach((t) => deleteTask(t.id, { silent: true }));
                                applyTaskPack(pack.id);
                              }}
                            >
                              Начать заново
                            </Btn>
                          ) : (
                            <Btn size="sm" variant="primary" icon={<Play className="w-3.5 h-3.5" />} onClick={() => applyTaskPack(pack.id)}>
                              Начать чек-лист
                            </Btn>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
