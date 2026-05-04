import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Currency = "SYP_OLD" | "SYP_NEW" | "USD";

export interface Product {
  id: string;
  name: string;
  priceOld: number; // ل.س.ق
  priceNew: number; // ل.س.ج
  priceUsd: number; // $
  unit?: string;
}

export interface InvoiceItem {
  id: string;
  product: Product;
  quantity: number;
  totalOld: number;
  totalNew: number;
  totalUsd: number;
}

export interface Invoice {
  id: string;
  number: number;
  customerName: string;
  notes: string;
  items: InvoiceItem[];
  totalOld: number;
  totalNew: number;
  totalUsd: number;
  exchangeRateOld: number; // how many OLD SYP per USD
  exchangeRateNew: number; // how many NEW SYP per USD
  date: string;
  createdAt: number;
}

interface AppContextType {
  products: Product[];
  invoices: Invoice[];
  exchangeRateOld: number; // ل.س.ق per $
  exchangeRateNew: number; // ل.س.ج per $
  setExchangeRateOld: (rate: number) => void;
  setExchangeRateNew: (rate: number) => void;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt">) => string;
  deleteInvoice: (id: string) => void;
  convertFromOld: (amountOld: number) => { new: number; usd: number };
  convertFromNew: (amountNew: number) => { old: number; usd: number };
  convertFromUsd: (amountUsd: number) => { old: number; new: number };
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = "mujahid_trading_data";

const defaultProducts: Product[] = [
  {
    id: "1",
    name: "سكر",
    priceOld: 150000,
    priceNew: 1500,
    priceUsd: 10.71,
    unit: "كيس",
  },
  {
    id: "2",
    name: "دخان",
    priceOld: 40000,
    priceNew: 400,
    priceUsd: 2.86,
    unit: "علبة",
  },
  {
    id: "3",
    name: "زيت",
    priceOld: 80000,
    priceNew: 800,
    priceUsd: 5.71,
    unit: "لتر",
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [exchangeRateOld, setExchangeRateOld] = useState(14000); // 14000 ل.س.ق = 1$
  const [exchangeRateNew, setExchangeRateNew] = useState(140); // 140 ل.س.ج = 1$

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setProducts(data.products || defaultProducts);
        setInvoices(data.invoices || []);
        setExchangeRateOld(data.exchangeRateOld || 14000);
        setExchangeRateNew(data.exchangeRateNew || 140);
      } else {
        setProducts(defaultProducts);
      }
    } catch {
      setProducts(defaultProducts);
    }
  }, []);

  useEffect(() => {
    if (products.length === 0 && invoices.length === 0) return;
    const data = { products, invoices, exchangeRateOld, exchangeRateNew };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [products, invoices, exchangeRateOld, exchangeRateNew]);

  const convertFromOld = (amountOld: number) => ({
    new: Math.round((amountOld / exchangeRateOld) * exchangeRateNew * 100) / 100,
    usd: Math.round((amountOld / exchangeRateOld) * 100) / 100,
  });

  const convertFromNew = (amountNew: number) => ({
    old: Math.round((amountNew / exchangeRateNew) * exchangeRateOld),
    usd: Math.round((amountNew / exchangeRateNew) * 100) / 100,
  });

  const convertFromUsd = (amountUsd: number) => ({
    old: Math.round(amountUsd * exchangeRateOld),
    new: Math.round(amountUsd * exchangeRateNew * 100) / 100,
  });

  const addProduct = (product: Omit<Product, "id">) => {
    const newProduct: Product = { ...product, id: Date.now().toString() };
    setProducts((prev) => [...prev, newProduct]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const addInvoice = (invoice: Omit<Invoice, "id" | "createdAt">) => {
    const id = Date.now().toString();
    const newInvoice: Invoice = { ...invoice, id, createdAt: Date.now() };
    setInvoices((prev) => [...prev, newInvoice]);
    return id;
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        products,
        invoices,
        exchangeRateOld,
        exchangeRateNew,
        setExchangeRateOld,
        setExchangeRateNew,
        addProduct,
        updateProduct,
        deleteProduct,
        addInvoice,
        deleteInvoice,
        convertFromOld,
        convertFromNew,
        convertFromUsd,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
