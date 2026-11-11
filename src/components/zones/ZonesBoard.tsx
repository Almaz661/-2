import React from 'react';
import {
  Baby,
  Bath,
  BedDouble,
  Car,
  Check,
  ChevronRight,
  CookingPot,
  DoorOpen,
  Home,
  Sofa,
  Trees,
} from 'lucide-react';
import type { HouseholdZone } from '../../types';
import { ZoneLevel, ZoneStatus, ZoneTask } from '../../services/zones';
import { Plus, Sparkles } from 'lucide-react';
import { Card } from '../ui/mercury';

export const ZONE_ICONS: Record<HouseholdZone, typeof Home> = {
  'Весь дом': Home,
  Кухня: CookingPot,
  Гостиная: Sofa,
  Ванная: Bath,
  Спальня: BedDouble,
  Детская: Baby,
  Прихожая: DoorOpen,
  Авто: Car,
  'Участок/Дача': Trees,
};

const LEVEL = {
  fresh: { label: 'В порядке', bar: 'bg-emerald-500', text: 'text-emerald-600', ring: 'border-emerald-300' },
  soon: { label: 'Скоро', bar: 'bg-amber-500', text: 'text-amber-600', ring: 'border-amber-300' },
  due: { label: 'Пора', bar: 'bg-amber-600', text: 'text-amber-700', ring: 'border-amber-400' },
} satisfies Record<ZoneLevel, { label: string; bar: string; text: string; ring: string }>;

/** Полоса состояния: заполняется по мере того, как «пора», цвет — от зелёного к красному. */
export const NeedBar: React.FC<{ need: number; level: ZoneLevel; className?: string }> = ({ need, level, className = '' }) => (
  <div
    className={`h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden ${className}`}
    role="meter"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(Math.min(1, need) * 100)}
    aria-label={LEVEL[level].label}
  >
    <div
      className={`h-full rounded-full ${LEVEL[level].bar} transition-[width,background-color] duration-700 ease-out`}
      style={{ width: `${Math.max(4, Math.min(100, need * 100))}%` }}
    />
  </div>
);

/** Компактная сетка зон для «Главного обзора». */
const PREVIEW_ZONES: HouseholdZone[] = ['Кухня', 'Ванная', 'Гостиная', 'Спальня'];

/** Пустое состояние: показываем, как будет выглядеть, и даём начать одним нажатием. */
const ZonesEmpty: React.FC<{ onStarter: () => void; onAdd: () => void }> = ({ onStarter, onAdd }) => (
  <Card className="p-5 sm:p-6">
    <h2 className="text-lg font-semibold text-[var(--text)]">Состояние дома</h2>
    <p className="text-sm text-[var(--muted)] mt-1 max-w-xl">
      Здесь у каждой комнаты будет полоса: зелёная — порядок, жёлтая — скоро пора, красная — пора. Пока нет
      повторяющихся дел, поэтому полосам нечего показать.
    </p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 opacity-60" aria-hidden="true">
      {PREVIEW_ZONES.map((z, i) => {
        const Icon = ZONE_ICONS[z];
        const lv: ZoneLevel = (['fresh', 'soon', 'due', 'fresh'] as ZoneLevel[])[i];
        return (
          <div key={z} className="p-3.5 rounded-xl border border-dashed border-[var(--line-strong)]">
            <div className="flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-full border grid place-items-center ${LEVEL[lv].ring} ${LEVEL[lv].text}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium text-[var(--text)]">{z}</span>
            </div>
            <NeedBar need={[0.3, 0.75, 1.1, 0.15][i]} level={lv} className="mt-3" />
          </div>
        );
      })}
    </div>
    <div className="flex flex-wrap gap-2 mt-5">
      <button
        type="button"
        onClick={onStarter}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-white text-sm font-medium hover:brightness-110 active:scale-[0.97] transition"
      >
        <Sparkles className="w-4 h-4" />
        Добавить типовые дела по дому
      </button>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] text-sm font-medium hover:bg-[var(--surface-3)] active:scale-[0.97] transition"
      >
        <Plus className="w-4 h-4" />
        Своё дело
      </button>
    </div>
  </Card>
);

export const ZonesOverview: React.FC<{
  zones: ZoneStatus[];
  onOpen: (zone: HouseholdZone) => void;
  onStarter: () => void;
  onAdd: () => void;
}> = ({ zones, onOpen, onStarter, onAdd }) => {
  if (zones.length === 0) return <ZonesEmpty onStarter={onStarter} onAdd={onAdd} />;
  const due = zones.filter((z) => z.level === 'due').length;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-[var(--text)]">Состояние дома</h2>
        <span className={`text-sm ${due ? 'text-amber-700' : 'text-emerald-600'}`}>
          {due ? `Ждут: ${due}` : 'Всё в порядке'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {zones.map((z) => {
          const Icon = ZONE_ICONS[z.zone] || Home;
          return (
            <button
              key={z.zone}
              type="button"
              onClick={() => onOpen(z.zone)}
              className="group text-left p-3.5 rounded-xl border border-[var(--line)] hover:bg-[var(--surface-3)] hover:border-[var(--line-strong)] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-8 h-8 rounded-full border grid place-items-center ${LEVEL[z.level].ring} ${LEVEL[z.level].text}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-[var(--text)] truncate">{z.zone}</span>
                  <span className={`block text-xs ${LEVEL[z.level].text}`}>
                    {LEVEL[z.level].label}
                    {z.dueCount > 0 ? `: ${z.dueCount}` : ''}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <NeedBar need={z.need} level={z.level} className="mt-3" />
            </button>
          );
        })}
      </div>
      {zones.length < 3 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-[var(--line)] text-sm">
          <span className="text-[var(--muted)]">Мало зон — добавьте дела по комнатам, чтобы видеть весь дом.</span>
          <button type="button" onClick={onStarter} className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)] hover:underline underline-offset-4">
            <Sparkles className="w-4 h-4" />
            Добавить типовые дела по дому
          </button>
        </div>
      )}
    </Card>
  );
};

/** Полный вид «По зонам» для раздела «Задачи»: зона → её дела с полосами и кнопкой «Сделано». */
export const ZonesBoard: React.FC<{
  zones: ZoneStatus[];
  focusZone?: HouseholdZone | null;
  onDone: (zt: ZoneTask) => void;
  onAdd: () => void;
  onStarter: () => void;
}> = ({ zones, focusZone, onDone, onAdd, onStarter }) => {
  if (zones.length === 0) return <ZonesEmpty onStarter={onStarter} onAdd={onAdd} />;
  const ordered = focusZone ? [...zones].sort((a, b) => (a.zone === focusZone ? -1 : b.zone === focusZone ? 1 : 0)) : zones;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {ordered.map((z) => {
        const Icon = ZONE_ICONS[z.zone] || Home;
        return (
          <Card key={z.zone} className={`p-2 sm:p-3 ${z.zone === focusZone ? 'ring-2 ring-[var(--accent)]' : ''}`} id={`zone-${z.zone}`}>
            <div className="flex items-center gap-3 px-3 pt-2 pb-3">
              <span className={`w-10 h-10 rounded-full border grid place-items-center ${LEVEL[z.level].ring} ${LEVEL[z.level].text}`}>
                <Icon className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[16px] font-semibold text-[var(--text)]">{z.zone}</h3>
                  <span className={`text-[14px] ${LEVEL[z.level].text}`}>{LEVEL[z.level].label}</span>
                </div>
                <NeedBar need={z.need} level={z.level} className="mt-2" />
              </div>
            </div>
            {z.tasks.map((zt) => (
              <div
                key={zt.task.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border-t border-[var(--line)] hover:bg-[var(--surface-3)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text)] truncate">{zt.task.title}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <NeedBar need={zt.need} level={zt.level} className="flex-1 max-w-[180px]" />
                    <span className={`text-xs tabular-nums ${LEVEL[zt.level].text}`}>{zt.hint}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDone(zt)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-medium border transition active:scale-95 ${
                    zt.level === 'fresh'
                      ? 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
                      : 'border-transparent bg-[var(--accent)] text-white hover:brightness-110'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Сделано
                </button>
              </div>
            ))}
          </Card>
        );
      })}
    </div>
  );
};
