import React, { useState, useEffect, useRef } from 'react';
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
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { parseWithGemini } from '../../services/aiService';
import { ParsedAIResponse } from '../../types';

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
    showToast,
  } = useHousehold();

  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [inputText, setInputText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechLang, setSpeechLang] = useState<'ru-RU' | 'en-US' | 'de-DE' | 'el-GR'>('ru-RU');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedAIResponse | null>(null);

  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');
  const sessionFinalTranscriptRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSpeechSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Остановка или запуск распознавания
  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    } else if (isOpen && initialVoice && !isListening) {
      const timer = setTimeout(() => {
        startListening();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialVoice]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  const startListening = () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      showToast(
        'Голосовой ввод Web Speech API не поддерживается вашим браузером. Рекомендуется Chrome, Edge или Safari.',
        'warning'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      // Фиксируем уже введенный текст как базовый
      baseTextRef.current = inputText.trim();
      sessionFinalTranscriptRef.current = '';
      setInterimTranscript('');
      setSpeechError(null);

      recognition.onstart = () => {
        setIsListening(true);
        showToast('🎙️ Микрофон активен: надиктуйте задачи, покупки или события...', 'info');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentSessionFinal = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            currentSessionFinal += (currentSessionFinal ? ' ' : '') + text.trim();
          } else {
            currentInterim += (currentInterim ? ' ' : '') + text.trim();
          }
        }

        sessionFinalTranscriptRef.current = currentSessionFinal;
        setInterimTranscript(currentInterim);

        // Объединяем базовый текст, подтвержденную речь и промежуточный вариант без дублирования
        const base = baseTextRef.current;
        const finalTogether = [base, currentSessionFinal].filter(Boolean).join(' ').trim();
        const full = [finalTogether, currentInterim].filter(Boolean).join(' ').trim();

        setInputText(full);
      };

      recognition.onerror = (e: any) => {
        console.warn('Web Speech API error:', e.error, e);
        let errorMsg = '';
        if (e.error === 'not-allowed') {
          errorMsg = 'Доступ к микрофону заблокирован. Разрешите микрофон в настройках браузера.';
        } else if (e.error === 'no-speech') {
          errorMsg = 'Речь не обнаружена. Попробуйте сказать громче.';
        } else if (e.error === 'audio-capture') {
          errorMsg = 'Микрофон не обнаружен или занят другой программой.';
        } else if (e.error === 'network') {
          errorMsg = 'Ошибка сети Web Speech API.';
        } else if (e.error !== 'aborted') {
          errorMsg = `Ошибка распознавания: ${e.error}`;
        }

        if (errorMsg) {
          setSpeechError(errorMsg);
          showToast(errorMsg, 'warning');
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      showToast('Не удалось включить микрофон: ' + (err?.message || ''), 'error');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleStopAndAnalyze = () => {
    stopListening();
    setTimeout(() => {
      handleAnalyze();
    }, 200);
  };

  if (!isOpen) return null;

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

    setIsLoading(true);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    try {
      const result = await parseWithGemini(inputText, members, imageBase64 || undefined);
      setParsedResult(result);
    } catch (e) {
      showToast('Ошибка при анализе запроса', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAll = () => {
    if (!parsedResult || !parsedResult.actions.length) return;

    let count = 0;
    parsedResult.actions.forEach((act) => {
      if (act.type === 'task') {
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

    showToast(`Успешно добавлено сущностей в дом: ${count}`, 'success');
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setInputText('');
    setImageBase64(null);
    setParsedResult(null);
    setIsLoading(false);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Готовые примеры для быстрого голосового тестирования в один клик
  const samplePrompts = [
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#FCFBF8] rounded-3xl border border-[#EBE7DF] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Заголовок модалки */}
        <div className="px-6 py-5 border-b border-[#EBE7DF] flex items-center justify-between bg-gradient-to-r from-[#FAF7F0] to-[#F5F1E6]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E15A42] to-[#F28C38] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-[#1F1D1A]">
                  Умный ввод «Send it in»
                </h3>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-[#C8452D] border border-orange-200/60">
                  <Mic className="w-2.5 h-2.5 text-[#E15A42]" />
                  <span>Web Speech API</span>
                </span>
              </div>
              <p className="text-xs text-[#8A8477]">
                Надиктуйте голосом, напишите текст или загрузите чек — ассистент сам всё распределит
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
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Предупреждение об ошибке распознавания речи, если возникла */}
          {speechError && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <MicOff className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{speechError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSpeechError(null)}
                className="text-amber-600 hover:text-amber-900 font-bold ml-2 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Интерактивный баннер активной голосовой записи (Web Speech API) */}
          {isListening && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-orange-500/10 to-amber-500/10 border border-rose-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/30 animate-pulse shrink-0">
                  <Mic className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-bold text-rose-800">
                      Идёт голосовая запись (Web Speech API)
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700">
                      {speechLang.slice(0, 2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5C564B] mt-0.5">
                    {interimTranscript ? (
                      <span className="italic font-medium text-rose-900">
                        «{interimTranscript}»
                      </span>
                    ) : (
                      'Говорите четко в микрофон: задачу, список покупок или событие...'
                    )}
                  </p>
                </div>
              </div>

              {/* Анимированный эквалайзер и быстрые действия */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                {/* Анимация полос звуковой волны */}
                <div className="flex items-center space-x-1 px-1.5 py-1 bg-white/70 rounded-lg border border-rose-200">
                  <span className="w-1 bg-rose-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2.5" />
                  <span className="w-1 bg-rose-600 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4.5" />
                  <span className="w-1 bg-orange-500 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2" />
                  <span className="w-1 bg-rose-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-5" />
                  <span className="w-1 bg-orange-600 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-3.5" />
                </div>

                <button
                  type="button"
                  onClick={handleStopAndAnalyze}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-[#E15A42] hover:brightness-105 text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                  title="Остановить запись и сразу запустить разбор"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Завершить и разобрать</span>
                  <span className="sm:hidden">Разобрать</span>
                </button>

                <button
                  type="button"
                  onClick={stopListening}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer"
                  title="Остановить микрофон"
                >
                  <MicOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Поле ввода */}
          <div className="relative">
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Например: Завтра в 17:00 родительское собрание у Артёма, купить цветы и помыть машину Максиму..."
              className="w-full p-4 rounded-2xl bg-white border border-[#E3DFD5] text-[#1F1D1A] placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#E15A42]/30 focus:border-[#E15A42] resize-none transition-all shadow-xs"
            />

            {/* Элементы управления вводом */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mt-2">
              <div className="flex items-center flex-wrap gap-2">
                {/* Кнопка голосового ввода (Web Speech API) */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isListening
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/30 animate-pulse'
                      : 'bg-white border border-[#E3DFD5] text-[#5C564B] hover:bg-[#F3EFE6] hover:border-[#E15A42]/40'
                  }`}
                  title={
                    isSpeechSupported
                      ? 'Нажмите для голосового ввода через микрофон'
                      : 'Web Speech API не поддерживается вашим браузером'
                  }
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Слушаю... Стоп</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-[#E15A42]" />
                      <span>Голос (микрофон)</span>
                    </>
                  )}
                </button>

                {/* Выбор языка распознавания речи */}
                <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-[#E3DFD5]">
                  {(['ru-RU', 'en-US', 'de-DE', 'el-GR'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setSpeechLang(lang);
                        if (isListening) {
                          stopListening();
                          setTimeout(startListening, 150);
                        }
                      }}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                        speechLang === lang
                          ? 'bg-[#FAF3EA] text-[#E15A42] border border-orange-200/80 shadow-2xs'
                          : 'text-[#8A8477] hover:text-[#1F1D1A]'
                      }`}
                      title={`Язык распознавания: ${
                        lang === 'ru-RU'
                          ? 'Русский'
                          : lang === 'en-US'
                          ? 'English'
                          : lang === 'de-DE'
                          ? 'Deutsch'
                          : 'Ελληνικά (Греческий)'
                      }`}
                    >
                      {lang.slice(0, 2).toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Загрузка фото */}
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
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E3DFD5] text-[#5C564B] hover:bg-[#F3EFE6] transition-all cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>Фото / Чек</span>
                </button>

                {inputText && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputText('');
                      setInterimTranscript('');
                    }}
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
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#E15A42] to-[#EA7038] text-white text-xs font-semibold shadow-md shadow-orange-600/20 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer ml-auto"
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
              <div className="text-[11px] font-semibold text-[#8A8477] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Примеры голосовых команд (нажмите для проверки):</span>
                <span className="text-[10px] text-orange-600 flex items-center space-x-1">
                  <Mic className="w-3 h-3" />
                  <span>можно надиктовать</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setInputText(p.text)}
                    className="p-3 rounded-2xl text-left bg-white border border-[#EBE7DF] hover:border-[#E15A42]/50 hover:bg-[#FAF8F3] transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 group-hover:bg-orange-100 group-hover:text-orange-800 transition-colors">
                        {p.icon} {p.category}
                      </span>
                      <Mic className="w-3 h-3 text-stone-300 group-hover:text-[#E15A42] transition-colors" />
                    </div>
                    <p className="text-xs text-[#5C564B] leading-snug group-hover:text-[#1F1D1A]">
                      «{p.text}»
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Результат разбора */}
          {parsedResult && (
            <div className="mt-4 p-5 rounded-2xl bg-[#F4EFE6] border border-[#E5DFD1] space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F1D1A] flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-[#E15A42]" />
                  <span>Результат умного анализа</span>
                </span>
                <span className="text-xs text-[#8A8477]">
                  {parsedResult.actions.length} действий
                </span>
              </div>

              <p className="text-xs text-[#5C564B]">{parsedResult.summary}</p>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {parsedResult.actions.map((act, index) => {
                  let Icon = CheckSquare;
                  let badge = 'Задача';
                  let badgeClass = 'bg-amber-100 text-amber-800';

                  if (act.type === 'calendar') {
                    Icon = Calendar;
                    badge = 'Календарь';
                    badgeClass = 'bg-blue-100 text-blue-800';
                  } else if (act.type === 'shopping') {
                    Icon = ShoppingCart;
                    badge = 'Покупка';
                    badgeClass = 'bg-rose-100 text-rose-800';
                  } else if (act.type === 'doc') {
                    Icon = FileText;
                    badge = 'Документ';
                    badgeClass = 'bg-purple-100 text-purple-800';
                  } else if (act.type === 'contact') {
                    Icon = Phone;
                    badge = 'Контакт';
                    badgeClass = 'bg-emerald-100 text-emerald-800';
                  }

                  return (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-white border border-stone-200/80 flex items-start space-x-3 shadow-2xs"
                    >
                      <div className="p-1.5 rounded-lg bg-stone-100 text-stone-700 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}
                          >
                            {badge}
                          </span>
                          <h4 className="text-xs font-semibold text-[#1F1D1A] truncate">
                            {act.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-[#8A8477] mt-0.5">{act.details}</p>
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
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#5C564B] hover:bg-black/5 cursor-pointer"
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  onClick={handleApplyAll}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 active:scale-[0.98] transition-all cursor-pointer"
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
