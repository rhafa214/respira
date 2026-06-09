import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import DebtsPage from "@/pages/DebtsPage";
import LoansPage from "@/pages/LoansPage";
import BankAccountsPage from "@/pages/BankAccountsPage";
import LandingPage from "@/pages/LandingPage";
import ExpensesPage from "@/pages/ExpensesPage";
import GoalsPage from "@/pages/GoalsPage";
import WishlistPage from "@/pages/WishlistPage";
import AssistantPage from "@/pages/AssistantPage";
import BudgetPage from "@/pages/BudgetPage";
import MarketListPage from "@/pages/MarketListPage";
import JourneyPage from "@/pages/JourneyPage";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { ChatProvider } from "@/components/ChatContext";
import { MonthProvider } from "@/components/MonthContext";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <AuthProvider>
      <ChatProvider>
        <MonthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />

              {/* App Routes wrapped in AppLayout and ProtectedRoute */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <DashboardPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/lancamentos"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ExpensesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/mercado"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <MarketListPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/bancos"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <BankAccountsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/dividas"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <DebtsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/emprestimos"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <LoansPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/orcamento"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <BudgetPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/historico"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <div className="p-8 text-center text-slate-500">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">
                          Histórico
                        </h2>
                        <p>
                          Módulo de histórico e retrospecto financeiro em
                          construção.
                        </p>
                      </div>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/calendario"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <div className="p-8 text-center text-slate-500">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">
                          Calendário Financeiro
                        </h2>
                        <p>Visualização mensal de vencimentos em construção.</p>
                      </div>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/metas"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <GoalsPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/desejos"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <WishlistPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/consultor"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AssistantPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/jornada"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <JourneyPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </MonthProvider>
      </ChatProvider>
    </AuthProvider>
  );
}
