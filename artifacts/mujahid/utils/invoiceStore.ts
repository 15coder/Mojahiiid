import { useState, useEffect } from 'react';

export type InvoiceItem = {
  productId: string;
  name: string;
  sellingPriceSYP: number;
  sellingPriceUSD: number;
  qty: number;
};

let _items: InvoiceItem[] = [];
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

export const invoiceStore = {
  getItems(): InvoiceItem[] {
    return _items;
  },

  addItem(product: Omit<InvoiceItem, 'qty'>) {
    const existing = _items.find((i) => i.productId === product.productId);
    if (existing) {
      _items = _items.map((i) =>
        i.productId === product.productId ? { ...i, qty: i.qty + 1 } : i
      );
    } else {
      _items = [..._items, { ...product, qty: 1 }];
    }
    notify();
  },

  updateQty(productId: string, qty: number) {
    if (qty <= 0) {
      _items = _items.filter((i) => i.productId !== productId);
    } else {
      _items = _items.map((i) =>
        i.productId === productId ? { ...i, qty } : i
      );
    }
    notify();
  },

  removeItem(productId: string) {
    _items = _items.filter((i) => i.productId !== productId);
    notify();
  },

  clear() {
    _items = [];
    notify();
  },

  getTotalSYP(): number {
    return _items.reduce((sum, i) => sum + i.sellingPriceSYP * i.qty, 0);
  },

  getTotalUSD(): number {
    return _items.reduce((sum, i) => sum + i.sellingPriceUSD * i.qty, 0);
  },

  subscribe(fn: () => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

export function useInvoice() {
  const [items, setItems] = useState<InvoiceItem[]>(() => invoiceStore.getItems());

  useEffect(() => {
    const unsub = invoiceStore.subscribe(() => {
      setItems([...invoiceStore.getItems()]);
    });
    return unsub;
  }, []);

  return {
    items,
    addItem: invoiceStore.addItem.bind(invoiceStore),
    updateQty: invoiceStore.updateQty.bind(invoiceStore),
    removeItem: invoiceStore.removeItem.bind(invoiceStore),
    clear: invoiceStore.clear.bind(invoiceStore),
    totalSYP: invoiceStore.getTotalSYP(),
    totalUSD: invoiceStore.getTotalUSD(),
  };
}
