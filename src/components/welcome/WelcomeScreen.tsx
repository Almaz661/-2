import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Home, ChevronDown, Sparkles } from 'lucide-react';
import { prefersReducedMotion } from '../../utils/onboarding';

interface WelcomeScreenProps {
  onFinish: () => void;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Приветственный экран первого запуска.
 * Скролл управляет «камерой»: сцена комнаты приближается к экрану планшета,
 * экран заполняет весь вьюпорт цветом фона приложения (--bg), после чего экран
 * приветствия растворяется и под ним оказывается настоящий «Главный обзор».
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onFinish }) => {
  const reduce = prefersReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const screenRef = useRef<SVGRectElement>(null);
  const screenUIRef = useRef<SVGGElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const geo = useRef({ cx: 0, cy: 0, vx: 0, vy: 0, s: 1 });
  const finishingRef = useRef(false);
  const [leaving, setLeaving] = useState(false);

  const finish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setLeaving(true);
    window.setTimeout(onFinish, reduce ? 0 : 450);
  }, [onFinish, reduce]);

  const update = useCallback(() => {
    const scroller = scrollerRef.current;
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!scroller || !stage || !wrap || reduce) return;

    const max = scroller.scrollHeight - scroller.clientHeight;
    const p = clamp(scroller.scrollTop / Math.max(1, max), 0, 1);
    const e = easeInOut(clamp((p - 0.06) / 0.86, 0, 1));
    const { cx, cy, vx, vy, s } = geo.current;
    const sc = Math.pow(s, e);
    const px = cx + (vx - cx) * e;
    const py = cy + (vy - cy) * e;
    wrap.style.transform = `translate3d(${px - cx * sc}px, ${py - cy * sc}px, 0) scale(${sc})`;

    const t = clamp(p / 0.2, 0, 1);
    if (copyRef.current) {
      copyRef.current.style.opacity = String(1 - t);
      copyRef.current.style.transform = `translateY(${-48 * t}px)`;
      copyRef.current.style.visibility = t >= 1 ? 'hidden' : 'visible';
    }
    if (veilRef.current) veilRef.current.style.opacity = String(1 - t);
    if (hintRef.current) hintRef.current.style.opacity = String(1 - clamp(p / 0.06, 0, 1));
    if (screenUIRef.current) screenUIRef.current.style.opacity = String(1 - clamp((e - 0.3) / 0.4, 0, 1));

    if (p >= 0.985) finish();
  }, [finish, reduce]);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    const screen = screenRef.current;
    if (!stage || !wrap || !svg || !screen) return;
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    svg.setAttribute('viewBox', sw / sh < 0.9 ? '450 80 700 760' : '0 0 1600 1000');
    wrap.style.transform = 'none';
    const r = screen.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    geo.current = {
      cx: r.left - s.left + r.width / 2,
      cy: r.top - s.top + r.height / 2,
      vx: s.width / 2,
      vy: s.height / 2,
      s: Math.max(s.width / r.width, s.height / r.height) * 1.12,
    };
    update();
  }, [update]);

  useEffect(() => {
    measure();
    const scroller = scrollerRef.current;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('keydown', onKey);
    return () => {
      scroller?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('keydown', onKey);
    };
  }, [measure, update, finish]);

  const start = () => {
    const scroller = scrollerRef.current;
    if (!scroller || reduce) return finish();
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div
      ref={scrollerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Добро пожаловать в «Дом без хаоса»"
      className="fixed inset-0 z-[200] overflow-y-auto overscroll-contain bg-[#1C2030] text-[#EEF0F6] select-none"
      style={{
        opacity: leaving ? 0 : 1,
        transition: reduce ? 'none' : 'opacity 450ms ease',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <div style={{ height: reduce ? '100dvh' : '280vh' }}>
        <div ref={stageRef} className="sticky top-0 h-[100dvh] overflow-hidden">
          {/* Сцена: SVG, поэтому не теряет чёткость при сильном приближении */}
          <div ref={wrapRef} className="absolute inset-0" style={{ transformOrigin: '0 0' }} aria-hidden="true">
            <svg ref={svgRef} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="block w-full h-full">
              <defs>
                <linearGradient id="dbh-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2F3150" /><stop offset="1" stopColor="#23253A" /></linearGradient>
                <linearGradient id="dbh-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4C4F80" /><stop offset=".45" stopColor="#B98BB0" /><stop offset=".85" stopColor="#F0B88E" /></linearGradient>
                <linearGradient id="dbh-table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7A5B45" /><stop offset="1" stopColor="#4E3829" /></linearGradient>
                <radialGradient id="dbh-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFD98A" stopOpacity=".42" /><stop offset="1" stopColor="#FFD98A" stopOpacity="0" /></radialGradient>
                <radialGradient id="dbh-screenglow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFE9D6" stopOpacity=".28" /><stop offset="1" stopColor="#FFE9D6" stopOpacity="0" /></radialGradient>
              </defs>

              <rect width="1600" height="1000" fill="url(#dbh-wall)" />

              {/* окно */}
              <rect x="130" y="110" width="540" height="580" rx="6" fill="#3A3C5C" />
              <rect x="152" y="132" width="496" height="536" fill="url(#dbh-sky)" />
              <circle cx="560" cy="230" r="24" fill="#FFF1D6" opacity=".92" />
              <path d="M152 668V560h40v-30h50v20h36v-48h62v58h30v-22h70v40h44v-64h56v40h40v40h68v134Z" fill="#2A2B47" />
              <g fill="#F6CF7A">
                <rect x="300" y="520" width="10" height="12" /><rect x="318" y="520" width="10" height="12" opacity=".6" />
                <rect x="512" y="530" width="10" height="12" /><rect x="530" y="548" width="10" height="12" opacity=".7" />
                <rect x="420" y="560" width="10" height="12" opacity=".8" /><rect x="214" y="575" width="10" height="12" />
              </g>
              <rect x="394" y="132" width="12" height="536" fill="#3A3C5C" />
              <rect x="152" y="394" width="496" height="12" fill="#3A3C5C" />
              <rect x="112" y="686" width="576" height="18" rx="3" fill="#44466A" />

              {/* полка */}
              <rect x="1080" y="290" width="400" height="12" rx="2" fill="#44466A" />
              <rect x="1110" y="214" width="22" height="76" fill="#5C6AA0" />
              <rect x="1136" y="226" width="18" height="64" fill="#8DBB9A" opacity=".85" />
              <rect x="1158" y="206" width="26" height="84" fill="#C9A6C2" opacity=".8" />
              <rect x="1188" y="232" width="20" height="58" fill="#6E7397" />
              <rect x="1214" y="248" width="70" height="20" rx="2" fill="#B6B9CC" opacity=".7" />
              <rect x="1218" y="268" width="62" height="22" rx="2" fill="#7F86A8" />
              <path d="M1400 290h44l-6-40h-32Z" fill="#6F8FA6" />
              <g fill="#5E8B6B">
                <ellipse cx="1410" cy="232" rx="12" ry="22" transform="rotate(-22 1410 232)" />
                <ellipse cx="1432" cy="228" rx="12" ry="24" transform="rotate(18 1432 228)" />
                <ellipse cx="1421" cy="214" rx="10" ry="20" />
              </g>

              {/* лампа */}
              <circle cx="1180" cy="460" r="420" fill="url(#dbh-glow)" />
              <line x1="1180" y1="0" x2="1180" y2="330" stroke="#15172A" strokeWidth="3" />
              <path d="M1132 380 1152 330h56l20 50Z" fill="#1E2034" />
              <ellipse cx="1180" cy="381" rx="48" ry="7" fill="#FFE2A3" />

              {/* стол */}
              <rect x="0" y="792" width="1600" height="208" fill="url(#dbh-table)" />
              <rect x="0" y="790" width="1600" height="5" fill="#977256" />
              <ellipse cx="1150" cy="812" rx="320" ry="34" fill="#FFD98A" opacity=".12" />

              {/* растение */}
              <ellipse cx="455" cy="795" rx="58" ry="8" fill="#000" opacity=".22" />
              <path d="M408 700h94l-10 94h-74Z" fill="#6F8FA6" />
              <rect x="404" y="694" width="102" height="14" rx="4" fill="#7E9FB6" />
              <g fill="#4F7A5C">
                <ellipse cx="430" cy="640" rx="26" ry="46" transform="rotate(-28 430 640)" />
                <ellipse cx="482" cy="628" rx="26" ry="50" transform="rotate(24 482 628)" />
              </g>
              <g fill="#6A9A72">
                <ellipse cx="456" cy="606" rx="24" ry="52" />
                <ellipse cx="410" cy="672" rx="18" ry="34" transform="rotate(-52 410 672)" />
                <ellipse cx="504" cy="668" rx="18" ry="34" transform="rotate(50 504 668)" />
              </g>

              {/* кружка */}
              <ellipse cx="1072" cy="795" rx="40" ry="6" fill="#000" opacity=".22" />
              <rect x="1044" y="734" width="58" height="60" rx="8" fill="#E4DFD6" />
              <path d="M1102 748h10a14 14 0 0 1 0 28h-10" fill="none" stroke="#E4DFD6" strokeWidth="8" />

              {/* планшет: экран в цвет приложения, чтобы переход был бесшовным */}
              <circle cx="800" cy="666" r="230" fill="url(#dbh-screenglow)" />
              <path d="M760 772h80l22 22H738Z" fill="#3A3D4E" />
              <rect x="640" y="558" width="320" height="216" rx="16" fill="#12141C" />
              <rect ref={screenRef} x="652" y="570" width="296" height="192" rx="6" style={{ fill: 'var(--bg)' }} />
              <g ref={screenUIRef} fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">
                <rect x="652" y="570" width="58" height="192" style={{ fill: 'var(--surface-2)' }} />
                <rect x="662" y="582" width="18" height="18" rx="6" style={{ fill: 'var(--accent)' }} />
                <g style={{ fill: 'var(--line)' }}>
                  <rect x="662" y="612" width="38" height="6" rx="3" /><rect x="662" y="626" width="32" height="6" rx="3" />
                  <rect x="662" y="640" width="36" height="6" rx="3" /><rect x="662" y="654" width="28" height="6" rx="3" />
                </g>
                <rect x="662" y="736" width="38" height="14" rx="5" style={{ fill: 'var(--accent)' }} />
                <text x="722" y="594" fontSize="12" fontWeight="700" style={{ fill: 'var(--text)' }}>Главный обзор</text>
                <rect x="722" y="606" width="104" height="66" rx="8" style={{ fill: 'var(--surface)', stroke: 'var(--line)' }} />
                <rect x="834" y="606" width="102" height="66" rx="8" style={{ fill: 'var(--surface)', stroke: 'var(--line)' }} />
                <rect x="722" y="680" width="214" height="70" rx="8" style={{ fill: 'var(--surface)', stroke: 'var(--line)' }} />
                <g style={{ fill: 'var(--text)' }} opacity=".75">
                  <rect x="732" y="616" width="56" height="6" rx="3" /><rect x="844" y="616" width="48" height="6" rx="3" />
                  <rect x="732" y="690" width="70" height="6" rx="3" />
                </g>
                <g style={{ fill: 'var(--muted)' }} opacity=".5">
                  <rect x="732" y="630" width="80" height="5" rx="2.5" /><rect x="732" y="642" width="64" height="5" rx="2.5" />
                  <rect x="844" y="630" width="78" height="5" rx="2.5" /><rect x="844" y="642" width="58" height="5" rx="2.5" />
                  <rect x="732" y="706" width="180" height="5" rx="2.5" /><rect x="732" y="718" width="150" height="5" rx="2.5" />
                  <rect x="732" y="730" width="166" height="5" rx="2.5" />
                </g>
                <rect x="732" y="654" width="34" height="9" rx="4.5" style={{ fill: 'var(--accent)' }} opacity=".85" />
              </g>
            </svg>
          </div>

          <div
            ref={veilRef}
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(20,22,36,.72) 0%, rgba(20,22,36,.38) 40%, rgba(20,22,36,0) 62%)' }}
          />

          {/* Верхняя панель */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 sm:px-8 pt-[max(env(safe-area-inset-top),16px)] pb-4">
            <div className="flex items-center gap-2.5 font-semibold text-[18px]">
              <span className="w-9 h-9 rounded-xl bg-[var(--accent)] grid place-items-center text-white">
                <Home className="w-[18px] h-[18px]" />
              </span>
              Дом без хаоса
            </div>
            <button
              type="button"
              onClick={finish}
              className="px-4 py-2 rounded-full text-sm font-medium text-[#EEF0F6]/90 hover:text-white hover:bg-white/10 active:scale-[0.97] transition"
            >
              Пропустить
            </button>
          </div>

          {/* Заголовок и действия */}
          <div ref={copyRef} className="absolute left-0 right-0 top-[calc(76px+6vh)] sm:top-[calc(76px+9vh)] text-center px-6">
            <h1 className="text-[40px] sm:text-[60px] lg:text-[80px] leading-[1.02] font-semibold tracking-[-0.035em] mb-5">
              Дом, который всё&nbsp;помнит
            </h1>
            <p className="text-[18px] sm:text-[20px] leading-relaxed text-[#EEF0F6]/85 max-w-[34em] mx-auto mb-8">
              Сроки документов, покупки, дела семьи и экстренная информация — в одном месте. Запишите один раз, дальше дом напомнит сам.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={start}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--accent)] text-white font-semibold text-[17px] shadow-[var(--shadow)] shadow-indigo-950/40 hover:brightness-110 active:scale-[0.97] transition"
              >
                <Sparkles className="w-4 h-4" />
                Войти в дом
              </button>
            </div>
          </div>

          {!reduce && (
            <div
              ref={hintRef}
              className="absolute left-1/2 -translate-x-1/2 bottom-[max(env(safe-area-inset-bottom),24px)] flex flex-col items-center gap-1 text-[14px] text-[#EEF0F6]/70 pointer-events-none"
            >
              Листайте вниз
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
