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
  createdAt?: string;
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
  customerViewMode?: boolean;
  lastBackupDate?: string;
  autoLockMinutes?: number;
  lowStockThreshold?: number;
  displayCurrency?: 'SYP_NEW' | 'SYP_OLD' | 'USD';
}

export type TrendDirection = 'up' | 'down' | 'neutral';
