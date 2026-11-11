// Фотографии интерфейса.
// По умолчанию — бесплатные снимки Unsplash (лицензия Unsplash разрешает такое использование,
// авторов указываем в подписи). Вместо них можно поставить фото своего дома —
// оно сжимается и хранится только на устройстве.

export interface Photo {
  url: string;
  author?: string;
  link?: string;
}

const unsplash = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const PHOTOS = {
  morning: {
    url: unsplash('1652349566530-86ef1a7cfd7d'),
    author: 'Uliana Kopanytsia',
    link: 'https://unsplash.com/photos/glRW5ivpwEM',
  },
  day: {
    url: unsplash('1649083048198-f57bd8fb7a3b'),
    author: 'Bailey Alexander',
    link: 'https://unsplash.com/photos/2dnjAACDNd8',
  },
  evening: {
    url: unsplash('1650784089422-a6b77fdf959d'),
    author: 'Nicholas Ho',
    link: 'https://unsplash.com/photos/XTTT9mz8XGI',
  },
  night: {
    url: unsplash('1687172140737-22c4c3371f3e'),
    author: 'Tolu Akinyemi',
    link: 'https://unsplash.com/photos/SI_EN4NLX5Q',
  },
} satisfies Record<string, Photo>;

export type PhotoSlot = 'home' | 'kitchen';
const KEY = (slot: PhotoSlot) => `dbh_photo_${slot}`;
const listeners = new Set<() => void>();

export const timeOfDayPhoto = (date = new Date()): Photo => {
  const h = date.getHours();
  if (h >= 5 && h < 11) return PHOTOS.morning;
  if (h >= 11 && h < 17) return PHOTOS.day;
  if (h >= 17 && h < 22) return PHOTOS.evening;
  return PHOTOS.night;
};

export const getOwnPhoto = (slot: PhotoSlot): string | null => {
  try {
    return localStorage.getItem(KEY(slot));
  } catch {
    return null;
  }
};

export const clearOwnPhoto = (slot: PhotoSlot) => {
  try {
    localStorage.removeItem(KEY(slot));
  } catch {
    /* нет хранилища */
  }
  listeners.forEach((fn) => fn());
};

export const subscribePhotos = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Сжать выбранное фото до 1600 px по длинной стороне и сохранить на устройстве. */
export const saveOwnPhoto = (slot: PhotoSlot, file: File): Promise<void> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Файл не похож на изображение'));
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.8);
        try {
          localStorage.setItem(KEY(slot), data);
        } catch {
          reject(new Error('Недостаточно места на устройстве для фото'));
          return;
        }
        listeners.forEach((fn) => fn());
        resolve();
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
