import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Clock, Landmark, Calendar, Trash2, HandCoins } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion } from "motion/react";

type Loan = {
  id?: string;
  bank: string;
  description: string;
  installmentValue: number;
  remainingInstallments: number;
  totalInstallments: number;
  dueDate: string;
};

export default function LoansPage() {
  const { data: loans, add, remove, loading } = useCollection<Loan>('loans');
  const [openDialog, setOpenDialog] = useState(false);
  const [newLoan, setNewLoan] = useState<Partial<Loan>>({});
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newLoan.bank || !newLoan.installmentValue || !newLoan.remainingInstallments) return;
    setAdding(true);
    await add(newLoan as Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
    setAdding(false);
    setOpenDialog(false);
    setNewLoan({});
  };

  const handleDelete = async (id: string) => {
    await remove(id);
  }

  const totalMonthly = loans.reduce((acc, curr) => acc + Number(curr.installmentValue), 0);
  const totalRemaining = loans.reduce((acc, curr) => acc + (Number(curr.installmentValue) * Number(curr.remainingInstallments)), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Empréstimos</h1>
          <p className="text-lg text-slate-500 mt-1">
            Controle os empréstimos debitados direto da sua conta.
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0 bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11">
              <Plus className="w-4 h-4" />
              Adicionar Empréstimo
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
             <DialogHeader>
               <DialogTitle>Cadastrar Empréstimo</DialogTitle>
               <DialogDescription>Acompanhe o que é debitado direto na sua conta.</DialogDescription>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Banco / Instituição</Label>
                 <Input value={newLoan.bank || ''} onChange={e => setNewLoan({...newLoan, bank: e.target.value})} placeholder="Ex: Itaú, Caixa..." />
               </div>
               <div className="space-y-2">
                 <Label>Descrição (Opcional)</Label>
                 <Input value={newLoan.description || ''} onChange={e => setNewLoan({...newLoan, description: e.target.value})} placeholder="Ex: Financiamento Carro" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Valor da Parcela (R$)</Label>
                   <Input type="number" value={newLoan.installmentValue || ''} onChange={e => setNewLoan({...newLoan, installmentValue: parseFloat(e.target.value)})} placeholder="500.00" />
                 </div>
                 <div className="space-y-2">
                   <Label>Dia do Vencimento</Label>
                   <Input type="number" min="1" max="31" value={newLoan.dueDate || ''} onChange={e => setNewLoan({...newLoan, dueDate: e.target.value})} placeholder="Ex: 10" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Parcelas Restantes</Label>
                    <Input type="number" value={newLoan.remainingInstallments || ''} onChange={e => setNewLoan({...newLoan, remainingInstallments: parseInt(e.target.value)})} placeholder="Ex: 24" />
                 </div>
                 <div className="space-y-2">
                    <Label>Total de Parcelas (Opcional)</Label>
                    <Input type="number" value={newLoan.totalInstallments || ''} onChange={e => setNewLoan({...newLoan, totalInstallments: parseInt(e.target.value)})} placeholder="Ex: 48" />
                 </div>
               </div>
             </div>
             <DialogFooter>
               <Button onClick={handleAdd} disabled={adding || !newLoan.bank || !newLoan.installmentValue || !newLoan.remainingInstallments} className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                 {adding ? 'Salvando...' : 'Salvar Empréstimo'}
               </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-[24px]">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Comprometimento Mensal
            </p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">R$ {totalMonthly.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
            <p className="text-xs text-slate-400 mt-2">Valor debitado mensalmente.</p>
          </CardContent>
        </Card>
        <Card className="rounded-[24px]">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mb-2">
              <Landmark className="w-4 h-4 text-slate-400" />
              Saldo Devedor Estimado
            </p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">R$ {totalRemaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
            <p className="text-xs text-slate-400 mt-2">Soma das parcelas restantes (sem desconto de amortização).</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-slate-800">Meus Empréstimos</h3>
        
        <motion.div 
           initial="hidden"
           animate="visible"
           variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
           className="grid grid-cols-1 gap-4"
        >
          {loading ? (
             <div className="p-6 text-slate-500">Carregando...</div>
          ) : loans.length === 0 ? (
             <motion.div 
               variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
               className="p-12 text-center flex flex-col items-center justify-center text-slate-500 bg-white rounded-3xl border border-slate-100"
             >
               <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                 <HandCoins className="w-8 h-8"/>
               </div>
               <p className="text-lg font-bold text-slate-800">Nenhum empréstimo cadastrado</p>
               <p className="max-w-xs mt-1 text-sm">Cadastre seus empréstimos para visualizar o quanto do seu salário está comprometido.</p>
             </motion.div>
          ) : loans.map((loan) => (
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} key={loan.id}>
              <Card className="transition-all hover:shadow-md rounded-[24px] border-slate-100">
                <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center p-5 gap-6">
                  <div className="flex items-center gap-4 w-full sm:w-1/3">
                    <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white bg-slate-900`}>
                       <HandCoins className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 leading-tight">{loan.bank}</h4>
                      {loan.description && <p className="text-sm text-slate-500">{loan.description}</p>}
                    </div>
                  </div>

                  <div className="w-full sm:w-1/4">
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Valor da Parcela</p>
                    <p className="font-bold text-slate-800 text-lg font-mono tracking-tight">R$ {Number(loan.installmentValue).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3"/> Vence dia {loan.dueDate || '--'}</p>
                  </div>

                  <div className="w-full sm:w-1/4">
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Andamento</p>
                    <div className="flex flex-col gap-1 items-start">
                       <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400"/> Falta {loan.remainingInstallments} {loan.totalInstallments ? `/ ${loan.totalInstallments}` : ''}</span>
                    </div>
                  </div>

                  <div className="flex justify-end w-full sm:w-auto ml-auto">
                    <Button variant="ghost" size="icon" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => loan.id && handleDelete(loan.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

    </div>
  );
}
