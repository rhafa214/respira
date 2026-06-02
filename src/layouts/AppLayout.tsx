import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, WalletCards, TrendingDown, Target, User, LifeBuoy, Bell, Sparkles, LogOut, ArrowLeftRight, Repeat, Moon, Sun, Landmark, Leaf, Menu, X, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { GlobalChatFAB } from "@/components/GlobalChatFAB";
import { QuickExpenseFAB } from "@/components/QuickExpenseModal";
import { useTheme } from "@/components/ThemeProvider";

const navItems = [
  { icon: LayoutDashboard, label: "Mês Atual", path: "/app" },
  { icon: ArrowLeftRight, label: "Gastos", path: "/app/lancamentos" },
  { icon: Target, label: "Orçamentos", path: "/app/orcamento" },
  { icon: Landmark, label: "Bancos e Cartões", path: "/app/bancos" },
  { icon: Target, label: "Sonhos e Metas", path: "/app/metas" },
  { icon: ShoppingBag, label: "Desejos", path: "/app/desejos" },
  { icon: Sparkles, label: "IA Financeira", path: "/app/consultor" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileNav = navItems.slice(0, 4);

  return (
    <div className="flex h-screen bg-slate-50/50 dark:bg-slate-950 transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-6 shadow-sm z-10 transition-colors">
        <div className="flex items-center justify-between px-2 mb-10">
          <div className="flex items-center gap-3">
             <img src="/icon.png" alt="Respira" className="w-10 h-10 rounded-xl object-cover shadow-sm" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
             <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-600 hidden">
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
        <header className="md:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 z-10 transition-colors">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="Respira" className="w-8 h-8 rounded-lg object-cover shadow-sm" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.classList.remove('hidden'); }} />
            <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-600 hidden">
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
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8 relative">
           <AnimatePresence mode="wait">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.3, ease: "easeOut" }}
             >
               {children}
             </motion.div>
           </AnimatePresence>
        </div>
      </main>
      
      <GlobalChatFAB />
      <QuickExpenseFAB />

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 pb-safe z-50 transition-colors">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
          {mobileNav.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 hover:text-slate-600 dark:text-slate-500"
                )}
              >
                <div className={cn("p-1.5 rounded-xl transition-colors", isActive && "bg-emerald-50 dark:bg-emerald-500/10")}>
                   <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {/* More Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-500"
          >
            <div className="p-1.5 rounded-xl transition-colors">
               <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl p-6 z-[70] max-h-[85vh] overflow-y-auto w-full pb-safe-offset-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Menu</h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 mb-6">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 text-sm font-medium",
                        location.pathname === item.path
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", location.pathname === item.path ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <div className="space-y-2 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setTheme(theme === "dark" ? "light" : "dark");
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  {theme === "dark" ? (
                    <Sun className="w-5 h-5 text-slate-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-slate-400" />
                  )}
                  {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <LogOut className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                  Sair do App
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
