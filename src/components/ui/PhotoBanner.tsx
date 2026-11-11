import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, RotateCcw } from 'lucide-react';
import { Photo, PhotoSlot, clearOwnPhoto, getOwnPhoto, saveOwnPhoto, subscribePhotos } from '../../utils/photos';

interface PhotoBannerProps {
  photo: Photo;
  slot: PhotoSlot;
  className?: string;
  children?: React.ReactNode;
  onError?: (msg: string) => void;
}

/**
 * Фото-баннер в духе Mercury: живая фотография с медленным приближением,
 * параллаксом при прокрутке и затемнением под текст.
 * Можно поставить своё фото — оно хранится только на этом устройстве.
 */
export const PhotoBanner: React.FC<PhotoBannerProps> = ({ photo, slot, className = '', children, onError }) => {
  const [own, setOwn] = useState<string | null>(() => getOwnPhoto(slot));
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribePhotos(() => setOwn(getOwnPhoto(slot))), [slot]);

  // Параллакс: фото движется медленнее страницы
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const scroller = wrapRef.current?.closest('main');
    if (!scroller) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrapRef.current;
        const layer = layerRef.current;
        if (!el || !layer) return;
        const r = el.getBoundingClientRect();
        const shift = Math.max(-60, Math.min(60, -r.top * 0.18));
        layer.style.transform = `translate3d(0, ${shift}px, 0)`;
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const src = own || photo.url;
  const showPhoto = !!own || !failed;

  return (
    <div
      ref={wrapRef}
      data-no-reveal
      className={`relative overflow-hidden rounded-2xl bg-[var(--text)] isolate ${className}`}
    >
      {/* Запасной фон, если фото недоступно (нет сети) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 85% 10%, rgba(255,214,150,.55), transparent 55%), linear-gradient(160deg, #4C4F80 0%, #8C6E9E 45%, #E9A97F 100%)',
        }}
        aria-hidden="true"
      />

      {showPhoto && (
        <div ref={layerRef} className="absolute -inset-y-16 inset-x-0 will-change-transform" aria-hidden="true">
          <img
            key={src}
            src={src}
            alt=""
            loading="eager"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`w-full h-full object-cover kenburns transition-opacity duration-700 [filter:saturate(0.85)_sepia(0.08)] ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>
      )}

      {/* Сезонная дымка: лёгкий оттенок времени года */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(200deg, color-mix(in srgb, var(--season) 30%, transparent) 0%, transparent 60%)' }}
        aria-hidden="true"
      />

      {/* Затемнение под текст */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(10,12,22,.05) 0%, rgba(10,12,22,.25) 45%, rgba(10,12,22,.72) 100%)' }}
        aria-hidden="true"
      />

      <div className="relative h-full">{children}</div>

      {/* Сменить фото */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {own && (
          <button
            type="button"
            onClick={() => clearOwnPhoto(slot)}
            title="Вернуть стандартное фото"
            aria-label="Вернуть стандартное фото"
            className="w-9 h-9 grid place-items-center rounded-full bg-black/30 text-white backdrop-blur-md hover:bg-black/45 active:scale-95 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={own ? 'Сменить фото' : 'Поставить своё фото'}
          title={own ? 'Сменить фото' : 'Поставить своё фото'}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-black/30 text-white text-[14px] font-medium backdrop-blur-md hover:bg-black/45 active:scale-95 transition"
        >
          <ImagePlus className="w-4 h-4" />
          <span className="hidden sm:inline">{own ? 'Сменить фото' : 'Своё фото'}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            saveOwnPhoto(slot, f).catch((err: Error) => onError?.(err.message));
          }}
        />
      </div>

      {/* Автор фото */}
      {!own && !failed && photo.author && (
        <a
          href={photo.link}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-2.5 right-3 text-[12px] text-white/60 hover:text-white/90 transition-colors"
        >
          Фото: {photo.author}, Unsplash
        </a>
      )}
    </div>
  );
};
