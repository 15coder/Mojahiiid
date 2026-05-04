import { useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import {
  Download, Upload, Trash2, CheckCircle2, AlertTriangle,
  FileJson, FolderOpen, Clock, HardDrive, RefreshCw, ShieldCheck
} from "lucide-react";

const STORAGE_KEY = "mujahid_trading_data";

function getStorageSize(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || "";
    const bytes = new Blob([raw]).size;
    if (bytes < 1024) return `${bytes} بايت`;
    return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  } catch {
    return "—";
  }
}

function getLastModified(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "لا توجد بيانات";
    const data = JSON.parse(raw);
    const invoices = data.invoices || [];
    if (invoices.length === 0) return "لا توجد فواتير";
    const latest = Math.max(...invoices.map((i: { createdAt: number }) => i.createdAt));
    return new Date(latest).toLocaleDateString("ar-SY", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getBackupFileName(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `mujahid-trading-backup-${y}-${m}-${d}.json`;
}

export default function Settings() {
  const { exchangeRateOld, exchangeRateNew, setExchangeRateOld, setExchangeRateNew } = useApp();
  const [rateOld, setRateOld] = useState(exchangeRateOld.toString());
  const [rateNew, setRateNew] = useState(exchangeRateNew.toString());
  const [rateSaved, setRateSaved] = useState(false);

  const [exportStatus, setExportStatus] = useState<"idle" | "done">("idle");
  const [importStatus, setImportStatus] = useState<"idle" | "done" | "error">("idle");
  const [importError, setImportError] = useState("");
  const [clearStatus, setClearStatus] = useState<"idle" | "confirm">("idle");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fileName = getBackupFileName();
  const storageSize = getStorageSize();
  const lastModified = getLastModified();

  const handleSaveRates = () => {
    const parsedOld = parseFloat(rateOld);
    const parsedNew = parseFloat(rateNew);
    if (!parsedOld || !parsedNew || parsedOld <= 0 || parsedNew <= 0) {
      alert("الرجاء إدخال أسعار صرف صحيحة");
      return;
    }
    setExchangeRateOld(parsedOld);
    setExchangeRateNew(parsedNew);
    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 2500);
  };

  const handleExport = () => {
    const raw = localStorage.getItem(STORAGE_KEY) || "{}";
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus("done");
    setTimeout(() => setExportStatus("idle"), 3000);
  };

  const processImport = (file: File) => {
    setImportStatus("idle");
    setImportError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        if (!data.products && !data.invoices) throw new Error("ملف غير صالح");
        localStorage.setItem(STORAGE_KEY, text);
        setImportStatus("done");
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setImportStatus("error");
        setImportError("الملف غير صالح أو تالف");
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImport(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImport(file);
  };

  const handleClearConfirm = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="text-xl font-bold">الإعدادات</h2>

      {/* ── Exchange Rates ── */}
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
          <span className="text-lg">💱</span>
          <div>
            <div className="font-bold text-sm">أسعار الصرف</div>
            <div className="text-xs text-muted-foreground">تؤثر على كل عمليات التحويل في التطبيق</div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 bg-muted/20 rounded-lg px-4 py-3">
              <span className="text-xs font-bold text-muted-foreground w-8 shrink-0">1 $</span>
              <span className="text-muted-foreground text-sm">=</span>
              <input
                type="number"
                value={rateOld}
                onChange={(e) => setRateOld(e.target.value)}
                className="flex-1 bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-right font-medium"
              />
              <span className="text-sm font-medium text-primary shrink-0">ل.س.ق</span>
            </div>
            <div className="flex items-center gap-3 bg-muted/20 rounded-lg px-4 py-3">
              <span className="text-xs font-bold text-muted-foreground w-8 shrink-0">1 $</span>
              <span className="text-muted-foreground text-sm">=</span>
              <input
                type="number"
                value={rateNew}
                onChange={(e) => setRateNew(e.target.value)}
                className="flex-1 bg-white border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-right font-medium"
              />
              <span className="text-sm font-medium text-blue-600 shrink-0">ل.س.ج</span>
            </div>
          </div>

          {/* Live preview row */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-primary/5 rounded-lg py-2 px-1">
              <div className="text-muted-foreground mb-0.5">1 دولار</div>
              <div className="font-bold text-primary">{new Intl.NumberFormat("ar-SY").format(parseFloat(rateOld) || 0)} ل.س.ق</div>
            </div>
            <div className="bg-blue-50 rounded-lg py-2 px-1">
              <div className="text-muted-foreground mb-0.5">1 دولار</div>
              <div className="font-bold text-blue-700">{new Intl.NumberFormat("ar-SY").format(parseFloat(rateNew) || 0)} ل.س.ج</div>
            </div>
            <div className="bg-muted/30 rounded-lg py-2 px-1">
              <div className="text-muted-foreground mb-0.5">نسبة التحويل</div>
              <div className="font-bold text-foreground">
                {parseFloat(rateNew) > 0
                  ? `÷ ${(parseFloat(rateOld) / parseFloat(rateNew)).toFixed(0)}`
                  : "—"}
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveRates}
            className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors ${
              rateSaved
                ? "bg-green-500 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {rateSaved ? <span className="flex items-center justify-center gap-2"><CheckCircle2 size={15} /> تم الحفظ!</span> : "حفظ أسعار الصرف"}
          </button>
        </div>
      </section>

      {/* ── Backup Section ── */}
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
          <ShieldCheck size={18} className="text-primary" />
          <div>
            <div className="font-bold text-sm">النسخ الاحتياطي واستعادة البيانات</div>
            <div className="text-xs text-muted-foreground">احفظ بياناتك أو استعدها من ملف سابق</div>
          </div>
        </div>

        {/* Storage info strip */}
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border border-b border-border">
          <div className="flex flex-col items-center py-3 px-2 gap-1">
            <HardDrive size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold">{storageSize}</span>
            <span className="text-[10px] text-muted-foreground">حجم البيانات</span>
          </div>
          <div className="flex flex-col items-center py-3 px-2 gap-1">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold text-center leading-tight">{lastModified}</span>
            <span className="text-[10px] text-muted-foreground">آخر تعديل</span>
          </div>
          <div className="flex flex-col items-center py-3 px-2 gap-1">
            <FolderOpen size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold">localStorage</span>
            <span className="text-[10px] text-muted-foreground">مكان التخزين</span>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Export card */}
          <div className="rounded-xl border border-border bg-muted/10 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
              <Download size={15} className="text-green-600" />
              <span className="font-semibold text-sm">تصدير النسخة الاحتياطية</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              {/* File path display */}
              <div className="bg-white border border-border rounded-lg px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-2">
                  <FileJson size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs font-mono font-bold text-foreground break-all">{fileName}</span>
                </div>
                <div className="flex items-center gap-2 pr-5">
                  <span className="text-[10px] text-muted-foreground">📂 مجلد التنزيلات في جهازك</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                يُصدَّر ملف JSON يحتوي على جميع الفواتير والمنتجات وإعدادات أسعار الصرف.
              </p>
              <button
                onClick={handleExport}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  exportStatus === "done"
                    ? "bg-green-500 text-white"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {exportStatus === "done"
                  ? <><CheckCircle2 size={15} /> تم التنزيل</>
                  : <><Download size={15} /> تنزيل النسخة الاحتياطية</>}
              </button>
            </div>
          </div>

          {/* Import card */}
          <div className="rounded-xl border border-border bg-muted/10 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
              <Upload size={15} className="text-blue-600" />
              <span className="font-semibold text-sm">استعادة من نسخة احتياطية</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                اختر ملف النسخة الاحتياطية (.json) لاستعادة البيانات. سيتم استبدال البيانات الحالية.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl py-6 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-border hover:border-blue-300 hover:bg-blue-50/40"
                }`}
              >
                <Upload size={22} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">اسحب الملف هنا أو اضغط للاختيار</p>
                <p className="text-xs text-muted-foreground mt-1">يقبل ملفات JSON فقط</p>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Expected filename hint */}
              <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
                <FileJson size={13} className="text-blue-500 shrink-0" />
                <span className="text-[10px] text-muted-foreground font-mono">mujahid-trading-backup-YYYY-MM-DD.json</span>
              </div>

              {importStatus === "done" && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                  <CheckCircle2 size={15} />
                  تم الاستعادة بنجاح! جاري إعادة التحميل...
                </div>
              )}
              {importStatus === "error" && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  <AlertTriangle size={15} />
                  {importError}
                </div>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-200 bg-red-50/30 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-red-200/60">
              <Trash2 size={15} className="text-red-500" />
              <span className="font-semibold text-sm text-red-700">منطقة الخطر</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                حذف كامل بيانات التطبيق من الجهاز — الفواتير والمنتجات والإعدادات. لا يمكن التراجع.
              </p>
              {clearStatus === "idle" ? (
                <button
                  onClick={() => setClearStatus("confirm")}
                  className="w-full border border-red-300 text-red-600 py-2.5 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                >
                  حذف جميع البيانات
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-red-700 text-center">هل أنت متأكد؟ لا يمكن التراجع!</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleClearConfirm}
                      className="bg-red-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                    >
                      نعم، احذف كل شيء
                    </button>
                    <button
                      onClick={() => setClearStatus("idle")}
                      className="border border-border py-2.5 rounded-lg text-sm font-bold hover:bg-muted/40 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── App Info ── */}
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
          <span className="text-lg">🏪</span>
          <div className="font-bold text-sm">معلومات التطبيق</div>
        </div>
        <div className="p-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">الاسم</span>
            <span className="font-bold">مجاهد للتجارة</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">التطوير</span>
            <span className="font-bold">نداء الرحمن عبّود</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">العملات المدعومة</span>
            <span className="font-medium">ل.س.ق · ل.س.ج · $</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">التخزين</span>
            <span className="font-medium">محلي على جهازك</span>
          </div>
        </div>
      </section>
    </div>
  );
}
