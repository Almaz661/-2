import React, { useState, useEffect, useRef } from 'react';
import { formatLocalDate } from '../../utils/dateUtils';
import {
  Sparkles,
  Mic,
  MicOff,
  Image as ImageIcon,
  Check,
  Calendar,
  CheckSquare,
  ShoppingCart,
  FileText,
  Phone,
  Pill,
  X,
  Loader2,
  Trash2,
  Volume2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { parseWithGemini } from '../../services/aiService';
import {
  applyStrictKeywordRouting,
  detectApothecaryKeyword,
  buildMedicineItemFromText,
} from '../../services/smartInputRouter';
import { ParsedAIResponse, ParsedEntityAction } from '../../types';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVoice?: boolean;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  initialVoice = false,
}) => {
  const {
    members,
    addTask,
    addEvent,
    addShoppingItem,
    addDoc,
    addContact,
    addMedicine,
    showToast,
  } = useHousehold();

  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [inputText, setInputText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Голосовая запись через MediaRecorder (как у современных аналогов: ChatGPT, Telegram, Alice)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechLang, setSpeechLang] = useState<'ru' | 'en' | 'de' | 'el'>('ru');

  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedAIResponse | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Автозапуск микрофона при открытии в голосовом режиме
  useEffect(() => {
    if (isOpen && initialVoice && !isRecording && !isTranscribing) {
      const timer = setTimeout(() => {
        startVoiceRecording();
      }, 350);
      return () => clearTimeout(timer);
    } else if (!isOpen && isRecording) {
      stopVoiceRecording(false);
    }
  }, [isOpen, initialVoice]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch (_) {}
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  /**
   * Запуск записи через MediaRecorder и W3C MediaDevices (современный стандарт индустрии)
   */
  const startVoiceRecording = async () => {
    cleanupAudio();
    setSpeechError(null);
    setMicPermissionDenied(false);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setSpeechError('Запись звука не поддерживается в вашем браузере');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Анализатор уровня звука для визуализации
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 255) * 100)));
            animFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        }
      } catch (err) {
        console.debug('Audio analyser setup error:', err);
      }

      // Определение поддерживаемого MIME-типа записи
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType: mimeType.split(';')[0] });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          setIsTranscribing(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType.split(';')[0],
        });

        await handleTranscribeBlob(audioBlob, mimeType);
      };

      recorder.start(250); // Сохраняем порции каждые 250 мс
      setIsRecording(true);
      setRecordingSeconds(0);

      // Таймер записи
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      showToast('Микрофон включен: диктуйте список покупок, задачи или события...', 'info');
    } catch (err: any) {
      console.warn('getUserMedia error:', err);
      cleanupAudio();
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes('Permission denied')
      ) {
        setMicPermissionDenied(true);
        setSpeechError('Браузер заблокировал доступ к микрофону для этой страницы');
      } else {
        setSpeechError('Не удалось подключиться к микрофону: ' + (err?.message || 'ошибка'));
      }
    }
  };

  /**
   * Остановка записи и запуск транскрибации
   */
  const stopVoiceRecording = (shouldTranscribe = true) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      if (!shouldTranscribe) {
        audioChunksRef.current = [];
      } else {
        setIsTranscribing(true);
      }
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
  };

  /**
   * Отправка аудио на серверный endpoint /api/ai/transcribe для расшифровки через Gemini
   */
  const handleTranscribeBlob = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    showToast('Распознаю голос через нейросеть...', 'info');

    try {
      // Конвертируем Blob в Base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64Data = res.split(',')[1] || '';
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: mimeType.split(';')[0],
          language: speechLang,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const data = await response.json();
      const recognized = (data.text || '').trim();

      if (recognized) {
        const newText = inputText.trim()
          ? `${inputText.trim()} ${recognized}`
          : recognized;
        setInputText(newText);
        showToast(`Распознано: «${recognized}»`, 'success');

        // Автоматически запускаем интеллектуальный разбор фразы
        setTimeout(() => {
          triggerAnalyzeWithText(newText);
        }, 300);
      } else {
        showToast('Голос не распознан. Попробуйте надиктовать фразу четче', 'warning');
      }
    } catch (err: any) {
      console.warn('Transcription error:', err);
      showToast('Не удалось распознать аудиозапись: ' + (err?.message || ''), 'error');
      setSpeechError('Сбой транскрибации. Проверьте интернет или введите текст вручную.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const triggerAnalyzeWithText = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    setIsLoading(true);
    try {
      const rawResult = await parseWithGemini(textToAnalyze, members, imageBase64 || undefined);
      // Применяем строгую автоматическую маршрутизацию по ключевым словам (аптечка, документы, контакты)
      const routedResult = applyStrictKeywordRouting(rawResult, textToAnalyze);
      setParsedResult(routedResult);
    } catch (e) {
      showToast('Ошибка при анализе запроса', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionTypeChange = (index: number, newType: ParsedEntityAction['type']) => {
    if (!parsedResult) return;
    const updatedActions = [...parsedResult.actions];
    const act = updatedActions[index];
    if (!act || act.type === newType) return;

    const oldType = act.type;
    let newData = act.data;
    let newDetails = act.details;

    if (newType === 'medicine') {
      const sourceText = act.data?.title || act.title || inputText;
      newData = buildMedicineItemFromText(sourceText);
      newDetails = `Категория: ${newData.category}, форма: ${newData.form}, кол-во: ${newData.quantity}, в Аптечку`;
    } else if (newType === 'task') {
      newData = {
        title: act.title,
        zone: 'Весь дом',
        assigneeId: members[0]?.id || null,
        isRotation: false,
        recurrence: 'none',
        dueDate: formatLocalDate(new Date()),
        dueTime: '12:00',
        priority: 'medium',
        completed: false,
        points: 10,
      };
      newDetails = 'Бытовая задача по дому';
    } else if (newType === 'shopping') {
      newData = {
        listId: 'list-supermarket',
        title: act.title,
        category: 'other',
        quantity: '1 шт.',
        completed: false,
      };
      newDetails = 'Список покупок «Супермаркет»';
    }

    updatedActions[index] = {
      ...act,
      type: newType,
      originalType: oldType,
      details: newDetails,
      data: newData,
    };

    setParsedResult({
      ...parsedResult,
      actions: updatedActions,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
        setInputMode('image');
        showToast('Фото прикреплено к умному вводу', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim() && !imageBase64) {
      showToast('Введите текст или прикрепите фото', 'warning');
      return;
    }
    await triggerAnalyzeWithText(inputText);
  };

  const handleApplyAll = () => {
    if (!parsedResult || !parsedResult.actions.length) return;

    let count = 0;
    parsedResult.actions.forEach((act) => {
      // Строгая вторичная проверка: если упомянута аптечка/лекарство, направляем в сервис аптечки
      const actText = `${act.title || ''} ${act.details || ''} ${act.data?.title || ''} ${act.data?.name || ''}`;
      const isApothecary = detectApothecaryKeyword(actText) || detectApothecaryKeyword(inputText);

      if (act.type === 'medicine' || (isApothecary && act.type === 'task')) {
        const medData =
          act.type === 'medicine' && act.data?.name
            ? act.data
            : buildMedicineItemFromText(act.data?.title || act.title || inputText);
        addMedicine(medData);
        count++;
      } else if (act.type === 'task') {
        addTask(act.data);
        count++;
      } else if (act.type === 'calendar') {
        addEvent(act.data);
        count++;
      } else if (act.type === 'shopping') {
        addShoppingItem(act.data);
        count++;
      } else if (act.type === 'doc') {
        addDoc(act.data);
        count++;
      } else if (act.type === 'contact') {
        addContact(act.data);
        count++;
      }
    });

    showToast(`Успешно распределено по службам дома: ${count} поз.`, 'success');
    handleReset();
    onClose();
  };

  const handleReset = () => {
    cleanupAudio();
    setInputText('');
    setImageBase64(null);
    setParsedResult(null);
    setIsLoading(false);
    setIsTranscribing(false);
    setSpeechError(null);
    setMicPermissionDenied(false);
  };

  if (!isOpen) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Готовые примеры для быстрого голосового тестирования в один клик
  const samplePrompts = [
    {
      text: '5 декабря день рождения близнецов, напомнить за 3 дня',
      category: 'День рождения',
      icon: '🎂',
    },
    {
      text: 'Запиши в аптечку: 2 уп парацетамола 500 мг и Нурофен детский',
      category: 'Аптечка',
      icon: '💊',
    },
    {
      text: 'Купить 2 пачки творога, свежий базилик и литр овсяного молока',
      category: 'Покупки',
      icon: '🛒',
    },
    {
      text: 'Завтра в 15:30 открытый урок у Софии, напомнить за час',
      category: 'Календарь',
      icon: '📅',
    },
    {
      text: 'В субботу помыть микроволновку и вынести коробки с балкона',
      category: 'Дела дома',
      icon: '🧹',
    },
    {
      text: 'Записать телефон педиатра доктора Ковалева: +7 926 555-01-23',
      category: 'Контакт / Заметка',
      icon: '📞',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--surface-2)] rounded-3xl border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Заголовок модалки */}
        <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-3)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white shadow-[var(--shadow)] shadow-indigo-500/20 text-lg">
              🎙️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--text)]">
                  Голосовой и умный ввод «Send it in»
                </h3>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[12px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>MediaRecorder AI</span>
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Надиктуйте голосом, вставьте текст или загрузите фото чека — ассистент распределит всё по дому
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело модалки */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Инструкция по разрешению микрофона, если браузер заблокировал */}
          {micPermissionDenied && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center space-x-2 font-semibold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Как включить микрофон в браузере:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-stone-700 pl-1 leading-relaxed">
                <li>Нажмите на значок 🔒 или ⚙️ в левой части адресной строки браузера.</li>
                <li>Найдите пункт <strong>«Микрофон»</strong> и переключите в положение <strong>«Разрешить»</strong>.</li>
                <li>Нажмите кнопку ниже, чтобы повторить запись.</li>
              </ol>
              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
                >
                  Повторить запрос микрофона
                </button>
                <button
                  type="button"
                  onClick={() => setMicPermissionDenied(false)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-amber-300 text-amber-800 text-xs font-semibold cursor-pointer"
                >
                  Закрыть подсказку
                </button>
              </div>
            </div>
          )}

          {/* Ошибка распознавания речи */}
          {speechError && !micPermissionDenied && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <MicOff className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{speechError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSpeechError(null)}
                className="text-rose-600 hover:text-rose-900 font-semibold ml-2 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Интерактивная панель активной записи микрофона с живым эквалайзером */}
          {isRecording && (
            <div className="p-4 rounded-3xl bg-[var(--surface-2)] border-2 border-rose-400/80 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-150 shadow-[var(--shadow)] shadow-rose-500/10">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-[var(--shadow)] shadow-rose-500/40 shrink-0">
                    <Mic className="w-6 h-6" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 border-2 border-[var(--surface)] animate-ping" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-rose-900">
                      Идёт запись голоса
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-rose-200 text-rose-900">
                      {formatTimer(recordingSeconds)}
                    </span>
                  </div>
                  <p className="text-[12px] text-stone-600 mt-0.5">
                    Говорите в микрофон: задачи, покупки или даты...
                  </p>
                </div>
              </div>

              {/* Живой эквалайзер уровня громкости микрофона */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center space-x-1.5 px-3 py-2 bg-[var(--surface)]/90 rounded-2xl border border-rose-200/80 shadow-2xs">
                  <Volume2 className="w-3.5 h-3.5 text-rose-500" />
                  <div className="flex items-center space-x-1">
                    {[15, 35, 60, 80, 50, 25, 45].map((baseHeight, idx) => {
                      const dynamicHeight = Math.max(
                        6,
                        Math.round((baseHeight * (audioLevel + 20)) / 100)
                      );
                      return (
                        <span
                          key={idx}
                          className="w-1 bg-[var(--accent)] rounded-full transition-all duration-75"
                          style={{ height: `${Math.min(24, dynamicHeight)}px` }}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => stopVoiceRecording(true)}
                    className="px-4 py-2 rounded-2xl bg-[var(--accent)] hover:brightness-105 text-white text-xs font-semibold shadow-[var(--shadow)] shadow-rose-600/30 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Готово</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => stopVoiceRecording(false)}
                    className="p-2 rounded-2xl bg-[var(--surface)] border border-stone-200 text-stone-500 hover:text-stone-800 text-xs font-semibold transition-colors cursor-pointer"
                    title="Отменить запись"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Плашка процесса транскрибации */}
          {isTranscribing && (
            <div className="p-3.5 rounded-2xl bg-[var(--accent-soft)] border border-[var(--line)] flex items-center space-x-3 text-xs text-[var(--accent)] font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
              <span>Расшифровываю голос через Gemini 3.5 Transcribe...</span>
            </div>
          )}

          {/* Поле ввода текста */}
          <div className="relative">
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Например: Завтра в 17:00 родительское собрание у Артёма, купить сыр моцарелла, помидоры черри и помыть плиту..."
              className="w-full p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--text)] placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] resize-none transition-all shadow-xs"
            />

            {/* Элементы управления вводом */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mt-2">
              <div className="flex items-center flex-wrap gap-2">
                {/* Большая главная кнопка микрофона */}
                <button
                  type="button"
                  onClick={() => {
                    if (isRecording) {
                      stopVoiceRecording(true);
                    } else {
                      startVoiceRecording();
                    }
                  }}
                  disabled={isTranscribing}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${ isRecording ? 'bg-rose-600 text-white shadow-[var(--shadow)] shadow-rose-600/30' : 'bg-[var(--surface)] border-2 border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400' }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Остановить запись</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-rose-600" />
                      <span>{isTranscribing ? 'Расшифровка...' : 'Надиктовать голосом'}</span>
                    </>
                  )}
                </button>

                {/* Выбор языка */}
                <div className="flex items-center space-x-1 bg-[var(--surface)] px-2 py-1 rounded-xl border border-[var(--line)]">
                  <span className="text-[12px] font-semibold text-stone-400 mr-1">Язык:</span>
                  {[
                    { code: 'ru', label: '🇷🇺 RU' },
                    { code: 'el', label: '🇬🇷 GR' },
                    { code: 'de', label: '🇳🇱 NL' },
                    { code: 'en', label: '🇬🇧 EN' },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setSpeechLang(l.code as any)}
                      className={`px-1.5 py-0.5 text-[12px] font-semibold rounded-lg transition-colors cursor-pointer ${ speechLang === l.code ? 'bg-[var(--surface-3)] text-[var(--accent)] border border-orange-200' : 'text-[var(--muted)] hover:text-[var(--text)]' }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                {/* Прикрепление фото чека */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface)] border border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--surface-3)] transition-all cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Фото / Чек</span>
                </button>

                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 cursor-pointer"
                  >
                    Очистить
                  </button>
                )}
              </div>

              {/* Кнопка запуска распознавания */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading || (!inputText.trim() && !imageBase64)}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold shadow-[var(--shadow)] shadow-indigo-600/20 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer ml-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Распознаю...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Разобрать</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Превью прикрепленного изображения */}
          {imageBase64 && (
            <div className="relative inline-block border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
              <img
                src={imageBase64}
                alt="Прикреплённый чек"
                className="max-h-36 object-contain rounded-2xl"
              />
              <button
                onClick={() => setImageBase64(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Быстрые подсказки / примеры голосовых команд */}
          {!parsedResult && (
            <div>
              <div className="text-[12px] font-semibold text-[var(--muted)] mb-2 flex items-center justify-between">
                <span>Примеры голосовых команд (нажмите для проверки):</span>
                <span className="text-[12px] text-orange-600 flex items-center space-x-1">
                  <Mic className="w-3 h-3" />
                  <span>можно надиктовать</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputText(p.text);
                      triggerAnalyzeWithText(p.text);
                    }}
                    className="p-3 rounded-2xl text-left bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)] transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 group-hover:bg-orange-100 group-hover:text-orange-800 transition-colors">
                        {p.icon} {p.category}
                      </span>
                      <Mic className="w-3 h-3 text-stone-300 group-hover:text-[var(--accent)] transition-colors" />
                    </div>
                    <p className="text-xs text-[var(--text-2)] leading-snug group-hover:text-[var(--text)]">
                      «{p.text}»
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Результат разбора */}
          {parsedResult && (
            <div className="mt-4 p-5 rounded-2xl bg-[var(--surface-3)] border border-[var(--line)] space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text)] flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <span>Результат умного анализа</span>
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {parsedResult.actions.length} действий
                </span>
              </div>

              <p className="text-xs text-[var(--text-2)]">{parsedResult.summary}</p>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {parsedResult.actions.map((act, index) => {
                  let Icon = CheckSquare;
                  let badge = 'Задача';
                  let badgeClass = 'bg-amber-100 text-amber-800';

                  if (act.type === 'calendar') {
                    Icon = Calendar;
                    badge = 'Календарь';
                    badgeClass = 'bg-[var(--accent-soft)] text-[var(--accent)]';
                  } else if (act.type === 'shopping') {
                    Icon = ShoppingCart;
                    badge = 'Покупка';
                    badgeClass = 'bg-rose-100 text-rose-800';
                  } else if (act.type === 'doc') {
                    Icon = FileText;
                    badge = 'Документ';
                    badgeClass = 'bg-[var(--accent-soft)] text-[var(--accent)]';
                  } else if (act.type === 'contact') {
                    Icon = Phone;
                    badge = 'Контакт';
                    badgeClass = 'bg-emerald-100 text-emerald-800';
                  } else if (act.type === 'medicine') {
                    Icon = Pill;
                    badge = 'Аптечка';
                    badgeClass = 'bg-teal-100 text-teal-800';
                  }

                  return (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-[var(--surface)] border border-stone-200/80 flex items-start space-x-3 shadow-2xs transition-all hover:border-stone-300"
                    >
                      <div className="p-1.5 rounded-lg bg-stone-100 text-stone-700 mt-0.5 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span
                              className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}
                            >
                              {badge}
                            </span>
                            {act.routedByKeyword && (
                              <span className="text-[12px] text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full inline-flex items-center space-x-1 font-medium">
                                <span>Авто-маршрут:</span>
                                <span className="font-semibold underline decoration-teal-400">«{act.routedByKeyword}»</span>
                              </span>
                            )}
                          </div>

                          {/* Интерактивный переключатель целевого сервиса */}
                          <div className="flex items-center space-x-1 ml-auto">
                            <span className="text-[12px] text-[var(--muted)] hidden sm:inline">Куда направить:</span>
                            <select
                              value={act.type}
                              onChange={(e) =>
                                handleActionTypeChange(index, e.target.value as any)
                              }
                              className="text-[12px] font-semibold bg-[var(--surface-2)] hover:bg-[var(--surface)] text-[var(--text-2)] rounded-lg px-2 py-0.5 border border-[var(--line)] cursor-pointer outline-hidden focus:ring-1 focus:ring-orange-400"
                              title="Изменить целевой раздел"
                            >
                              <option value="medicine">В Аптечку</option>
                              <option value="shopping">В Покупки</option>
                              <option value="task">В Задачи</option>
                              <option value="calendar">В Календарь</option>
                              <option value="doc">В Документы</option>
                              <option value="contact">В Контакты</option>
                            </select>
                          </div>
                        </div>

                        <h4 className="text-xs font-semibold text-[var(--text)] truncate mt-1">
                          {act.title}
                        </h4>
                        <p className="text-[12px] text-[var(--muted)] mt-0.5">{act.details}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Кнопка подтверждения и сохранения */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-2)] hover:bg-black/5 cursor-pointer"
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  onClick={handleApplyAll}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-[var(--shadow)] shadow-emerald-700/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Сохранить всё в дом</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
