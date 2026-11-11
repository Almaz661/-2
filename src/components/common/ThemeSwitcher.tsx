import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Monitor, ChevronDown, Check } from 'lucide-react';
import { ThemePref, getThemePref, setThemePref, subscribeTheme } from '../../utils/theme';

const OPTIONS: { id: ThemePref; label: string; Icon: typeof Sun }[] = [
  { id: 'light', label: 'Светлая', Icon: Sun },
  { id: 'dark', label: 'Тёмная', Icon: Moon },
  { id: 'system', label: 'Как в системе', Icon: Monitor },
];

const useThemePref = () => {
  const [pref, setPref] = useState<ThemePref>(getThemePref);
  useEffect(() => {
    const off = subscribeTheme(setPref);
    return () => {
      off();
    };
  }, []);
  return pref;
};

/** Кнопка-меню в шапке: иконка + шеврон, выпадающий список с отметкой выбранного. */
export const ThemeMenu: React.FC = () => {
  const pref = useThemePref();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.id === pref) ?? OPTIONS[2];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Тема оформления"
        className="flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-3)] active:scale-95 transition"
      >
        <current.Icon className="w-3.5 h-3.5" />
        <ChevronDown className={`w-3 h-3 text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        role="menu"
        className={`absolute right-0 top-[calc(100%+8px)] z-50 w-48 p-1.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] origin-top-right transition duration-150 ${ open ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none' }`}
      >
        {OPTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="menuitemradio"
            aria-checked={pref === id}
            onClick={() => {
              setThemePref(id);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
          >
            <Icon className="w-4 h-4 text-[var(--muted)]" />
            <span className="flex-1 text-left">{label}</span>
            {pref === id && <Check className="w-4 h-4 text-[var(--accent)]" />}
          </button>
        ))}
      </div>
    </div>
  );
};

/** Сегментированный переключатель для страницы настроек. */
export const ThemeSegmented: React.FC = () => {
  const pref = useThemePref();
  return (
    <div role="radiogroup" aria-label="Тема оформления" className="inline-flex p-1 rounded-xl bg-[var(--surface-3)] border border-[var(--line)]">
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={pref === id}
          onClick={() => setThemePref(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${ pref === id ? 'bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow)]' : 'text-[var(--muted)] hover:text-[var(--text)]' }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
};
