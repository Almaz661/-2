import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Gift, ShoppingCart, UtensilsCrossed, X, Home } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { formatLocalDate, nextOccurrence, occursOn } from '../../utils/dateUtils';
import { computeZones } from '../../services/zones';
import { MemberAvatar } from '../common/MemberAvatar';
import { NeedBar, ZONE_ICONS } from '../zones/ZonesBoard';

/**
 * «Семейный экран» — режим для iPad на подставке (как Skylight / Nori Family Hub, но без отдельного устройства).
 * Крупно: часы, расписание дня, дела с отметкой одним касанием, ужин, ближайшие праздники, покупки, состояние дома.
 * Экран не гаснет (Wake Lock), ночью приглушается, обновляется каждую минуту.
 */
export const FamilyScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { tasks, events, members, mealPlan, recipes, shoppingItems, toggleTaskCompletion, householdName } = useHousehold();
  const [now, setNow] = useState(new Date());

  // Часы и пересчёт раз в 20 секунд
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(t);
  }, []);

  // Экран не гаснет, пока открыт семейный режим; пробуем полноэкранный режим
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    const request = () => nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      lock?.release().catch(() => undefined);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('keydown', onKey);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    };
  }, [onClose]);

  const todayStr = formatLocalDate(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatLocalDate(tomorrow);
  const hour = now.getHours();
  const night = hour >= 22 || hour < 6;

  const byTime = (a: { startTime?: string; allDay?: boolean }, b: { startTime?: string; allDay?: boolean }) =>
    (a.allDay ? '00:00' : a.startTime || '00:00').localeCompare(b.allDay ? '00:00' : b.startTime || '00:00');
  const todayEvents = events.filter((e) => occursOn(e, todayStr)).sort(byTime);
  const tomorrowEvents = events.filter((e) => occursOn(e, tomorrowStr)).sort(byTime);

  const todayTasks = tasks
    .filter((t) => (t.dueDate <= todayStr && !t.completed) || (t.completed && (t.completedAt ? formatLocalDate(new Date(t.completedAt)) : '') === todayStr))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueTime || '99').localeCompare(b.dueTime || '99'));
  const doneCount = todayTasks.filter((t) => t.completed).length;

  const todayMeal = mealPlan.find((m) => m.date === todayStr);
  const dinnerRecipe = todayMeal?.dinner?.recipeId ? recipes.find((r) => r.id === todayMeal.dinner?.recipeId) : null;
  const dinnerTitle = dinnerRecipe?.title || todayMeal?.dinner?.customTitle || null;

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.recurringYearly || e.isHoliday)
        .map((e) => ({ e, date: nextOccurrence(e, todayStr) }))
        .map((x) => ({ ...x, days: Math.round((new Date(x.date + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000) }))
        .filter((x) => x.days >= 0 && x.days <= 30)
        .sort((a, b) => a.days - b.days)
        .slice(0, 3),
    [events, todayStr]
  );
  const toBuy = shoppingItems.filter((i) => !i.completed);
  const zones = computeZones(tasks, now).slice(0, 6);

  const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const greeting = hour >= 5 && hour < 12 ? 'Доброе утро' : hour < 18 && hour >= 12 ? 'Добрый день' : hour < 23 && hour >= 18 ? 'Добрый вечер' : 'Доброй ночи';

  const panel = 'bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-5 lg:p-6 flex flex-col lg:min-h-0';
  const h = 'flex items-center gap-2.5 text-[16px] font-semibold text-[var(--muted)] mb-4';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Семейный экран"
      className="fixed inset-0 z-[180] bg-[var(--bg)] text-[var(--text)] overflow-y-auto lg:overflow-hidden page-in-right"
      style={{ filter: night ? 'brightness(0.72)' : undefined, transition: 'filter 1s ease' }}
    >
      <div className="min-h-full lg:h-full flex flex-col gap-4 lg:gap-5 p-4 lg:p-6 pt-[max(env(safe-area-inset-top),16px)]">
        {/* Часы и приветствие */}
        <header className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[64px] lg:text-[88px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{time}</div>
            <div className="mt-2 text-lg lg:text-2xl text-[var(--text-2)]">
              {date.charAt(0).toUpperCase() + date.slice(1)}. {greeting}!
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex -space-x-2">
              {members.map((m) => (
                <MemberAvatar key={m.id} member={m} size="md" className="ring-2 ring-[var(--bg)]" />
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть семейный экран"
              className="w-12 h-12 grid place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="lg:flex-1 lg:min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Расписание */}
          <section className={panel}>
            <h2 className={h}>
              <CalendarDays className="w-5 h-5" /> Сегодня
            </h2>
            <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto space-y-3">
              {todayEvents.length === 0 && <p className="text-xl text-[var(--muted)]">Свободный день</p>}
              {todayEvents.map((e) => (
                <div key={e.id} className="flex gap-4 items-start">
                  <span className="w-16 shrink-0 text-xl font-semibold tabular-nums">{e.allDay || !e.startTime ? 'день' : e.startTime}</span>
                  <div className="min-w-0">
                    <div className="text-xl font-medium leading-snug">{e.title}</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {e.memberIds.map((id) => {
                        const m = members.find((x) => x.id === id);
                        return m ? <MemberAvatar key={id} member={m} size="xs" /> : null;
                      })}
                      {e.location && <span className="text-sm text-[var(--muted)] truncate ml-1">{e.location}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {tomorrowEvents.length > 0 && (
                <div className="pt-4 mt-2 border-t border-[var(--line)]">
                  <div className="text-sm font-medium text-[var(--muted)] mb-2">Завтра</div>
                  {tomorrowEvents.slice(0, 3).map((e) => (
                    <div key={e.id} className="flex gap-4 py-1 text-[var(--text-2)]">
                      <span className="w-16 shrink-0 tabular-nums">{e.allDay || !e.startTime ? 'день' : e.startTime}</span>
                      <span className="truncate">{e.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Дела: отметка одним касанием */}
          <section className={panel}>
            <h2 className={h}>
              <Check className="w-5 h-5" /> Дела
              {todayTasks.length > 0 && (
                <span className="ml-auto text-[16px] tabular-nums">
                  {doneCount} из {todayTasks.length}
                </span>
              )}
            </h2>
            <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto -mx-2">
              {todayTasks.length === 0 && <p className="px-2 text-xl text-[var(--muted)]">На сегодня дел нет</p>}
              {todayTasks.map((t) => {
                const m = members.find((x) => x.id === t.assigneeId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTaskCompletion(t.id)}
                    className="w-full flex items-center gap-4 px-2 py-3 rounded-2xl text-left hover:bg-[var(--surface-3)] active:scale-[0.99] transition"
                  >
                    <span
                      className={`w-10 h-10 shrink-0 rounded-full grid place-items-center border-2 transition-colors ${
                        t.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--line-strong)] text-transparent'
                      }`}
                    >
                      <Check className="w-5 h-5" />
                    </span>
                    <span className={`flex-1 min-w-0 text-xl leading-snug ${t.completed ? 'line-through text-[var(--muted)]' : ''}`}>
                      {t.title}
                    </span>
                    {m && <MemberAvatar member={m} size="sm" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Ужин, праздники, покупки, дом */}
          <section className="flex flex-col gap-4 lg:gap-5 lg:min-h-0 md:col-span-2 lg:col-span-1">
            <div className={`${panel} !flex-none`}>
              <h2 className={h}>
                <UtensilsCrossed className="w-5 h-5" /> Ужин
              </h2>
              <div className="text-2xl font-semibold leading-snug">{dinnerTitle || 'Ещё не решили'}</div>
              {dinnerRecipe && (
                <div className="mt-1 text-[var(--muted)]">{dinnerRecipe.prepTimeMinutes + dinnerRecipe.cookTimeMinutes} мин</div>
              )}
            </div>

            {upcoming.length > 0 && (
              <div className={`${panel} !flex-none`}>
                <h2 className={h}>
                  <Gift className="w-5 h-5" /> Скоро
                </h2>
                {upcoming.map((u) => (
                  <div key={u.e.id + u.date} className="flex items-baseline justify-between gap-3 py-1">
                    <span className="text-lg truncate">{u.e.title}</span>
                    <span className={`shrink-0 tabular-nums ${u.days <= 1 ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted)]'}`}>
                      {u.days === 0 ? 'сегодня' : u.days === 1 ? 'завтра' : `через ${u.days} дн.`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className={`${panel} flex-1`}>
              <h2 className={h}>
                <ShoppingCart className="w-5 h-5" /> Купить
                <span className="ml-auto tabular-nums">{toBuy.length}</span>
              </h2>
              <div className="text-lg text-[var(--text-2)] leading-relaxed line-clamp-3">
                {toBuy.length ? toBuy.slice(0, 8).map((i) => i.title).join(', ') : 'Список пуст'}
              </div>
              {zones.length > 0 && (
                <div className="mt-auto pt-4 border-t border-[var(--line)] grid grid-cols-3 gap-3">
                  {zones.map((z) => {
                    const Icon = ZONE_ICONS[z.zone] || Home;
                    return (
                      <div key={z.zone} title={z.zone}>
                        <div className="flex items-center gap-1.5 text-sm text-[var(--muted)] truncate">
                          <Icon className="w-4 h-4 shrink-0" /> {z.zone}
                        </div>
                        <NeedBar need={z.need} level={z.level} className="mt-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="text-center text-sm text-[var(--muted)]">
          {householdName} · экран не гаснет, пока открыт этот режим · ночью приглушается
        </footer>
      </div>
    </div>
  );
};
