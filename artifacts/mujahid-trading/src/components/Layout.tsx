import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Calculator, FileText, Package, Settings, Home } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/", label: "الرئيسية", icon: Home },
  { path: "/calculator", label: "حاسبة الفواتير", icon: Calculator },
  { path: "/invoices", label: "الفواتير", icon: FileText },
  { path: "/products", label: "المنتجات", icon: Package },
  { path: "/settings", label: "الإعدادات", icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-sm sticky top-0 z-50 no-print">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-2xl">🏪</div>
          <div>
            <h1 className="text-lg font-bold leading-tight">مجاهد للتجارة</h1>
            <p className="text-xs opacity-75">إدارة الفواتير والمبيعات</p>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-border no-print">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link key={path} href={path}>
              <button
                className={cn(
                  "flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  location === path
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border no-print">
        <p>🏪 مجاهد للتجارة | 💻 برمجة وتطوير: نداء الرحمن عبّود</p>
      </footer>
    </div>
  );
}
