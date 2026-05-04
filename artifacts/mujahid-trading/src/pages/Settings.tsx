import { useState } from "react";
import { useApp } from "@/context/AppContext";

export default function Settings() {
  const { exchangeRateOld, exchangeRateNew, setExchangeRateOld, setExchangeRateNew } = useApp();
  const [rateOld, setRateOld] = useState(exchangeRateOld.toString());
  const [rateNew, setRateNew] = useState(exchangeRateNew.toString());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const parsedOld = parseFloat(rateOld);
    const parsedNew = parseFloat(rateNew);
    if (!parsedOld || !parsedNew || parsedOld <= 0 || parsedNew <= 0) {
      alert("الرجاء إدخال أسعار صرف صحيحة");
      return;
    }
    setExchangeRateOld(parsedOld);
    setExchangeRateNew(parsedNew);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-bold">الإعدادات</h2>

      {/* Exchange Rates */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
        <h3 className="font-bold">💱 أسعار الصرف</h3>
        <p className="text-xs text-muted-foreground">
          حدد كم يساوي الدولار الأمريكي الواحد بالليرة السورية القديمة والجديدة.
          هذه القيم تؤثر على جميع عمليات التحويل في التطبيق.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              سعر الدولار بالليرة السورية القديمة (ل.س.ق)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">1$ =</span>
              <input
                type="number"
                value={rateOld}
                onChange={(e) => setRateOld(e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
              />
              <span className="text-sm text-muted-foreground">ل.س.ق</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              سعر الدولار بالليرة السورية الجديدة (ل.س.ج)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">1$ =</span>
              <input
                type="number"
                value={rateNew}
                onChange={(e) => setRateNew(e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-right"
              />
              <span className="text-sm text-muted-foreground">ل.س.ج</span>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
          <div className="font-medium mb-1">معاينة التحويل:</div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">1 دولار يساوي:</span>
            <span className="font-bold text-primary">
              {new Intl.NumberFormat("ar-SY").format(parseFloat(rateOld) || 0)} ل.س.ق
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">1 دولار يساوي:</span>
            <span className="font-bold text-blue-700">
              {new Intl.NumberFormat("ar-SY").format(parseFloat(rateNew) || 0)} ل.س.ج
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">العلاقة بين القديمة والجديدة:</span>
            <span className="font-bold text-muted-foreground">
              {parseFloat(rateNew) > 0 ? `1 ل.س.ج = ${(parseFloat(rateOld) / parseFloat(rateNew)).toFixed(0)} ل.س.ق` : "—"}
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition ${
            saved
              ? "bg-green-500 text-white"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {saved ? "✅ تم الحفظ!" : "💾 حفظ الإعدادات"}
        </button>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
        <h3 className="font-bold mb-3">ℹ️ معلومات التطبيق</h3>
        <div className="text-sm space-y-2 text-muted-foreground">
          <p>🏪 <strong className="text-foreground">مجاهد للتجارة</strong></p>
          <p>💻 برمجة وتطوير: <strong className="text-foreground">نداء الرحمن عبّود</strong></p>
          <p className="text-xs mt-3">
            التطبيق يدعم ثلاث عملات: الليرة السورية القديمة (ل.س.ق)، 
            الليرة السورية الجديدة (ل.س.ج)، والدولار الأمريكي ($).
            جميع البيانات محفوظة محلياً على جهازك.
          </p>
        </div>
      </div>
    </div>
  );
}
