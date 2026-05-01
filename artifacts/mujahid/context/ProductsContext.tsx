import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { Product } from '@/types/product';
import { rebuildIndex } from '@/utils/fuzzySearch';

const PRODUCTS_KEY = '@mujahid:products';

interface ProductsContextValue {
  products: Product[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, 'id' | 'lastModified'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  exportData: () => Promise<string>;
  importData: (jsonString: string) => Promise<number>;
  updateAllProductsExchangeRate: (newRate: number) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const stored = await AsyncStorage.getItem(PRODUCTS_KEY);
      if (stored) {
        const parsed: Product[] = JSON.parse(stored);
        setProducts(parsed);
        rebuildIndex(parsed);
      }
    } catch {
      // start fresh
    } finally {
      setIsLoading(false);
    }
  }

  async function saveProducts(list: Product[]) {
    await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(list));
    rebuildIndex(list);
  }

  const addProduct = useCallback(async (data: Omit<Product, 'id' | 'lastModified'>): Promise<Product> => {
    const newProduct: Product = {
      ...data,
      id: generateId(),
      lastModified: new Date().toISOString(),
    };
    setProducts((prev) => {
      const next = [newProduct, ...prev];
      saveProducts(next).catch(() => {});
      return next;
    });
    return newProduct;
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Omit<Product, 'id'>>) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const updated: Product = {
          ...p,
          ...updates,
          previousCostSYP: updates.costSYP !== undefined ? p.costSYP : p.previousCostSYP,
          previousCostUSD: updates.costUSD !== undefined ? p.costUSD : p.previousCostUSD,
          previousSellingPriceSYP: updates.sellingPriceSYP !== undefined ? p.sellingPriceSYP : p.previousSellingPriceSYP,
          previousSellingPriceUSD: updates.sellingPriceUSD !== undefined ? p.sellingPriceUSD : p.previousSellingPriceUSD,
          lastModified: new Date().toISOString(),
        };
        return updated;
      });
      saveProducts(next).catch(() => {});
      return next;
    });
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveProducts(next).catch(() => {});
      return next;
    });
  }, []);

  const getProductById = useCallback((id: string) => {
    return products.find((p) => p.id === id);
  }, [products]);

  const exportData = useCallback(async (): Promise<string> => {
    const exportObj = {
      version: 1,
      exportDate: new Date().toISOString(),
      products,
    };
    return JSON.stringify(exportObj, null, 2);
  }, [products]);

  const importData = useCallback(async (jsonString: string): Promise<number> => {
    const parsed = JSON.parse(jsonString);
    let importedProducts: Product[] = [];
    if (parsed.products && Array.isArray(parsed.products)) {
      importedProducts = parsed.products;
    } else if (Array.isArray(parsed)) {
      importedProducts = parsed;
    } else {
      throw new Error('تنسيق ملف غير صحيح');
    }
    setProducts(importedProducts);
    await saveProducts(importedProducts);
    return importedProducts.length;
  }, []);

  const updateAllProductsExchangeRate = useCallback(async (newRate: number) => {
    if (!newRate || newRate <= 0) return;
    setProducts((prev) => {
      const next = prev.map((p) => {
        const newCostSYP = p.costUSD > 0 ? Math.round(p.costUSD * newRate) : p.costSYP;
        const newSellSYP = p.sellingPriceUSD > 0 ? Math.round(p.sellingPriceUSD * newRate) : p.sellingPriceSYP;
        return {
          ...p,
          previousCostSYP: p.costSYP,
          previousSellingPriceSYP: p.sellingPriceSYP,
          costSYP: newCostSYP,
          sellingPriceSYP: newSellSYP,
          lastModified: new Date().toISOString(),
        };
      });
      saveProducts(next).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ProductsContext.Provider value={{
      products,
      isLoading,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductById,
      exportData,
      importData,
      updateAllProductsExchangeRate,
    }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider');
  return ctx;
}
