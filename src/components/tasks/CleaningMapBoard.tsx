import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { LEVELS, MAP_ITEMS as ALL_ITEMS, MapItem, MapLevel, MapSector, SECTORS } from '../../data/cleaningMap';
import { applies, subscribeHomeProfile } from '../../utils/homeProfile';
import { formatLocalDate } from '../../utils/dateUtils';
import { Btn, Card, Segmented } from '../ui/mercury';

import { readCleanMap as read, subscribeCleanMap, writeCleanMap, markDay } from '../../services/cleanMapStore';

type Status = 'never' | 'fresh' | 'soon' | 'due';
const STATUS: Record<Status, { label: string; color: string; text: string }> = {
  never: { label: 'не отмечено', color: 'var(--line-strong)', text: 'text-[var(--muted)]' },
  fresh: { label: 'в порядке', color: '#10b981', text: 'text-emerald-600' },
  soon: { label: 'скоро', color: '#fbbf24', text: 'text-amber-500' },
  due: { label: 'пора', color: '#d97706', text: 'text-amber-700' },
};

const SECTOR_COLOR: Record<MapSector, string> = {
  floor: '#D9C49A',
  above: '#8FCFC9',
  bath: '#DDA9CF',
  kitchen: '#5FC3A0',
};
// Четверти круга как на схеме: Пол — слева сверху, Над полом — справа сверху, Ванная — слева снизу, Кухня — справа снизу
const SECTOR_ANGLE: Record<MapSector, [number, number]> = {
  floor: [180, 270],
  above: [270, 360],
  kitchen: [0, 90],
  bath: [90, 180],
};
const RING: Record<MapLevel, [number, number]> = { support: [0, 153], detailed: [153, 270], rare: [270, 380] };
const LEVEL_OPACITY: Record<MapLevel, number> = { support: 0.85, detailed: 0.6, rare: 0.35 };

const C = 400;

// Подписи как на схеме владельца: координаты точки на исходной картинке и строки текста
const SCHEME_LABELS: { title: string; at: [number, number]; lines: string[] }[] = [
  { title: 'За тяжёлой мебелью', at: [480, 92], lines: ['За тяжёлой', 'мебелью', '1 раз в полгода'] },
  { title: 'Под кроватью, под диваном, за лёгкой мебелью', at: [491, 225], lines: ['Под кроватью,', 'под диваном,', 'за лёгкой мебелью', '1 раз в неделю'] },
  { title: 'Вся видимая поверхность пола', at: [541, 354], lines: ['Вся видимая', 'поверхность', 'ежедневно'] },
  { title: 'Влажная уборка', at: [378, 386], lines: ['Влажная уборка', '1 раз в неделю'] },
  { title: 'Коврик в прихожей', at: [686, 198], lines: ['Коврик в прихожей', '1 раз в 1–2 недели'] },
  { title: 'Всё до 180 см — пыль', at: [777, 282], lines: ['До 180 см —', '1 раз в неделю'] },
  { title: 'Всё выше 180 см — шкафы сверху, карнизы', at: [930, 337], lines: ['>180 см — 1 раз', 'в 1–2 месяца'] },
  { title: 'Все горизонтали + выключатели', at: [681, 354], lines: ['Все горизонтали', '+ выключатели', 'ежедневно'] },
  { title: 'Батареи, экраны', at: [855, 372], lines: ['Батареи, экраны', '1 раз в 2 недели'] },
  { title: 'Сантехника с химией', at: [380, 509], lines: ['Сантехника', 'с химией', '1 раз в неделю'] },
  { title: 'Зеркало, кран, раковина, ванна', at: [512, 509], lines: ['Зеркало, кран,', 'раковина,', 'ванна', '±5 раз в день'] },
  { title: 'Под ванной, под шкафчиком', at: [412, 597], lines: ['Под ванной,', 'под шкафчиком', '1 раз в 2 недели'] },
  { title: 'Дозаторы, стаканчики', at: [498, 682], lines: ['Дозаторы,', 'стаканчики', '1 раз в неделю'] },
  { title: 'Стены, потолок, внутри шкафчика', at: [300, 672], lines: ['Стены, потолок,', 'внутри шкафчика', '1 раз в месяц'] },
  { title: 'Стол', at: [669, 509], lines: ['Стол', 'ежедневно'] },
  { title: 'Плита, фасады — локально сразу', at: [669, 561], lines: ['Плита, фасады', 'локально сразу'] },
  { title: 'Под раковиной, под стеллажом', at: [837, 521], lines: ['Под раковиной,', 'под стеллажом', '1 раз в 1–2 недели'] },
  { title: 'Батарея, экран', at: [780, 622], lines: ['Батарея, экран', '1 раз в 2 недели'] },
  { title: 'За техникой, за мебелью', at: [930, 626], lines: ['За техникой,', 'за мебелью', '1–2 раза в месяц'] },
  { title: 'Техника внутри: микроволновка, духовка-гриль', at: [669, 672], lines: ['Техника внутри', '1 раз в неделю'] },
  { title: 'Потолок', at: [854, 724], lines: ['Потолок —', 'раз в полгода'] },
  { title: 'Шкафчики и фасады внутри, шторы, окно', at: [710, 789], lines: ['Шкафчики, фасады', 'внутри, шторы, окно', '1 раз в месяц'] },
];
const fromPic = ([x, y]: [number, number]) => [C + (x - 652) * 0.9, C + (y - 463) * 0.9] as const;
const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const wedge = (r0: number, r1: number, a0: number, a1: number) => {
  const [x0, y0] = pt(r1, a0);
  const [x1, y1] = pt(r1, a1);
  if (r0 === 0) return `M${C},${C} L${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} Z`;
  const [x2, y2] = pt(r0, a1);
  const [x3, y3] = pt(r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`;
};

const daysSince = (iso: string) => {
  const d = new Date(iso);
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const n = new Date();
  const b = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.round((b - a) / 86400000);
};

/** «Карта уборки» — схема владельца: 4 зоны × 3 уровня, у каждого пункта своя частота и своя полоса «пора». */
export const CleaningMapBoard: React.FC = () => {
  // Только пункты, которые подходят этому дому
  const [, setTick] = useState(0);
  useEffect(() => subscribeHomeProfile(() => setTick((t) => t + 1)), []);
  const MAP_ITEMS = ALL_ITEMS.filter((i) => applies(i.needs));
  const [done, setDone] = useState<Record<string, string>>(read);
  const [sector, setSector] = useState<MapSector>('kitchen');
  const [selected, setSelected] = useState<string | null>(null);

  // Сохраняем отметки и слушаем отметки из других мест (утреннее сообщение, план по дням)
  const first = React.useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (JSON.stringify(read()) !== JSON.stringify(done)) writeCleanMap(done);
  }, [done]);
  useEffect(() => subscribeCleanMap(() => setDone(read())), []);

  const statusOf = (it: MapItem): { s: Status; ago?: number; need: number } => {
    const last = done[it.id];
    if (!last) return { s: 'never', need: 0 };
    const ago = daysSince(last);
    const need = ago / it.intervalDays;
    return { s: need >= 1 ? 'due' : need >= 0.7 ? 'soon' : 'fresh', ago, need };
  };
  const [prev, setPrev] = useState<{ id: string; value?: string } | null>(null);
  const mark = (id: string) =>
    setDone((d) => {
      setPrev({ id, value: d[id] });
      return { ...d, [id]: new Date().toISOString() };
    });
  const undo = () => {
    if (!prev) return;
    setDone((d) => {
      const n = { ...d };
      if (prev.value) n[prev.id] = prev.value;
      else delete n[prev.id];
      return n;
    });
    setPrev(null);
  };

  const stats = useMemo(() => {
    const c = { never: 0, fresh: 0, soon: 0, due: 0 } as Record<Status, number>;
    MAP_ITEMS.forEach((it) => c[statusOf(it).s]++);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const sel = MAP_ITEMS.find((x) => x.id === selected) || null;

  // Точки на круге: равномерно по четверти, в два ряда внутри своего кольца
  const dots = MAP_ITEMS.map((it) => {
    const group = MAP_ITEMS.filter((x) => x.sector === it.sector && x.level === it.level);
    const k = group.indexOf(it);
    const [a0, a1] = SECTOR_ANGLE[it.sector];
    const pad = it.level === 'support' ? 18 : 8;
    const angle = a0 + pad + ((a1 - a0 - 2 * pad) * (k + 0.5)) / group.length;
    const [r0, r1] = RING[it.level];
    const lanes = group.length > 4 && it.level !== 'support' ? [0.32, 0.72] : [0.55];
    const r = r0 + (r1 - r0) * lanes[k % lanes.length] + (it.level === 'support' ? 25 : 0);
    const [x, y] = pt(r, angle);
    return { it, x, y };
  });

  const today = formatLocalDate(new Date());
  const doneToday = Object.values(done).filter((d) => markDay(d) === today).length;

  return (
    <div className="space-y-6">
      <div className="px-1">
        <h2 className="text-lg font-semibold text-[var(--text)]">🧭 Карта уборки</h2>
        <p className="text-[14px] text-[var(--muted)] max-w-3xl">
          Четыре зоны и три уровня: поддерживающая — каждый день, подробная — раз в 1–2 недели, редкая — раз в месяц и реже.
          Отметьте «Сделано» — точка позеленеет и сама покраснеет, когда снова пора.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,560px)_1fr] gap-6 items-start">
        {/* Круг */}
        <Card className="p-3 sm:p-4">
          <svg viewBox="0 0 800 800" className="w-full h-auto" role="img" aria-label="Карта уборки: четыре зоны и три уровня">
            {/* светлая подложка — схема одинаково читается в светлой и тёмной теме */}
            <circle cx={C} cy={C} r={380} fill="#FBFAF7" />
            {SECTORS.map((s) =>
              LEVELS.map((l) => (
                <path
                  key={s.id + l.id}
                  d={wedge(RING[l.id][0], RING[l.id][1], SECTOR_ANGLE[s.id][0], SECTOR_ANGLE[s.id][1])}
                  fill={SECTOR_COLOR[s.id]}
                  fillOpacity={LEVEL_OPACITY[l.id]}
                  stroke="#FFFFFF"
                  strokeWidth={4}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSector(s.id)}
                />
              ))
            )}
            {/* подписи зон — по углам, как на схеме */}
            {SECTORS.map((s) => {
              const pos: Record<MapSector, [number, number, 'start' | 'end']> = {
                floor: [14, 30, 'start'],
                above: [786, 30, 'end'],
                bath: [14, 784, 'start'],
                kitchen: [786, 784, 'end'],
              };
              const [x, y, anchor] = pos[s.id];
              return (
                <text key={s.id} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize="24" fontWeight={600} fill="var(--text)" style={{ pointerEvents: 'none' }}>
                  {s.title}
                </text>
              );
            })}
            {/* подписи уровней по горизонтали, как на схеме */}
            {LEVELS.map((l) => {
              const r = (RING[l.id][0] + RING[l.id][1]) / 2;
              return [-1, 1].map((side) => (
                <text
                  key={l.id + side}
                  x={C + side * r}
                  y={C}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="13"
                  fontWeight={700}
                  letterSpacing="0.5"
                  fill="#6B5E45"
                  stroke="#FBFAF7"
                  strokeWidth={5}
                  paintOrder="stroke"
                  style={{ pointerEvents: 'none' }}
                >
                  {l.id === 'support' ? (side < 0 ? 'ПОДДЕРЖ.' : '') : l.title.toUpperCase()}
                </text>
              ));
            })}
            {/* пункты схемы — с подписями, как на исходной картинке */}
            {SCHEME_LABELS.map((lb) => {
              const it = MAP_ITEMS.find((x) => x.fromScheme && x.title === lb.title);
              if (!it) return null;
              const st = statusOf(it);
              const [x, y] = fromPic(lb.at);
              const isSel = selected === it.id;
              return (
                <g key={it.id} onClick={() => { mark(it.id); setSelected(it.id); setSector(it.sector); }} style={{ cursor: 'pointer' }}>
                  <title>{`${it.title} — ${it.freq} (${STATUS[st.s].label})`}</title>
                  {/* невидимая зона касания побольше — по точке и подписи */}
                  <rect x={x - 14} y={y - 14} width={150} height={lb.lines.length * 16 + 14} fill="transparent" />
                  {st.s === 'never' ? (
                    <circle cx={x} cy={y} r={isSel ? 10 : 8} fill="#FFFFFF" stroke="#8D91A5" strokeWidth={2.5} />
                  ) : (
                    <circle cx={x} cy={y} r={isSel ? 11 : 9} fill={STATUS[st.s].color} stroke="#FFFFFF" strokeWidth={2} />
                  )}
                  <text x={x + 14} y={y - 2} fontSize="13.5" fill="#1C1D29" style={{ fontWeight: isSel ? 700 : 500 }}>
                    {lb.lines.map((ln, k) => (
                      <tspan key={k} x={x + 14} dy={k === 0 ? 4 : 16}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="text-center text-sm text-[var(--text-2)] mt-1 mb-2">
            Нажмите на пункт — он станет <span className="text-emerald-600 font-medium">зелёным</span>. Со временем сам
            станет <span className="text-amber-600 font-medium">жёлтым</span>, а когда пора — <span className="text-amber-700 font-medium">тёмно-янтарным</span>.
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[var(--muted)] mt-1">
            {(['due', 'soon', 'fresh', 'never'] as Status[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={s === 'never' ? { border: '2px solid #8D91A5' } : { background: STATUS[s].color }}
                /> {s === 'never' ? 'ещё не отмечали' : STATUS[s].label}: {stats[s]}
              </span>
            ))}
            <span>· на круге — пункты вашей схемы; остальные {MAP_ITEMS.filter((x) => !x.fromScheme).length} — в списке справа</span>
          </div>
          {sel && (() => {
            const st = statusOf(sel);
            return (
              <div className="mt-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: st.s === 'never' ? 'transparent' : STATUS[st.s].color, border: st.s === 'never' ? '2px solid #8D91A5' : undefined }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text)]">{sel.title}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {sel.freq} ·{' '}
                    <span className={STATUS[st.s].text}>
                      {st.s === 'never' ? 'ещё не отмечали' : st.ago === 0 ? 'отмечено сегодня ✓' : `${st.ago} дн. назад — ${STATUS[st.s].label}`}
                    </span>
                  </div>
                </div>
                {prev?.id === sel.id ? (
                  <Btn size="sm" variant="ghost" onClick={undo}>
                    Отменить
                  </Btn>
                ) : (
                  <Btn size="sm" variant="primary" icon={<Check className="w-3.5 h-3.5" />} onClick={() => mark(sel.id)}>
                    Сделано
                  </Btn>
                )}
              </div>
            );
          })()}
        </Card>

        {/* Список выбранной зоны по уровням */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              value={sector}
              onChange={setSector}
              options={SECTORS.map((s) => ({
                id: s.id,
                label: s.title,
                count: MAP_ITEMS.filter((x) => x.sector === s.id && statusOf(x).s === 'due').length || undefined,
              }))}
            />
            <span className="text-[14px] text-[var(--muted)]">Сегодня отмечено: {doneToday}</span>
          </div>
          {LEVELS.map((l) => {
            const items = MAP_ITEMS.filter((x) => x.sector === sector && x.level === l.id);
            return (
              <Card key={l.id} className="p-2 sm:p-3">
                <div className="flex items-baseline justify-between gap-3 px-3 pt-2 pb-2">
                  <h3 className="text-[16px] font-semibold text-[var(--text)]">{l.title}</h3>
                  <span className="text-[14px] text-[var(--muted)]">{l.hint}</span>
                </div>
                {items.map((it) => {
                  const st = statusOf(it);
                  const fill = st.s === 'never' ? 0 : Math.min(1, st.need);
                  return (
                    <div
                      key={it.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-t border-[var(--line)] transition-colors ${selected === it.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-3)]'}`}
                      onClick={() => setSelected(it.id)}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={st.s === 'never' ? { border: '2px solid #8D91A5' } : { background: STATUS[st.s].color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--text)]">
                          {it.title}
                          {it.fromScheme && <span className="ml-1.5 text-[12px] text-[var(--muted)]">• схема</span>}
                        </div>
                        <div className="text-xs text-[var(--muted)] mt-0.5">
                          {it.freq}
                          <span className={STATUS[st.s].text}>
                            {' · '}
                            {st.s === 'never' ? 'не отмечено' : st.ago === 0 ? 'сделано сегодня' : `${st.ago} дн. назад`}
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:block h-1.5 w-16 shrink-0 rounded-full bg-[var(--surface-3)] overflow-hidden">
                        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(fill * 100, st.s === 'never' ? 0 : 6)}%`, background: STATUS[st.s].color }} />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          mark(it.id);
                        }}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-medium border transition active:scale-95 ${
                          st.s === 'fresh'
                            ? 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
                            : 'border-transparent bg-[var(--accent)] text-white hover:brightness-110'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" /> Сделано
                      </button>
                    </div>
                  );
                })}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
