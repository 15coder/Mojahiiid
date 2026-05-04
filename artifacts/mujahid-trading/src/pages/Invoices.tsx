import { useState } from "react";
import { Link } from "wouter";
import { useApp } from "@/context/AppContext";
import { formatOld, formatNew, formatUsd, arabicDate } from "@/lib/utils";
import { Search, Trash2, Eye, Plus } from "lucide-react";

export default function Invoices() {
  const { invoices, deleteInvoice } = useApp();
  const [search, setSearch] = useState("");

  const filtered = invoices
    .filter(
      (inv) =>
        inv.customerName.includes(search) ||
        inv.number.toString().includes(search) ||
        inv.notes.includes(search)
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  const handleDelete = (id: string, num: number) => {
    if (confirm(`هل تريد حذف فاتورة رقم ${num}؟`)) {
      deleteInvoice(id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">سجل الفواتير</h2>
        <Link href="/calculator">
          <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm">
            <Plus size={16} />
            فاتورة جديدة
          </button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم العميل أو رقم الفاتورة..."
          className="w-full border border-border rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-right bg-white"
        />
      </div>

      {/* Total Summary */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-border p-3 text-center shadow-sm">
            <div className="text-xs text-muted-foreground mb-1">إجمالي ل.س.ق</div>
            <div className="font-bold text-primary text-xs">{formatOld(invoices.reduce((s, i) => s + i.totalOld, 0))}</div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 text-center shadow-sm">
            <div className="text-xs text-muted-foreground mb-1">إجمالي ل.س.ج</div>
            <div className="font-bold text-blue-700 text-xs">{formatNew(invoices.reduce((s, i) => s + i.totalNew, 0))}</div>
          </div>
          <div className="bg-white rounded-xl border border-border p-3 text-center shadow-sm">
            <div className="text-xs text-muted-foreground mb-1">إجمالي $</div>
            <div className="font-bold text-green-700 text-xs">{formatUsd(invoices.reduce((s, i) => s + i.totalUsd, 0))}</div>
          </div>
        </div>
      )}

      {/* Invoices List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted-foreground">
          <div className="text-4xl mb-3">📋</div>
          <p>{invoices.length === 0 ? "لا توجد فواتير بعد" : "لا توجد نتائج للبحث"}</p>
          {invoices.length === 0 && (
            <Link href="/calculator">
              <button className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
                إنشاء أول فاتورة
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold">فاتورة رقم {inv.number}</div>
                  <div className="text-sm text-muted-foreground">{inv.customerName}</div>
                  {inv.notes && <div className="text-xs text-green-700 mt-0.5">{inv.notes}</div>}
                  <div className="text-xs text-muted-foreground mt-0.5">{arabicDate(new Date(inv.date))}</div>
                </div>
                <div className="flex gap-1">
                  <Link href={`/invoice/${inv.id}`}>
                    <button className="p-2 text-primary hover:bg-primary/8 rounded-lg transition-colors">
                      <Eye size={16} />
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(inv.id, inv.number)}
                    className="p-2 text-destructive hover:bg-destructive/8 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground mb-2">
                {inv.items.map((item) => `${item.product.name} ×${item.quantity}`).join(" • ")}
              </div>

              <div className="bg-muted/40 rounded-lg p-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-primary font-bold">{formatOld(inv.totalOld)}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-blue-700 font-bold">{formatNew(inv.totalNew)}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-green-700 font-bold">{formatUsd(inv.totalUsd)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
