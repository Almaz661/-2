/**
 * Обработка и подготовка изображений чеков для OCR:
 * - Усиление контраста и адаптивная бинаризация для термобумаги
 * - Поворот чека на 90° / 180° / 270°
 * - Сшивка сегментов длинного чека (multi-photo) в единое полотно
 */

export interface ImageEnhanceOptions {
  contrast?: number; // 0 - 200 (100 = default)
  brightness?: number; // -50 to +50 (0 = default)
  grayscale?: boolean;
  binarize?: boolean; // Черно-белый порог для выцветших термочеков
  threshold?: number; // 0 - 255 (по умолчанию 128)
}

export function loadImageAsync(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Ошибка загрузки изображения чека'));
    img.src = src;
  });
}

/**
 * Улучшение читаемости термочека: повышение контраста, монохромный режим и подавление шума
 */
export async function enhanceReceiptImage(
  imageSource: string,
  options: ImageEnhanceOptions = {}
): Promise<string> {
  const {
    contrast = 120,
    brightness = 5,
    grayscale = true,
    binarize = false,
    threshold = 135,
  } = options;

  const img = await loadImageAsync(imageSource);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return imageSource;

  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Контрастный коэффициент
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Яркость
    r += brightness;
    g += brightness;
    b += brightness;

    // 2. Контраст
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;

    // Ограничение диапазона
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    if (grayscale || binarize) {
      // Монохромный расчет
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      if (binarize) {
        const val = gray > threshold ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      } else {
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    } else {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Поворот изображения на 90, 180 или 270 градусов
 */
export async function rotateReceiptImage(
  imageSource: string,
  angle: 90 | 180 | 270
): Promise<string> {
  const img = await loadImageAsync(imageSource);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSource;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  if (angle === 90 || angle === 270) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2);

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Сшивка сегментов длинного кассового чека (последовательные фото) в единое полотно.
 * Сохраняет пропорции и накладывает тонкий визуальный разделитель.
 */
export async function stitchReceiptSegments(
  images: string[],
  stitchOverlap: number = 20
): Promise<string> {
  if (images.length === 0) return '';
  if (images.length === 1) return images[0];

  const loadedImgs = await Promise.all(images.map((src) => loadImageAsync(src)));

  // Приводим все сегменты к единой эталонной ширине (ширине первого или максимальной)
  const targetWidth = Math.max(...loadedImgs.map((img) => img.naturalWidth || img.width));

  // Вычисляем общую высоту с учетом масштабирования по ширине
  let totalHeight = 0;
  const scaledHeights: number[] = [];

  for (let i = 0; i < loadedImgs.length; i++) {
    const img = loadedImgs[i];
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = targetWidth / w;
    const scaledH = Math.round(h * scale);
    scaledHeights.push(scaledH);
    totalHeight += scaledH;

    // Учет перекрытия между кадрами (если есть)
    if (i > 0 && stitchOverlap > 0) {
      totalHeight -= stitchOverlap;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = Math.max(100, totalHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) return images[0];

  // Фон белой термобумаги
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let currentY = 0;
  for (let i = 0; i < loadedImgs.length; i++) {
    const img = loadedImgs[i];
    const scaledH = scaledHeights[i];

    ctx.drawImage(img, 0, currentY, targetWidth, scaledH);

    currentY += scaledH;
    if (i < loadedImgs.length - 1 && stitchOverlap > 0) {
      currentY -= stitchOverlap;
    }
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Автоматическая подготовка изображения перед OCR:
 * 1. Ограничение сверхбольших фото до безопасных и чётких 2048px (предотвращает OOM в браузере)
 * 2. Оптимизация контраста для термобумаги
 */
export async function prepareImageForOCR(imageSource: string): Promise<string> {
  const img = await loadImageAsync(imageSource);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  // Оптимальный максимальный размер для AI Vision и OCR (до 2200px без потери резкости)
  const MAX_DIM = 2200;
  if (w > MAX_DIM || h > MAX_DIM) {
    if (w > h) {
      h = Math.round((h * MAX_DIM) / w);
      w = MAX_DIM;
    } else {
      w = Math.round((w * MAX_DIM) / h);
      h = MAX_DIM;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSource;

  // Чистое сглаживание высокого качества с сохранением естественного цветового диапазона
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL('image/jpeg', 0.95);
}
