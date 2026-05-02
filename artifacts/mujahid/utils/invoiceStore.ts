import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

const STORE_KEY = '@mujahid:invoices_v2';

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
  items: InvoiceItem[];
  createdAt: string;
  totalSYP: number;
  totalUSD: number;
};

type StoreState = {
  activeItems: InvoiceItem[];
  activeNumber: number;
  savedInvoices: SavedInvoice[];
  nextNumber: number;
  isLoaded: boolean;
};

let _state: StoreState = {
  activeItems: [],
  activeNumber: 1,
  savedInvoices: [],
  nextNumber: 1,
  isLoaded: false,
};

const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

async function persist() {
  try {
    await AsyncStorage.setItem(
      STORE_KEY,
      JSON.stringify({ savedInvoices: _state.savedInvoices, nextNumber: _state.nextNumber })
    );
  } catch {}
}

let _loadPromise: Promise<void> | null = null;

export function loadInvoiceStore(): Promise<void> {
  if (_state.isLoaded) return Promise.resolve();
  if (_loadPromise) return _loadPromise;
  _loadPromise = AsyncStorage.getItem(STORE_KEY)
    .then((stored) => {
      if (stored) {
        const parsed = JSON.parse(stored);
        _state = {
          ..._state,
          savedInvoices: parsed.savedInvoices || [],
          nextNumber: parsed.nextNumber || 1,
          activeNumber: parsed.nextNumber || 1,
          isLoaded: true,
        };
      } else {
        _state = { ..._state, isLoaded: true };
      }
      notify();
    })
    .catch(() => {
      _state = { ..._state, isLoaded: true };
      notify();
    });
  return _loadPromise;
}

function calcTotal(items: InvoiceItem[], currency: 'SYP' | 'USD'): number {
  return items.reduce(
    (s, i) => s + (currency === 'SYP' ? i.sellingPriceSYP : i.sellingPriceUSD) * i.qty,
    0
  );
}

export const invoiceStore = {
  getState(): StoreState {
    return _state;
  },

  addItem(product: Omit<InvoiceItem, 'qty'>) {
    const existing = _state.activeItems.find((i) => i.productId === product.productId);
    _state = {
      ..._state,
      activeItems: existing
        ? _state.activeItems.map((i) =>
            i.productId === product.productId ? { ...i, qty: i.qty + 1 } : i
          )
        : [..._state.activeItems, { ...product, qty: 1 }],
    };
    notify();
  },

  updateQty(productId: string, qty: number) {
    _state = {
      ..._state,
      activeItems:
        qty <= 0
          ? _state.activeItems.filter((i) => i.productId !== productId)
          : _state.activeItems.map((i) =>
              i.productId === productId ? { ...i, qty } : i
            ),
    };
    notify();
  },

  removeItem(productId: string) {
    _state = {
      ..._state,
      activeItems: _state.activeItems.filter((i) => i.productId !== productId),
    };
    notify();
  },

  discardActive() {
    _state = { ..._state, activeItems: [] };
    notify();
  },

  saveActive(): SavedInvoice | null {
    if (_state.activeItems.length === 0) return null;
    const invoice: SavedInvoice = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      number: _state.activeNumber,
      items: [..._state.activeItems],
      createdAt: new Date().toISOString(),
      totalSYP: calcTotal(_state.activeItems, 'SYP'),
      totalUSD: calcTotal(_state.activeItems, 'USD'),
    };
    const nextNum = _state.nextNumber + 1;
    _state = {
      ..._state,
      savedInvoices: [invoice, ..._state.savedInvoices],
      activeItems: [],
      activeNumber: nextNum,
      nextNumber: nextNum,
    };
    persist().catch(() => {});
    notify();
    return invoice;
  },

  deleteSaved(id: string) {
    _state = {
      ..._state,
      savedInvoices: _state.savedInvoices.filter((inv) => inv.id !== id),
    };
    persist().catch(() => {});
    notify();
  },

  clearAll() {
    _state = {
      activeItems: [],
      savedInvoices: [],
      nextNumber: 1,
      activeNumber: 1,
      isLoaded: true,
    };
    persist().catch(() => {});
    notify();
  },

  // ── Legacy API (scanner.tsx compatibility) ─────────────────
  getItems(): InvoiceItem[] {
    return _state.activeItems;
  },

  clear() {
    _state = { ..._state, activeItems: [] };
    notify();
  },

  subscribe(fn: () => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  getTotalSYP(items?: InvoiceItem[]): number {
    return calcTotal(items ?? _state.activeItems, 'SYP');
  },
  getTotalUSD(items?: InvoiceItem[]): number {
    return calcTotal(items ?? _state.activeItems, 'USD');
  },
};

// ── Main React hook ───────────────────────────────────────────
export function useInvoiceStore() {
  const [state, setState] = useState<StoreState>(() => invoiceStore.getState());

  useEffect(() => {
    loadInvoiceStore();
    const unsub = invoiceStore.subscribe(() =>
      setState({ ...invoiceStore.getState() })
    );
    return unsub;
  }, []);

  return {
    state,
    activeItems: state.activeItems,
    savedInvoices: state.savedInvoices,
    activeNumber: state.activeNumber,
    isLoaded: state.isLoaded,
    totalSYP: invoiceStore.getTotalSYP(state.activeItems),
    totalUSD: invoiceStore.getTotalUSD(state.activeItems),
    addItem: invoiceStore.addItem.bind(invoiceStore),
    updateQty: invoiceStore.updateQty.bind(invoiceStore),
    removeItem: invoiceStore.removeItem.bind(invoiceStore),
    saveActive: invoiceStore.saveActive.bind(invoiceStore),
    discardActive: invoiceStore.discardActive.bind(invoiceStore),
    deleteSaved: invoiceStore.deleteSaved.bind(invoiceStore),
    clearAll: invoiceStore.clearAll.bind(invoiceStore),
  };
}

// ── Legacy hook (backward compat) ────────────────────────────
export function useInvoice() {
  const store = useInvoiceStore();
  return {
    items: store.activeItems,
    addItem: store.addItem,
    updateQty: store.updateQty,
    removeItem: store.removeItem,
    clear: store.discardActive,
    totalSYP: store.totalSYP,
    totalUSD: store.totalUSD,
  };
}
