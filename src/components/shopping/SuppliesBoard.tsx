import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { PLACES, STARTER, SupplyPlace } from '../../data/supplies';
import { applies, Need } from '../../utils/homeProfile';
import { formatLocalDate } from '../../utils/dateUtils';
import { Card } from '../ui/mercury';

type Status = 'ok' | 'low' | 'out';
interface Supply {
  id: string;
  name: string;
  place: SupplyPlace;
  status: Status;
  /** Когда отправили в покупки — чтобы после покупки вернуть «есть» */
  requested?: boolean;
  expiry?: string;
  needs?: Need[];
}
const KEY = 'dbh_supplies';
const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();
const STATUS: Record<Status, { label: string; cls: string }> = {
  ok: { label: 'есть', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  low: { label: 'заканчивается', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  out: { label: 'нет', cls: 'bg-[var(--surface-3)] text-[var(--text-2)] border-[var(--line)]' },
};
const NEXT: Record<Status, Status> = { ok: 'low', low: 'out', out: 'ok' };

const load = (): Supply[] | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
};

/** «Запасы дома»: одно касание — «заканчивается», и товар сам уходит в покупки; купили — снова «есть». */
export const SuppliesBoard: React.FC = () => {
  const { shoppingItems, shoppingLists, addShoppingItems, showToast } = useHousehold();
  const [items, setItems] = useState<Supply[]>(
    () => load() || STARTER.map((s, i) => ({ id: `s${i}`, name: s.name, place: s.place, status: 'ok' as Status, ...(s.needs ? { needs: s.needs } : {}) }))
  );
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlace, setEditPlace] = useState<SupplyPlace>('pantry');
  const [newPlace, setNewPlace] = useState<SupplyPlace>('pantry');
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* нет места */
    }
  }, [items]);

  // Купили (в списке покупок больше нет открытой позиции) — запас снова «есть»
  const openShopping = useMemo(() => new Set(shoppingItems.filter((i) => !i.completed).map((i) => norm(i.title))), [shoppingItems]);
  useEffect(() => {
    setItems((list) => {
      let changed = false;
      const next = list.map((s) => {
        if (s.requested && !openShopping.has(norm(s.name))) {
          changed = true;
          return { ...s, status: 'ok' as Status, requested: false };
        }
        return s;
      });
      return changed ? next : list;
    });
  }, [openShopping]);

  const listFor = (place: SupplyPlace) => {
    const want = PLACES.find((p) => p.id === place)!.list;
    return shoppingLists.find((l) => l.id === want) || shoppingLists[0];
  };
  const tap = (s: Supply) => {
    const status = NEXT[s.status];
    let requested = s.requested;
    if (status !== 'ok' && !s.requested && !openShopping.has(norm(s.name))) {
      const list = listFor(s.place);
      if (list) {
        addShoppingItems([{ listId: list.id, title: s.name, category: 'other', completed: false }], { silent: true });
        showToast(`«${s.name}» — в списке «${list.name}»`, 'success');
        requested = true;
      }
    }
    if (status === 'ok') requested = false;
    setItems((l) => l.map((x) => (x.id === s.id ? { ...x, status, requested } : x)));
  };

  // Удаление с возможностью вернуть: «раньше покупали — теперь нет»
  const [removed, setRemoved] = useState<{ item: Supply; index: number } | null>(null);
  const remove = (s: Supply) => {
    setItems((l) => {
      const index = l.findIndex((x) => x.id === s.id);
      setRemoved({ item: s, index });
      return l.filter((x) => x.id !== s.id);
    });
  };
  useEffect(() => {
    if (!removed) return;
    const t = window.setTimeout(() => setRemoved(null), 6000);
    return () => window.clearTimeout(t);
  }, [removed]);
  const undo = () => {
    if (!removed) return;
    setItems((l) => {
      const next = [...l];
      next.splice(Math.min(removed.index, next.length), 0, removed.item);
      return next;
    });
    setRemoved(null);
  };

  const today = formatLocalDate(new Date());
  const soon = items.filter((s) => s.expiry && s.expiry <= formatLocalDate(new Date(Date.now() + 2 * 86400000)));
  const places = PLACES.filter((p) => applies(p.needs));
  const lowCount = items.filter((s) => s.status !== 'ok').length;

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h2 className="text-lg text-[var(--text)]">Запасы дома</h2>
        <p className="text-[14px] text-[var(--muted)] max-w-3xl">
          Что всегда должно быть дома. Нажмите на отметку: «есть» → «заканчивается» → «нет». Закончилось — товар сам уходит в список покупок; купили — снова «есть».
        </p>
        <p className="text-sm text-[var(--text-2)] mt-2">{lowCount ? `Нужно купить: ${lowCount}` : 'Всего хватает'}</p>
      </div>

      {soon.length > 0 && (
        <Card className="p-4">
          <h3 className="text-[16px] font-medium text-[var(--text)] mb-2">Использовать первым</h3>
          <ul className="text-sm space-y-1">
            {soon.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span className="text-[var(--text)]">{s.name}</span>
                <span className={s.expiry! < today ? 'text-red-600' : 'text-amber-700'}>
                  {s.expiry! < today ? 'срок прошёл' : s.expiry === today ? 'сегодня' : 'скоро'}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {places.map((p) => {
          const list = items.filter((s) => s.place === p.id && applies(s.needs));
          const withDate = p.id === 'fridge' || p.id === 'freezer';
          return (
            <Card key={p.id} className="p-2 sm:p-3">
              <div className="flex items-center gap-2.5 px-3 pt-2 pb-2">
                <span className="text-xl">{p.icon}</span>
                <h3 className="flex-1 text-[16px] font-medium text-[var(--text)]">{p.title}</h3>
                <span className="text-xs text-[var(--muted)] tabular-nums">{list.filter((s) => s.status !== 'ok').length || ''}</span>
              </div>
              {list.length === 0 && <p className="px-3 pb-3 text-sm text-[var(--muted)]">Пока пусто.</p>}
              {list.map((s) => (
                <div key={s.id} className="group flex items-center gap-3 px-3 py-2 border-t border-[var(--line)]">
                  {editId === s.id ? (
                    <span className="flex-1 min-w-0 flex flex-wrap gap-2">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Название запаса" autoFocus
                        className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg text-sm bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)]" />
                      <select value={editPlace} onChange={(e) => setEditPlace(e.target.value as SupplyPlace)} aria-label="Где хранится"
                        className="px-2 py-1.5 rounded-lg text-sm bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)]">
                        {places.map((pl) => <option key={pl.id} value={pl.id}>{pl.title}</option>)}
                      </select>
                      <button type="button" className="px-3 py-1.5 rounded-lg text-sm bg-[var(--accent)] text-white"
                        onClick={() => { if (editName.trim()) setItems((l) => l.map((x) => (x.id === s.id ? { ...x, name: editName.trim(), place: editPlace } : x))); setEditId(null); }}>
                        Сохранить
                      </button>
                      <button type="button" className="px-3 py-1.5 rounded-lg text-sm text-[var(--text-2)]" onClick={() => setEditId(null)}>Отмена</button>
                    </span>
                  ) : (
                    <button type="button" title="Изменить название или место" onClick={() => { setEditId(s.id); setEditName(s.name); setEditPlace(s.place); }}
                      className="flex-1 min-w-0 text-left text-sm text-[var(--text)] truncate hover:underline underline-offset-4">
                      {s.name}
                    </button>
                  )}
                  {withDate && (
                    <input
                      type="date"
                      value={s.expiry || ''}
                      title="Годен до"
                      onChange={(e) => setItems((l) => l.map((x) => (x.id === s.id ? { ...x, expiry: e.target.value || undefined } : x)))}
                      className="w-[130px] px-2 py-1 rounded-lg text-xs bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text-2)]"
                    />
                  )}
                  <button type="button" onClick={() => tap(s)} className={`shrink-0 min-w-[120px] px-3 py-1.5 rounded-full text-xs font-medium border transition active:scale-95 ${STATUS[s.status].cls}`}>
                    {STATUS[s.status].label}
                  </button>
                  <button
                    type="button"
                    aria-label={`Удалить из запасов: ${s.name}`}
                    title="Больше не покупаем — убрать из запасов"
                    onClick={() => remove(s)}
                    className="shrink-0 w-9 h-9 grid place-items-center rounded-full text-[var(--muted)] hover:text-red-600 hover:bg-red-50 active:scale-95 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && newName.trim() && (setItems((l) => [...l, { id: Date.now().toString(36), name: newName.trim(), place: newPlace, status: 'ok' }]), setNewName(''))}
            placeholder="Добавить запас, например «Пищевая плёнка»"
            className="flex-1 px-4 py-2.5 rounded-full text-sm bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
          <select
            value={newPlace}
            onChange={(e) => setNewPlace(e.target.value as SupplyPlace)}
            className="px-4 py-2.5 rounded-full text-sm bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)]"
          >
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!newName.trim()) return;
              setItems((l) => [...l, { id: Date.now().toString(36), name: newName.trim(), place: newPlace, status: 'ok' }]);
              setNewName('');
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium bg-[var(--accent)] text-white"
          >
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>
      </Card>
      {removed && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-4 px-5 py-3 rounded-full bg-[var(--inverse)] text-white shadow-2xl text-sm">
          <span>Убрано из запасов: «{removed.item.name}»</span>
          <button type="button" onClick={undo} className="font-semibold underline underline-offset-4">
            Вернуть
          </button>
        </div>
      )}
    </div>
  );
};
