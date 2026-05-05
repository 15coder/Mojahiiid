import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

export type InvoiceItem = {
  productId: string;
  name: string;
  unitPriceSYP: number;
  qty: number;
};

export type SavedInvoice = {
  id: string;
  number: number;
  customerName: string;
  notes: string;
  items: InvoiceItem[];
  totalSYP: number;
  exchangeRate: number;
  createdAt: string;
};

export type StatsPeriod = 'today' | 'week' | 'month';

export type StatsResult = {
  count: number;
  totalSYP: number;
  avgSYP: number;
  invoices: SavedInvoice[];
};

const SAVED_KEY = 'invoice_saved_v2';
const DRAFT_KEY = 'invoice_draft_v2';
const COUNTER_KEY = 'invoice_counter_v2';

type DraftState = {
  customerName: string;
  notes: string;
  items: InvoiceItem[];
  number: number;
};

const INITIAL_DRAFT: DraftState = {
  customerName: '',
  notes: '',
  items: [],
  number: 1,
};

let _draft: DraftState = { ...INITIAL_DRAFT };
let _saved: SavedInvoice[] = [];
let _isLoaded = false;
const _subs = new Set<() => void>();

function _notify() {
  _subs.forEach(fn => fn());
}

async function _persistDraft() {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(_draft));
  } catch {}
}

export const invoiceStore = {
  subscribe(fn: () => void) {
    _subs.add(fn);
    return () => _subs.delete(fn);
  },

  isLoaded() { return _isLoaded; },
  getDraft() { return _draft; },
  getSaved() { return _saved; },

  async load() {
    if (_isLoaded) return;
    try {
      const [draftJson, savedJson, counterStr] = await Promise.all([
        AsyncStorage.getItem(DRAFT_KEY),
        AsyncStorage.getItem(SAVED_KEY),
        AsyncStorage.getItem(COUNTER_KEY),
      ]);
      if (savedJson) _saved = JSON.parse(savedJson);
      const counter = counterStr ? parseInt(counterStr, 10) : _saved.length + 1;
      _draft = draftJson
        ? { ...JSON.parse(draftJson), number: counter }
        : { ...INITIAL_DRAFT, number: counter };
    } catch {}
    _isLoaded = true;
    _notify();
  },

  addItem(item: Omit<InvoiceItem, 'qty'>) {
    const idx = _draft.items.findIndex(i => i.productId === item.productId);
    if (idx >= 0) {
      const items = [..._draft.items];
      items[idx] = { ...items[idx], qty: items[idx].qty + 1 };
      _draft = { ..._draft, items };
    } else {
      _draft = { ..._draft, items: [..._draft.items, { ...item, qty: 1 }] };
    }
    _notify();
    _persistDraft();
  },

  updateQty(productId: string, qty: number) {
    if (qty <= 0) {
      _draft = { ..._draft, items: _draft.items.filter(i => i.productId !== productId) };
    } else {
      _draft = { ..._draft, items: _draft.items.map(i => i.productId === productId ? { ...i, qty } : i) };
    }
    _notify();
    _persistDraft();
  },

  removeItem(productId: string) {
    _draft = { ..._draft, items: _draft.items.filter(i => i.productId !== productId) };
    _notify();
    _persistDraft();
  },

  setCustomerName(name: string) {
    _draft = { ..._draft, customerName: name };
    _notify();
    _persistDraft();
  },

  setNotes(notes: string) {
    _draft = { ..._draft, notes };
    _notify();
    _persistDraft();
  },

  async saveInvoice(exchangeRate: number): Promise<SavedInvoice> {
    const totalSYP = _draft.items.reduce((s, i) => s + i.unitPriceSYP * i.qty, 0);
    const inv: SavedInvoice = {
      id: `${Date.now()}`,
      number: _draft.number,
      customerName: _draft.customerName,
      notes: _draft.notes,
      items: [..._draft.items],
      totalSYP,
      exchangeRate,
      createdAt: new Date().toISOString(),
    };
    _saved = [inv, ..._saved];
    const next = _draft.number + 1;
    _draft = { ...INITIAL_DRAFT, number: next };
    _notify();
    await Promise.all([
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify(_saved)),
      AsyncStorage.setItem(COUNTER_KEY, String(next)),
      AsyncStorage.removeItem(DRAFT_KEY),
    ]);
    return inv;
  },

  newInvoice() {
    const next = _draft.number + 1;
    _draft = { ...INITIAL_DRAFT, number: next };
    AsyncStorage.setItem(COUNTER_KEY, String(next)).catch(() => {});
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    _notify();
  },

  deleteSaved(id: string) {
    _saved = _saved.filter(i => i.id !== id);
    AsyncStorage.setItem(SAVED_KEY, JSON.stringify(_saved)).catch(() => {});
    _notify();
  },

  clearAll() {
    _saved = [];
    AsyncStorage.setItem(SAVED_KEY, JSON.stringify([])).catch(() => {});
    _notify();
  },

  async restoreInvoices(invoices: SavedInvoice[]) {
    _saved = invoices;
    const maxNum = invoices.reduce((max, inv) => Math.max(max, inv.number), 0);
    const next = maxNum + 1;
    _draft = { ...INITIAL_DRAFT, number: next };
    await Promise.all([
      AsyncStorage.setItem(SAVED_KEY, JSON.stringify(_saved)),
      AsyncStorage.setItem(COUNTER_KEY, String(next)),
      AsyncStorage.removeItem(DRAFT_KEY),
    ]);
    _notify();
  },

  getStats(period: StatsPeriod): StatsResult {
    const now = new Date();
    const filtered = _saved.filter(inv => {
      const d = new Date(inv.createdAt);
      if (period === 'today') return d.toDateString() === now.toDateString();
      if (period === 'week') return (now.getTime() - d.getTime()) / 86400000 <= 7;
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalSYP = filtered.reduce((s, i) => s + i.totalSYP, 0);
    return {
      count: filtered.length,
      totalSYP,
      avgSYP: filtered.length ? Math.round(totalSYP / filtered.length) : 0,
      invoices: filtered,
    };
  },
};

export function useInvoiceStore() {
  const [tick, setTick] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const unsub = invoiceStore.subscribe(() => {
      if (alive.current) setTick(t => t + 1);
    });
    if (!invoiceStore.isLoaded()) invoiceStore.load();
    return () => {
      alive.current = false;
      unsub();
    };
  }, []);

  const draft = invoiceStore.getDraft();
  const saved = invoiceStore.getSaved();

  return {
    tick,
    isLoaded: invoiceStore.isLoaded(),
    items: draft.items,
    customerName: draft.customerName,
    notes: draft.notes,
    number: draft.number,
    totalSYP: draft.items.reduce((s, i) => s + i.unitPriceSYP * i.qty, 0),
    savedInvoices: saved,
    addItem: (item: Omit<InvoiceItem, 'qty'>) => invoiceStore.addItem(item),
    updateQty: (id: string, qty: number) => invoiceStore.updateQty(id, qty),
    removeItem: (id: string) => invoiceStore.removeItem(id),
    setCustomerName: (name: string) => invoiceStore.setCustomerName(name),
    setNotes: (notes: string) => invoiceStore.setNotes(notes),
    saveInvoice: (rate: number) => invoiceStore.saveInvoice(rate),
    newInvoice: () => invoiceStore.newInvoice(),
    deleteSaved: (id: string) => invoiceStore.deleteSaved(id),
    clearAll: () => invoiceStore.clearAll(),
    restoreInvoices: (invoices: SavedInvoice[]) => invoiceStore.restoreInvoices(invoices),
    getStats: (p: StatsPeriod) => invoiceStore.getStats(p),
  };
}
