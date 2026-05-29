import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingDown, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Debt = {
  id?: string;
  bank: string;
  type: string;
  total: number;
  remaining: number;
  installments: string;
  status: string;
  interest: string;
};

export default function DebtsPage() {
  const { data: debts, add, loading } = useCollection<Debt>('debts');
  const [openDialog, setOpenDialog] = useState(false);
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({ status: 'Atenção' });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newDebt.bank || !newDebt.total || !newDebt.remaining) return;
    setAdding(true);
    await add(newDebt as Omit<Debt, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
    setAdding(false);
    setOpenDialog(false);
    setNewDebt({ status: 'Atenção' });
  };

  const totalRestante = debts.reduce((acc, curr) => acc + Number(curr.remaining), 0);
  const totalOriginal = debts.reduce((acc, curr) => acc + Number(curr.total), 0);
  const pago = totalOriginal - totalRestante;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suas Dívidas</h1>
          <p className="text-lg text-slate-500 mt-1">
            Encarar os números é o primeiro passo para a liberdade.
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Adicionar Dívida
            </Button>
          </DialogTrigger>
          <DialogContent>
             <DialogHeader>
               <DialogTitle>Cadastrar Dívida</DialogTitle>
               <DialogDescription>Insira os detalhes para acompanharmos o progresso.</DialogDescription>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Instituição ou Banco</Label>
                 <Input value={newDebt.bank || ''} onChange={e => setNewDebt({...newDebt, bank: e.target.value})} placeholder="Ex: NuBank, Itaú, Financiamento..." />
               </div>
               <div className="space-y-2">
                 <Label>Tipo</Label>
                 <Input value={newDebt.type || ''} onChange={e => setNewDebt({...newDebt, type: e.target.value})} placeholder="Ex: Cartão de Crédito, Empréstimo Pessoal..." />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Valor Original (R$)</Label>
                   <Input type="number" value={newDebt.total || ''} onChange={e => setNewDebt({...newDebt, total: parseFloat(e.target.value)})} placeholder="5000" />
                 </div>
                 <div className="space-y-2">
                   <Label>Saldo Devedor Atual (R$)</Label>
                   <Input type="number" value={newDebt.remaining || ''} onChange={e => setNewDebt({...newDebt, remaining: parseFloat(e.target.value)})} placeholder="3000" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Parcelas restatnes</Label>
                    <Input value={newDebt.installments || ''} onChange={e => setNewDebt({...newDebt, installments: e.target.value})} placeholder="Ex: 8 de 12" />
                 </div>
                 <div className="space-y-2">
                    <Label>Juros / Observação</Label>
                    <Input value={newDebt.interest || ''} onChange={e => setNewDebt({...newDebt, interest: e.target.value})} placeholder="Ex: Alto (12% a.m.)" />
                 </div>
               </div>
             </div>
             <DialogFooter>
               <Button onClick={handleAdd} disabled={adding || !newDebt.bank || !newDebt.remaining || !newDebt.total}>
                 {adding ? 'Salvando...' : 'Salvar Dívida'}
               </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              Total a pagar
            </p>
            <h3 className="text-3xl font-bold text-slate-800">R$ {totalRestante.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-emerald-700 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" />
              Já pago / Amortizado
            </p>
            <h3 className="text-3xl font-bold text-emerald-700">R$ {Math.max(0, pago).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Lista Prioritária</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <div className="p-6 text-slate-500">Carregando suas dívidas...</div>
          ) : debts.length === 0 ? (
             <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed">
               Você não possui dívidas cadastradas. Que alívio!
             </div>
          ) : debts.map((debt) => (
            <Card key={debt.id} className="transition-all hover:shadow-md">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center p-6 gap-6">
                  <div className="flex items-center gap-4 w-full sm:w-1/3">
                    <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white bg-slate-800`}>
                       <span className="font-bold text-lg">{debt.bank.charAt(0)}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{debt.bank}</h4>
                      <p className="text-sm text-slate-500">{debt.type}</p>
                    </div>
                  </div>

                  <div className="w-full sm:w-1/4">
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Restante</p>
                    <p className="font-bold text-slate-800 text-lg">R$ {debt.remaining.toLocaleString('pt-BR')}</p>
                    <p className="text-sm text-slate-500">de R$ {debt.total.toLocaleString('pt-BR')}</p>
                  </div>

                  <div className="w-full sm:w-1/4">
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Situação</p>
                    <div className="flex flex-col gap-1 items-start">
                       <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> {debt.installments || 'N/A'} parcelas</span>
                       <span className="text-xs text-slate-500 flex items-center gap-1">{debt.interest && `Juros: ${debt.interest}`}</span>
                    </div>
                  </div>

                  <div className="flex justify-end w-full sm:w-auto ml-auto">
                    <Button variant="outline" size="sm">Estratégia IA</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
