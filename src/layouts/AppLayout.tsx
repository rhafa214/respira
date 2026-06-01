import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, WalletCards, TrendingDown, Target, User, LifeBuoy, Bell, Sparkles, LogOut, ArrowLeftRight, Repeat, Moon, Sun, Landmark, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { GlobalChatFAB } from "@/components/GlobalChatFAB";
import { QuickExpenseFAB } from "@/components/QuickExpenseModal";
import { useTheme } from "@/components/ThemeProvider";

const navItems = [
  { icon: LayoutDashboard, label: "Mês Atual", path: "/app" },
  { icon: ArrowLeftRight, label: "Lançamentos", path: "/app/lancamentos" },
  { icon: Repeat, label: "Contas Fixas", path: "/app/fixas" },
  { icon: Target, label: "Orçamentos", path: "/app/orcamento" },
  { icon: Landmark, label: "Bancos e Cartões", path: "/app/bancos" },
  { icon: Target, label: "Sonhos e Metas", path: "/app/metas" },
  { icon: Sparkles, label: "IA Financeira", path: "/app/consultor" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950 transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-6 shadow-sm z-10 transition-colors">
        <div className="flex items-center justify-between px-2 mb-10">
          <div className="flex items-center gap-3">
             <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-600">
               <Leaf className="w-6 h-6" />
             </div>
             <span className="font-semibold text-xl tracking-tight text-slate-800 dark:text-slate-100">Respira</span>
          </div>
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
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1.5 pt-8 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 group"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300" />
            ) : (
              <Moon className="w-5 h-5 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300" />
            )}
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 group"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-rose-500 dark:group-hover:text-rose-400" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header Mobile */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10 transition-colors">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-600">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-slate-800 dark:text-slate-100">Respira</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Top Header Desktop (Right) */}
        <header className="hidden md:flex items-center justify-end p-6 bg-transparent absolute top-0 right-0 w-full z-10 pointer-events-none">
          <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shadow-sm pointer-events-auto transition-transform hover:scale-105">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
           {children}
        </div>
      </main>
      
      <GlobalChatFAB />
      <QuickExpenseFAB />

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-safe z-50 transition-colors">
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
                  isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
                )}
              >
                <div className={cn("p-1.5 rounded-xl transition-colors", isActive && "bg-emerald-50 dark:bg-emerald-500/10")}>
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
