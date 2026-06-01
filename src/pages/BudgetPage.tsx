import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCollection } from "@/hooks/useFirestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Target, CheckCircle2, TrendingDown, RefreshCcw } from "lucide-react";
import { useMonth } from "@/components/MonthContext";
import { format } from "date-fns";

type Budget = {
  id?: string;
  category: string;
  limit: number;
};

type Transaction = {
  id?: string;
  amount: number;
  category: string;
  date: string;
  type: string;
};

export default function BudgetPage() {
  const { data: budgets, add: addBudget, loading: loadingBudgets } = useCollection<Budget>('budgets');
  const { data: allTransactions, loading: loadingTxs } = useCollection<Transaction>('transactions');
  const { currentDate } = useMonth();

  const [openDialog, setOpenDialog] = useState(false);
  const [newBudget, setNewBudget] = useState<Partial<Budget>>({ category: 'Alimentação', limit: 0 });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newBudget.category || !newBudget.limit) return;
    setAdding(true);
    await addBudget(newBudget as Omit<Budget, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
    setAdding(false);
    setOpenDialog(false);
    setNewBudget({ category: 'Alimentação', limit: 0 });
  };

  // Group transactions by category for current month
  const currentMonthTxs = allTransactions.filter(t => t.date && t.date.substring(0, 7) === format(currentDate, "yyyy-MM") && t.type === 'expense');
  
  const spentByCategory = currentMonthTxs.reduce((acc, tx) => {
    const cat = tx.category || 'Outros';
    acc[cat] = (acc[cat] || 0) + Number(tx.amount);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-3">
            <Target className="w-3.5 h-3.5" />
            Orçamentos
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Limites por Categoria</h1>
          <p className="text-lg text-slate-500 mt-1">Estipule tetos de gastos e acompanhe seu progresso real.</p>
        </div>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent>
             <DialogHeader>
               <DialogTitle>Definir Novo Limite</DialogTitle>
               <DialogDescription>Escolha uma categoria e um valor máximo por mês.</DialogDescription>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Categoria</Label>
                 <select 
                   className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                   value={newBudget.category} 
                   onChange={e => setNewBudget({...newBudget, category: e.target.value})}
                 >
                   <option value="Alimentação">Alimentação</option>
                   <option value="Moradia">Moradia</option>
                   <option value="Transporte">Transporte</option>
                   <option value="Lazer">Lazer</option>
                   <option value="Saúde">Saúde</option>
                   <option value="Educação">Educação</option>
                   <option value="Outros">Outros</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <Label>Limite Máximo (R$)</Label>
                 <Input type="number" value={newBudget.limit || ''} onChange={e => setNewBudget({...newBudget, limit: parseFloat(e.target.value)})} placeholder="1000" />
               </div>
             </div>
             <DialogFooter>
               <Button onClick={handleAdd} disabled={adding || !newBudget.limit}>
                 {adding ? 'Salvando...' : 'Salvar Orçamento'}
               </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loadingBudgets || loadingTxs ? (
           <div className="col-span-full py-12 text-center text-slate-500">Calculando seus limites...</div>
        ) : budgets.length === 0 ? (
           <div className="col-span-full border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <p className="text-slate-500 font-medium">Nenhum orçamento definido.</p>
              <p className="text-sm text-slate-400 mt-2">Crie limites por categoria para evitar sustos no fim do mês.</p>
           </div>
        ) : (
          budgets.map(budget => {
             const spent = spentByCategory[budget.category] || 0;
             const percentage = Math.min(100, Math.round((spent / budget.limit) * 100));
             const remaining = Math.max(0, budget.limit - spent);
             const overspent = spent > budget.limit;
             
             return (
               <Card key={budget.id} className="border-slate-200 shadow-sm transition-all hover:shadow-md">
                 <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                         <div className={`p-2.5 rounded-xl ${overspent ? 'bg-rose-100 text-rose-600' : percentage > 80 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {overspent ? <TrendingDown className="w-5 h-5" /> : percentage > 80 ? <RefreshCcw className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                         </div>
                         <div>
                            <h3 className="font-bold text-slate-800">{budget.category}</h3>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">Limite de R$ {budget.limit.toFixed(2).replace('.', ',')}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className={`font-bold text-lg ${overspent ? 'text-rose-600' : 'text-slate-800'}`}>
                           R$ {spent.toFixed(2).replace('.', ',')}
                         </p>
                         <p className="text-xs text-slate-500">Gastos no mês</p>
                      </div>
                    </div>

                    <div className="space-y-2 mt-6">
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                         <div className={`h-2.5 rounded-full transition-all duration-1000 ${overspent ? 'bg-rose-500' : percentage > 80 ? 'bg-orange-400' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center text-xs font-medium">
                        <span className={overspent ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                          {overspent ? `Ultrapassou R$ ${(spent - budget.limit).toFixed(2).replace('.', ',')}` : `Restam R$ ${remaining.toFixed(2).replace('.', ',')}`}
                        </span>
                        <span className="text-slate-400">{percentage}%</span>
                      </div>
                    </div>
                 </CardContent>
               </Card>
             );
          })
        )}
      </div>
    </div>
  );
}
