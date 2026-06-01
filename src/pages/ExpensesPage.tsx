import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, ShoppingCart, Home, Car, Pill, GraduationCap, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMonth } from "@/components/MonthContext";
import { format } from "date-fns";

type Transaction = {
  id?: string;
  description: string;
  amount: number;
  category: "Alimentação" | "Moradia" | "Transporte" | "Saúde" | "Educação" | "Renda" | "Outros";
  date: string;
  type: "income" | "expense";
};

export default function ExpensesPage() {
  const { currentDate } = useMonth();
  const { data: allTransactions, add, loading } = useCollection<Transaction>('transactions');
  
  // Filter by selected month from context
  const transactions = allTransactions.filter(t => {
    if (!t.date) return false;
    const tMonth = t.date.substring(0, 7);
    const currMonth = format(currentDate, "yyyy-MM");
    return tMonth === currMonth;
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: 'expense', category: 'Alimentação' });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newTx.description || !newTx.amount || !newTx.date) return;
    setAdding(true);
    await add(newTx as Omit<Transaction, 'id' | 'userId' | 'createdAt'>);
    setAdding(false);
    setOpenDialog(false);
    setNewTx({ type: 'expense', category: 'Alimentação' });
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'Alimentação': return <ShoppingCart className="w-6 h-6" />;
      case 'Moradia': return <Home className="w-6 h-6" />;
      case 'Transporte': return <Car className="w-6 h-6" />;
      case 'Saúde': return <Pill className="w-6 h-6" />;
      case 'Educação': return <GraduationCap className="w-6 h-6" />;
      default: return <ShoppingCart className="w-6 h-6" />;
    }
  };

  const getColor = (category: string, type: string) => {
    if (type === 'income') return "bg-emerald-100 text-emerald-600";
    switch (category) {
      case 'Alimentação': return "bg-orange-100 text-orange-600";
      case 'Moradia': return "bg-blue-100 text-blue-600";
      case 'Transporte': return "bg-slate-100 text-slate-600";
      case 'Saúde': return "bg-rose-100 text-rose-600";
      case 'Educação': return "bg-indigo-100 text-indigo-600";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suas Transações</h1>
          <p className="text-lg text-slate-500 mt-1">
            Entenda para onde seu dinheiro vai, sem complicação.
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Transação</DialogTitle>
              <DialogDescription>Adicione um gasto ou receita.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-4">
                <Button variant={newTx.type === 'expense' ? 'destructive' : 'outline'} className="flex-1 rounded-xl" onClick={() => setNewTx({...newTx, type: 'expense'})}>Gasto</Button>
                <Button variant={newTx.type === 'income' ? 'default' : 'outline'} className="flex-1 rounded-xl" onClick={() => setNewTx({...newTx, type: 'income'})}>Receita</Button>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={newTx.description || ''} onChange={e => setNewTx({...newTx, description: e.target.value})} placeholder="Ex: Supermercado Extra" />
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

              {newTx.type === 'expense' && (
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <select 
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
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
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={adding || !newTx.description || !newTx.amount || !newTx.date}>
                {adding ? 'Salvando...' : 'Salvar Transação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Options */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <Input placeholder="Buscar gasto..." className="pl-9" />
        </div>
        <Button variant="outline" className="gap-2 px-3">
           <Filter className="w-4 h-4" />
           <span className="hidden sm:inline">Filtros</span>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
           {loading ? (
             <div className="p-8 text-center text-slate-500">Carregando...</div>
           ) : transactions.length === 0 ? (
             <div className="p-8 text-center text-slate-500">
               Nenhuma transação registrada. Que tal adicionar a primeira?
             </div>
           ) : (
             <div className="divide-y divide-slate-100">
                {transactions.map((expense) => {
                   return (
                     <div key={expense.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getColor(expense.category, expense.type)}`}>
                              {getIcon(expense.category)}
                           </div>
                           <div>
                              <p className="font-semibold text-slate-900">{expense.description}</p>
                              <p className="text-sm text-slate-500">{expense.type === 'income' ? 'Entrada' : expense.category}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className={`font-bold ${expense.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                             {expense.type === 'income' ? '+' : '-'} R$ {expense.amount.toFixed(2).replace('.', ',')}
                           </p>
                           <p className="text-sm text-slate-400">{new Date(expense.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                     </div>
                   )
                })}
             </div>
           )}
        </CardContent>
      </Card>
      
    </div>
  );
}
