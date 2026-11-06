/**
 * Утилита для сжатия, центрирования и конвертации фотографий участников в Base64.
 * Оптимизирована для iPad/iPhone и настольных устройств:
 * - Вырезает квадрат 1:1 по центру, чтобы портретные и альбомные фото выглядели идеально в круглых аватарах;
 * - Масштабирует до компактного размера (по умолчанию 320x320 px);
 * - Сохраняет в легковесный JPEG с качеством 0.85 (~20-30 КБ), гарантируя сохранность квоты LocalStorage.
 */
export async function processAndResizeImage(file: File, maxDimension = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      reject(new Error('Выбранный файл не является изображением'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Игнорируем ошибку очистки URL
      }
    };

    img.onerror = () => {
      cleanup();
      // Попытка фолбэка через обычный FileReader
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Не удалось прочитать файл изображения'));
      reader.onload = (e) => {
        const fallbackImg = new Image();
        fallbackImg.onerror = () => reject(new Error('Не удалось загрузить изображение'));
        fallbackImg.onload = () => {
          try {
            const result = renderCroppedCanvas(fallbackImg, maxDimension);
            resolve(result);
          } catch (err) {
            resolve(e.target?.result as string);
          }
        };
        fallbackImg.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    };

    img.onload = () => {
      try {
        const result = renderCroppedCanvas(img, maxDimension);
        cleanup();
        resolve(result);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    img.src = objectUrl;
  });
}

function renderCroppedCanvas(img: HTMLImageElement, targetSize: number): string {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Центрированное квадратное кадрирование (1:1)
  const minDim = Math.min(width, height);
  const sx = (width - minDim) / 2;
  const sy = (height - minDim) / 2;

  const canvasSize = Math.min(targetSize, minDim);
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Не удалось инициализировать canvas');
  }

  // Высокое качество интерполяции
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Отрисовка центрального квадрата
  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, canvasSize, canvasSize);

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Получение инициалов из имени участника (например: "Анна" -> "А", "Максим И." -> "МИ", "Папа" -> "П")
 */
export function getMemberInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0].charAt(0).toUpperCase();
    const second = parts[1].charAt(0).toUpperCase();
    return `${first}${second}`;
  }
  return parts[0].charAt(0).toUpperCase();
}
