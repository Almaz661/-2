import React, { useEffect, useState } from 'react';
import { Home, X } from 'lucide-react';
import { getHomeProfile, subscribeHomeProfile } from '../../utils/homeProfile';
import { HomeProfileForm } from './HomeProfileForm';

/** Тихое приглашение на «Главном обзоре», пока профиль дома не заполнен. */
export const HomeProfilePrompt: React.FC<{ card: string }> = ({ card }) => {
  const [done, setDone] = useState(getHomeProfile().completed);
  const [open, setOpen] = useState(false);
  useEffect(() => subscribeHomeProfile(() => setDone(getHomeProfile().completed)), []);
  if (done) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${card} w-full p-4 sm:p-5 text-left flex items-center gap-4 hover:bg-[var(--surface-3)] transition-colors`}
      >
        <span className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] grid place-items-center shrink-0">
          <Home className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[16px] font-medium text-[var(--text)]">Расскажите о доме — 1 минута</span>
          <span className="block text-[14px] text-[var(--muted)] mt-0.5">Квартира или дом, какая техника — и в списках останется только ваше</span>
        </span>
        <span className="text-sm text-[var(--accent)] shrink-0">Заполнить</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Профиль дома"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-[var(--surface)] border border-[var(--line)] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl page-in-right"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl text-[var(--text)]">Профиль дома</h2>
                <p className="text-[14px] text-[var(--muted)]">Один раз — и больше не спрашиваем</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" className="w-9 h-9 grid place-items-center rounded-full hover:bg-[var(--surface-3)] text-[var(--muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <HomeProfileForm onSaved={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};
