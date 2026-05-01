export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  hidden: boolean;
  order: number;
  isDefault?: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'غذائية', icon: 'nutrition-outline', color: '#22C55E', hidden: false, order: 0, isDefault: true },
  { id: 'nuts', name: 'مكسرات وضيافة', icon: 'leaf-outline', color: '#F59E0B', hidden: false, order: 1, isDefault: true },
  { id: 'drinks', name: 'مشروبات', icon: 'cafe-outline', color: '#3B82F6', hidden: false, order: 2, isDefault: true },
  { id: 'spices', name: 'بهارات', icon: 'flame-outline', color: '#EF4444', hidden: false, order: 3, isDefault: true },
  { id: 'cleaners', name: 'منظفات', icon: 'water-outline', color: '#06B6D4', hidden: false, order: 4, isDefault: true },
  { id: 'baby', name: 'مستلزمات أطفال', icon: 'happy-outline', color: '#EC4899', hidden: false, order: 5, isDefault: true },
];
