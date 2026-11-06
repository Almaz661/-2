import { ScannedReceipt, ReceiptItemLine, ReceiptLanguage } from '../types';
import { parseReceiptText } from './receiptParser';
import { runLocalOCR, OCRProgress } from './ocrService';
import { prepareImageForOCR } from '../utils/receiptImageProcessor';

export interface GeminiReceiptResponse {
  storeName?: string;
  date?: string;
  time?: string;
  totalAmount: number;
  taxAmount?: number;
  discountTotal?: number;
  currency: string;
  language: ReceiptLanguage;
  items: ReceiptItemLine[];
  error?: string;
}

/**
 * Отправляет чек на серверный эндпоинт с Gemini API для интеллектуального
 * распознавания и автоматической категоризации (продукты, бытовая химия и т.д.)
 * без жестких шаблонов.
 *
 * Автоматически сжимает/оптимизирует изображение перед передачей, предотвращая
 * сбои на мобильных устройствах и планшетах (iPad / iPhone) при фото высокого разрешения.
 */
export async function parseReceiptWithGemini(
  imageBase64?: string,
  rawText?: string,
  languageHint?: string,
  onProgress?: (progress: OCRProgress) => void
): Promise<ScannedReceipt> {
  const receiptId = 'receipt_' + Date.now().toString(36);

  // 1. Подготовка и сжатие изображения (до безопасных 2048px) перед отправкой
  let optimizedImage = imageBase64;
  if (optimizedImage && optimizedImage.length > 300000) {
    try {
      if (onProgress) {
        onProgress({
          status: 'Оптимизация разрешения фото для быстрой отправки...',
          progress: 25,
          stage: 'init',
        });
      }
      optimizedImage = await prepareImageForOCR(optimizedImage);
    } catch (prepErr) {
      console.warn('Не удалось сжать фото перед отправкой, отправляем оригинал:', prepErr);
    }
  }

  // 2. Вызов серверного Gemini API
  try {
    if (onProgress) {
      onProgress({
        status: 'Gemini AI распознаёт товары и автоматически категоризирует позиции...',
        progress: 60,
        stage: 'parsing',
      });
    }

    const res = await fetch('/api/ai/parse-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: optimizedImage,
        rawText,
        languageHint,
      }),
    });

    if (res.ok) {
      const data: GeminiReceiptResponse = await res.json();
      if (data && data.items && data.items.length > 0) {
        // Подсчет сходимости
        const sumItems = Math.round(data.items.reduce((s, it) => s + (it.totalPrice || 0), 0) * 100) / 100;
        const diff = Math.round(Math.abs(sumItems - (data.totalAmount || 0)) * 100) / 100;

        return {
          id: receiptId,
          storeName: data.storeName || 'Супермаркет',
          rawStoreName: data.storeName,
          date: data.date || new Date().toISOString().split('T')[0],
          time: data.time || new Date().toTimeString().slice(0, 5),
          totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : sumItems,
          taxAmount: data.taxAmount,
          discountTotal: data.discountTotal,
          currency: data.currency || (languageHint === 'rus' ? 'RUB' : 'EUR'),
          rawText: rawText || '',
          language: data.language || (languageHint as ReceiptLanguage) || 'nld',
          images: optimizedImage ? [optimizedImage] : [],
          items: data.items.map((it, idx) => ({
            id: it.id || `gemini_item_${idx}_${Date.now().toString(36)}`,
            originalText: it.originalText || it.normalizedTitle,
            normalizedTitle: it.normalizedTitle || it.originalText,
            quantity: typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1,
            unit: it.unit || 'шт',
            unitPrice: it.unitPrice || it.totalPrice,
            totalPrice: it.totalPrice || 0,
            discount: it.discount,
            currency: it.currency || data.currency || (languageHint === 'rus' ? 'RUB' : 'EUR'),
            category: it.category || 'other',
            confidence: it.confidence || 95,
            status: 'verified',
            isDoubtful: false,
          })),
          scannedAt: new Date().toISOString(),
          matchedSumDiff: diff,
        };
      }
    }
    console.warn('Серверный Gemini API вернул пустой результат или ошибку, применяем локальный OCR.');
  } catch (err) {
    console.warn('Ошибка вызова Gemini API на сервере:', err);
  }

  // 3. Резервный локальный разбор через Tesseract OCR + синтаксический анализатор
  let textToParse = rawText;
  if (!textToParse && optimizedImage) {
    try {
      if (onProgress) {
        onProgress({
          status: 'Локальное распознавание OCR (Tesseract)...',
          progress: 75,
          stage: 'recognizing',
        });
      }
      const effectiveLang = (languageHint as ReceiptLanguage) || 'nld';
      const ocr = await runLocalOCR(optimizedImage, effectiveLang, onProgress);
      textToParse = ocr?.text || '';
    } catch (ocrErr) {
      console.warn('Локальный OCR fallback не удался:', ocrErr);
    }
  }

  if (onProgress) {
    onProgress({
      status: 'Синтаксический анализ и категоризация товаров...',
      progress: 95,
      stage: 'parsing',
    });
  }

  const fallbackData = parseReceiptText(textToParse || '', (languageHint as ReceiptLanguage) || undefined);
  return {
    id: receiptId,
    storeName: fallbackData.storeName || 'Покупки',
    rawStoreName: fallbackData.rawStoreName,
    date: fallbackData.date || new Date().toISOString().split('T')[0],
    time: fallbackData.time,
    totalAmount: fallbackData.totalAmount,
    taxAmount: fallbackData.taxAmount,
    discountTotal: fallbackData.discountTotal,
    currency: fallbackData.currency || (languageHint === 'rus' ? 'RUB' : 'EUR'),
    rawText: textToParse || '',
    language: fallbackData.detectedLanguage || (languageHint as ReceiptLanguage) || 'nld',
    images: optimizedImage ? [optimizedImage] : [],
    items: fallbackData.items,
    scannedAt: new Date().toISOString(),
    matchedSumDiff: fallbackData.matchedSumDiff,
  };
}
