export interface Product {
  id: string;
  name: string;
  barcode?: string;
  imagePaths: string[];
  costSYP: number;
  costUSD: number;
  sellingPriceSYP: number;
  sellingPriceUSD: number;
  notes?: string;
  previousCostSYP?: number;
  previousCostUSD?: number;
  previousSellingPriceSYP?: number;
  previousSellingPriceUSD?: number;
  lastModified: string;
}

export interface AppSettings {
  exchangeRate: number;
  biometricEnabled: boolean;
  darkMode: 'light' | 'dark' | 'system';
}

export type TrendDirection = 'up' | 'down' | 'neutral';
