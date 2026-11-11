import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/* Общие элементы интерфейса в стиле Mercury.
   Все цвета — токены из index.css, поэтому работают в светлой и тёмной теме. */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div
    className={cx('bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-[var(--shadow)]', className)}
    {...rest}
  />
);

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: React.ReactNode; size?: 'sm' | 'md' }
> = ({ variant = 'secondary', icon, size = 'md', className, children, ...rest }) => (
  <button
    type="button"
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition active:scale-[0.97] disabled:opacity-50',
      size === 'sm' ? 'px-3 py-1.5 text-[14px]' : 'px-4 py-2.5 text-sm',
      variant === 'primary' && 'bg-[var(--accent)] text-white hover:brightness-110',
      variant === 'secondary' &&
        'bg-[var(--surface)] text-[var(--text)] border border-[var(--line)] hover:bg-[var(--surface-3)]',
      variant === 'ghost' && 'text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-500',
      className
    )}
    {...rest}
  >
    {icon}
    {children}
  </button>
);

export const IconBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }> = ({
  danger,
  className,
  ...rest
}) => (
  <button
    type="button"
    className={cx(
      'w-8 h-8 grid place-items-center rounded-lg text-[var(--muted)] transition-colors',
      danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-[var(--surface-3)] hover:text-[var(--text)]',
      className
    )}
    {...rest}
  />
);

export type TagTone = 'neutral' | 'accent' | 'warn' | 'danger' | 'success';
export const Tag: React.FC<{ tone?: TagTone; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  tone = 'neutral',
  icon,
  children,
  className,
}) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap',
      tone === 'neutral' && 'bg-[var(--surface-3)] text-[var(--text-2)]',
      tone === 'accent' && 'bg-[var(--accent-soft)] text-[var(--accent)]',
      tone === 'warn' && 'bg-amber-50 text-amber-700',
      tone === 'danger' && 'bg-red-50 text-red-700',
      tone === 'success' && 'bg-emerald-50 text-emerald-700',
      className
    )}
  >
    {icon}
    {children}
  </span>
);

export interface SegOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cx('inline-flex p-1 rounded-xl bg-[var(--surface-3)] max-w-full overflow-x-auto', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          type="button"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            'px-3 py-1.5 rounded-lg text-[14px] font-medium whitespace-nowrap transition',
            value === o.id
              ? 'bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow)]'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 tabular-nums text-[var(--muted)]">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Кнопка-фильтр с выпадающим списком: «Зона: Кухня ▾». */
export function FilterMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  allValue,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  allValue: T;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === value);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const active = value !== allValue;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[14px] font-medium border transition-colors whitespace-nowrap',
          active
            ? 'bg-[var(--accent-soft)] border-transparent text-[var(--accent)]'
            : 'bg-[var(--surface)] border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--surface-3)]'
        )}
      >
        {label}
        {active && current ? `: ${current.label}` : ''}
        <ChevronDown className={cx('w-3.5 h-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <div
        role="listbox"
        className={cx(
          'absolute left-0 top-[calc(100%+6px)] z-40 min-w-52 max-h-72 overflow-y-auto p-1.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)] origin-top-left transition duration-150',
          open ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'
        )}
      >
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="option"
            aria-selected={value === o.id}
            onClick={() => {
              onChange(o.id);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[14px] text-left text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
          >
            <span className="flex-1">{o.label}</span>
            {value === o.id && <Check className="w-4 h-4 text-[var(--accent)]" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}> = ({ icon, title, text, action }) => (
  <div className="py-14 px-6 text-center">
    <div className="w-12 h-12 mx-auto rounded-full border border-[var(--line-strong)] grid place-items-center text-[var(--muted)]">
      {icon}
    </div>
    <h3 className="mt-4 text-[16px] font-semibold text-[var(--text)]">{title}</h3>
    {text && <p className="mt-1 text-sm text-[var(--muted)] max-w-sm mx-auto">{text}</p>}
    {action && <div className="mt-5 flex items-center justify-center gap-2">{action}</div>}
  </div>
);

/** Заголовок группы строк внутри таблицы: «Сегодня 3». */
export const GroupLabel: React.FC<{ label: string; count?: number; tone?: 'default' | 'danger' }> = ({
  label,
  count,
  tone = 'default',
}) => (
  <div
    className={cx(
      'px-4 pt-5 pb-2 text-[14px] font-medium',
      tone === 'danger' ? 'text-amber-700' : 'text-[var(--muted)]'
    )}
  >
    {label}
    {count !== undefined && <span className="ml-1.5 tabular-nums">{count}</span>}
  </div>
);

export const PageWrap: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('px-4 py-6 sm:px-8 sm:py-8 max-w-6xl mx-auto space-y-6', className)}>{children}</div>
);

/** Число, которое «набегает» от нуля при появлении — как балансы у Mercury. */
export const CountUp: React.FC<{ value: number; duration?: number }> = ({ value, duration = 700 }) => {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (value - a) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown}</>;
};

/** Направление сдвига: если новый индекс больше прежнего — содержимое въезжает справа, иначе слева. */
export function useSlideDir(index: number): 'right' | 'left' {
  const prev = useRef(index);
  const dir = useRef<'right' | 'left'>('right');
  if (prev.current !== index) {
    dir.current = index > prev.current ? 'right' : 'left';
    prev.current = index;
  }
  return dir.current;
}

/**
 * Боковая смена содержимого, как у Mercury: при переключении вкладки
 * новое содержимое въезжает сбоку с лёгким размытием.
 */
export const Slide: React.FC<{ k: React.Key; index: number; children: React.ReactNode; className?: string }> = ({
  k,
  index,
  children,
  className,
}) => {
  const dir = useSlideDir(index);
  const first = useRef(true);
  const anim = first.current ? '' : dir === 'right' ? 'slide-in-right' : 'slide-in-left';
  useEffect(() => {
    first.current = false;
  }, []);
  return (
    <div className={cx('overflow-hidden', className)}>
      <div key={k} className={anim}>
        {children}
      </div>
    </div>
  );
};
