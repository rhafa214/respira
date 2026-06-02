import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, ShoppingCart, Home, Car, Pill, GraduationCap, ArrowDownRight, ArrowUpRight, TrendingUp, Calendar, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMonth } from "@/components/MonthContext";
import { getCategoryIcon, getCategoryColor } from "@/lib/categories";

type Transaction = {
  id?: string;
  description: string;
  amount: number;
  category: "Alimentação" | "Moradia" | "Transporte" | "Saúde" | "Educação" | "Renda" | "Outros";
  date: string;
  type: "income" | "expense";
  isFixed?: boolean;
};

export default function ExpensesPage() {
  const { currentDate, setCurrentDate } = useMonth();
  const { data: allTransactions, add, loading } = useCollection<Transaction>('transactions');
  
  const [activeTab, setActiveTab] = useState<"fixed" | "variable">("variable");

  const monthStr = format(currentDate, "yyyy-MM");
  const monthName = format(currentDate, "MMMM yyyy", { locale: ptBR });

  // Filter by selected month from context
  const transactions = allTransactions.filter(t => {
    if (!t.date || t.type !== 'expense') return false; // Somente despesas
    const tMonth = t.date.substring(0, 7);
    return tMonth === monthStr;
  });

  const variableExpenses = transactions.filter(t => !t.isFixed && !t.isRecurring && !t.installmentInfo);
  const fixedExpenses = transactions.filter(t => t.isFixed || t.isRecurring || !!t.installmentInfo);

  const totalVariable = variableExpenses.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalFixed = fixedExpenses.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const [openDialog, setOpenDialog] = useState(false);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: 'expense', category: 'Alimentação' });
  const [adding, setAdding] = useState(false);

  const handlePrevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  }

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  }

  const handleAdd = async () => {
    if (!newTx.description || !newTx.amount || !newTx.date) return;
    setAdding(true);
    await add({...newTx, isFixed: activeTab === 'fixed'} as Omit<Transaction, 'id' | 'userId' | 'createdAt'>);
    setAdding(false);
    setOpenDialog(false);
    setNewTx({ type: 'expense', category: 'Alimentação' });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-500 pb-24">
      
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Gastos</h1>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100 p-1.5 rounded-full flex items-center">
         <button 
           onClick={() => setActiveTab('fixed')}
           className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-full transition-all ${activeTab === 'fixed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
         >
           Fixos
         </button>
         <button 
           onClick={() => setActiveTab('variable')}
           className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-full transition-all ${activeTab === 'variable' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
         >
           Variáveis
         </button>
      </div>

      {activeTab === 'variable' && (
         <div className="bg-[#fef6ee] border border-orange-100/50 p-4 rounded-3xl relative overflow-hidden flex items-start gap-3">
            <div className="bg-orange-400 p-2.5 rounded-xl text-white shrink-0">
               <TrendingUp className="w-5 h-5" />
            </div>
            <div>
               <h3 className="font-bold text-slate-800">Gastos Variáveis</h3>
               <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                 Gastos que mudam todo mês de acordo com seus hábitos e escolhas do dia a dia.
               </p>
               <div className="flex flex-wrap gap-2 mt-3">
                  <span className="bg-orange-100 text-orange-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">Mercado</span>
                  <span className="bg-orange-100 text-orange-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">Restaurante</span>
                  <span className="bg-orange-100 text-orange-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">Transporte</span>
                  <span className="bg-orange-100 text-orange-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">Lazer</span>
               </div>
            </div>
         </div>
      )}

      {/* Month Selector */}
      <div className="flex items-center justify-between px-2">
         <button onClick={handlePrevMonth} className="p-2 text-slate-400 hover:text-slate-800">
           <ChevronLeft className="w-5 h-5" />
         </button>
         <div className="font-bold text-slate-800 capitalize text-sm">{monthName}</div>
         <button onClick={handleNextMonth} className="p-2 text-slate-400 hover:text-slate-800">
           <ChevronRight className="w-5 h-5" />
         </button>
      </div>

      <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6">
         <p className="text-rose-600 text-[11px] font-bold uppercase tracking-widest mb-1">Total de Gastos {activeTab === 'variable' ? 'Variáveis' : 'Fixos'}</p>
         <p className="text-4xl font-bold text-slate-900">{formatCurrency(activeTab === 'variable' ? totalVariable : totalFixed)}</p>
      </div>

      <div className="space-y-4 pt-2">
         <div className="flex justify-between items-center px-1">
             <h3 className="text-base font-bold text-slate-900">Seus gastos {activeTab === 'fixed' ? 'fixos' : 'variáveis'}</h3>
         </div>

         <div className="space-y-3">
            {(activeTab === 'variable' ? variableExpenses : fixedExpenses).length === 0 ? (
               <div className="bg-white border text-center border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center gap-3">
                  <div className="text-slate-300">
                     <ReceiptText className="w-10 h-10" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Nenhum gasto {activeTab === 'fixed' ? 'fixo' : 'variável'} ainda</p>
                    <p className="text-xs text-slate-400 mt-1">Adicione seu primeiro gasto usando o botão abaixo.</p>
                  </div>
               </div>
            ) : (
               (activeTab === 'variable' ? variableExpenses : fixedExpenses).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                     <div className="flex items-center gap-4">
                       <div className={`p-2.5 rounded-xl shrink-0 ${getCategoryColor(tx.category || tx.description, tx.type)}`}>
                         {getCategoryIcon(tx.category || tx.description, tx.type)}
                       </div>
                       <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm text-slate-800`}>
                              {tx.description}
                            </p>
                            {tx.installmentInfo && (
                              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">
                                Parcela {tx.installmentInfo}
                              </span>
                            )}
                            {tx.isRecurring && !tx.installmentInfo && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                                Recorrente
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{tx.category || "Outros"}</p>
                       </div>
                     </div>
                     <div className="text-right">
                        <p className={`font-bold text-sm text-slate-800`}>
                           - {formatCurrency(Number(tx.amount))}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(tx.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</p>
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>

      {/* Floating Add Button */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogTrigger asChild>
          <div className="fixed bottom-24 md:bottom-12 right-4 md:right-8 z-50">
            <button className="w-14 h-14 bg-emerald-400 text-white rounded-full shadow-lg shadow-emerald-400/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Gasto {activeTab === 'variable' ? 'Variável' : 'Fixo'}</DialogTitle>
            <DialogDescription>Adicione um registro para o mês atual.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={newTx.description || ''} onChange={e => setNewTx({...newTx, description: e.target.value})} placeholder="Ex: Supermercado..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" value={newTx.amount || ''} onChange={e => setNewTx({...newTx, amount: parseFloat(e.target.value)})} placeholder="150.00" />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={newTx.date || ''} onChange={e => setNewTx({...newTx, date: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <select 
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                value={newTx.category} 
                onChange={e => setNewTx({...newTx, category: e.target.value as any})}
              >
                <option value="Alimentação">Alimentação</option>
                <option value="Moradia">Moradia</option>
                <option value="Transporte">Transporte</option>
                <option value="Saúde">Saúde</option>
                <option value="Educação">Educação</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={adding || !newTx.description || !newTx.amount || !newTx.date} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
              {adding ? 'Salvando...' : `Salvar Gasto ${activeTab === 'variable' ? 'Variável' : 'Fixo'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

