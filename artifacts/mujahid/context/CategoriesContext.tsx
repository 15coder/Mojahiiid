import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Category, DEFAULT_CATEGORIES } from '@/types/category';

const CATEGORIES_KEY = '@mujahid:categories';

function generateId(): string {
  return 'cat_' + Date.now().toString() + Math.random().toString(36).substring(2, 6);
}

interface CategoriesContextValue {
  categories: Category[];
  visibleCategories: Category[];
  isLoading: boolean;
  addCategory: (name: string, icon: string, color: string) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  toggleCategoryVisibility: (id: string) => Promise<void>;
  getCategoryById: (id: string | undefined) => Category | undefined;
  resetCategories: (newCategories: Category[]) => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const stored = await AsyncStorage.getItem(CATEGORIES_KEY);
      if (stored) {
        const parsed: Category[] = JSON.parse(stored);
        setCategories(parsed);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch {
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveCategories(list: Category[]) {
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(list));
  }

  const addCategory = useCallback(async (name: string, icon: string, color: string) => {
    const newCat: Category = {
      id: generateId(),
      name,
      icon,
      color,
      hidden: false,
      order: categories.length,
    };
    const next = [...categories, newCat];
    setCategories(next);
    await saveCategories(next);
  }, [categories]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Omit<Category, 'id'>>) => {
    const next = categories.map((c) => c.id === id ? { ...c, ...updates } : c);
    setCategories(next);
    await saveCategories(next);
  }, [categories]);

  const deleteCategory = useCallback(async (id: string) => {
    const next = categories.filter((c) => c.id !== id);
    setCategories(next);
    await saveCategories(next);
  }, [categories]);

  const toggleCategoryVisibility = useCallback(async (id: string) => {
    const next = categories.map((c) => c.id === id ? { ...c, hidden: !c.hidden } : c);
    setCategories(next);
    await saveCategories(next);
  }, [categories]);

  const getCategoryById = useCallback((id: string | undefined): Category | undefined => {
    if (!id) return undefined;
    return categories.find((c) => c.id === id);
  }, [categories]);

  const resetCategories = useCallback(async (newCategories: Category[]) => {
    setCategories(newCategories);
    await saveCategories(newCategories);
  }, []);

  const visibleCategories = categories.filter((c) => !c.hidden).sort((a, b) => a.order - b.order);

  return (
    <CategoriesContext.Provider value={{
      categories,
      visibleCategories,
      isLoading,
      addCategory,
      updateCategory,
      deleteCategory,
      toggleCategoryVisibility,
      getCategoryById,
      resetCategories,
    }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx;
}
