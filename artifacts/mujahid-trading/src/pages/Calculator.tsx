import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/context/AppContext";
import { InvoiceItem, Product } from "@/context/AppContext";
import { formatOld, formatNew, formatUsd, arabicDate } from "@/lib/utils";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput";
import InvoiceDisplay from "@/components/InvoiceDisplay";

interface DraftItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  priceOld: number;
  priceNew: number;
  priceUsd: number;
  unit: string;
}

export default function Calculator() {
  const { products, invoices, addInvoice, exchangeRateOld, exchangeRateNew, convertFromOld, convertFromNew, convertFromUsd } = useApp();
  const [, navigate] = useLocation();

  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);

  const addItem = () => {
    const newItem: DraftItem = {
      id: Date.now().toString(),
      productId: "",
      productName: "",
      quantity: 1,
      priceOld: 0,
      priceNew: 0,
      priceUsd: 0,
      unit: "",
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, updates: Partial<DraftItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const selectProduct = (itemId: string, product: Product) => {
    updateItem(itemId, {
      productId: product.id,
      productName: product.name,
      priceOld: product.priceOld,
      priceNew: product.priceNew,
      priceUsd: product.priceUsd,
      unit: product.unit || "",
    });
  };

  const handlePriceOldChange = (itemId: string, val: number) => {
    const conv = convertFromOld(val);
    updateItem(itemId, { priceOld: val, priceNew: conv.new, priceUsd: conv.usd });
  };

  const handlePriceNewChange = (itemId: string, val: number) => {
    const conv = convertFromNew(val);
    updateItem(itemId, { priceNew: val, priceOld: conv.old, priceUsd: conv.usd });
  };

  const handlePriceUsdChange = (itemId: string, val: number) => {
    const conv = convertFromUsd(val);
    updateItem(itemId, { priceUsd: val, priceOld: conv.old, priceNew: conv.new });
  };

  // Computed totals
  const totalOld = items.reduce((s, i) => s + i.priceOld * i.quantity, 0);
  const totalNew = items.reduce((s, i) => s + i.priceNew * i.quantity, 0);
  const totalUsd = items.reduce((s, i) => s + i.priceUsd * i.quantity, 0);

  const handleSave = () => {
    if (!customerName.trim()) {
      alert("الرجاء إدخال اسم الشخص");
      return;
    }
    if (items.length === 0) {
      alert("الرجاء إضافة منتج واحد على الأقل");
      return;
    }

    const invoiceItems: InvoiceItem[] = items.map((item) => ({
      id: item.id,
      product: {
        id: item.productId || item.id,
        name: item.productName || "منتج",
        priceOld: item.priceOld,
        priceNew: item.priceNew,
        priceUsd: item.priceUsd,
        unit: item.unit,
      },
      quantity: item.quantity,
      totalOld: item.priceOld * item.quantity,
      totalNew: item.priceNew * item.quantity,
      totalUsd: item.priceUsd * item.quantity,
    }));

    const id = addInvoice({
      number: invoices.length + 1,
      customerName,
      notes,
      items: invoiceItems,
      totalOld,
      totalNew,
      totalUsd,
      exchangeRateOld,
      exchangeRateNew,
      date: new Date().toISOString(),
    });

    setSavedInvoiceId(id);
    setPreviewMode(true);
  };

  if (previewMode && savedInvoiceId) {
    const savedInvoice = invoices.find((inv) => inv.id === savedInvoiceId);
    if (savedInvoice) {
      return (
        <div>
          <div className="mb-4 flex gap-2 no-print">
            <button
              onClick={() => { setPreviewMode(false); setSavedInvoiceId(null); setCustomerName(""); setNotes(""); setItems([]); }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90"
            >
              ➕ فاتورة جديدة
            </button>
            <button
              onClick={() => navigate(`/invoices`)}
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90"
            >
              📋 كل الفواتير
            </button>
          </div>
          <InvoiceDisplay invoice={savedInvoice} showPrint />
        </div>
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Calculator size={20} className="text-primary" />
        <h2 className="text-xl font-bold">إنشاء فاتورة جديدة</h2>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">معلومات العميل</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">اسم الشخص *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="أدخل اسم العميل"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">ملاحظات</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: مقبوض كامل"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">المنتجات</h3>
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:opacity-90 transition"
          >
            <Plus size={16} />
            إضافة منتج
          </button>
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-3xl mb-2">🛒</div>
            <p className="text-sm">لا توجد منتجات. اضغط "إضافة منتج" للبدء.</p>
          </div>
        )}

        {items.map((item, idx) => (
          <div key={item.id} className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-bold text-primary">• {idx + 1}</span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-destructive hover:opacity-70 transition p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Product selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">اسم المنتج</label>
                <div className="relative">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value);
                      if (prod) selectProduct(item.id, prod);
                      else updateItem(item.id, { productId: "", productName: "" });
                    }}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white appearance-none text-right pr-8"
                  >
                    <option value="">اختر منتجاً أو أدخل يدوياً</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                {!item.productId && (
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(e) => updateItem(item.id, { productName: e.target.value })}
                    placeholder="أو اكتب اسم المنتج يدوياً"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">الكمية</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
                />
              </div>
            </div>

            {/* Price inputs */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">سعر الوحدة</label>
              <CurrencyInput
                valueOld={item.priceOld}
                valueNew={item.priceNew}
                valueUsd={item.priceUsd}
                onChangeOld={(v) => handlePriceOldChange(item.id, v)}
                onChangeNew={(v) => handlePriceNewChange(item.id, v)}
                onChangeUsd={(v) => handlePriceUsdChange(item.id, v)}
              />
            </div>

            {/* Item totals */}
            {(item.priceOld > 0 || item.priceNew > 0 || item.priceUsd > 0) && (
              <div className="bg-muted/50 rounded-lg p-2 text-xs flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-muted-foreground">الإجمالي:</span>
                <span className="text-primary font-bold">{formatOld(item.priceOld * item.quantity)}</span>
                <span className="text-blue-700 font-bold">{formatNew(item.priceNew * item.quantity)}</span>
                <span className="text-green-700 font-bold">{formatUsd(item.priceUsd * item.quantity)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total Summary */}
      {items.length > 0 && (
        <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4 shadow-sm">
          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
            <span>💰</span> الإجمالي الكلي
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">ل.س.ق</div>
              <div className="font-bold text-primary text-sm">{formatOld(totalOld)}</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">ل.س.ج</div>
              <div className="font-bold text-blue-700 text-sm">{formatNew(totalNew)}</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">دولار</div>
              <div className="font-bold text-green-700 text-sm">{formatUsd(totalUsd)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={items.length === 0 || !customerName.trim()}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-base hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
      >
        💾 حفظ وعرض الفاتورة
      </button>
    </div>
  );
}

