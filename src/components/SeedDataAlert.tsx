import { useState } from "react";
import { useCollection } from "@/hooks/useFirestore";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export function SeedDataAlert() {
  const { data: transactions, add: addTx, remove: removeTx, loading: txLoading } = useCollection<any>('transactions');
  const { data: debts, add: addDebt, remove: removeDebt, loading: dbLoading } = useCollection<any>('debts');
  const [loading, setLoading] = useState(false);
  const [localDismissed, setLocalDismissed] = useState(false);

  if (txLoading || dbLoading) return null;
  if (transactions.length > 5 || localStorage.getItem("seedDismissed") === "true" || localDismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem("seedDismissed", "true");
    setLocalDismissed(true);
  };

  const handleSeed = async () => {
    setLoading(true);
    try {
      // Clear old data first
      if (transactions.length > 0) {
        for (const tx of transactions) {
          await removeTx(tx.id);
        }
      }
      if (debts.length > 0) {
        for (const db of debts) {
          await removeDebt(db.id);
        }
      }

      // 08/06/2026
      const d = "2026-06-08";

      // Renda Bruta
      await addTx({ description: "Salário", amount: 5953.34, category: "Renda", type: "income", date: d, status: "pending", isRecurring: true });

      // Descontos Automáticos (now a special type)
      await addTx({ description: "Empréstimo BB 1", amount: 524.59, category: "Desconto Automático", type: "deduction", date: d, status: "paid", isRecurring: false, installmentInfo: "1/20" });
      await addTx({ description: "Empréstimo BB 2", amount: 571.50, category: "Desconto Automático", type: "deduction", date: d, status: "paid", isRecurring: false, installmentInfo: "1/71" });

      // Despesas fixas / essenciais
      await addTx({ description: "Aluguel", amount: 1500, category: "Moradia", type: "expense", date: d, status: "pending", isRecurring: true });
      await addTx({ description: "Água e luz", amount: 500, category: "Moradia", type: "expense", date: d, status: "pending", isRecurring: true });
      await addTx({ description: "Internet", amount: 100, category: "Moradia", type: "expense", date: d, status: "pending", isRecurring: true });
      await addTx({ description: "Compra mensal", amount: 1000, category: "Alimentação", type: "expense", date: d, status: "pending", isRecurring: true });
      await addTx({ description: "Combustível", amount: 350, category: "Transporte", type: "expense", date: d, status: "pending", isRecurring: true });
      await addTx({ description: "Financiamento carro", amount: 560, category: "Transporte", type: "expense", date: d, status: "pending", isRecurring: true });
      await addTx({ description: "Ração dos cachorros", amount: 200, category: "Alimentação", type: "expense", date: d, status: "pending", isRecurring: true });

      // Obrigações importantes
      await addTx({ description: "Missão", amount: 800, category: "Obrigações", type: "expense", date: d, status: "pending", isRecurring: false });
      await addTx({ description: "Parcela advogada", amount: 400, category: "Obrigações", type: "expense", date: d, status: "pending", isRecurring: false, installmentInfo: "1/6" });
      await addTx({ description: "Clube de corte de cabelo", amount: 100, category: "Obrigações", type: "expense", date: d, status: "pending", isRecurring: true });

      // Lazer Controlado / Saúde Mental
      await addTx({ description: "Streaming Claro + Cartão PicPay", amount: 130, category: "Verba de Respiro", type: "expense", date: d, status: "pending", isRecurring: true });
      
      // Debts Table (Same as before but maintaining)
      await addDebt({ bank: "Banco do Brasil", type: "Cartão de Crédito", total: 10000, remaining: 10000, installments: "Atrasado", status: "Atenção", interest: "Alto" });
      await addDebt({ bank: "Nubank", type: "Cartão de Crédito", total: 5000, remaining: 5000, installments: "Atrasado", status: "Atenção", interest: "Alto" });
      await addDebt({ bank: "Caixa", type: "Cartão de Crédito", total: 4000, remaining: 4000, installments: "Atrasado", status: "Atenção", interest: "Alto" });
      await addDebt({ bank: "PicPay", type: "Cartão de Crédito", total: 272.06, remaining: 272.06, installments: "Atrasado", status: "Atenção", interest: "Alto" });
      await addDebt({ bank: "Faculdade Atrasada", type: "Mensalidade", total: 516, remaining: 516, installments: "1", status: "Atenção", interest: "Baixo" });
      await addDebt({ bank: "Faculdade Futura", type: "Mensalidade", total: 693, remaining: 693, installments: "7 de 99", status: "Em dia", interest: "Nenhum" });
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50/50 relative">
      <button onClick={handleDismiss} className="absolute top-2 right-2 p-1 rounded-full text-amber-500 hover:bg-amber-100 transition-colors">
        <X className="w-4 h-4" />
      </button>
      <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-full text-amber-600">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Sincronizar Junho 2026</h3>
            <p className="text-sm text-slate-600 mt-1">Isso apagará os dados atuais e carregará a situação real de Junho (Renda de R$ 5.953,00, Aluguel, Missão, etc).</p>
          </div>
        </div>
        <Button onClick={handleSeed} disabled={loading} className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white">
           {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
           {loading ? "Carregando..." : "Sincronizar Junho"}
        </Button>
      </CardContent>
    </Card>
  );
}
