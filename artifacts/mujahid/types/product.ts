export interface Product {
  id: string;
  name: string;
  barcode?: string;
  categoryId?: string;
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
  themeId: string;
  appName: string;
  pinEnabled: boolean;
  pinCode: string;
  securityKey: string;
  appIconUri?: string;
}

export type TrendDirection = 'up' | 'down' | 'neutral';
