import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../utils/onboarding';

interface TourStep {
  /** Селекторы-кандидаты: берётся первый видимый (десктопный сайдбар, шапка или мобильная панель). */
  targets: string[];
  title: string;
  text: string;
}

const STEPS: TourStep[] = [
  {
    targets: ['[data-tour="capture"]'],
    title: 'Умный ввод',
    text: 'Напишите, что нужно сделать или купить. Система сама разложит запись по разделам.',
  },
  {
    targets: ['[data-tour="voice"]', '[data-tour="capture"]'],
    title: 'Голосом',
    text: 'Надиктуйте задачу или покупку. Перед сохранением вы увидите распознанный текст.',
  },
  {
    targets: ['[data-tour="search"]'],
    title: 'Где лежит?',
    text: 'Поиск по вещам, документам, аптечке и контактам мастеров.',
  },
  {
    targets: ['[data-tour="nav-docs"]', '[data-tour="sections"]'],
    title: 'Документы и сроки',
    text: 'Страховки и договоры с напоминанием до окончания срока.',
  },
  {
    targets: ['[data-tour="sos"]'],
    title: 'SOS',
    text: 'Экстренный экран открывается без пароля: адрес, контакты, аптечка.',
  },
];

const PAD = 6;
const MOVE_MS = 850;

const isVisible = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 &&
    r.top < window.innerHeight && r.left < window.innerWidth;
};

const findTarget = (step: TourStep): HTMLElement | null => {
  for (const sel of step.targets) {
    const el = Array.from(document.querySelectorAll<HTMLElement>(sel)).find(isVisible);
    if (el) return el;
  }
  return null;
};

interface Box { top: number; left: number; width: number; height: number }

interface GuidedTourProps {
  onFinish: () => void;
}

/**
 * Обучающий тур первого запуска: нарисованный курсор подлетает к реальной кнопке
 * интерфейса стрелкой и превращается в руку над ней; кнопка подсвечивается,
 * рядом появляется подсказка. Тур ничего не нажимает за пользователя.
 */
export const GuidedTour: React.FC<GuidedTourProps> = ({ onFinish }) => {
  const reduce = prefersReducedMotion();
  const steps = useRef(STEPS.filter((s) => findTarget(s))).current;
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [shape, setShape] = useState<'arrow' | 'hand'>('arrow');
  const [ready, setReady] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [tipPos, setTipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const step = steps[index];
  const last = index === steps.length - 1;

  const place = (x: number, y: number, ms: number) => {
    const c = cursorRef.current;
    if (!c) return;
    c.style.transition = `transform ${ms}ms cubic-bezier(.45,0,.2,1)`;
    c.style.transform = `translate(${x}px, ${y}px)`;
  };

  const measure = useCallback(() => {
    if (!step) return null;
    const el = findTarget(step);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const b = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
    setBox(b);
    return { r, b };
  }, [step]);

  // Переход к шагу: курсор летит стрелкой, по прибытии становится рукой
  useEffect(() => {
    if (!step) {
      onFinish();
      return;
    }
    setReady(false);
    setShape('arrow');
    const m = measure();
    if (!m) return;
    const { r } = m;
    const x = r.left + r.width * 0.55;
    const y = r.top + r.height * 0.6;
    if (index === 0) place(window.innerWidth / 2, window.innerHeight * 0.75, 0);
    const t1 = window.setTimeout(() => place(x, y, reduce ? 0 : MOVE_MS), 30);
    const t2 = window.setTimeout(() => {
      setShape('hand');
      setReady(true);
    }, reduce ? 40 : MOVE_MS + 60);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [index, step, measure, onFinish, reduce]);

  // Положение подсказки: под целью, если не помещается — над ней; прижата к краям экрана
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!tip || !box) return;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const gap = 14;
    let top = box.top + box.height + gap;
    if (top + th > window.innerHeight - 12) top = box.top - th - gap;
    const left = Math.min(Math.max(12, box.left + box.width / 2 - tw / 2), window.innerWidth - tw - 12);
    setTipPos({ top: Math.max(12, top), left });
  }, [box, ready]);

  useEffect(() => {
    if (ready) nextRef.current?.focus({ preventScroll: true });
  }, [ready]);

  useEffect(() => {
    const onResize = () => {
      const m = measure();
      if (m) place(m.r.left + m.r.width * 0.55, m.r.top + m.r.height * 0.6, 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish();
      if (e.key === 'ArrowRight' && ready) next();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  });

  const next = () => (last ? onFinish() : setIndex((i) => i + 1));

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true" aria-label="Знакомство с приложением">
      {/* Затемнение с «окном» вокруг цели */}
      {box && (
        <div
          className="absolute rounded-2xl pointer-events-none"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            boxShadow: '0 0 0 9999px rgba(28,25,22,.45), 0 0 0 2px var(--accent)',
            transition: reduce ? 'none' : 'top .5s ease, left .5s ease, width .5s ease, height .5s ease',
          }}
        />
      )}

      {/* Нарисованный курсор: стрелка в полёте, рука над кликабельной целью */}
      {!reduce && (
        <div ref={cursorRef} className="absolute left-0 top-0 w-0 h-0 pointer-events-none" aria-hidden="true">
          {shape === 'arrow' ? (
            <svg className="absolute" style={{ left: -5, top: -3, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.4))' }} width="24" height="24" viewBox="0 0 24 24">
              <path d="M5 3v17.5l4.6-4.4 3.2 7 3-1.4-3.2-6.8H19L5 3Z" fill="#fff" stroke="#111" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="absolute" style={{ left: -11, top: -2, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.4))' }} width="24" height="24" viewBox="0 0 24 24">
              <path d="M9 12V3.8a1.8 1.8 0 0 1 3.6 0V10h.2V8.9a1.6 1.6 0 0 1 3.2 0v1.7h.2v-.9a1.55 1.55 0 0 1 3.1 0v1.4h.2a1.4 1.4 0 0 1 2.8 0v5c0 3.7-2.7 6.4-6.3 6.4h-2.3c-2 0-3.5-.9-4.7-2.5l-3.5-4.7a1.55 1.55 0 0 1 2.3-2.05L9 14.6Z" fill="#fff" stroke="#111" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M12.7 10v3.4M16.1 10.6v3M19.4 11.1v2.6" stroke="#111" strokeWidth="1" strokeLinecap="round" />
            </svg>
          )}
        </div>
      )}

      {/* Подсказка */}
      <div
        ref={tipRef}
        className="absolute w-[min(320px,calc(100vw-24px))] bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--line)] p-4 text-[var(--text)]"
        style={{
          top: tipPos.top,
          left: tipPos.left,
          opacity: ready ? 1 : 0,
          transform: ready ? 'none' : 'translateY(6px)',
          transition: reduce ? 'none' : 'opacity .25s ease, transform .25s ease',
          pointerEvents: ready ? 'auto' : 'none',
        }}
        aria-live="polite"
      >
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h3 className="font-semibold text-[16px]">{step.title}</h3>
          <span className="text-xs text-[var(--muted)] tabular-nums shrink-0">{index + 1} из {steps.length}</span>
        </div>
        <p className="text-[14px] leading-relaxed text-[var(--text-2)] mb-4">{step.text}</p>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onFinish}
            className="text-[14px] font-medium text-[var(--muted)] hover:text-[var(--text)] px-2 py-1.5 -ml-2 rounded-lg transition"
          >
            Пропустить
          </button>
          <button
            ref={nextRef}
            type="button"
            onClick={next}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-[14px] font-semibold hover:brightness-105 active:scale-[0.97] transition"
          >
            {last ? 'Готово' : 'Далее'}
          </button>
        </div>
      </div>
    </div>
  );
};
