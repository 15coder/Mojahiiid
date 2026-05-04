import { useParams, useLocation } from "wouter";
import { useApp } from "@/context/AppContext";
import InvoiceDisplay from "@/components/InvoiceDisplay";
import { ArrowRight } from "lucide-react";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { invoices } = useApp();
  const [, navigate] = useLocation();

  const invoice = invoices.find((inv) => inv.id === id);

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-muted-foreground mb-4">الفاتورة غير موجودة</p>
        <button
          onClick={() => navigate("/invoices")}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90"
        >
          العودة للفواتير
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/invoices")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-4 no-print"
      >
        <ArrowRight size={16} />
        العودة للفواتير
      </button>
      <InvoiceDisplay invoice={invoice} showPrint />
    </div>
  );
}
