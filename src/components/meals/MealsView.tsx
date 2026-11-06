import React, { useState, useMemo } from 'react';
import {
  UtensilsCrossed,
  Clock,
  Flame,
  Plus,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Edit2,
  Trash2,
  Search,
  Sparkles,
  ChefHat,
  Filter,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { Recipe } from '../../types';
import { RecipeDetailModal } from './RecipeDetailModal';
import { RecipeModal } from './RecipeModal';
import { RecipeImportModal } from './RecipeImportModal';

type MealTab = 'plan' | 'recipes';

const DAYS_NAMES = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

export const MealsView: React.FC = () => {
  const {
    mealPlan,
    recipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    updateMealSlot,
    importRecipeIngredientsToShopping,
  } = useHousehold();

  const [activeTab, setActiveTab] = useState<MealTab>('plan');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Состояние модального окна добавления / редактирования рецепта
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Недельные даты, начиная с понедельника текущей недели
  const today = new Date();
  const currentDayOfWeek = (today.getDay() + 6) % 7; // 0 for Mon
  const monday = new Date(today);
  monday.setDate(today.getDate() - currentDayOfWeek);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const todayStr = today.toISOString().split('T')[0];

  // Фильтрация рецептов по категории и поисковому запросу
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchesCategory =
        selectedCategory === 'all' || r.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchTags = r.tags.some((t) => t.toLowerCase().includes(q));
      const matchIngredients = r.ingredients.some((ing) =>
        ing.name.toLowerCase().includes(q)
      );

      return matchTitle || matchDesc || matchTags || matchIngredients;
    });
  }, [recipes, selectedCategory, searchQuery]);

  // Состояние модалки быстрого редактирования слота в плане питания
  const [editingSlot, setEditingSlot] = useState<{
    dateStr: string;
    slotKey: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    label: string;
    dayName: string;
    currentTitle: string;
  } | null>(null);
  const [slotCustomInput, setSlotCustomInput] = useState('');

  const handleOpenAddRecipe = () => {
    setRecipeToEdit(null);
    setIsRecipeModalOpen(true);
  };

  const handleOpenEditRecipe = (recipe: Recipe) => {
    setRecipeToEdit(recipe);
    setIsRecipeModalOpen(true);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Верхняя строка переключения табов и кнопка добавления */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-[#EFECE4] border border-[#E3DFD5] self-start">
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'bg-white text-[#1F1D1A] shadow-xs font-bold'
                : 'text-[#6B6456] hover:text-[#1F1D1A]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>План питания на неделю</span>
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'recipes'
                ? 'bg-white text-[#1F1D1A] shadow-xs font-bold'
                : 'text-[#6B6456] hover:text-[#1F1D1A]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Семейная книга рецептов ({recipes.length})</span>
          </button>
        </div>

        {/* Кнопки создания и AI-импорта рецепта */}
        <div className="flex items-center space-x-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-[#1F1E1C] border border-amber-200 text-xs font-bold transition-all shadow-2xs active:scale-[0.98] cursor-pointer shrink-0"
            title="Скачать или распознать рецепт с сайта, YouTube или Instagram"
          >
            <Sparkles className="w-4 h-4 text-[#E15A42]" />
            <span>AI-Импорт рецепта</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddRecipe}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#E15A42] hover:bg-[#D04E37] text-white text-xs font-bold transition-all shadow-xs active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить рецепт</span>
          </button>
        </div>
      </div>

      {/* Панель фильтров и поиска рецептов */}
      {activeTab === 'recipes' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#EDE7DB] shadow-2xs">
          {/* Поиск */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8C867D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, тегам или ингредиентам..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-xs focus:outline-none focus:border-[#E15A42] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Фильтр по приёмам пищи */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'breakfast', 'lunch', 'dinner', 'snack'].map((cat) => {
              const labelMap: Record<string, string> = {
                all: 'Все блюда',
                breakfast: '🍳 Завтраки',
                lunch: '🍲 Обеды',
                dinner: '🍝 Ужины',
                snack: '🍎 Перекусы',
              };
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#1F1E1C] text-white font-bold shadow-2xs'
                      : 'bg-[#FAF7F2] border border-[#E5DFD3] text-[#5C564B] hover:bg-stone-100'
                  }`}
                >
                  {labelMap[cat]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. ПЛАН ПИТАНИЯ НА НЕДЕЛЮ (Сетка по дням) */}
      {activeTab === 'plan' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDates.map((dateStr, idx) => {
              const dayPlan = mealPlan.find((p) => p.date === dateStr);
              const isToday = dateStr === todayStr;
              const dateObj = new Date(dateStr);

              const slots: Array<{
                slotKey: 'breakfast' | 'lunch' | 'dinner' | 'snack';
                label: string;
                emoji: string;
                slotData?: { recipeId?: string; customTitle?: string };
              }> = [
                { slotKey: 'breakfast', label: 'Завтрак', emoji: '🍳', slotData: dayPlan?.breakfast },
                { slotKey: 'lunch', label: 'Обед', emoji: '🍲', slotData: dayPlan?.lunch },
                { slotKey: 'dinner', label: 'Ужин', emoji: '🍝', slotData: dayPlan?.dinner },
                { slotKey: 'snack', label: 'Перекус', emoji: '🍎', slotData: dayPlan?.snack },
              ];

              return (
                <div
                  key={dateStr}
                  className={`p-3.5 rounded-3xl border flex flex-col space-y-2.5 transition-all ${
                    isToday
                      ? 'bg-amber-50/50 border-[#E15A42]/50 shadow-xs'
                      : 'bg-white border-[#EBE7DF]'
                  }`}
                >
                  {/* Заголовок дня */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE1]">
                    <div className="overflow-hidden">
                      <div className="text-[11px] font-bold text-[#8A8477] truncate">
                        {DAYS_NAMES[idx]}
                      </div>
                      <div className="text-xs font-extrabold text-[#1F1D1A]">
                        {dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    {isToday && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#E15A42] text-white">
                        Сегодня
                      </span>
                    )}
                  </div>

                  {/* 4 слота приёма пищи */}
                  <div className="space-y-2 flex-1">
                    {slots.map(({ slotKey, label, emoji, slotData }) => {
                      const recipe = slotData?.recipeId
                        ? recipes.find((r) => r.id === slotData.recipeId)
                        : null;
                      const title = recipe?.title || slotData?.customTitle;

                      return (
                        <div
                          key={slotKey}
                          onClick={() => {
                            if (recipe) {
                              setSelectedRecipe(recipe);
                            } else {
                              setEditingSlot({
                                dateStr,
                                slotKey,
                                label,
                                dayName: DAYS_NAMES[idx],
                                currentTitle: title || '',
                              });
                              setSlotCustomInput(title || '');
                            }
                          }}
                          className={`p-2 rounded-2xl border text-left transition-all cursor-pointer ${
                            title
                              ? 'bg-[#FAF8F3] border-[#E8E2D4] hover:bg-white hover:border-[#E15A42]/40 shadow-2xs'
                              : 'bg-stone-50/50 border-dashed border-stone-200 hover:bg-stone-100/60'
                          }`}
                        >
                          <div className="text-[10px] font-semibold text-[#8A8477] flex items-center space-x-1">
                            <span>{emoji}</span>
                            <span>{label}</span>
                          </div>
                          <div className="text-xs font-bold text-[#1F1D1A] truncate mt-0.5">
                            {title || <span className="text-stone-400 font-normal">+ Запланировать</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. СЕМЕЙНАЯ КНИГА РЕЦЕПТОВ */}
      {activeTab === 'recipes' && (
        <>
          {filteredRecipes.length === 0 ? (
            /* Пустое состояние */
            <div className="bg-white rounded-3xl border border-[#EDE7DB] p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-orange-100 text-[#E15A42] flex items-center justify-center mx-auto">
                <ChefHat className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#1F1E1C]">
                  {searchQuery ? 'Рецепты не найдены' : 'Книга рецептов пуста'}
                </h3>
                <p className="text-xs text-[#8C867D]">
                  {searchQuery
                    ? `По запросу «${searchQuery}» ничего не нашлось. Попробуйте изменить фильтр.`
                    : 'Сохраняйте любимые блюда семьи, чтобы быстро планировать меню и переносить ингредиенты в список покупок.'}
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2.5 pt-2 flex-wrap gap-y-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-[#1F1E1C] border border-amber-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E15A42]" />
                  <span>Импорт по ссылке / видео</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddRecipe}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#E15A42] hover:bg-[#D04E37] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать вручную</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden hover:border-[#E15A42]/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative"
                >
                  <div>
                    {/* Фото рецепта */}
                    <div className="relative h-44 overflow-hidden bg-stone-100">
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                        <div className="px-2 py-1 rounded-xl bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} мин</span>
                        </div>
                      </div>

                      {/* Быстрые кнопки редактирования и удаления на фото */}
                      <div className="absolute top-3 left-3 flex items-center space-x-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditRecipe(recipe);
                          }}
                          className="p-1.5 rounded-xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer"
                          title="Редактировать рецепт"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRecipe(recipe.id);
                          }}
                          className="p-1.5 rounded-xl bg-black/50 hover:bg-rose-600 text-white backdrop-blur-xs transition-colors cursor-pointer"
                          title="Удалить рецепт"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {recipe.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#8C522C] border border-[#E8E2D4]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <h3 className="font-bold text-sm text-[#1F1D1A] group-hover:text-[#E15A42] transition-colors leading-snug">
                        {recipe.title}
                      </h3>

                      <p className="text-xs text-[#8A8477] line-clamp-2">
                        {recipe.description}
                      </p>
                    </div>
                  </div>

                  {/* Нижняя плашка действий */}
                  <div className="px-5 py-3 bg-[#FAF8F5] border-t border-[#F0ECE1] flex items-center justify-between text-xs">
                    <span className="text-[#8A8477] font-medium">
                      {recipe.ingredients.length} ингредиентов
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        importRecipeIngredientsToShopping(recipe);
                      }}
                      className="flex items-center space-x-1 text-[#E15A42] font-semibold hover:underline cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>В покупки</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Модалка детального рецепта (с кнопками редактирования и удаления) */}
      <RecipeDetailModal
        isOpen={Boolean(selectedRecipe)}
        onClose={() => setSelectedRecipe(null)}
        recipe={selectedRecipe}
        onEdit={(r) => handleOpenEditRecipe(r)}
        onDelete={(id) => deleteRecipe(id)}
      />

      {/* Модалка создания и редактирования рецепта */}
      <RecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => {
          setIsRecipeModalOpen(false);
          setRecipeToEdit(null);
        }}
        recipeToEdit={recipeToEdit}
        onOpenImport={() => setIsImportModalOpen(true)}
        onSave={(data) => {
          if (recipeToEdit) {
            updateRecipe(recipeToEdit.id, data);
          } else {
            addRecipe(data);
          }
          setIsRecipeModalOpen(false);
          setRecipeToEdit(null);
        }}
      />

      {/* Модалка AI-импорта рецепта по ссылке или тексту */}
      <RecipeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onRecipeParsed={(parsed, openEditor) => {
          if (openEditor) {
            setRecipeToEdit(parsed as any);
            setIsRecipeModalOpen(true);
          } else {
            addRecipe(parsed);
          }
        }}
      />

      {/* Модалка планирования блюда на день (Завтрак, Обед, Ужин, Перекус) */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full border border-[#E5DFD3] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E2D4]">
              <div>
                <h3 className="font-bold text-base text-[#1F1E1C]">
                  {editingSlot.label} • {editingSlot.dayName}
                </h3>
                <span className="text-xs text-[#8C867D]">
                  {new Date(editingSlot.dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#EDE8DC] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMealSlot(editingSlot.dateStr, editingSlot.slotKey, {
                  customTitle: slotCustomInput.trim() || undefined,
                  recipeId: undefined,
                });
                setEditingSlot(null);
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="font-semibold text-[#1F1E1C]">
                  Название блюда или заметка
                </label>
                <input
                  type="text"
                  autoFocus
                  value={slotCustomInput}
                  onChange={(e) => setSlotCustomInput(e.target.value)}
                  placeholder="Например: Сырники с малиновым вареньем, Борщ..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#DDD7CB] rounded-xl text-xs focus:outline-none focus:border-[#E15A42]"
                />
              </div>

              {/* Выбор из каталога домашних рецептов + кнопка создать рецепт */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#8C867D]">
                    Или выберите из книги рецептов:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSlot(null);
                      handleOpenAddRecipe();
                    }}
                    className="text-[11px] font-bold text-[#E15A42] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Создать рецепт</span>
                  </button>
                </div>

                {recipes.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-stone-200/60 rounded-xl p-1.5 bg-white">
                    {recipes.map((r) => (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => {
                          updateMealSlot(editingSlot.dateStr, editingSlot.slotKey, {
                            recipeId: r.id,
                            customTitle: undefined,
                          });
                          setEditingSlot(null);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-amber-50 text-xs font-medium text-[#1F1E1C] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="truncate">{r.title}</span>
                        <span className="text-[10px] text-stone-400 shrink-0 ml-2">
                          ⏱ {r.prepTimeMinutes + r.cookTimeMinutes} мин
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#E8E2D4]">
                {editingSlot.currentTitle && (
                  <button
                    type="button"
                    onClick={() => {
                      updateMealSlot(editingSlot.dateStr, editingSlot.slotKey, {
                        customTitle: undefined,
                        recipeId: undefined,
                      });
                      setEditingSlot(null);
                    }}
                    className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Очистить слот
                  </button>
                )}
                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="px-3 py-2 rounded-xl text-stone-600 hover:bg-stone-200/50 cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#E15A42] hover:bg-[#D04931] text-white font-bold cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
