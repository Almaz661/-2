import React, { useMemo, useState } from 'react';
import { ChevronDown, EyeOff, Eye, Plus, Search, Check } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { CATALOG } from '../../data/catalog';
import { applies, Need } from '../../utils/homeProfile';
import { formatLocalDate } from '../../utils/dateUtils';
import type { HouseholdZone, RecurrenceType } from '../../types';
import { Card } from '../ui/mercury';

// «Библиотека дел» — мастер-каталог: только названия. Своё дело берётся в работу одним касанием с выбором частоты.
// Что не подходит дому — скрывается само по «Профилю дома»; остальное можно скрыть вручную: «Не про нас».

const NEEDS_RULES: [RegExp, Need][] = [
  [/посудомо/i, 'dishwasher'],
  [/сушильн/i, 'dryer'],
  [/робота-пылесоса|робот-пылесос/i, 'robot'],
  [/кондиционер/i, 'aircon'],
  [/балкон|лоджи/i, 'balcony'],
  [/(?<!по)сад|огород|участ|газон|грядк|рассад|урожай|посадк|сорняк|почв|садов/i, 'garden'],
  [/животн|корм|лоток|наполнител|ветеринар|вольер|клетк|когти|расчесать шерсть|осмотреть лапы|миск|микрочип|переноск|лежанк/i, 'pets'],
  [/школ|секци|детск|домашними заданиями/i, 'kids'],
  [/подвал/i, 'basement'],
  [/чердак/i, 'attic'],
  [/гараж/i, 'garage'],
  [/септик|локальную канализацию/i, 'septic'],
  [/стиральн/i, 'washer'],
  [/кофемашин/i, 'coffee'],
  [/микроволн/i, 'microwave'],
  [/духовк/i, 'oven'],
  [/увлажнител|осушител/i, 'humidifier'],
  [/комнатн|растени[ея] (?:в|на)|поддона|горшк|пересадить растение/i, 'plants'],
  [/водосток|крыш|фасад|насос|наружн/i, 'house'],
  [/автомобил/i, 'car'],
];
const needsOf = (name: string): Need[] => NEEDS_RULES.filter(([re]) => re.test(name)).map(([, n]) => n);

const zoneFor = (cat: string, section: string): HouseholdZone => {
  if (cat === 'food') return 'Кухня';
  if (/Ванная/.test(section)) return 'Ванная';
  if (/Спальн/.test(section)) return 'Спальня';
  if (/Гостиная/.test(section)) return 'Гостиная';
  if (/прихож/i.test(section)) return 'Прихожая';
  if (/Сад|участок/.test(section)) return 'Участок/Дача';
  return 'Весь дом';
};

const FREQ: { id: RecurrenceType; label: string }[] = [
  { id: 'none', label: 'Один раз' },
  { id: 'weekly', label: 'Каждую неделю' },
  { id: 'biweekly', label: 'Раз в 2 недели' },
  { id: 'monthly', label: 'Каждый месяц' },
];

const KEY = 'dbh_library_hidden';
const loadHidden = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

export const LibraryBoard: React.FC = () => {
  const { tasks, addTask } = useHousehold();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [hidden, setHidden] = useState<string[]>(loadHidden);
  const [showHidden, setShowHidden] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({});

  const saveHidden = (h: string[]) => {
    setHidden(h);
    try {
      localStorage.setItem(KEY, JSON.stringify(h));
    } catch {
      /* нет хранилища */
    }
  };
  const taken = useMemo(() => new Set(tasks.map((t) => t.title.toLowerCase().trim())), [tasks]);
  const query = q.toLowerCase().trim();

  const cats = CATALOG.map((c) => ({
    ...c,
    sections: c.sections
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (it) => applies(needsOf(it)) && (showHidden || !hidden.includes(it)) && (!query || it.toLowerCase().includes(query))
        ),
      }))
      .filter((s) => s.items.length),
  })).filter((c) => c.sections.length);
  const total = cats.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.items.length, 0), 0);
  const shown = cat === 'all' ? cats : cats.filter((c) => c.id === cat);

  const take = (name: string, catId: string, section: string, recurrence: RecurrenceType) => {
    addTask({
      title: name,
      zone: zoneFor(catId, section),
      assigneeId: null,
      isRotation: false,
      recurrence,
      dueDate: formatLocalDate(new Date()),
      priority: 'medium',
      completed: false,
      packName: 'Библиотека дел',
    });
    setPicking(null);
  };

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h2 className="text-lg text-[var(--text)]">Библиотека дел</h2>
        <p className="text-[14px] text-[var(--muted)] max-w-3xl">
          Мастер-каталог: все домашние дела по 9 категориям. Здесь только названия — частоту выбираете, когда берёте дело к себе.
          Что не подходит вашему дому, скрыто по «Профилю дома». Сейчас дел: {total}.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Найти дело, например «фильтр» или «шторы»"
            className="w-full pl-9 pr-3 py-2.5 rounded-full text-sm bg-[var(--surface)] border border-[var(--line)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowHidden((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[14px] border border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--surface-3)]"
        >
          {showHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showHidden ? 'Не показывать скрытые' : `Показать скрытые (${hidden.length})`}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ id: 'all', icon: '', title: 'Все' }, ...cats].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            aria-pressed={cat === c.id}
            className={`px-3.5 py-2 rounded-full text-[14px] border transition ${
              cat === c.id ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--line)] bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-3)]'
            }`}
          >
            {c.icon} {c.title}
          </button>
        ))}
      </div>

      {shown.map((c) => (
        <section key={c.id}>
          <h3 className="text-[16px] font-semibold text-[var(--text)] mb-2 px-1">
            {c.num}. {c.title}
          </h3>
          <div className="space-y-3">
            {c.sections.map((s) => {
              const sk = c.id + s.title;
              const isOpen = openSec[sk] ?? (!!query || cat !== 'all');
              return (
                <Card key={sk} className="p-2 sm:p-3">
                  <button type="button" onClick={() => setOpenSec((o) => ({ ...o, [sk]: !isOpen }))} aria-expanded={isOpen} className="w-full flex items-center gap-3 px-3 py-2 text-left">
                    <span className="flex-1 text-sm font-medium text-[var(--text)]">{s.title}</span>
                    <span className="text-xs text-[var(--muted)] tabular-nums">{s.items.length}</span>
                    <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen &&
                    s.items.map((it) => {
                      const isTaken = taken.has(it.toLowerCase());
                      const isHidden = hidden.includes(it);
                      return (
                        <div key={it} className="border-t border-[var(--line)] px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className={`flex-1 min-w-0 text-sm ${isHidden ? 'text-[var(--muted)] line-through' : 'text-[var(--text)]'}`}>{it}</span>
                            {isTaken ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                                <Check className="w-3.5 h-3.5" /> в делах
                              </span>
                            ) : (
                              !isHidden && (
                                <button
                                  type="button"
                                  onClick={() => setPicking(picking === it ? null : it)}
                                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[var(--accent)] text-white hover:brightness-110"
                                >
                                  <Plus className="w-3.5 h-3.5" /> В дела
                                </button>
                              )
                            )}
                            <button
                              type="button"
                              onClick={() => saveHidden(isHidden ? hidden.filter((h) => h !== it) : [...hidden, it])}
                              className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--text)]"
                            >
                              {isHidden ? 'Вернуть' : 'Не про нас'}
                            </button>
                          </div>
                          {picking === it && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {FREQ.map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => take(it, c.id, s.title, f.id)}
                                  className="px-3 py-1.5 rounded-full text-xs border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent-soft)]"
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </Card>
              );
            })}
          </div>
        </section>
      ))}
      {total === 0 && <p className="text-sm text-[var(--muted)] px-1">Ничего не найдено.</p>}
    </div>
  );
};
