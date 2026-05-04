import { Invoice } from "@/context/AppContext";
import { formatOld, formatNew, formatUsd, arabicDate } from "@/lib/utils";

interface InvoiceDisplayProps {
  invoice: Invoice;
  showPrint?: boolean;
}

export default function InvoiceDisplay({ invoice, showPrint = false }: InvoiceDisplayProps) {
  const handlePrint = () => window.print();

  return (
    <div className="font-mono" style={{ fontFamily: "'Cairo', monospace", direction: "rtl" }}>
      {showPrint && (
        <div className="no-print mb-4 flex gap-2">
          <button
            onClick={handlePrint}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            🖨️ طباعة الفاتورة
          </button>
        </div>
      )}

      {/* Invoice Box */}
      <div className="bg-white rounded-xl border-2 border-border p-5 shadow-sm print-invoice" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="text-center mb-3">
          <div className="text-2xl mb-1">🏪</div>
          <div className="font-bold text-lg">مجاهد للتجارة</div>
          <div className="text-xs text-muted-foreground">برمجة وتطوير: نداء الرحمن عبّود</div>
        </div>

        <div className="border-t-2 border-dashed border-muted-foreground/30 my-3" />

        {/* Invoice Info */}
        <div className="mb-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">رقم الفاتورة:</span>
            <span className="font-bold">فاتورة رقم {invoice.number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">اسم الشخص:</span>
            <span className="font-medium">{invoice.customerName}</span>
          </div>
          {invoice.notes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ملاحظات:</span>
              <span className="font-medium text-green-700">{invoice.notes}</span>
            </div>
          )}
        </div>

        <div className="border-t-2 border-border my-3" />

        {/* Items */}
        <div className="space-y-3 mb-3">
          {invoice.items.map((item, index) => (
            <div key={item.id}>
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm">
                  •{index + 1} : {item.product.name} × {item.quantity}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                <span>{formatOld(item.product.priceOld)} للوحدة</span>
                <span>|</span>
                <span>{formatNew(item.product.priceNew)} للوحدة</span>
                <span>|</span>
                <span>{formatUsd(item.product.priceUsd)}</span>
              </div>
              <div className="text-sm font-medium mt-0.5 flex flex-wrap gap-x-3">
                <span className="text-primary">{formatOld(item.totalOld)}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-blue-700">{formatNew(item.totalNew)}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-green-700">{formatUsd(item.totalUsd)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-border my-3" />

        {/* Total */}
        <div className="mb-3">
          <div className="font-bold text-base mb-2">💰 الإجمالي:</div>
          <div className="space-y-1 text-sm font-medium">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الليرة السورية القديمة:</span>
              <span className="text-primary font-bold">{formatOld(invoice.totalOld)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الليرة السورية الجديدة:</span>
              <span className="text-blue-700 font-bold">{formatNew(invoice.totalNew)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الدولار الأمريكي:</span>
              <span className="text-green-700 font-bold">{formatUsd(invoice.totalUsd)}</span>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-muted-foreground/30 my-3" />

        {/* Exchange Rate */}
        <div className="text-xs text-muted-foreground mb-2">
          💱 سعر الصرف: {new Intl.NumberFormat("ar-SY").format(invoice.exchangeRateOld)} ل.س.ق أو {invoice.exchangeRateNew} ل.س.ج للدولار
        </div>

        {/* Date */}
        <div className="text-xs text-muted-foreground mb-3">
          📅 {arabicDate(new Date(invoice.date))}
        </div>

        <div className="border-t-2 border-border my-3" />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <div>🏪 مصدرة عن تطبيق "مجاهد للتجارة"</div>
          <div>💻 برمجة وتطوير: نداء الرحمن عبّود</div>
        </div>
      </div>
    </div>
  );
}
