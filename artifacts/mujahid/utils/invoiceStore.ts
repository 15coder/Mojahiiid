// Invoice section removed — placeholder to avoid broken imports during cleanup
export type InvoiceItem = {
  productId: string;
  name: string;
  sellingPriceSYP: number;
  sellingPriceUSD: number;
  qty: number;
};

export type SavedInvoice = {
  id: string;
  number: number;
  name?: string;
  items: InvoiceItem[];
  createdAt: string;
  totalSYP: number;
  totalUSD: number;
  note?: string;
  discountPct?: number;
  discountFixed?: number;
  finalTotalSYP?: number;
  finalTotalUSD?: number;
};

export type StatsPeriod = 'today' | 'week' | 'month';
export type StatsResult = { count: number; totalSYP: number; totalUSD: number; avgSYP: number; invoices: SavedInvoice[] };

export const invoiceStore = {
  getItems: (): InvoiceItem[] => [],
  addItem: (_: Omit<InvoiceItem, 'qty'>) => {},
  subscribe: (_: () => void) => () => {},
};

export function useInvoiceStore() {
  return {
    savedInvoices: [] as SavedInvoice[],
    activeItems: [] as InvoiceItem[],
    activeName: '',
    activeNote: '',
    activeDiscountPct: 0,
    activeDiscountFixed: 0,
    activeNumber: 1,
    totalSYP: 0,
    totalUSD: 0,
    finalTotalSYP: 0,
    finalTotalUSD: 0,
    isLoaded: true,
    addItem: (_: Omit<InvoiceItem, 'qty'>) => {},
    updateQty: (_: string, __: number) => {},
    removeItem: (_: string) => {},
    setName: (_: string) => {},
    setNote: (_: string) => {},
    setDiscount: (_: number, __: number) => {},
    saveActive: (): SavedInvoice | null => null,
    discardActive: () => {},
    deleteSaved: (_: string) => {},
    duplicateInvoice: (_: string) => {},
    clearAll: () => {},
    getStats: (_: StatsPeriod): StatsResult => ({ count: 0, totalSYP: 0, totalUSD: 0, avgSYP: 0, invoices: [] }),
  };
}
