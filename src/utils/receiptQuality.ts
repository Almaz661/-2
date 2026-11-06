import { ImageQualityReport } from '../types';

/**
 * Диагностика качества изображения чека перед распознаванием:
 * - Размытие (дисперсия лапласиана / градиентов высокой частоты)
 * - Освещение и контраст (средняя яркость, гистограмма, пересвет, глубокие тени)
 * - Разрешение и пропорции (достаточно ли пикселей для мелкого шрифта термобумаги)
 * - Обрезка краев
 */
export async function analyzeReceiptImageQuality(
  imageSource: string | HTMLCanvasElement | HTMLImageElement
): Promise<ImageQualityReport> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let img: HTMLImageElement;
  if (typeof imageSource === 'string') {
    img = await loadImage(imageSource);
  } else if (imageSource instanceof HTMLImageElement) {
    img = imageSource;
  } else {
    // Canvas
    const tempImg = new Image();
    tempImg.src = imageSource.toDataURL('image/jpeg');
    await new Promise((resolve) => {
      tempImg.onload = resolve;
    });
    img = tempImg;
  }

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Ограничиваем размер для быстрого пиксельного анализа
  const sampleWidth = Math.min(600, width);
  const sampleHeight = Math.round((height / width) * sampleWidth);
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  if (!ctx) {
    return {
      score: 80,
      isBlurry: false,
      blurScore: 100,
      isDark: false,
      isOverexposed: false,
      avgBrightness: 150,
      isLowResolution: false,
      width,
      height,
      isCroppedWarning: false,
      issues: [],
      recommendations: [],
    };
  }

  ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imageData.data;
  const pixelCount = sampleWidth * sampleHeight;

  // 1. Анализ яркости и контраста (Luminance)
  let totalLuminance = 0;
  let darkPixelCount = 0;
  let brightPixelCount = 0;

  // Серая карта для вычисления Лапласиана
  const gray = new Float32Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // Стандартное человеческое восприятие яркости (Rec. 601)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;
    totalLuminance += lum;

    if (lum < 40) darkPixelCount++;
    if (lum > 235) brightPixelCount++;
  }

  const avgBrightness = Math.round(totalLuminance / pixelCount);

  // 2. Оценка размытия (Лапласиан 3x3)
  // Ядро Лапласа: [0, 1, 0; 1, -4, 1; 0, 1, 0]
  let laplacianSum = 0;
  let laplacianSumSq = 0;
  let laplacianSamples = 0;

  const step = 2; // Шаг выборки для скорости
  for (let y = 1; y < sampleHeight - 1; y += step) {
    for (let x = 1; x < sampleWidth - 1; x += step) {
      const idx = y * sampleWidth + x;
      const top = (y - 1) * sampleWidth + x;
      const bottom = (y + 1) * sampleWidth + x;
      const left = y * sampleWidth + (x - 1);
      const right = y * sampleWidth + (x + 1);

      const lap =
        gray[top] + gray[bottom] + gray[left] + gray[right] - 4 * gray[idx];

      laplacianSum += lap;
      laplacianSumSq += lap * lap;
      laplacianSamples++;
    }
  }

  const meanLap = laplacianSum / (laplacianSamples || 1);
  const laplaceVariance =
    laplacianSumSq / (laplacianSamples || 1) - meanLap * meanLap;
  const blurScore = Math.round(laplaceVariance);

  // 3. Анализ разрешения
  const minDim = Math.min(width, height);
  const isLowResolution = minDim < 600 || width * height < 400000;

  // 4. Анализ условий
  const isBlurry = blurScore < 50;
  const isDark = avgBrightness < 65 || darkPixelCount / pixelCount > 0.45;
  const isOverexposed =
    avgBrightness > 215 || brightPixelCount / pixelCount > 0.55;

  // 5. Проверка краев (текст не должен обрезаться у самых границ)
  // Проверяем полосу по 3% по краям на наличие высококонтрастных переходов
  let isCroppedWarning = false;
  let borderContrast = 0;
  const borderMargin = Math.max(2, Math.floor(sampleWidth * 0.03));
  for (let y = 0; y < sampleHeight; y += 4) {
    const leftPx = gray[y * sampleWidth + borderMargin];
    const rightPx = gray[y * sampleWidth + (sampleWidth - borderMargin - 1)];
    if (leftPx < 100 || rightPx < 100) borderContrast++;
  }
  if (borderContrast > sampleHeight * 0.15) {
    isCroppedWarning = true;
  }

  // 6. Формирование рекомендаций и итогового балла (0 - 100)
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  if (isBlurry) {
    score -= 30;
    issues.push('Изображение может быть размыто (низкая резкость)');
    recommendations.push(
      'Положите чек на ровную поверхность и держите камеру неподвижно 1 секунду.'
    );
  }

  if (isDark) {
    score -= 25;
    issues.push('Недостаточное освещение (чек в тени)');
    recommendations.push(
      'Включите лампу, фонарик или подойдите ближе к источнику света.'
    );
  } else if (isOverexposed) {
    score -= 20;
    issues.push('Слишком яркий свет или блик от вспышки');
    recommendations.push(
      'Выключите прямую вспышку или измените угол съемки, чтобы убрать блик с термобумаги.'
    );
  }

  if (isLowResolution) {
    score -= 20;
    issues.push('Низкое разрешение изображения');
    recommendations.push(
      'Сфотографируйте чек ближе, чтобы он занимал большую часть кадра.'
    );
  }

  if (isCroppedWarning) {
    score -= 10;
    issues.push('Возможна обрезка краев чека');
    recommendations.push(
      'Убедитесь, что все края чека и цены справа полностью попадают в кадр.'
    );
  }

  score = Math.max(10, Math.min(100, score));

  return {
    score,
    isBlurry,
    blurScore,
    isDark,
    isOverexposed,
    avgBrightness,
    isLowResolution,
    width,
    height,
    isCroppedWarning,
    issues,
    recommendations,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось загрузить изображение чека'));
    img.src = src;
  });
}
