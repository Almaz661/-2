import { createWorker } from 'tesseract.js';
import { ReceiptLanguage } from '../types';

export interface OCRProgress {
  status: string;
  progress: number; // 0 - 100
  stage: 'init' | 'loading_model' | 'recognizing' | 'parsing' | 'done';
}

export interface OCRResult {
  text: string;
  confidence: number;
  lines: Array<{
    text: string;
    confidence: number;
  }>;
}

/**
 * Преобразование кода языка в код tesseract
 */
export function getTesseractLangCode(lang: ReceiptLanguage): string {
  switch (lang) {
    case 'rus':
      return 'rus+eng';
    case 'deu':
      return 'deu+eng';
    case 'nld':
      return 'nld+eng';
    case 'pol':
      return 'pol+eng';
    case 'ell':
      return 'ell+eng';
    case 'eng':
    default:
      return 'eng';
  }
}

/**
 * Локальное оптическое распознавание символов в браузере с помощью Tesseract.js
 */
export async function runLocalOCR(
  imageSource: string | HTMLCanvasElement,
  language: ReceiptLanguage,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  const langCode = getTesseractLangCode(language);

  if (onProgress) {
    onProgress({
      status: 'Инициализация модуля OCR...',
      progress: 5,
      stage: 'init',
    });
  }

  let worker: any = null;

  try {
    try {
      worker = await createWorker(langCode, 1, {
        logger: (m: any) => {
          if (onProgress) {
            let stage: OCRProgress['stage'] = 'loading_model';
            let statusText = 'Загрузка языковой модели...';

            if (m.status === 'recognizing text') {
              stage = 'recognizing';
              statusText = `Распознавание строк чека (${Math.round((m.progress || 0) * 100)}%)...`;
            } else if (m.status.includes('loading') || m.status.includes('initialized')) {
              stage = 'loading_model';
              statusText = `Подготовка языковой модели (${langCode})...`;
            }

            onProgress({
              status: statusText,
              progress: Math.min(95, Math.round((m.progress || 0) * 85) + 10),
              stage,
            });
          }
        },
      });
    } catch (createErr) {
      console.warn(`Не удалось загрузить связку ${langCode}, пробуем запасной вариант eng:`, createErr);
      // Запасной fallback на базовый 'eng'
      worker = await createWorker('eng', 1, {
        logger: (m: any) => {
          if (onProgress && m.status === 'recognizing text') {
            onProgress({
              status: `Распознавание текста (${Math.round((m.progress || 0) * 100)}%)...`,
              progress: Math.min(95, Math.round((m.progress || 0) * 85) + 10),
              stage: 'recognizing',
            });
          }
        },
      });
    }

    // Настройка режимов сегментации страницы для кассовых чеков:
    // PSM 6 (SINGLE_BLOCK) предотвращает разрыв строк на независимые вертикальные колонки
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
      });
    } catch {
      // Игнорируем если браузерный WebAssembly worker не поддерживает этот параметр
    }

    if (onProgress) {
      onProgress({
        status: 'Оптическое распознавание символов чека...',
        progress: 60,
        stage: 'recognizing',
      });
    }

    const ret = await worker.recognize(imageSource);
    const data = ret.data;

    const extractedLines = (data.lines || []).map((l: any) => ({
      text: (l.text || '').trim(),
      confidence: Math.round(l.confidence || 0),
    }));

    if (onProgress) {
      onProgress({
        status: 'Синтаксический анализ и извлечение покупок...',
        progress: 100,
        stage: 'done',
      });
    }

    return {
      text: data.text || '',
      confidence: Math.round(data.confidence || 80),
      lines: extractedLines,
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (err) {
        console.warn('Ошибка при завершении Tesseract worker:', err);
      }
    }
  }
}
