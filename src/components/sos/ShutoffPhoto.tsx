import React, { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

// Фото места отключения (кран воды, щиток, газ) — чтобы в стрессе не искать. Хранится только на этом устройстве.
const key = (propId: string, kind: string) => `dbh_shutoff_${propId}_${kind}`;

const compress = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 900;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = reject;
    img.src = url;
  });

export const ShutoffPhoto: React.FC<{ propId: string; kind: 'water' | 'electric' | 'gas'; label: string }> = ({ propId, kind, label }) => {
  const [src, setSrc] = useState<string | null>(() => {
    try {
      return localStorage.getItem(key(propId, kind));
    } catch {
      return null;
    }
  });
  const [big, setBig] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const data = await compress(f);
      localStorage.setItem(key(propId, kind), data);
      setSrc(data);
    } catch {
      /* не удалось сохранить фото */
    }
  };

  return (
    <div className="mt-2">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {src ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setBig(true)} className="block rounded-lg overflow-hidden border border-white/20" title={`Фото: ${label}`}>
            <img src={src} alt={label} className="w-20 h-14 object-cover" />
          </button>
          <button type="button" onClick={() => input.current?.click()} className="text-[12px] underline underline-offset-2 opacity-80 hover:opacity-100">
            Заменить фото
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-white/30 text-[12px] opacity-90 hover:opacity-100"
        >
          <Camera className="w-3.5 h-3.5" /> Добавить фото: {label}
        </button>
      )}
      {big && src && (
        <div className="fixed inset-0 z-[300] bg-black/85 grid place-items-center p-4" onClick={() => setBig(false)}>
          <img src={src} alt={label} className="max-w-full max-h-full rounded-xl" />
          <button type="button" aria-label="Закрыть" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 text-white grid place-items-center">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
