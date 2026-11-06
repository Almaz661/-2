import React, { useState } from 'react';
import {
  X,
  Clock,
  Flame,
  Users,
  ShoppingCart,
  Check,
  Calendar,
  UtensilsCrossed,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { Recipe } from '../../types';

interface RecipeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipeId: string) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  isOpen,
  onClose,
  recipe,
  onEdit,
  onDelete,
}) => {
  const { importRecipeIngredientsToShopping, shoppingLists, updateMealSlot, showToast } =
    useHousehold();

  const [selectedListId, setSelectedListId] = useState<string>(
    shoppingLists[0]?.id || 'list-supermarket'
  );
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('dinner');
  const [isAddingToPlan, setIsAddingToPlan] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [selectedIngs, setSelectedIngs] = useState<Record<number, boolean>>({});

  React.useEffect(() => {
    if (!recipe) return;
    const initialMap: Record<number, boolean> = {};
    recipe.ingredients.forEach((ing, idx) => {
      const n = (ing.name || '').toLowerCase();
      const isStaple =
        n === 'соль' ||
        n === 'морская соль' ||
        n === 'вода' ||
        n === 'перец черный' ||
        n === 'черный перец';
      initialMap[idx] = !isStaple;
    });
    setSelectedIngs(initialMap);
  }, [recipe]);

  if (!isOpen || !recipe) return null;

  const handleImportIngredients = () => {
    const indices = Object.entries(selectedIngs)
      .filter(([_, checked]) => checked)
      .map(([idx]) => Number(idx));
    importRecipeIngredientsToShopping(recipe, selectedListId, indices);
  };

  const handleAssignToPlan = () => {
    updateMealSlot(selectedDate, selectedSlot, {
      recipeId: recipe.id,
      customTitle: recipe.title,
    });
    setIsAddingToPlan(false);
    showToast(`Блюдо «${recipe.title}» добавлено в план питания`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#FCFBF8] rounded-3xl border border-[#EBE7DF] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Заголовок с картинкой */}
        <div className="relative h-56 bg-stone-100 overflow-hidden shrink-0">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Верхняя панель действий: Редактировать, Удалить, Закрыть */}
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(recipe);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
                title="Редактировать рецепт"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Изменить</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-full bg-black/50 hover:bg-rose-600/80 text-white backdrop-blur-xs transition-colors cursor-pointer"
                title="Удалить рецепт"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-xs transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-4 left-6 right-6 text-white">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {recipe.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="text-xl font-extrabold leading-tight">{recipe.title}</h3>
          </div>
        </div>

        {/* Тело рецепта */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Мета-показатели (время, порции, ккал) */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-[#F7F4EC] border border-[#EBE6DB] text-center">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold text-[#8A8477]">Время</span>
              <span className="text-xs font-bold text-[#1F1D1A] flex items-center space-x-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} мин</span>
              </span>
            </div>
            <div className="flex flex-col items-center border-x border-stone-200">
              <span className="text-[10px] font-semibold text-[#8A8477]">Порций</span>
              <span className="text-xs font-bold text-[#1F1D1A] flex items-center space-x-1 mt-0.5">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>{recipe.servings} персоны</span>
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold text-[#8A8477]">Калории</span>
              <span className="text-xs font-bold text-[#1F1D1A] flex items-center space-x-1 mt-0.5">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                <span>{recipe.calories || 320} ккал</span>
              </span>
            </div>
          </div>

          <p className="text-xs text-[#5C564B] leading-relaxed">{recipe.description}</p>

          {/* Ингредиенты с интерактивным выбором и отправкой в список покупок */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-[#1F1D1A] flex items-center space-x-1.5">
                  <span>Ингредиенты</span>
                  <span className="text-xs font-normal text-[#8A8477]">
                    ({recipe.ingredients.length} шт.)
                  </span>
                </h4>
                <div className="flex items-center space-x-2 mt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<number, boolean> = {};
                      recipe.ingredients.forEach((_, idx) => (all[idx] = true));
                      setSelectedIngs(all);
                    }}
                    className="text-[#E15A42] hover:underline font-semibold cursor-pointer"
                  >
                    Выбрать все
                  </button>
                  <span className="text-stone-300">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const stapleLess: Record<number, boolean> = {};
                      recipe.ingredients.forEach((ing, idx) => {
                        const n = ing.name.toLowerCase();
                        stapleLess[idx] =
                          !n.includes('соль') &&
                          !n.includes('вода') &&
                          !n.includes('перец');
                      });
                      setSelectedIngs(stapleLess);
                    }}
                    className="text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
                  >
                    Снять соль и воду
                  </button>
                  <span className="text-stone-300">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedIngs({})}
                    className="text-stone-500 hover:underline cursor-pointer"
                  >
                    Очистить
                  </button>
                </div>
              </div>

              {/* Выбор списка покупок и кнопка отправки */}
              <div className="flex items-center space-x-2">
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold bg-white text-[#1F1D1A]"
                >
                  {shoppingLists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleImportIngredients}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-105 text-white text-xs font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>В список ({Object.values(selectedIngs).filter(Boolean).length})</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recipe.ingredients.map((ing, i) => {
                const isChecked = selectedIngs[i] !== false;
                return (
                  <div
                    key={i}
                    onClick={() =>
                      setSelectedIngs((prev) => ({
                        ...prev,
                        [i]: !prev[i],
                      }))
                    }
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                      isChecked
                        ? 'bg-white border-[#E15A42]/40 shadow-2xs text-[#1F1D1A]'
                        : 'bg-stone-50 border-stone-200 text-stone-400 line-through'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'bg-[#E15A42] text-white' : 'border border-stone-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </div>
                      <span className="font-semibold truncate">{ing.name}</span>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ml-1.5 ${
                        isChecked ? 'bg-[#F2EFE8] text-[#8A8477]' : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      {ing.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Пошаговое приготовление */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#1F1D1A]">
              Инструкция приготовления
            </h4>
            <div className="space-y-2.5">
              {recipe.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-3 p-3 rounded-2xl bg-white border border-[#EBE7DF] text-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-[#E15A42] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-[#3A352C] leading-relaxed flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Добавление в недельный план питания */}
          <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E2D4] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1F1D1A] flex items-center space-x-1.5">
                <UtensilsCrossed className="w-4 h-4 text-[#E15A42]" />
                <span>Запланировать на неделю</span>
              </span>
              {!isAddingToPlan && (
                <button
                  onClick={() => setIsAddingToPlan(true)}
                  className="text-xs font-semibold text-[#E15A42] hover:underline"
                >
                  Выбрать день →
                </button>
              )}
            </div>

            {isAddingToPlan && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 animate-in fade-in">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs"
                />
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs"
                >
                  <option value="breakfast">Завтрак</option>
                  <option value="lunch">Обед</option>
                  <option value="dinner">Ужин</option>
                  <option value="snack">Перекус</option>
                </select>
                <button
                  onClick={handleAssignToPlan}
                  className="px-3 py-1.5 rounded-xl bg-[#E15A42] text-white text-xs font-bold"
                >
                  Поставить в план
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения удаления рецепта */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#E5DFD3] shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#1F1E1C]">Удалить рецепт?</h4>
                <p className="text-xs text-[#8C867D]">«{recipe.title}»</p>
              </div>
            </div>
            <p className="text-xs text-[#5C564B]">
              Рецепт будет безвозвратно удален из вашей семейной книги.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5C564B] hover:bg-stone-100 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onClose();
                  if (onDelete) onDelete(recipe.id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
