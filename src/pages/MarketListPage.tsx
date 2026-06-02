import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCollection, useDoc } from "@/hooks/useFirestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, CheckCircle2, Trash2, Pencil, Calculator, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type MarketItem = {
  id?: string;
  name: string;
  estimatedPrice: number;
  actualPrice: number;
  purchased: boolean;
};

export default function MarketListPage() {
  const currentMonthStr = format(new Date(), "yyyy-MM");
  
  const { data: items, add, update, remove } = useCollection<MarketItem>(`market_items_${currentMonthStr}`);
  const { data: budgetData, update: updateBudget } = useDoc<any>('market_budgets', currentMonthStr);

  const [openAdd, setOpenAdd] = useState(false);
  const [newItem, setNewItem] = useState<{name: string, estimatedPrice: number}>({ name: "", estimatedPrice: 0 });

  const [openEdit, setOpenEdit] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketItem | null>(null);

  const [budgetVal, setBudgetVal] = useState<string>("");
  const [editingBudget, setEditingBudget] = useState(false);

  const budget = budgetData?.amount || 0;
  const totalEstimated = items.reduce((acc, item) => acc + (Number(item.estimatedPrice) || 0), 0);
  const totalActual = items.reduce((acc, item) => acc + (Number(item.purchased ? item.actualPrice : 0) || 0), 0);
  
  // Predict final cost: paid actual price + estimated for non-purchased
  const predictedTotal = items.reduce((acc, item) => acc + (item.purchased ? Number(item.actualPrice || 0) : Number(item.estimatedPrice || 0)), 0);

  const isOverBudget = budget > 0 && predictedTotal > budget;

  const handleAddItem = async () => {
    if (!newItem.name) return;
    await add({ ...newItem, actualPrice: 0, purchased: false });
    setNewItem({ name: "", estimatedPrice: 0 });
    setOpenAdd(false);
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.id) return;
    const { id, ...data } = editingItem;
    await update(id, data);
    setEditingItem(null);
    setOpenEdit(false);
  };

  const togglePurchased = async (item: MarketItem) => {
    if (!item.id) return;
    const toggled = !item.purchased;
    if (toggled && item.actualPrice === 0) {
      // Prompt for actual price or just prefill with estimated
      setEditingItem({ ...item, purchased: true, actualPrice: item.estimatedPrice });
      setOpenEdit(true);
    } else {
      await update(item.id, { purchased: toggled });
    }
  };

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetVal);
    if (!isNaN(val)) {
      if (budgetData) {
        await updateBudget({ amount: val });
      } else {
        await updateBudget({ amount: val }); // useDoc update creates if not exists
      }
    }
    setEditingBudget(false);
  };

  const formatCurrency = (val: number) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-emerald-500" /> Mercado
        </h1>
      </div>

      {/* Budget Summary */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-8 shadow-xl shadow-slate-900/10 text-white space-y-6">
        <div className="flex items-center justify-between">
           <div>
             <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Orçamento Previsto</p>
             {editingBudget ? (
               <div className="flex items-center gap-2">
                 <Input type="number" className="w-32 bg-slate-800 border-slate-700 text-white" value={budgetVal} onChange={e => setBudgetVal(e.target.value)} placeholder="0.00" />
                 <Button onClick={handleSaveBudget} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">Salvar</Button>
               </div>
             ) : (
               <div className="flex items-center gap-3">
                 <p className="text-2xl font-bold">{formatCurrency(budget)}</p>
                 <button onClick={() => { setBudgetVal(budget.toString()); setEditingBudget(true); }} className="text-slate-400 hover:text-white">
                   <Pencil className="w-4 h-4" />
                 </button>
               </div>
             )}
           </div>
           
           <div className="text-right">
             <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Previsão Final</p>
             <p className={`text-2xl font-bold ${isOverBudget ? 'text-rose-400' : 'text-white'}`}>
                {formatCurrency(predictedTotal)}
             </p>
           </div>
        </div>

        {isOverBudget && (
          <div className="bg-rose-500/20 border border-rose-500/50 rounded-xl p-3 flex items-center gap-3 text-rose-200">
             <AlertTriangle className="w-5 h-5 shrink-0" />
             <p className="text-sm">Aviso: Sua previsão de compras ultrapassou o orçamento em <strong>{formatCurrency(predictedTotal - budget)}</strong>.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="font-bold text-slate-800 text-lg">Lista de Compras</h3>
           <Button onClick={() => setOpenAdd(true)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-2">
             <Plus className="w-4 h-4" /> Adicionar
           </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-10">
             <ShoppingCart className="w-12 h-12 text-slate-200 mx-auto mb-3" />
             <p className="text-slate-500 font-medium">Sua lista está vazia</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className={`flex items-center justify-between p-4 rounded-[20px] border transition-all ${item.purchased ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200 shadow-sm'}`}>
                 <div className="flex items-center gap-4">
                    <button onClick={() => togglePurchased(item)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${item.purchased ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}`}>
                       <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div>
                       <p className={`font-semibold text-slate-800 ${item.purchased ? 'line-through text-slate-500' : ''}`}>{item.name}</p>
                       <p className="text-xs text-slate-400">Previsto: {formatCurrency(item.estimatedPrice)}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-4">
                   {item.purchased && (
                     <div className="text-right">
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">Gasto</p>
                        <p className="font-bold text-slate-800">{formatCurrency(item.actualPrice)}</p>
                     </div>
                   )}
                   <button onClick={() => { setEditingItem(item); setOpenEdit(true); }} className="text-slate-400 hover:text-slate-600">
                     <Pencil className="w-4 h-4" />
                   </button>
                   <button onClick={() => update(item.id!, { purchased: false }).then(() => remove(item.id!))} className="text-rose-400 hover:text-rose-600">
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Adicionar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Nome do Item</Label>
               <Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ex: Arroz 5kg" />
             </div>
             <div className="space-y-2">
               <Label>Preço Previsto (R$)</Label>
               <Input type="number" value={newItem.estimatedPrice || ''} onChange={e => setNewItem({...newItem, estimatedPrice: parseFloat(e.target.value)})} placeholder="0.00" />
             </div>
          </div>
          <DialogFooter>
             <Button onClick={handleAddItem} disabled={!newItem.name} className="w-full bg-slate-900 text-white rounded-xl">Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Nome do Item</Label>
                 <Input value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Preço Previsto (R$)</Label>
                   <Input type="number" value={editingItem.estimatedPrice || ''} onChange={e => setEditingItem({...editingItem, estimatedPrice: parseFloat(e.target.value)})} />
                 </div>
                 <div className="space-y-2">
                   <Label>Preço Pago (R$)</Label>
                   <Input type="number" value={editingItem.actualPrice || ''} onChange={e => setEditingItem({...editingItem, actualPrice: parseFloat(e.target.value)})} />
                 </div>
               </div>
            </div>
          )}
          <DialogFooter>
             <Button onClick={handleUpdateItem} className="w-full bg-slate-900 text-white rounded-xl">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
