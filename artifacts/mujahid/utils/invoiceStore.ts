import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

const STORE_KEY = '@mujahid:invoices_v3';

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

export type StatsResult = {
  count: number;
  totalSYP: number;
  totalUSD: number;
  avgSYP: number;
  invoices: SavedInvoice[];
};

type StoreState = {
  activeItems: InvoiceItem[];
  activeName: string;
  activeNote: string;
  activeDiscountPct: number;
  activeDiscountFixed: number;
  activeNumber: number;
  savedInvoices: SavedInvoice[];
  nextNumber: number;
  isLoaded: boolean;
};

let _state: StoreState = {
  activeItems: [],
  activeName: '',
  activeNote: '',
  activeDiscountPct: 0,
  activeDiscountFixed: 0,
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
        AsyncStorage.getItem('@mujahid:invoices_v2').then((old) => {
          if (old) {
            const parsed = JSON.parse(old);
            _state = {
              ..._state,
              savedInvoices: parsed.savedInvoices || [],
              nextNumber: parsed.nextNumber || 1,
              activeNumber: parsed.nextNumber || 1,
              isLoaded: true,
            };
            notify();
          }
        }).catch(() => {});
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

function applyDiscount(raw: number, pct: number, fixed: number): number {
  return Math.max(0, raw * (1 - pct / 100) - fixed);
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

  setName(name: string) {
    _state = { ..._state, activeName: name };
    notify();
  },

  setNote(note: string) {
    _state = { ..._state, activeNote: note };
    notify();
  },

  setDiscount(pct: number, fixed: number) {
    _state = {
      ..._state,
      activeDiscountPct: Math.min(100, Math.max(0, pct)),
      activeDiscountFixed: Math.max(0, fixed),
    };
    notify();
  },

  discardActive() {
    _state = {
      ..._state,
      activeItems: [],
      activeName: '',
      activeNote: '',
      activeDiscountPct: 0,
      activeDiscountFixed: 0,
    };
    notify();
  },

  saveActive(): SavedInvoice | null {
    if (_state.activeItems.length === 0) return null;
    const rawSYP = calcTotal(_state.activeItems, 'SYP');
    const rawUSD = calcTotal(_state.activeItems, 'USD');
    const finalSYP = applyDiscount(rawSYP, _state.activeDiscountPct, _state.activeDiscountFixed);
    const finalUSD = rawSYP > 0 ? rawUSD * (finalSYP / rawSYP) : rawUSD;

    const invoice: SavedInvoice = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      number: _state.activeNumber,
      name: _state.activeName.trim() || undefined,
      items: [..._state.activeItems],
      createdAt: new Date().toISOString(),
      totalSYP: rawSYP,
      totalUSD: rawUSD,
      note: _state.activeNote.trim() || undefined,
      discountPct: _state.activeDiscountPct > 0 ? _state.activeDiscountPct : undefined,
      discountFixed: _state.activeDiscountFixed > 0 ? _state.activeDiscountFixed : undefined,
      finalTotalSYP: finalSYP,
      finalTotalUSD: finalUSD,
    };
    const nextNum = _state.nextNumber + 1;
    _state = {
      ..._state,
      savedInvoices: [invoice, ..._state.savedInvoices],
      activeItems: [],
      activeName: '',
      activeNote: '',
      activeDiscountPct: 0,
      activeDiscountFixed: 0,
      activeNumber: nextNum,
      nextNumber: nextNum,
    };
    persist().catch(() => {});
    notify();
    return invoice;
  },

  duplicateInvoice(id: string) {
    const inv = _state.savedInvoices.find((i) => i.id === id);
    if (!inv) return;
    _state = {
      ..._state,
      activeItems: [...inv.items],
      activeName: inv.name || '',
      activeNote: inv.note || '',
      activeDiscountPct: inv.discountPct || 0,
      activeDiscountFixed: inv.discountFixed || 0,
    };
    notify();
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
      activeName: '',
      activeNote: '',
      activeDiscountPct: 0,
      activeDiscountFixed: 0,
      savedInvoices: [],
      nextNumber: 1,
      activeNumber: 1,
      isLoaded: true,
    };
    persist().catch(() => {});
    notify();
  },

  getStats(period: StatsPeriod): StatsResult {
    const now = new Date();
    const start = new Date();
    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    const filtered = _state.savedInvoices.filter(
      (inv) => new Date(inv.createdAt) >= start
    );
    const totalSYP = filtered.reduce(
      (s, i) => s + (i.finalTotalSYP ?? i.totalSYP),
      0
    );
    const totalUSD = filtered.reduce(
      (s, i) => s + (i.finalTotalUSD ?? i.totalUSD),
      0
    );
    return {
      count: filtered.length,
      totalSYP,
      totalUSD,
      avgSYP: filtered.length > 0 ? totalSYP / filtered.length : 0,
      invoices: filtered,
    };
  },

  getActiveFinalSYP(): number {
    const raw = calcTotal(_state.activeItems, 'SYP');
    return applyDiscount(raw, _state.activeDiscountPct, _state.activeDiscountFixed);
  },

  getActiveFinalUSD(): number {
    const raw = calcTotal(_state.activeItems, 'USD');
    const rawSYP = calcTotal(_state.activeItems, 'SYP');
    const finalSYP = applyDiscount(rawSYP, _state.activeDiscountPct, _state.activeDiscountFixed);
    return rawSYP > 0 ? raw * (finalSYP / rawSYP) : raw;
  },

  getItems(): InvoiceItem[] {
    return _state.activeItems;
  },

  clear() {
    _state = { ..._state, activeItems: [], activeName: '', activeNote: '', activeDiscountPct: 0, activeDiscountFixed: 0 };
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

export function useInvoiceStore() {
  const [state, setState] = useState<StoreState>(() => invoiceStore.getState());

  useEffect(() => {
    loadInvoiceStore();
    const unsub = invoiceStore.subscribe(() =>
      setState({ ...invoiceStore.getState() })
    );
    return unsub;
  }, []);

  const rawSYP = invoiceStore.getTotalSYP(state.activeItems);
  const rawUSD = invoiceStore.getTotalUSD(state.activeItems);
  const finalSYP = invoiceStore.getActiveFinalSYP();
  const finalUSD = invoiceStore.getActiveFinalUSD();

  return {
    state,
    activeItems: state.activeItems,
    activeName: state.activeName,
    activeNote: state.activeNote,
    activeDiscountPct: state.activeDiscountPct,
    activeDiscountFixed: state.activeDiscountFixed,
    savedInvoices: state.savedInvoices,
    activeNumber: state.activeNumber,
    isLoaded: state.isLoaded,
    totalSYP: rawSYP,
    totalUSD: rawUSD,
    finalTotalSYP: finalSYP,
    finalTotalUSD: finalUSD,
    addItem: invoiceStore.addItem.bind(invoiceStore),
    updateQty: invoiceStore.updateQty.bind(invoiceStore),
    removeItem: invoiceStore.removeItem.bind(invoiceStore),
    setName: invoiceStore.setName.bind(invoiceStore),
    setNote: invoiceStore.setNote.bind(invoiceStore),
    setDiscount: invoiceStore.setDiscount.bind(invoiceStore),
    saveActive: invoiceStore.saveActive.bind(invoiceStore),
    discardActive: invoiceStore.discardActive.bind(invoiceStore),
    deleteSaved: invoiceStore.deleteSaved.bind(invoiceStore),
    duplicateInvoice: invoiceStore.duplicateInvoice.bind(invoiceStore),
    clearAll: invoiceStore.clearAll.bind(invoiceStore),
    getStats: invoiceStore.getStats.bind(invoiceStore),
  };
}

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
