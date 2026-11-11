// Движение интерфейса в стиле Mercury:
//  • появление карточек и строк при прокрутке (каскадом, с задержкой по порядку);
//  • «капля» в точке касания на iPad и телефоне — визуальный отклик вместо курсора;
//  • тень у шапки, когда содержимое прокручено.
// Всё отключается системной настройкой «Уменьшить движение».

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CANDIDATES = [
  '[data-reveal]',
  'section',
  '.rounded-2xl.border',
  '.group',
  '[role="button"]',
].join(',');

// Не трогаем выпадающие меню, модальные окна и абсолютно спозиционированные элементы:
// у них свои трансформации, и «въезд» сдвинул бы их с места.
const eligible = (el: HTMLElement) => {
  if (el.dataset.revealState || el.closest('[data-no-reveal], .fixed, [role="menu"], [role="listbox"], [role="dialog"]')) return false;
  const pos = getComputedStyle(el).position;
  return pos !== 'absolute' && pos !== 'fixed' && pos !== 'sticky';
};

/** Подготовить и запустить появление элементов внутри прокручиваемого контейнера. */
export function revealIn(root: HTMLElement): () => void {
  if (reduced() || typeof IntersectionObserver === 'undefined') return () => {};
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(CANDIDATES))
    .filter(eligible)
    .slice(0, 220);

  nodes.forEach((el) => {
    el.dataset.revealState = 'wait';
  });

  let batch = 0;
  let batchTimer = 0;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        // Каскад: элементы, появившиеся одновременно, стартуют друг за другом
        el.style.transitionDelay = `${Math.min(batch, 10) * 45}ms`;
        batch += 1;
        window.clearTimeout(batchTimer);
        batchTimer = window.setTimeout(() => (batch = 0), 120);
        requestAnimationFrame(() => {
          el.dataset.revealState = 'in';
          window.setTimeout(() => {
            el.style.transitionDelay = '';
            el.dataset.revealState = 'done';
          }, 900);
        });
      });
    },
    { root, threshold: 0.08, rootMargin: '0px 0px -4% 0px' }
  );
  nodes.forEach((el) => io.observe(el));

  // Новые строки (добавили задачу, переключили вкладку) тоже появляются плавно
  const mo = new MutationObserver(() => {
    const fresh = Array.from(root.querySelectorAll<HTMLElement>(CANDIDATES))
      .filter(eligible)
      .slice(0, 60);
    fresh.forEach((el) => {
      el.dataset.revealState = 'wait';
      io.observe(el);
    });
  });
  mo.observe(root, { childList: true, subtree: true });

  return () => {
    io.disconnect();
    mo.disconnect();
    window.clearTimeout(batchTimer);
  };
}

/** Тень у шапки при прокрутке основного контейнера. */
export function trackScrolled(root: HTMLElement): () => void {
  const onScroll = () => {
    document.documentElement.toggleAttribute('data-scrolled', root.scrollTop > 4);
  };
  root.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  return () => root.removeEventListener('scroll', onScroll);
}

/** Отклик на касание: расходящийся круг в точке нажатия на кнопку. */
export function installTapFeedback(): () => void {
  if (reduced()) return () => {};
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const target = (e.target as HTMLElement | null)?.closest(
      'button, a[href], [role="button"], [role="tab"], select, label[for]'
    );
    if (!target || (target as HTMLButtonElement).disabled) return;
    const dot = document.createElement('span');
    dot.className = 'tap-ripple';
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
    document.body.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
  };
  document.addEventListener('pointerdown', onDown, { passive: true });
  return () => document.removeEventListener('pointerdown', onDown);
}
