import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Clock,
  Flame,
  Users,
  Image as ImageIcon,
  Sparkles,
  Tag,
  ListPlus,
  ChefHat,
  Check,
} from 'lucide-react';
import { Recipe, RecipeIngredient, ShoppingCategory } from '../../types';

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Omit<Recipe, 'id'>) => void;
  recipeToEdit?: Recipe | null;
  onOpenImport?: () => void;
}

const PRESET_RECIPE_IMAGES = [
  { label: 'Салат / Овощи', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80' },
  { label: 'Паста / Паста песто', url: 'https://images.unsplash.com/photo-1621996346565-e3d5d62817d2?auto=format&fit=crop&w=600&q=80' },
  { label: 'Рыба / Лосось', url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80' },
  { label: 'Суп / Борщ', url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80' },
  { label: 'Сырники / Завтрак', url: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80' },
  { label: 'Мясо / Птица', url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=80' },
  { label: 'Средиземноморское / Фета', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80' },
  { label: 'Выпечка / Пирог', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80' },
];

const SUGGESTED_TAGS = [
  'Быстро (до 20 мин)',
  'Семейное',
  'Любимое детям',
  'ЗОЖ / Фитнес',
  'Греция / Средиземноморское',
  'Ужин',
  'Завтрак',
  'Обед',
  'Выпечка',
  'Праздничное',
  'Без сахара',
];

const CATEGORY_OPTIONS: Array<{ value: 'breakfast' | 'lunch' | 'dinner' | 'snack'; label: string; emoji: string }> = [
  { value: 'breakfast', label: 'Завтрак', emoji: '🍳' },
  { value: 'lunch', label: 'Обед', emoji: '🍲' },
  { value: 'dinner', label: 'Ужин', emoji: '🍝' },
  { value: 'snack', label: 'Перекус', emoji: '🍎' },
];

const SHOPPING_CATEGORIES: Array<{ value: ShoppingCategory; label: string }> = [
  { value: 'produce', label: 'Овощи и фрукты' },
  { value: 'dairy', label: 'Молочные продукты' },
  { value: 'meat', label: 'Мясо и птица' },
  { value: 'bakery', label: 'Хлеб и выпечка' },
  { value: 'pantry', label: 'Бакалея и специи' },
  { value: 'household', label: 'Хозтовары' },
  { value: 'drinks', label: 'Напитки' },
  { value: 'other', label: 'Другое' },
];

export const RecipeModal: React.FC<RecipeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  recipeToEdit,
  onOpenImport,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('dinner');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(15);
  const [cookTimeMinutes, setCookTimeMinutes] = useState(20);
  const [servings, setServings] = useState(4);
  const [calories, setCalories] = useState<number | undefined>(380);
  const [image, setImage] = useState(PRESET_RECIPE_IMAGES[0].url);
  const [tags, setTags] = useState<string[]>(['Семейное', 'Ужин']);
  const [newTagInput, setNewTagInput] = useState('');

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { name: '', amount: '', category: 'produce' },
  ]);

  const [steps, setSteps] = useState<string[]>(['']);

  const [showBulkPasteIngredients, setShowBulkPasteIngredients] = useState(false);
  const [bulkIngredientsText, setBulkIngredientsText] = useState('');

  const [showBulkPasteSteps, setShowBulkPasteSteps] = useState(false);
  const [bulkStepsText, setBulkStepsText] = useState('');

  // Синхронизация состояния при открытии модального окна или редактировании
  useEffect(() => {
    if (isOpen) {
      if (recipeToEdit) {
        setTitle(recipeToEdit.title || '');
        setDescription(recipeToEdit.description || '');
        setCategory(recipeToEdit.category || 'dinner');
        setPrepTimeMinutes(recipeToEdit.prepTimeMinutes || 10);
        setCookTimeMinutes(recipeToEdit.cookTimeMinutes || 20);
        setServings(recipeToEdit.servings || 4);
        setCalories(recipeToEdit.calories || 350);
        setImage(recipeToEdit.image || PRESET_RECIPE_IMAGES[0].url);
        setTags(recipeToEdit.tags || ['Семейное']);
        setIngredients(
          recipeToEdit.ingredients && recipeToEdit.ingredients.length > 0
            ? recipeToEdit.ingredients
            : [{ name: '', amount: '', category: 'produce' }]
        );
        setSteps(
          recipeToEdit.steps && recipeToEdit.steps.length > 0
            ? recipeToEdit.steps
            : ['']
        );
      } else {
        setTitle('');
        setDescription('');
        setCategory('dinner');
        setPrepTimeMinutes(15);
        setCookTimeMinutes(25);
        setServings(4);
        setCalories(400);
        setImage(PRESET_RECIPE_IMAGES[0].url);
        setTags(['Семейное', 'Ужин']);
        setIngredients([
          { name: '', amount: '', category: 'produce' },
          { name: '', amount: '', category: 'pantry' },
        ]);
        setSteps(['']);
      }
      setShowBulkPasteIngredients(false);
      setShowBulkPasteSteps(false);
    }
  }, [isOpen, recipeToEdit]);

  if (!isOpen) return null;

  // Ингредиенты
  const addIngredientRow = () => {
    setIngredients((prev) => [...prev, { name: '', amount: '', category: 'produce' }]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, val: string) => {
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyBulkIngredients = () => {
    if (!bulkIngredientsText.trim()) return;
    const lines = bulkIngredientsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const parsed: RecipeIngredient[] = lines.map((line) => {
      // Пытаемся отделить количество (например "Сыр фета - 200 г" или "200 г сыра")
      const dashIdx = line.indexOf('-');
      const colonIdx = line.indexOf(':');
      const splitIdx = dashIdx !== -1 ? dashIdx : colonIdx;

      if (splitIdx !== -1) {
        const namePart = line.substring(0, splitIdx).trim();
        const amtPart = line.substring(splitIdx + 1).trim();
        return { name: namePart, amount: amtPart, category: guessCategory(namePart) };
      }

      return { name: line, amount: 'по вкусу', category: guessCategory(line) };
    });

    setIngredients(parsed);
    setShowBulkPasteIngredients(false);
    setBulkIngredientsText('');
  };

  // Шаги
  const addStepRow = () => {
    setSteps((prev) => [...prev, '']);
  };

  const updateStep = (index: number, val: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? val : s)));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyBulkSteps = () => {
    if (!bulkStepsText.trim()) return;
    const lines = bulkStepsText
      .split('\n')
      .map((l) => l.replace(/^\d+[\.\)\-]\s*/, '').trim())
      .filter(Boolean);

    if (lines.length > 0) {
      setSteps(lines);
    }
    setShowBulkPasteSteps(false);
    setBulkStepsText('');
  };

  // Теги
  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (newTagInput.trim()) {
      if (!tags.includes(newTagInput.trim())) {
        setTags((prev) => [...prev, newTagInput.trim()]);
      }
      setNewTagInput('');
    }
  };

  // Отправка формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const cleanIngredients = ingredients
      .map((ing) => ({
        name: ing.name.trim(),
        amount: ing.amount.trim() || 'по вкусу',
        category: ing.category || 'produce',
      }))
      .filter((ing) => ing.name.length > 0);

    const cleanSteps = steps
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    onSave({
      title: title.trim(),
      description: description.trim() || 'Вкусное семейное блюдо',
      category,
      prepTimeMinutes: Number(prepTimeMinutes) || 10,
      cookTimeMinutes: Number(cookTimeMinutes) || 15,
      servings: Number(servings) || 4,
      calories: Number(calories) || undefined,
      image: image.trim() || PRESET_RECIPE_IMAGES[0].url,
      tags: tags.length > 0 ? tags : ['Семейное'],
      ingredients: cleanIngredients.length > 0 ? cleanIngredients : [
        { name: 'Ингредиенты по вкусу', amount: 'по вкусу', category: 'pantry' },
      ],
      steps: cleanSteps.length > 0 ? cleanSteps : ['Приготовить с любовью и подать к столу.'],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[var(--surface-3)] rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Заголовок модального окна */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--surface)] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[var(--accent)] flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[var(--text)]">
                {recipeToEdit ? 'Редактировать рецепт' : 'Добавить рецепт в семейную книгу'}
              </h3>
              <p className="text-[12px] text-[var(--muted)]">
                Ингредиенты можно будет в 1 клик перенести в список покупок
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--line)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма с прокруткой */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {/* Быстрый переход к AI-импорту по ссылке */}
          {!recipeToEdit && onOpenImport && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="w-full p-3.5 rounded-2xl bg-[var(--surface)] hover:from-amber-100 hover:to-orange-100 border border-amber-200 text-left flex items-center justify-between transition-all cursor-pointer shadow-none group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[var(--accent)] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block font-semibold text-xs text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                    Есть ссылка с сайта, YouTube или Instagram?
                  </strong>
                  <span className="text-[12px] text-[var(--muted)]">
                    AI сам извлечёт ингредиенты, граммовки и шаги за пару секунд
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-[var(--accent)] group-hover:translate-x-0.5 transition-transform flex items-center space-x-1 shrink-0 ml-2">
                <span>Вставить ссылку →</span>
              </span>
            </button>
          )}

          {/* 1. Основная информация */}
          <div className="space-y-3.5 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--line)]">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--text)]">
                Название блюда <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Греческий салат с фетой, Паста карбонара, Борщ..."
                className="w-full px-3.5 py-2.5 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--surface)] transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--text-2)]">Краткое описание / Секрет приготовления</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Особый соус, любимое блюдо детей по выходным, быстрая подача..."
                className="w-full px-3 py-2 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl text-xs focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--surface)] resize-none"
              />
            </div>

            {/* Категория приёма пищи */}
            <div className="space-y-1.5">
              <label className="font-semibold text-[var(--text-2)]">Приём пищи</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border font-semibold transition-all cursor-pointer ${ category === cat.value ? 'bg-[var(--inverse)] text-white border-[var(--text)] shadow-[var(--shadow)]' : 'bg-[var(--surface-3)] border-[var(--line-strong)] text-[var(--text-2)] hover:bg-stone-100' }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Метрики: время, порции, калории */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-[var(--text-2)] flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-[var(--accent)]" />
                  <span>Подготовка (мин)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-[var(--text-2)] flex items-center space-x-1">
                  <Flame className="w-3 h-3 text-orange-500" />
                  <span>Варка/жарка (мин)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={cookTimeMinutes}
                  onChange={(e) => setCookTimeMinutes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-[var(--text-2)] flex items-center space-x-1">
                  <Users className="w-3 h-3 text-amber-600" />
                  <span>Порций</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-[var(--text-2)] flex items-center space-x-1">
                  <span>Ккал / порция</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={calories || ''}
                  onChange={(e) => setCalories(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="350"
                  className="w-full px-3 py-1.5 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          </div>

          {/* 2. Фото блюда */}
          <div className="space-y-2.5 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--line)]">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-[var(--text)] flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-[var(--accent)]" />
                <span>Фото блюда</span>
              </label>
              <span className="text-[12px] text-[var(--muted)]">Выберите из коллекции или вставьте URL</span>
            </div>

            {/* Превью выбранного фото */}
            <div className="flex items-center space-x-3">
              <img
                src={image}
                alt="Превью"
                className="w-16 h-16 rounded-2xl object-cover border border-[var(--line-strong)] shadow-none"
              />
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3 py-2 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl text-xs focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Быстрый выбор готовых красивых фото */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1">
              {PRESET_RECIPE_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImage(preset.url)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-[12px] font-medium shrink-0 transition-all cursor-pointer ${ image === preset.url ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold' : 'bg-[var(--surface-3)] text-[var(--text-2)] border-[var(--line)] hover:bg-stone-100' }`}
                >
                  <img src={preset.url} alt="" className="w-4 h-4 rounded-full object-cover" />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Теги */}
          <div className="space-y-2 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--line)]">
            <label className="font-semibold text-[var(--text)] flex items-center space-x-1.5">
              <Tag className="w-4 h-4 text-[var(--accent)]" />
              <span>Теги рецепта</span>
            </label>

            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${ tags.includes(tag) ? 'bg-[var(--accent)] text-white shadow-none' : 'bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--line)] hover:bg-stone-100' }`}
                >
                  {tags.includes(tag) ? '✓ ' : '+ '}
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag(e);
                  }
                }}
                placeholder="Свой тег (например: Мультиварка)..."
                className="flex-1 px-3 py-1.5 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl text-xs focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl cursor-pointer"
              >
                Добавить
              </button>
            </div>
          </div>

          {/* 4. Ингредиенты */}
          <div className="space-y-3 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--line)]">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold text-[var(--text)] text-sm">
                  Ингредиенты ({ingredients.filter((i) => i.name.trim()).length})
                </label>
                <p className="text-[12px] text-[var(--muted)]">
                  Будут автоматически сортироваться в списке покупок по отделам магазина
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPasteIngredients(!showBulkPasteIngredients)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[12px] font-semibold cursor-pointer"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>Вставить списком</span>
                </button>
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-[12px] font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Строка</span>
                </button>
              </div>
            </div>

            {/* Блок пакетной вставки ингредиентов */}
            {showBulkPasteIngredients && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                <span className="text-[12px] font-semibold text-amber-900 block">
                  Вставьте список ингредиентов (каждый с новой строки):
                </span>
                <textarea
                  rows={4}
                  value={bulkIngredientsText}
                  onChange={(e) => setBulkIngredientsText(e.target.value)}
                  placeholder={`Сыр Фета - 200 г\nПомидоры черри - 250 г\nОгурцы свежие - 2 шт.\nОливковое масло Extra Virgin - 3 ст. л.\nОрегано сушёный - 1 ч. л.`}
                  className="w-full p-2.5 bg-[var(--surface)] border border-amber-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkPasteIngredients(false)}
                    className="px-2.5 py-1 text-[12px] text-stone-600 hover:text-stone-900"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBulkIngredients}
                    className="px-3 py-1 bg-[var(--accent)] text-white font-semibold rounded-full text-[12px]"
                  >
                    Распознать и вставить
                  </button>
                </div>
              </div>
            )}

            {/* Список строк ингредиентов */}
            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                    placeholder="Название (например: Сыр Фета)"
                    className="flex-2 px-3 py-1.5 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl text-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(idx, 'amount', e.target.value)}
                    placeholder="Кол-во (200 г, 2 шт.)"
                    className="flex-1 px-3 py-1.5 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl text-xs focus:outline-none focus:border-[var(--accent)]"
                  />
                  <select
                    value={ing.category}
                    onChange={(e) => updateIngredient(idx, 'category', e.target.value as ShoppingCategory)}
                    className="w-32 px-2 py-1.5 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl text-[12px] focus:outline-none focus:border-[var(--accent)]"
                  >
                    {SHOPPING_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    disabled={ingredients.length <= 1}
                    className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Пошаговые инструкции */}
          <div className="space-y-3 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--line)]">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-semibold text-[var(--text)] text-sm">
                  Шаги приготовления ({steps.filter((s) => s.trim()).length})
                </label>
                <p className="text-[12px] text-[var(--muted)]">
                  Пошаговое руководство, чтобы легко готовить по рецепту
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPasteSteps(!showBulkPasteSteps)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[12px] font-semibold cursor-pointer"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>Вставить текст шагов</span>
                </button>
                <button
                  type="button"
                  onClick={addStepRow}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-[12px] font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Шаг</span>
                </button>
              </div>
            </div>

            {/* Блок быстрой вставки текста шагов */}
            {showBulkPasteSteps && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                <span className="text-[12px] font-semibold text-amber-900 block">
                  Вставьте шаги приготовления (каждый абзац станет отдельным шагом):
                </span>
                <textarea
                  rows={4}
                  value={bulkStepsText}
                  onChange={(e) => setBulkStepsText(e.target.value)}
                  placeholder={`1. Овощи промыть, нарезать крупными кусочками.\n2. Сыр фета нарезать кубиками или положить цельным пластом сверху.\n3. Сбрызнуть оливковым маслом и посыпать орегано.`}
                  className="w-full p-2.5 bg-[var(--surface)] border border-amber-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkPasteSteps(false)}
                    className="px-2.5 py-1 text-[12px] text-stone-600 hover:text-stone-900"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBulkSteps}
                    className="px-3 py-1 bg-[var(--accent)] text-white font-semibold rounded-full text-[12px]"
                  >
                    Разбить на шаги
                  </button>
                </div>
              </div>
            )}

            {/* Список шагов */}
            <div className="space-y-2.5">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-white font-semibold text-xs flex items-center justify-center shrink-0 mt-1">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={step}
                    onChange={(e) => updateStep(idx, e.target.value)}
                    placeholder={`Шаг ${idx + 1}...`}
                    className="flex-1 px-3 py-2 bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl text-xs focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    disabled={steps.length <= 1}
                    className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 disabled:opacity-30 cursor-pointer mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Кнопки сохранения */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[var(--line-strong)] text-[var(--text-2)] font-semibold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[var(--accent)] hover:brightness-110 text-white font-semibold hover:transition-all cursor-pointer flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>{recipeToEdit ? 'Сохранить изменения' : 'Сохранить рецепт'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Функция определения категории покупки по названию ингредиента
function guessCategory(name: string): ShoppingCategory {
  const n = name.toLowerCase();
  if (n.includes('сыр') || n.includes('молок') || n.includes('сливк') || n.includes('сметан') || n.includes('йогурт') || n.includes('масло сливочн') || n.includes('творог') || n.includes('фета')) {
    return 'dairy';
  }
  if (n.includes('помидор') || n.includes('огур') || n.includes('салат') || n.includes('яблок') || n.includes('лук') || n.includes('чеснок') || n.includes('перец') || n.includes('лимон') || n.includes('зелень') || n.includes('брокколи') || n.includes('банан')) {
    return 'produce';
  }
  if (n.includes('мясо') || n.includes('говядин') || n.includes('куриц') || n.includes('филе') || n.includes('лосос') || n.includes('рыб') || n.includes('форель') || n.includes('фарш') || n.includes('свинин') || n.includes('индейк')) {
    return 'meat';
  }
  if (n.includes('хлеб') || n.includes('булоч') || n.includes('багет') || n.includes('мука') || n.includes('лаваш')) {
    return 'bakery';
  }
  if (n.includes('паста') || n.includes('макарон') || n.includes('рис') || n.includes('крупа') || n.includes('соль') || n.includes('сахар') || n.includes('масло оливк') || n.includes('масло растит') || n.includes('соус') || n.includes('специ') || n.includes('ореган')) {
    return 'pantry';
  }
  if (n.includes('сок') || n.includes('вода') || n.includes('чай') || n.includes('кофе') || n.includes('вино')) {
    return 'drinks';
  }
  return 'produce';
}
