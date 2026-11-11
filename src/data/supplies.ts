// «Запасы дома»: что должно быть дома всегда. Стартовый набор — из каталога (раздел 4) и обсуждения;
// всё можно удалить или дополнить. Статус меняется одним касанием: есть → заканчивается → нет.
import type { Need } from '../utils/homeProfile';

export type SupplyPlace = 'fridge' | 'freezer' | 'pantry' | 'household' | 'hygiene' | 'tech' | 'pets' | 'garden';
export const PLACES: { id: SupplyPlace; title: string; icon: string; needs?: Need[]; list: string }[] = [
  { id: 'fridge', title: 'Холодильник', icon: '🧊', list: 'list-supermarket' },
  { id: 'freezer', title: 'Морозильник', icon: '❄️', list: 'list-supermarket' },
  { id: 'pantry', title: 'Кладовая и шкафы', icon: '🥫', list: 'list-supermarket' },
  { id: 'household', title: 'Бытовая химия', icon: '🧴', list: 'list-supermarket' },
  { id: 'hygiene', title: 'Гигиена и бумага', icon: '🧻', list: 'list-supermarket' },
  { id: 'tech', title: 'Батарейки, лампы, зарядки, расходники', icon: '🔋', list: 'list-home' },
  { id: 'pets', title: 'Для животных', icon: '🐾', needs: ['pets'], list: 'list-supermarket' },
  { id: 'garden', title: 'Для растений и сада', icon: '🌱', needs: ['garden'], list: 'list-home' },
];

export const STARTER: { place: SupplyPlace; name: string; needs?: Need[] }[] = [
  ...['Молоко', 'Яйца', 'Сливочное масло', 'Сыр'].map((name) => ({ place: 'fridge' as const, name })),
  ...['Замороженные овощи', 'Мясо или рыба впрок'].map((name) => ({ place: 'freezer' as const, name })),
  ...['Соль', 'Сахар', 'Мука', 'Рис', 'Гречка', 'Макароны', 'Подсолнечное масло', 'Чай', 'Кофе'].map((name) => ({ place: 'pantry' as const, name })),
  ...['Средство для мытья посуды', 'Средство для стирки', 'Средство для уборки', 'Губки', 'Мешки для мусора'].map((name) => ({ place: 'household' as const, name })),
  { place: 'household', name: 'Таблетки для посудомойки', needs: ['dishwasher'] },
  ...['Туалетная бумага', 'Бумажные полотенца', 'Мыло', 'Шампунь', 'Зубная паста'].map((name) => ({ place: 'hygiene' as const, name })),
  ...['Батарейки AA', 'Батарейки AAA', 'Лампочки'].map((name) => ({ place: 'tech' as const, name })),
  { place: 'tech', name: 'Фильтр для воды', needs: ['waterfilter'] },
  { place: 'tech', name: 'Мешки или фильтр для пылесоса' },
  { place: 'tech', name: 'Запасная зарядка и кабель' },
  { place: 'tech', name: 'Картридж для принтера', needs: ['printer'] },
  { place: 'tech', name: 'Бумага для принтера', needs: ['printer'] },
  { place: 'pets', name: 'Корм' },
  { place: 'pets', name: 'Наполнитель' },
  { place: 'garden', name: 'Грунт' },
  { place: 'garden', name: 'Удобрение' },
];
