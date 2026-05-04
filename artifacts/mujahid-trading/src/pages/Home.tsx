import { Link } from "wouter";
import { useApp } from "@/context/AppContext";
import { formatOld, formatNew, formatUsd, arabicDate } from "@/lib/utils";
import { Calculator, FileText, Package, Plus } from "lucide-react";

export default function Home() {
  const { invoices, products, exchangeRateOld, exchangeRateNew } = useApp();

  const totalSalesOld = invoices.reduce((s, inv) => s + inv.totalOld, 0);
  const totalSalesNew = invoices.reduce((s, inv) => s + inv.totalNew, 0);
  const totalSalesUsd = invoices.reduce((s, inv) => s + inv.totalUsd, 0);
  const recentInvoices = [...invoices].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-primary text-primary-foreground rounded-xl p-5 shadow">
        <h2 className="text-xl font-bold mb-1">مرحباً بك 👋</h2>
        <p className="text-sm opacity-80">تطبيق مجاهد للتجارة - إدارة الفواتير والمبيعات</p>
        <div className="mt-3 text-xs opacity-70">
          💱 سعر الصرف: {new Intl.NumberFormat("ar-SY").format(exchangeRateOld)} ل.س.ق = {exchangeRateNew} ل.س.ج = 1$
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="عدد الفواتير" value={invoices.length.toString()} icon="📄" />
        <StatCard label="عدد المنتجات" value={products.length.toString()} icon="📦" />
        <StatCard label="إجمالي المبيعات (ق)" value={formatOld(totalSalesOld)} icon="💰" small />
        <StatCard label="إجمالي ($)" value={formatUsd(totalSalesUsd)} icon="💵" small />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/calculator">
          <div className="bg-white border-2 border-primary/20 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/50 hover:shadow-md transition group">
            <div className="bg-primary/10 text-primary rounded-lg p-2.5 group-hover:bg-primary group-hover:text-white transition">
              <Calculator size={22} />
            </div>
            <div>
              <div className="font-bold text-sm">فاتورة جديدة</div>
              <div className="text-xs text-muted-foreground">إنشاء وحساب فاتورة</div>
            </div>
          </div>
        </Link>
        <Link href="/invoices">
          <div className="bg-white border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-blue-400 hover:shadow-md transition group">
            <div className="bg-blue-50 text-blue-600 rounded-lg p-2.5 group-hover:bg-blue-600 group-hover:text-white transition">
              <FileText size={22} />
            </div>
            <div>
              <div className="font-bold text-sm">عرض الفواتير</div>
              <div className="text-xs text-muted-foreground">سجل جميع الفواتير</div>
            </div>
          </div>
        </Link>
        <Link href="/products">
          <div className="bg-white border-2 border-green-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-green-400 hover:shadow-md transition group">
            <div className="bg-green-50 text-green-600 rounded-lg p-2.5 group-hover:bg-green-600 group-hover:text-white transition">
              <Package size={22} />
            </div>
            <div>
              <div className="font-bold text-sm">إدارة المنتجات</div>
              <div className="text-xs text-muted-foreground">أسعار وقائمة المنتجات</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Invoices */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-base">آخر الفواتير</h3>
          <Link href="/invoices">
            <span className="text-sm text-primary hover:underline cursor-pointer">عرض الكل</span>
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm">لا توجد فواتير بعد</p>
            <Link href="/calculator">
              <button className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm flex items-center gap-2 mx-auto hover:opacity-90">
                <Plus size={16} />
                إنشاء أول فاتورة
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map((inv) => (
              <Link key={inv.id} href={`/invoice/${inv.id}`}>
                <div className="bg-white border border-border rounded-xl p-4 flex justify-between items-start hover:shadow-md transition cursor-pointer">
                  <div>
                    <div className="font-bold text-sm">فاتورة رقم {inv.number}</div>
                    <div className="text-sm text-muted-foreground">{inv.customerName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{arabicDate(new Date(inv.date))}</div>
                  </div>
                  <div className="text-left text-sm font-medium space-y-0.5">
                    <div className="text-primary">{formatOld(inv.totalOld)}</div>
                    <div className="text-blue-700">{formatNew(inv.totalNew)}</div>
                    <div className="text-green-700">{formatUsd(inv.totalUsd)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, small }: { label: string; value: string; icon: string; small?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
      <div className="text-xl mb-1">{icon}</div>
      <div className={`font-bold ${small ? "text-sm" : "text-xl"} leading-tight`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
