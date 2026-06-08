import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingDown, Clock, ShieldCheck, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Debt = {
  id?: string;
  bank: string;
  type: string;
  total: number;
  remaining: number;
  installments: string;
  status: string;
  interest: string;
  notes?: string;
};

const getBankIconProps = (bankName: string) => {
  const name = bankName.toLowerCase();
  if (name.includes('picpay')) return { color: 'bg-emerald-500 text-white', label: 'PP' };
  if (name.includes('nubank')) return { color: 'bg-purple-600 text-white', label: 'Nu' };
  if (name.includes('itau') || name.includes('itaú')) return { color: 'bg-orange-500 text-white', label: 'IT' };
  if (name.includes('bradesco')) return { color: 'bg-red-600 text-white', label: 'Br' };
  if (name.includes('santander')) return { color: 'bg-red-500 text-white', label: 'Sa' };
  if (name.includes('caixa')) return { color: 'bg-blue-600 text-white', label: 'CX' };
  if (name.includes('inter')) return { color: 'bg-orange-500 text-white', label: 'IN' };
  if (name.includes('c6')) return { color: 'bg-zinc-800 text-white', label: 'C6' };
  if (name.includes('brasil') || name.includes('bb')) return { color: 'bg-yellow-400 text-blue-900', label: 'BB' };
  return { color: 'bg-slate-800 text-white', label: bankName.charAt(0).toUpperCase() };
};

export default function DebtsPage() {
  const { data: debts, add, update, remove, loading } = useCollection<Debt>('debts');
  const [openDialog, setOpenDialog] = useState(false);
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({ status: 'Atenção' });
  const [adding, setAdding] = useState(false);

  const [editDialog, setEditDialog] = useState(false);
  const [editDebt, setEditDebt] = useState<Partial<Debt> | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleAdd = async () => {
    if (!newDebt.bank || !newDebt.total || !newDebt.remaining) return;
    setAdding(true);
    await add(newDebt as Omit<Debt, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
    setAdding(false);
    setOpenDialog(false);
    setNewDebt({ status: 'Atenção' });
  };

  const handleEdit = async () => {
    if (!editDebt || !editDebt.id) return;
    setSavingEdit(true);
    const { id, createdAt, userId, updatedAt, ...debtData } = editDebt as any;
    await update(id, debtData);
    setSavingEdit(false);
    setEditDialog(false);
    setEditDebt(null);
  };

  const handleDelete = async () => {
    if(!editDebt?.id) return;
    await remove(editDebt.id);
    setEditDialog(false);
    setEditDebt(null);
  };

  const totalRestante = debts.reduce((acc, curr) => acc + Number(curr.remaining), 0);
  const totalOriginal = debts.reduce((acc, curr) => acc + Number(curr.total), 0);
  const pago = totalOriginal - totalRestante;

  const chartData = debts.map(d => ({
    name: d.bank,
    Original: Number(d.total),
    Restante: Number(d.remaining)
  }));

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
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">R$ {totalRestante.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100/50">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-emerald-700 flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" />
              Já pago / Amortizado
            </p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-emerald-700">R$ {Math.max(0, pago).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
          </CardContent>
        </Card>
      </div>

      {debts.length > 0 && (
        <Card className="rounded-[24px]">
          <CardContent className="p-6">
             <h4 className="text-lg font-semibold text-slate-800 mb-6">Evolução e Comparativo</h4>
             <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                   <YAxis hide />
                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                   <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                   <Bar dataKey="Original" fill="#94a3b8" radius={[4, 4, 4, 4]} maxBarSize={40} />
                   <Bar dataKey="Restante" fill="#f43f5e" radius={[4, 4, 4, 4]} maxBarSize={40} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Lista Prioritária</h3>
        
        <motion.div 
           initial="hidden"
           animate="visible"
           variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
           className="grid grid-cols-1 gap-4"
        >
          {loading ? (
             <div className="p-6 text-slate-500">Carregando suas dívidas...</div>
          ) : debts.length === 0 ? (
             <motion.div 
               variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
               className="p-12 text-center flex flex-col items-center justify-center text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200"
             >
               <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                 <ShieldCheck className="w-8 h-8"/>
               </div>
               <p className="text-lg font-bold text-slate-800">Vida sem dívidas cadastradas</p>
               <p className="max-w-xs mt-1">Nenhum registro encontrado. Que alívio! Ou cadastre sua primeira conta a quitar acima.</p>
             </motion.div>
          ) : debts.map((debt) => {
            const iconProps = getBankIconProps(debt.bank);
            return (
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} key={debt.id}>
              <Card className="transition-all hover:shadow-md rounded-[24px]">
                <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center p-5 gap-6">
                  <div className="flex items-center gap-4 w-full sm:w-1/3">
                    <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center ${iconProps.color}`}>
                       <span className="font-bold text-lg">{iconProps.label}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 leading-tight">{debt.bank}</h4>
                      <p className="text-sm text-slate-500">{debt.type}</p>
                    </div>
                  </div>

                  <div className="w-full sm:w-1/4">
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Restante</p>
                    <p className="font-bold text-slate-800 text-lg font-mono tracking-tight">R$ {Number(debt.remaining).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p className="text-sm font-mono text-slate-500">de R$ {Number(debt.total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  </div>

                  <div className="w-full sm:w-1/4">
                    <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Situação</p>
                    <div className="flex flex-col gap-1 items-start">
                       <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${debt.status === 'Quitada' ? 'bg-emerald-100 text-emerald-700' : debt.status === 'Renegociada' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>{debt.status || 'Ativa'}</span>
                       {debt.installments && <span className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/> {debt.installments} parcelas</span>}
                    </div>
                  </div>

                  <div className="flex justify-end w-full sm:w-auto ml-auto">
                    <Button variant="outline" size="sm" onClick={() => {
                        setEditDebt(debt);
                        setEditDialog(true);
                    }}>
                       <Pencil className="w-4 h-4 mr-2" />
                       Atualizar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          )})}
        </motion.div>
      </div>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="rounded-3xl max-w-md">
           <DialogHeader>
             <DialogTitle>Atualizar Dívida</DialogTitle>
             <DialogDescription>Acompanhe a renegociação ou quitação.</DialogDescription>
           </DialogHeader>
           {editDebt && (
              <div className="space-y-4 py-4">
                 <div className="space-y-2">
                   <Label>Status Atual</Label>
                   <select 
                     className="w-full p-2 border border-slate-200 rounded-xl outline-none focus:border-slate-400"
                     value={editDebt.status || 'Ativa'} 
                     onChange={e => setEditDebt({...editDebt, status: e.target.value})}
                   >
                     <option value="Ativa">Ativa / Em Aberto</option>
                     <option value="Atenção">Atenção (Atrasado)</option>
                     <option value="Renegociada">Renegociada</option>
                     <option value="Quitada">Quitada 🎉</option>
                   </select>
                 </div>
                 <div className="space-y-2">
                   <Label>Valor Restante Atualizado (R$)</Label>
                   <Input type="number" value={editDebt.remaining || ''} onChange={e => setEditDebt({...editDebt, remaining: parseFloat(e.target.value)})} />
                 </div>
                 <div className="space-y-2">
                   <Label>Anotações (Evolução, Propostas)</Label>
                   <Input value={editDebt.notes || ''} onChange={e => setEditDebt({...editDebt, notes: e.target.value})} placeholder="Ex: Fiz um acordo de 12x de R$50..." />
                 </div>
              </div>
           )}
           <DialogFooter className="flex-col sm:flex-row gap-2">
             <Button variant="outline" onClick={handleDelete} className="w-14 rounded-xl border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 px-0 flex-shrink-0 mr-auto">
               <Trash2 className="w-4 h-4" />
             </Button>
             <div className="flex gap-2 flex-1">
               <Button variant="outline" onClick={() => setEditDialog(false)} className="rounded-xl flex-1 px-8">Cancelar</Button>
               <Button onClick={handleEdit} disabled={savingEdit} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex-1 px-8">Salvar</Button>
             </div>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
