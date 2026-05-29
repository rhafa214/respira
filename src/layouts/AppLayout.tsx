import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, WalletCards, TrendingDown, Target, User, LifeBuoy, Bell, Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { GlobalChatFAB } from "@/components/GlobalChatFAB";

const navItems = [
  { icon: LayoutDashboard, label: "Mês Atual", path: "/app" },
  { icon: WalletCards, label: "Calendário Financeiro", path: "/app/calendario" },
  { icon: TrendingDown, label: "Dívidas", path: "/app/dividas" },
  { icon: Target, label: "Estratégia", path: "/app/estrategia" },
  { icon: Sparkles, label: "IA Financeira", path: "/app/consultor" },
  { icon: WalletCards, label: "Histórico", path: "/app/historico" },
  { icon: Target, label: "Sonhos e Metas", path: "/app/metas" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50/50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-r border-slate-100 p-6 shadow-sm z-10">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-600">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <span className="font-semibold text-xl tracking-tight text-slate-800">Respira</span>
        </div>

        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 group text-sm font-medium",
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1.5 pt-8 border-t border-slate-100">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 group"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-rose-500" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header Mobile */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100 z-10">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-600">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-slate-800">Respira</span>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        {/* Top Header Desktop (Right) */}
        <header className="hidden md:flex items-center justify-end p-6 bg-transparent absolute top-0 right-0 w-full z-10 pointer-events-none">
          <button className="p-2.5 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-slate-600 shadow-sm pointer-events-auto transition-transform hover:scale-105">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
           {children}
        </div>
      </main>
      
      <GlobalChatFAB />

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 pb-safe z-50">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-emerald-600" : "text-slate-400"
                )}
              >
                <div className={cn("p-1.5 rounded-xl transition-colors", isActive && "bg-emerald-50")}>
                   <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
