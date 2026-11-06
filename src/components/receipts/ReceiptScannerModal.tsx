import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  Sliders,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  RefreshCw,
  Sun,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  ReceiptLanguage,
  ImageQualityReport,
  ScannedReceipt,
} from '../../types';
import { analyzeReceiptImageQuality } from '../../utils/receiptQuality';
import {
  enhanceReceiptImage,
  rotateReceiptImage,
  stitchReceiptSegments,
  prepareImageForOCR,
} from '../../utils/receiptImageProcessor';
import { runLocalOCR, OCRProgress } from '../../services/ocrService';
import { parseReceiptText } from '../../services/receiptParser';
import { parseReceiptWithGemini } from '../../services/geminiReceiptService';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptParsed: (receipt: ScannedReceipt) => void;
}

export type ScannerLanguage = ReceiptLanguage | 'auto';

const SUPPORTED_LANGUAGES: Array<{
  code: ScannerLanguage;
  name: string;
  flag: string;
  stores: string;
}> = [
  { code: 'auto', name: 'Авто (AI)', flag: '✨', stores: 'Автоопределение магазина и страны' },
  { code: 'nld', name: 'Нидерланды', flag: '🇳🇱', stores: 'Jumbo, Albert Heijn, Plus, Dirk, Lidl' },
  { code: 'deu', name: 'Германия', flag: '🇩🇪', stores: 'REWE, EDEKA, ALDI, Lidl, Kaufland' },
  { code: 'rus', name: 'Россия', flag: '🇷🇺', stores: 'ВкусВилл, Пятёрочка, Перекрёсток, Магнит' },
  { code: 'pol', name: 'Польша', flag: '🇵🇱', stores: 'Biedronka, Dino, Żabka, Lidl' },
  { code: 'ell', name: 'Греция', flag: '🇬🇷', stores: 'Σκλαβενίτης, AB Vassilopoulos, Masoutis' },
  { code: 'eng', name: 'Англия', flag: '🇬🇧', stores: 'Tesco, Sainsbury’s, Marks & Spencer' },
];

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onReceiptParsed,
}) => {
  // Выбранный язык (по умолчанию интеллектуальное автоопределение страны и магазина)
  const [selectedLanguage, setSelectedLanguage] = useState<ScannerLanguage>('auto');

  // Сегменты фото чека (для длинных чеков - multi-photo)
  const [segments, setSegments] = useState<string[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);

  // Режим съемки камерой
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Диагностика качества
  const [qualityReport, setQualityReport] = useState<ImageQualityReport | null>(null);
  const [isAnalyzingQuality, setIsAnalyzingQuality] = useState(false);

  // Обработка изображения
  const [isEnhanceOpen, setIsEnhanceOpen] = useState(false);
  const [contrastVal, setContrastVal] = useState(130);
  const [binarize, setBinarize] = useState(false);

  // OCR и процесс
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Скрытый input для галереи/файлов
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Скрытый input для прямого вызова системной камеры мобильного устройства / iPad
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Очистка при закрытии
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setSegments([]);
      setQualityReport(null);
      setOcrProgress(null);
      setErrorMessage(null);
      setIsScanning(false);
    }
  }, [isOpen]);

  // Запуск камеры
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      if (streamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Не удалось получить прямой доступ к видеопотоку камеры:', err);
      setIsCameraActive(false);
      // Fallback: мгновенно вызываем системную камеру устройства (iOS / Android / iPad)
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 200);
  };

  // Снимок с видеокамеры
  const captureFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    addSegment(dataUrl);
    stopCamera();
  };

  // Обработка загрузки из галереи/файлов
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        if (result) {
          try {
            // Мгновенная адаптивная оптимизация до безопасных 2048px (предотвращает OOM в мобильном Safari)
            const prepared = await prepareImageForOCR(result);
            addSegment(prepared);
          } catch {
            addSegment(result);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Добавление сегмента фото
  const addSegment = (dataUrl: string) => {
    setSegments((prev) => {
      const next = [...prev, dataUrl];
      setActiveSegmentIndex(next.length - 1);
      return next;
    });
    runQualityCheck(dataUrl);
  };

  // Удаление сегмента
  const removeSegment = (index: number) => {
    setSegments((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const newActive = Math.max(0, Math.min(next.length - 1, activeSegmentIndex));
      setActiveSegmentIndex(newActive);
      if (next.length > 0) {
        runQualityCheck(next[newActive]);
      } else {
        setQualityReport(null);
      }
      return next;
    });
  };

  // Анализ качества изображения
  const runQualityCheck = async (imageSrc: string) => {
    setIsAnalyzingQuality(true);
    try {
      const report = await analyzeReceiptImageQuality(imageSrc);
      setQualityReport(report);
    } catch (e) {
      console.warn('Ошибка проверки качества:', e);
    } finally {
      setIsAnalyzingQuality(false);
    }
  };

  // Поворот активного фото
  const handleRotate = async (angle: 90 | 180 | 270) => {
    if (segments.length === 0) return;
    const current = segments[activeSegmentIndex];
    try {
      const rotated = await rotateReceiptImage(current, angle);
      setSegments((prev) => {
        const next = [...prev];
        next[activeSegmentIndex] = rotated;
        return next;
      });
      runQualityCheck(rotated);
    } catch (e) {
      console.warn('Ошибка поворота:', e);
    }
  };

  // Улучшение контраста
  const handleApplyEnhancement = async () => {
    if (segments.length === 0) return;
    const current = segments[activeSegmentIndex];
    try {
      const enhanced = await enhanceReceiptImage(current, {
        contrast: contrastVal,
        grayscale: true,
        binarize,
      });
      setSegments((prev) => {
        const next = [...prev];
        next[activeSegmentIndex] = enhanced;
        return next;
      });
      runQualityCheck(enhanced);
      setIsEnhanceOpen(false);
    } catch (e) {
      console.warn('Ошибка обработки:', e);
    }
  };

  // Запуск распознавания чека (интеллектуальный Gemini AI + каскадный локальный OCR с отслеживанием прогресса)
  const handleStartOCR = async () => {
    if (segments.length === 0) {
      setErrorMessage('Пожалуйста, сделайте фото чека или выберите файл');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);
    setOcrProgress({
      status: 'Подготовка изображений живого чека...',
      progress: 10,
      stage: 'init',
    });

    try {
      // Если чек длинный и состоит из нескольких сегментов — сшиваем их в единое полотно
      let finalImage = segments[0];
      if (segments.length > 1) {
        setOcrProgress({
          status: `Сшивка ${segments.length} частей длинного чека...`,
          progress: 20,
          stage: 'init',
        });
        finalImage = await stitchReceiptSegments(segments, 15);
      }

      const langParam = selectedLanguage === 'auto' ? undefined : selectedLanguage;

      // Запуск парсинга через объединенный сервис (Gemini с авто-переходом на Tesseract при офлайне)
      const parsedReceipt = await parseReceiptWithGemini(
        finalImage,
        undefined,
        langParam,
        (progress) => setOcrProgress(progress)
      );

      const scannedReceipt: ScannedReceipt = {
        ...parsedReceipt,
        qualityReport: qualityReport || undefined,
        images: segments,
      };

      // Передаем результат в экран проверки
      onReceiptParsed(scannedReceipt);
      onClose();
    } catch (err: any) {
      console.error('Ошибка распознавания чека:', err);
      setErrorMessage(
        'Не удалось распознать чек: ' +
          (err?.message || 'проверьте чёткость снимка или выберите другой ракурс.')
      );
    } finally {
      setIsScanning(false);
      setOcrProgress(null);
    }
  };

  if (!isOpen) return null;

  const currentSegment = segments[activeSegmentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-[#FAF9F5] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#E5E0D5] flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Заголовок модального окна */}
        <div className="px-6 py-4 bg-white border-b border-[#EBE7DF] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E15A42] to-[#F28C38] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1F1E1C]">Сканер кассовых чеков</h2>
              <p className="text-xs text-[#7A746B]">
                Локальное распознавание OCR • Без серверов • Мультиязычный анализ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#F2EFE9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело модального окна */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          {/* Скрытый input для выбора файлов */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            multiple
            className="hidden"
          />
          {/* Скрытый input для прямого снимка камерой мобильного устройства / iPad */}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* 1. Блок выбора языка и подсказки по магазинам */}
          <div className="bg-white p-4 rounded-xl border border-[#E8E4DA] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#5A554D] uppercase tracking-wider">
                Язык чека и страны (OCR)
              </label>
              <span className="text-xs text-[#8A847A]">
                Влияет на языковую модель и словарь нормализации
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[#E15A42] bg-[#FFF5F2] ring-2 ring-[#E15A42]/20 shadow-xs'
                        : 'border-[#EAE6DD] bg-white hover:border-[#D0C9BD]'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className="text-base">{lang.flag}</span>
                      <span
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-[#E15A42]' : 'text-[#3D3A36]'
                        }`}
                      >
                        {lang.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8C867D] truncate">
                      {lang.code.toUpperCase()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Информационный баннер умного разбора живых чеков */}
          <div className="bg-gradient-to-r from-[#FFF5F2] via-[#FFF9F5] to-[#F5F8FF] p-3.5 rounded-xl border border-orange-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E15A42] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#1F1E1C]">
                  Распознавание живых чеков с Gemini AI • Без шаблонов
                </div>
                <div className="text-[11px] text-[#7A746B]">
                  Сфотографируйте чек камерой или выберите фото из галереи. AI автоматически выделит товары и распределит по категориям (продукты, бытовая химия, прочее).
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#DDD8CD] hover:border-[#E15A42] hover:text-[#E15A42] text-xs font-semibold text-[#3D3A36] shrink-0 transition-colors shadow-2xs"
            >
              Выбрать фото
            </button>
          </div>

          {/* 3. Основная область съемки / просмотра */}
          {isCameraActive ? (
            /* Live Camera View */
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] max-h-[480px] flex items-center justify-center border-2 border-[#E15A42]">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Рамка видоискателя для кассового чека */}
              <div className="absolute inset-8 border-2 border-dashed border-white/70 rounded-xl pointer-events-none flex flex-col justify-between p-4">
                <div className="text-center text-xs font-medium text-white/90 bg-black/40 py-1 px-3 rounded-full self-center backdrop-blur-xs">
                  Поместите чек целиком внутрь рамки
                </div>
                <div className="flex justify-between items-end text-[11px] text-white/75">
                  <span>Следите за чёткостью цифр цен</span>
                  <span>Держите ровно</span>
                </div>
              </div>

              {/* Панель управления камерой */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center space-x-6">
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-all"
                  title="Переключить камеру"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={captureFromVideo}
                  className="w-16 h-16 rounded-full bg-white border-4 border-[#E15A42] flex items-center justify-center text-[#E15A42] hover:scale-105 active:scale-95 transition-all shadow-lg"
                  title="Сделать снимок"
                >
                  <Camera className="w-8 h-8" />
                </button>

                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-all"
                  title="Закрыть камеру"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : segments.length > 0 ? (
            /* Просмотр отснятых сегментов чека */
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-5">
                {/* Превью текущего выбранного сегмента */}
                <div className="flex-1 bg-white p-3 rounded-2xl border border-[#E8E4DA] shadow-xs flex flex-col items-center">
                  <div className="relative w-full max-h-[380px] bg-[#181716] rounded-xl overflow-hidden flex items-center justify-center">
                    <img
                      src={currentSegment}
                      alt="Чек"
                      className="max-h-[380px] w-auto object-contain"
                    />

                    {/* Тулбар быстрых действий на фото */}
                    <div className="absolute top-3 right-3 flex items-center space-x-1.5 bg-black/60 backdrop-blur-md p-1.5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleRotate(90)}
                        className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                        title="Повернуть на 90°"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEnhanceOpen(!isEnhanceOpen)}
                        className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                        title="Настройки контраста для термобумаги"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Панель настройки контраста термобумаги */}
                  {isEnhanceOpen && (
                    <div className="w-full mt-3 p-3.5 bg-[#F9F7F2] rounded-xl border border-[#E8E4DA] space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#3D3A36]">
                        <span>Усиление контраста термопечати</span>
                        <span>{contrastVal}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={contrastVal}
                        onChange={(e) => setContrastVal(Number(e.target.value))}
                        className="w-full accent-[#E15A42]"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center space-x-2 text-xs text-[#524D45] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={binarize}
                            onChange={(e) => setBinarize(e.target.checked)}
                            className="rounded text-[#E15A42] focus:ring-[#E15A42]"
                          />
                          <span>Чёрно-белая бинаризация (для выцветших чеков)</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleApplyEnhancement}
                          className="px-3 py-1 bg-[#E15A42] text-white text-xs font-medium rounded-lg hover:bg-[#C94732]"
                        >
                          Применить
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Боковая панель: Диагностика качества и лента сегментов */}
                <div className="w-full md:w-80 flex flex-col space-y-4">
                  {/* Диагностика качества изображения */}
                  <div className="bg-white p-4 rounded-xl border border-[#E8E4DA] shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-[#5A554D] uppercase tracking-wider">
                        Качество снимка
                      </span>
                      {qualityReport && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            qualityReport.score >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : qualityReport.score >= 60
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {qualityReport.score >= 80
                            ? 'Отличное'
                            : qualityReport.score >= 60
                            ? 'Приемлемое'
                            : 'Низкое'} ({qualityReport.score}%)
                        </span>
                      )}
                    </div>

                    {isAnalyzingQuality ? (
                      <div className="text-xs text-[#7A746B] py-2 flex items-center space-x-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Анализ резкости и освещения...</span>
                      </div>
                    ) : qualityReport ? (
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
                          <span className="text-[#6D675E]">Резкость (Лапласиан):</span>
                          <span
                            className={`font-medium flex items-center space-x-1 ${
                              qualityReport.isBlurry
                                ? 'text-rose-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {qualityReport.isBlurry ? (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Возможно размытие</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Чётко</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
                          <span className="text-[#6D675E]">Освещенность:</span>
                          <span
                            className={`font-medium flex items-center space-x-1 ${
                              qualityReport.isDark
                                ? 'text-amber-600'
                                : qualityReport.isOverexposed
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {qualityReport.isDark ? (
                              <>
                                <Sun className="w-3.5 h-3.5" />
                                <span>Слишком темно</span>
                              </>
                            ) : qualityReport.isOverexposed ? (
                              <>
                                <Sun className="w-3.5 h-3.5" />
                                <span>Пересвет / блик</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Оптимально</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-[#F2EFE9]">
                          <span className="text-[#6D675E]">Разрешение:</span>
                          <span className="font-medium text-[#2E2C29]">
                            {qualityReport.width} × {qualityReport.height} px
                          </span>
                        </div>

                        {/* Замечания и рекомендации */}
                        {qualityReport.issues.length > 0 && (
                          <div className="mt-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200/60 text-[11px] text-amber-900 space-y-1">
                            <div className="font-semibold flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Рекомендация:</span>
                            </div>
                            {qualityReport.recommendations.map((rec, i) => (
                              <div key={i}>• {rec}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Мульти-фото сегменты длинного чека */}
                  <div className="bg-white p-4 rounded-xl border border-[#E8E4DA] shadow-xs flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#5A554D] uppercase tracking-wider flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#E15A42]" />
                          <span>Длинный чек ({segments.length})</span>
                        </span>
                        <span className="text-[11px] text-[#7A746B]">
                          Части объединятся
                        </span>
                      </div>

                      {/* Список миниатюр сегментов */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {segments.map((seg, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setActiveSegmentIndex(idx);
                              runQualityCheck(seg);
                            }}
                            className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                              activeSegmentIndex === idx
                                ? 'border-[#E15A42] ring-2 ring-[#E15A42]/30 scale-102'
                                : 'border-[#E5E0D5] hover:border-[#B5AEA1]'
                            }`}
                          >
                            <img
                              src={seg}
                              alt={`Часть ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                              #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSegment(idx);
                              }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white hover:bg-rose-600 flex items-center justify-center transition-colors"
                              title="Удалить сегмент"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Добавить следующую часть чека */}
                    <div className="flex items-center space-x-2 pt-2 border-t border-[#F2EFE9]">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 py-2 px-2.5 bg-[#FFF5F2] border border-orange-200 hover:border-[#E15A42] text-[#E15A42] rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Снять след. часть (Камера)</span>
                      </button>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="p-2 bg-[#FAF9F5] border border-[#DDD8CD] hover:border-[#BDB5A6] rounded-xl text-[#3D3A36] transition-colors"
                        title="Включить видеокамеру"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-[#FAF9F5] border border-[#DDD8CD] hover:border-[#BDB5A6] rounded-xl text-[#3D3A36] transition-colors"
                        title="Добавить фото из файлов"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Начальное состояние: Выбор камеры или файла */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-orange-300 bg-[#FFFDFB] hover:border-[#E15A42] hover:bg-[#FFF5F2] flex flex-col items-center justify-center text-center space-y-2.5 transition-all group shadow-xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FFF1ED] text-[#E15A42] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1F1E1C] text-sm group-hover:text-[#E15A42] transition-colors">
                    Камера устройства
                  </h3>
                  <p className="text-[11px] text-[#7A746B] mt-0.5">
                    Быстрый снимок на iPad, iPhone и Android
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={startCamera}
                className="p-6 rounded-2xl border-2 border-dashed border-[#D6D0C3] bg-white hover:border-[#E15A42] hover:bg-[#FFF9F7] flex flex-col items-center justify-center text-center space-y-2.5 transition-all group shadow-xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#F0EFEB] text-[#555047] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FFF1ED] group-hover:text-[#E15A42] transition-all shadow-xs">
                  <Eye className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1F1E1C] text-sm group-hover:text-[#E15A42] transition-colors">
                    Видеосканер в окне
                  </h3>
                  <p className="text-[11px] text-[#7A746B] mt-0.5">
                    Живой видоискатель через веб-камеру
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-[#D6D0C3] bg-white hover:border-[#E15A42] hover:bg-[#FFF9F7] flex flex-col items-center justify-center text-center space-y-2.5 transition-all group shadow-xs"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#F0EFEB] text-[#555047] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FFF1ED] group-hover:text-[#E15A42] transition-all shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1F1E1C] text-sm group-hover:text-[#E15A42] transition-colors">
                    Галерея и файлы
                  </h3>
                  <p className="text-[11px] text-[#7A746B] mt-0.5">
                    JPG, PNG, HEIC или несколько сегментов
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Индикатор прогресса OCR сканирования */}
          {isScanning && (
            <div className="p-4 bg-white rounded-xl border border-[#E15A42]/30 shadow-md space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1F1E1C] flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-[#E15A42] animate-spin" />
                  <span>{ocrProgress?.status || 'Выполняется распознавание...'}</span>
                </span>
                <span className="font-semibold text-[#E15A42]">
                  {ocrProgress?.progress || 10}%
                </span>
              </div>
              <div className="w-full bg-[#EFECE6] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#E15A42] to-[#F28C38] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${ocrProgress?.progress || 10}%` }}
                />
              </div>
              <p className="text-[11px] text-[#787268]">
                Вся обработка происходит 100% локально в вашем браузере с помощью WebAssembly (без передачи чека в интернет).
              </p>
            </div>
          )}

          {/* Сообщение об ошибке */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Подвал с главными кнопками */}
        <div className="px-6 py-4 bg-white border-t border-[#EBE7DF] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-[#7A746B]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Open-Source OCR (Apache 2.0) • Конфиденциально</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isScanning}
              className="px-4 py-2 rounded-xl border border-[#D5D0C5] text-xs font-semibold text-[#5A554D] hover:bg-[#F2EFE9] transition-colors"
            >
              Отмена
            </button>

            <button
              type="button"
              onClick={handleStartOCR}
              disabled={segments.length === 0 || isScanning}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center space-x-2 shadow-md transition-all ${
                segments.length === 0 || isScanning
                  ? 'bg-[#B0AAA0] cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-[#E15A42] to-[#F28C38] hover:from-[#D14B33] hover:to-[#E07925] shadow-orange-500/20 active:scale-98'
              }`}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Распознавание...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Распознать чек {segments.length > 1 ? `(${segments.length} ч.)` : ''}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
