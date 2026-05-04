import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatOld, formatNew, formatUsd } from "@/lib/utils";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput";

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newPriceOld, setNewPriceOld] = useState(0);
  const [newPriceNew, setNewPriceNew] = useState(0);
  const [newPriceUsd, setNewPriceUsd] = useState(0);

  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editPriceOld, setEditPriceOld] = useState(0);
  const [editPriceNew, setEditPriceNew] = useState(0);
  const [editPriceUsd, setEditPriceUsd] = useState(0);

  const handleAdd = () => {
    if (!newName.trim()) { alert("أدخل اسم المنتج"); return; }
    addProduct({ name: newName, unit: newUnit, priceOld: newPriceOld, priceNew: newPriceNew, priceUsd: newPriceUsd });
    setNewName(""); setNewUnit(""); setNewPriceOld(0); setNewPriceNew(0); setNewPriceUsd(0);
    setShowAdd(false);
  };

  const startEdit = (id: string) => {
    const p = products.find((p) => p.id === id)!;
    setEditingId(id);
    setEditName(p.name);
    setEditUnit(p.unit || "");
    setEditPriceOld(p.priceOld);
    setEditPriceNew(p.priceNew);
    setEditPriceUsd(p.priceUsd);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateProduct(editingId, { name: editName, unit: editUnit, priceOld: editPriceOld, priceNew: editPriceNew, priceUsd: editPriceUsd });
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل تريد حذف "${name}"؟`)) deleteProduct(id);
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">إدارة المنتجات</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm"
        >
          <Plus size={16} />
          منتج جديد
        </button>
      </div>

      {/* Add Product Form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-primary/20 p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-sm">إضافة منتج جديد</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">اسم المنتج *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="اسم المنتج"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-right"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">الوحدة</label>
              <input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="كيس / لتر / علبة..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-right"
              />
            </div>
          </div>
          <CurrencyInput
            valueOld={newPriceOld} valueNew={newPriceNew} valueUsd={newPriceUsd}
            onChangeOld={setNewPriceOld} onChangeNew={setNewPriceNew} onChangeUsd={setNewPriceUsd}
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5">
              <Check size={15} /> حفظ
            </button>
            <button onClick={() => setShowAdd(false)} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
              <X size={15} /> إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-muted-foreground">
          <div className="text-4xl mb-3">📦</div>
          <p>لا توجد منتجات. أضف منتجاً جديداً.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((prod) => (
            <div key={prod.id} className="bg-white rounded-xl border border-border p-4 shadow-sm">
              {editingId === prod.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">اسم المنتج</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-right" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">الوحدة</label>
                      <input value={editUnit} onChange={(e) => setEditUnit(e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-right" />
                    </div>
                  </div>
                  <CurrencyInput
                    valueOld={editPriceOld} valueNew={editPriceNew} valueUsd={editPriceUsd}
                    onChangeOld={setEditPriceOld} onChangeNew={setEditPriceNew} onChangeUsd={setEditPriceUsd}
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">
                      <Check size={14} /> حفظ
                    </button>
                    <button onClick={() => setEditingId(null)} className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                      <X size={14} /> إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold">{prod.name} {prod.unit && <span className="text-muted-foreground text-sm font-normal">({prod.unit})</span>}</div>
                    <div className="text-sm mt-1 flex flex-wrap gap-x-3">
                      <span className="text-primary font-medium">{formatOld(prod.priceOld)}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-blue-700 font-medium">{formatNew(prod.priceNew)}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-green-700 font-medium">{formatUsd(prod.priceUsd)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(prod.id)} className="p-2 text-primary hover:bg-primary/8 rounded-lg transition-colors">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(prod.id, prod.name)} className="p-2 text-destructive hover:bg-destructive/8 rounded-lg transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
