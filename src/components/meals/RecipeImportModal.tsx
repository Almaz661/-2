import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Link as LinkIcon,
  FileText,
  Clock,
  Flame,
  Users,
  Check,
  AlertCircle,
  Loader2,
  ChefHat,
  ShoppingCart,
  Edit2,
  ArrowRight,
  Globe,
  Youtube,
  Instagram,
} from 'lucide-react';
import { Recipe, ShoppingCategory } from '../../types';
import { useHousehold } from '../../context/HouseholdContext';

interface RecipeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeParsed: (recipe: Omit<Recipe, 'id'>, openEditor?: boolean) => void;
}

export const RecipeImportModal: React.FC<RecipeImportModalProps> = ({
  isOpen,
  onClose,
  onRecipeParsed,
}) => {
  const { importRecipeIngredientsToShopping } = useHousehold();
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedRecipe, setParsedRecipe] = useState<Omit<Recipe, 'id'> | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setUrlInput('');
    setTextInput('');
    setError(null);
    setParsedRecipe(null);
    setIsLoading(false);
  };

  const handleParse = async () => {
    if (mode === 'url' && !urlInput.trim()) {
      setError('Пожалуйста, вставьте ссылку на рецепт, видео или пост');
      return;
    }
    if (mode === 'text' && !textInput.trim()) {
      setError('Пожалуйста, вставьте текст рецепта или описание из поста');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/import-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: mode === 'url' ? urlInput.trim() : undefined,
          rawText: mode === 'text' ? textInput.trim() : (urlInput.trim() ? `Источник: ${urlInput.trim()}` : ''),
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.title) {
        throw new Error('Не удалось распознать рецепт из предоставленных данных');
      }

      setParsedRecipe(data);
    } catch (err: any) {
      console.error('Ошибка импорта рецепта:', err);
      setError(
        err?.message || 'Не удалось загрузить или распознать страницу. Попробуйте скопировать текст рецепта и вставить его во вкладку «Текст рецепта».'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveImmediately = () => {
    if (parsedRecipe) {
      onRecipeParsed(parsedRecipe, false);
      handleReset();
      onClose();
    }
  };

  const handleSaveAndAddToShopping = () => {
    if (parsedRecipe) {
      onRecipeParsed(parsedRecipe, false);
      importRecipeIngredientsToShopping(parsedRecipe);
      handleReset();
      onClose();
    }
  };

  const handleOpenInEditor = () => {
    if (parsedRecipe) {
      onRecipeParsed(parsedRecipe, true);
      handleReset();
      onClose();
    }
  };

  // Быстрые шаблоны для демонстрации
  const sampleRecipes = [
    {
      title: 'Греческий салат с фетой (YouTube)',
      text: `Греческий салат Хориатики (деревенский салат):\nИнгредиенты:\n- Спелые томаты - 4 шт.\n- Огурцы хрустящие - 2 шт.\n- Сыр Фета греческий - 200 г\n- Красный лук - 1 шт.\n- Маслины Каламата с косточкой - 100 г\n- Оливковое масло первого отжима Extra Virgin - 4 ст. л.\n- Сушёный орегано - 1 ч. л.\n- Соль морская - по вкусу\nПриготовление:\n1. Овощи промыть и нарезать крупными дольками, лук - тонкими полукольцами.\n2. Выложить овощи в глубокую миску, добавить оливки каламата.\n3. Сверху положить цельный пласт сыра фета, щедро посыпать сушёным орегано и полить оливковым маслом.\n4. Подавать сразу с хрустящим деревенским хлебом.`,
    },
    {
      title: 'Паста Карбонара без сливок',
      text: `Настоящая римская карбонара:\nИнгредиенты:\n- Спагетти твердых сортов - 400 г\n- Панчетта или гуанчале (или сырокопченый бекон) - 150 г\n- Желтки куриные - 4 шт.\n- Сыр Пекорино Романо или Пармезан - 70 г\n- Свежемолотый черный перец - 1 ч. л.\n- Соль для варки пасты\nШаги:\n1. Отварить спагетти в кипящей подсоленной воде до состояния al dente.\n2. На сухой сковороде обжарить нарезанный бекон до хрустящей золотистой корочки 5-6 минут.\n3. В миске взбить желтки с тертым сыром и большим количеством черного перца.\n4. Переложить горячую пасту к бекону, снять с огня, добавить ложку воды от пасты и сырно-яичный соус. Быстро перемешать до кремовой текстуры.`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#FAF7F2] rounded-3xl border border-[#E5DFD3] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Заголовок модального окна */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D4] bg-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E15A42] to-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1F1E1C] flex items-center space-x-1.5">
                <span>AI-Импорт готового рецепта</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Smart AI
                </span>
              </h3>
              <p className="text-[11px] text-[#8C867D]">
                С любого сайта, YouTube, Instagram или скопированного текста
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#EDE8DC] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело модалки */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {!parsedRecipe ? (
            <>
              {/* Переключатель режима: Ссылка vs Текст */}
              <div className="flex items-center space-x-1 p-1 bg-white rounded-2xl border border-[#E5DFD3] self-start max-w-sm">
                <button
                  type="button"
                  onClick={() => setMode('url')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    mode === 'url'
                      ? 'bg-[#1F1E1C] text-white shadow-2xs'
                      : 'text-[#6B6456] hover:text-[#1F1E1C]'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>По ссылке (URL)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('text')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    mode === 'text'
                      ? 'bg-[#1F1E1C] text-white shadow-2xs'
                      : 'text-[#6B6456] hover:text-[#1F1E1C]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Текст или пост</span>
                </button>
              </div>

              {/* Поле ввода ссылки */}
              {mode === 'url' && (
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#EDE7DB]">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#1F1E1C] flex items-center space-x-1.5">
                      <Globe className="w-4 h-4 text-[#E15A42]" />
                      <span>Ссылка на рецепт, видео или пост</span>
                    </label>
                    <div className="flex items-center space-x-1 text-stone-400">
                      <Youtube className="w-3.5 h-3.5" />
                      <Instagram className="w-3.5 h-3.5" />
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://menunedeli.ru/... или https://youtube.com/watch?v=... или https://unilever..."
                      className="w-full pl-3.5 pr-24 py-2.5 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-xs focus:outline-none focus:border-[#E15A42] focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text && text.startsWith('http')) {
                            setUrlInput(text.trim());
                          }
                        } catch (_) {}
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-[#DDD7CB] text-[10px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      Вставить
                    </button>
                  </div>

                  {/* Быстрые ссылки для моментальной проверки примеров пользователя */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-[#8C867D] block">
                      Примеры ссылок для быстрой проверки:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setUrlInput('https://menunedeli.ru/recipe/krolik-suvid/')}
                        className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-amber-100 text-[#4A453C] hover:text-[#1F1E1C] text-[11px] font-semibold border border-stone-200 transition-colors cursor-pointer"
                        title="Кролик су-вид (menunedeli.ru)"
                      >
                        🐇 Кролик су-вид (menunedeli.ru)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setUrlInput(
                            'https://www.unileverfoodsolutions.io/recipe/filet-mignon-with-garlic-rosemary-sauce-R90025413.html'
                          )
                        }
                        className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-amber-100 text-[#4A453C] hover:text-[#1F1E1C] text-[11px] font-semibold border border-stone-200 transition-colors cursor-pointer"
                        title="Филе миньон с розмарином (Unilever)"
                      >
                        🥩 Филе миньон (Unilever)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrlInput('https://www.youtube.com/watch?v=kQQTl7Om6KY')}
                        className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-rose-100 text-[#4A453C] hover:text-rose-900 text-[11px] font-semibold border border-stone-200 transition-colors cursor-pointer"
                        title="Видео рецепта на YouTube"
                      >
                        🎬 YouTube рецепт
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#8C867D] leading-relaxed">
                    💡 Приложение скачает содержимое страницы, найдёт ингредиенты с граммовками, выстроит понятные пошаговые инструкции и подберёт фото.
                  </p>
                </div>
              )}

              {/* Поле ввода сырого текста */}
              {mode === 'text' && (
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#EDE7DB]">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#1F1E1C] flex items-center space-x-1.5">
                      <FileText className="w-4 h-4 text-[#E15A42]" />
                      <span>Вставьте текст рецепта или описание под постом</span>
                    </label>
                  </div>

                  <textarea
                    rows={6}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Скопируйте сюда рецепт из соцсети, блога или мессенджера (на любом языке — AI всё переведёт и структурирует)..."
                    className="w-full p-3 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-xs focus:outline-none focus:border-[#E15A42] focus:bg-white resize-none"
                  />

                  {/* Быстрые образцы для проверки */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-[#8C867D]">
                      Или попробуйте образец в один клик:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {sampleRecipes.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTextInput(s.text)}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#5C564B] font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Сообщение об ошибке */}
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start space-x-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <strong className="block font-bold">Не удалось распознать ссылку</strong>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Кнопка запуска распознавания */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleParse}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#E15A42] via-orange-600 to-amber-600 hover:brightness-105 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI шеф-повар анализирует и раскладывает по полочкам...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Распознать и разложить на ингредиенты</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Результат распознавания рецепта */
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-emerald-900">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">Рецепт успешно распознан и структурирован!</span>
                </div>
                <button
                  type="button"
                  onClick={() => setParsedRecipe(null)}
                  className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                >
                  Загрузить другой
                </button>
              </div>

              {/* Карточка предпросмотра рецепта */}
              <div className="bg-white rounded-3xl border border-[#EDE7DB] overflow-hidden shadow-xs space-y-4">
                {/* Шапка с фото и названием */}
                <div className="relative h-48 bg-stone-100 overflow-hidden">
                  <img
                    src={parsedRecipe.image || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'}
                    alt={parsedRecipe.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {parsedRecipe.tags.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-semibold">
                          {t}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-extrabold text-lg leading-tight">{parsedRecipe.title}</h3>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Мета-показатели */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#FAF8F3] border border-[#EBE6DB] text-center">
                    <div>
                      <span className="text-[10px] text-[#8C867D] block">Время</span>
                      <strong className="text-xs font-bold text-[#1F1E1C]">
                        {parsedRecipe.prepTimeMinutes + parsedRecipe.cookTimeMinutes} мин
                      </strong>
                    </div>
                    <div className="border-x border-stone-200">
                      <span className="text-[10px] text-[#8C867D] block">Порций</span>
                      <strong className="text-xs font-bold text-[#1F1E1C]">
                        {parsedRecipe.servings} персоны
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C867D] block">Калории</span>
                      <strong className="text-xs font-bold text-[#1F1E1C]">
                        {parsedRecipe.calories || 350} ккал
                      </strong>
                    </div>
                  </div>

                  <p className="text-xs text-[#5C564B] leading-relaxed">{parsedRecipe.description}</p>

                  {/* Ингредиенты */}
                  <div className="space-y-2">
                    <span className="font-bold text-[#1F1E1C] block text-xs">
                      Распознанные ингредиенты ({parsedRecipe.ingredients.length} шт.):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1">
                      {parsedRecipe.ingredients.map((ing, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7F2] border border-[#EBE7DF] text-xs"
                        >
                          <span className="font-semibold text-[#1F1E1C] truncate">{ing.name}</span>
                          <span className="text-[11px] font-bold text-[#E15A42] bg-white px-2 py-0.5 rounded-md border border-[#DDD7CB] shrink-0 ml-1">
                            {ing.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Шаги */}
                  <div className="space-y-2">
                    <span className="font-bold text-[#1F1E1C] block text-xs">
                      Инструкция по шагам ({parsedRecipe.steps.length}):
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                      {parsedRecipe.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-xs">
                          <span className="w-5 h-5 rounded-full bg-[#E15A42] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-[#3A352C] leading-relaxed flex-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Закрепленный подвал с кнопками, если рецепт успешно распознан */}
        {parsedRecipe && (
          <div className="px-6 py-4 border-t border-[#E8E2D4] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-2 text-xs text-[#7A746B]">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Рецепт переведен и адаптирован для домашней кухни</span>
            </div>

            <div className="flex flex-wrap items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleOpenInEditor}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-[#DDD7CB] hover:bg-stone-100 text-[#1F1E1C] font-semibold flex items-center justify-center space-x-1.5 cursor-pointer text-xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#E15A42]" />
                <span>В редактор</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndAddToShopping}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-105 active:scale-[0.99] text-white font-bold shadow-md flex items-center justify-center space-x-1.5 cursor-pointer transition-all text-xs"
                title="Сохранить рецепт и сразу добавить ингредиенты в список покупок"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>+ В покупки</span>
              </button>

              <button
                type="button"
                onClick={handleSaveImmediately}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E15A42] to-amber-600 hover:brightness-105 active:scale-[0.99] text-white font-bold shadow-md flex items-center justify-center space-x-1.5 cursor-pointer transition-all text-xs"
              >
                <Check className="w-4 h-4" />
                <span>Сохранить рецепт</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
