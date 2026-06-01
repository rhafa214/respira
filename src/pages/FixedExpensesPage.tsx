import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Repeat, CalendarCheck, CheckCircle2, RotateCcw } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMonth } from "@/components/MonthContext";
import { useAuth } from "@/components/AuthProvider";
import { getCategoryIcon, getCategoryColor } from "@/lib/categories";

type FixedExpense = {
  id?: string;
  description: string;
  amount: number;
  category: string;
  type: string;
};

export default function FixedExpensesPage() {
  const { data: fixedExpenses, add, loading: loadingFixed } = useCollection<FixedExpense>('fixed_expenses');
  const { data: transactions, add: addTransaction, loading: loadingTxs } = useCollection<any>('transactions');
  const { user } = useAuth();
  const { currentDate } = useMonth();

  const [openDialog, setOpenDialog] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<FixedExpense>>({ type: 'expense', category: 'Moradia', amount: 0 });
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);

  const monthStr = format(currentDate, "yyyy-MM");
  const monthName = format(currentDate, "MMMM", { locale: ptBR });

  const handleAdd = async () => {
    if (!newExpense.description || !newExpense.amount) return;
    setAdding(true);
    await add(newExpense as Omit<FixedExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
    setAdding(false);
    setOpenDialog(false);
    setNewExpense({ type: 'expense', category: 'Moradia', amount: 0 });
  };

  const handleGenerateMonth = async () => {
    if (!user || fixedExpenses.length === 0) return;
    setGenerating(true);
    
    // For each fixed expense, create a transaction IF it doesn't exist yet for this exact month + fixed config
    // To prevent duplicates, we can check if a transaction with the same description, isFixed banner, and same month exists
    const currentMonthTxs = transactions.filter(t => t.date && t.date.substring(0, 7) === monthStr && t.isFixed);
    
    for (const fe of fixedExpenses) {
      const alreadyExists = currentMonthTxs.some(t => t.description === fe.description);
      if (!alreadyExists) {
         await addTransaction({
            description: fe.description,
            amount: fe.amount,
            category: fe.category,
            type: fe.type,
            date: `${monthStr}-05`, // Defaulting to day 5, could be configurable
            isFixed: true,
            status: "pending"
         });
      }
    }
    
    setGenerating(false);
    alert(`Contas fixas cadastradas em ${monthName} com sucesso!`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3">
            <Repeat className="w-3.5 h-3.5" />
            Contas Recorrentes
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suas Contas Fixas</h1>
          <p className="text-lg text-slate-500 mt-1">Configure o que repete todo mês para lançar com um clique.</p>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={handleGenerateMonth} disabled={generating || loadingFixed || fixedExpenses.length === 0} variant="outline" className="gap-2 bg-white hover:bg-slate-50 shadow-sm border-slate-200 text-slate-700">
            {generating ? <RotateCcw className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4 text-emerald-600" />}
            Lançar em {monthName}
          </Button>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4" />
                Nova Conta Fixa
              </Button>
            </DialogTrigger>
            <DialogContent>
               <DialogHeader>
                 <DialogTitle>Adicionar Conta Fixa</DialogTitle>
                 <DialogDescription>Ela aparecerá todos os meses quando você gerar as contas do mês.</DialogDescription>
               </DialogHeader>
               <div className="space-y-4 py-4">
                 <div className="space-y-2">
                   <Label>Descrição da Conta</Label>
                   <Input value={newExpense.description || ''} onChange={e => setNewExpense({...newExpense, description: e.target.value})} placeholder="Ex: Aluguel, Internet, Netflix..." />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Valor Estimado (R$)</Label>
                     <Input type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} placeholder="150.00" />
                   </div>
                   <div className="space-y-2">
                     <Label>Categoria</Label>
                     <select 
                       className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                       value={newExpense.category} 
                       onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                     >
                       <option value="Moradia">Moradia</option>
                       <option value="Alimentação">Alimentação</option>
                       <option value="Transporte">Transporte</option>
                       <option value="Saúde">Saúde</option>
                       <option value="Educação">Educação</option>
                       <option value="Lazer">Lazer</option>
                       <option value="Outros">Outros</option>
                     </select>
                   </div>
                 </div>
               </div>
               <DialogFooter>
                 <Button onClick={handleAdd} disabled={adding || !newExpense.description || !newExpense.amount}>
                   {adding ? 'Salvando...' : 'Salvar Conta'}
                 </Button>
               </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {loadingFixed ? (
            <div className="p-12 text-center text-slate-500">Caregando contas recorrentes...</div>
          ) : fixedExpenses.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                 <Repeat className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Sem contas fixas cadastradas</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">Adicione Aluguel, Condomínio, Energia, Água e Serviços de streaming para facilitar o controle mensal.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
               {fixedExpenses.map(expense => (
                 <div key={expense.id} className="p-5 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${getCategoryColor(expense.category || expense.description, expense.type)}`}>
                          {getCategoryIcon(expense.category || expense.description, expense.type, "w-6 h-6")}
                       </div>
                       <div>
                         <h4 className="font-bold text-slate-800">{expense.description}</h4>
                         <p className="text-sm font-medium text-slate-500 mt-0.5">{expense.category}</p>
                       </div>
                    </div>
                    <div className="text-left sm:text-right">
                       <p className="font-bold text-lg text-slate-800">R$ {Number(expense.amount).toFixed(2).replace('.', ',')}</p>
                       <p className="text-xs text-blue-600 font-medium mt-1">Lançamento Automático</p>
                    </div>
                 </div>
               ))}
            </div>
          )}
      </div>

    </div>
  );
}
