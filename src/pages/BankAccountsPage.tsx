import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Landmark, CreditCard, Wallet, Link as LinkIcon, RefreshCcw } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { PluggyConnect } from 'react-pluggy-connect';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type BankAccount = {
  id?: string;
  name: string;
  type: string; // "conta_corrente", "poupanca", "cartao_credito"
  balance: number; // For credit cards, this is the current invoice/debt (fatura). For accounts, it's the positive balance.
  limit?: number; // Only for credit cards
};

export default function BankAccountsPage() {
  const { data: accounts, add, loading } = useCollection<BankAccount>('bank_accounts');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [openFinanceDialog, setOpenFinanceDialog] = useState(false);
  const [connectToken, setConnectToken] = useState("");
  const [newAccount, setNewAccount] = useState<Partial<BankAccount>>({ type: 'conta_corrente', balance: 0 });
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  const handleOpenFinanceSync = async () => {
    setSyncing(true);
    setSyncError("");
    setConnectToken("");
    try {
      const response = await fetch("/api/open-finance/token", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const text = await response.text();
      
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Failed to parse response:", text);
        throw new Error(`Resposta API inválida. Talvez o backend esteja reiniciando. Tente de novo.`);
      }
      
      if (!response.ok) {
        let msg = data.message || data.error;
        if (!msg) {
            msg = `Erro do Servidor (${response.status}): ${text.slice(0,100)}`;
        }
        throw new Error(msg);
      }

      setConnectToken(data.accessToken);

    } catch (err: any) {
      setSyncError(err.message || "Falha na sincronização.");
    } finally {
      setSyncing(false);
    }
  };

  const handlePluggySuccess = async (itemData: any) => {
    // When an item is connected, its data comes here. 
    // We would conceptually call our `/api/open-finance/accounts` passing `itemData.item.id` 
    // And then add those to our firestore 'bank_accounts' collection.
    // For demo purposes and since backend actually fetched this:
    try {
      setOpenFinanceDialog(false);
      setConnectToken("");
      // Call backend to fetch accounts
      const res = await fetch("/api/open-finance/accounts", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ itemId: itemData.item.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao bsucar contas");
      
      // Save all fetched accounts into firestore
      for (const acc of data.accounts) {
         let type = "conta_corrente";
         if (acc.type === "CREDIT") type = "cartao_credito";
         
         await add({
           name: acc.name + " (" + acc.bankData?.transferNumber + ")",
           type,
           balance: acc.balance,
           limit: acc.creditData?.creditLimit || 0
         } as Omit<BankAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
      }
      
      alert("Contas sincronizadas com sucesso!");
    } catch(e) {
      console.error(e);
      alert("Sucesso no Pluggy, mas erro ao salvar contas.");
    }
  };

  const handlePluggyError = (error: any) => {
    console.error("Pluggy Error:", error);
    setSyncError("Houve um erro na conexão. Tente novamente.");
    setConnectToken("");
  };

  const handleAdd = async () => {
    if (!newAccount.name || newAccount.balance === undefined) return;
    setAdding(true);
    await add(newAccount as Omit<BankAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
    setAdding(false);
    setOpenDialog(false);
    setNewAccount({ type: 'conta_corrente', balance: 0, limit: 0 });
  };

  const bankAccounts = accounts.filter(a => a.type === 'conta_corrente' || a.type === 'poupanca');
  const creditCards = accounts.filter(a => a.type === 'cartao_credito');

  const totalBalance = bankAccounts.reduce((acc, curr) => acc + Number(curr.balance), 0);
  const totalDebt = creditCards.reduce((acc, curr) => acc + Number(curr.balance), 0);
  const netBalance = totalBalance - totalDebt;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-semibold mb-3">
            <Landmark className="w-3.5 h-3.5" />
            Situação Bancária
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Bancos e Cartões</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-1">
            Mapeie o seu dinheiro e veja sua posição financeira real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={openFinanceDialog && !connectToken} onOpenChange={(open) => {
             if (!open) setOpenFinanceDialog(false);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 shrink-0 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50" onClick={() => setOpenFinanceDialog(true)}>
                <LinkIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Open Finance</span>
                <span className="sm:hidden">Sincronizar</span>
              </Button>
            </DialogTrigger>
             <DialogContent>
                 <>
                   <DialogHeader>
                     <DialogTitle>Sincronização com Open Finance</DialogTitle>
                     <DialogDescription>Conecte seus bancos automaticamente de forma segura via Pluggy / Open Finance Banco Central.</DialogDescription>
                   </DialogHeader>
                   <div className="space-y-4 py-4 text-center">
                     <div className="mx-auto w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
                        <Landmark className="w-8 h-8" />
                     </div>
                     {syncError ? (
                        <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-sm font-medium">
                           {syncError}
                        </div>
                     ) : (
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                           Para esta integração funcionar, você precisa ter as credenciais da API configuradas (PLUGGY_CLIENT_ID e SECRET) no ambiente. Se você for o desenvolvedor, verifique as variáveis de ambiente.
                        </p>
                     )}
                   </div>
                   <DialogFooter>
                     <Button onClick={handleOpenFinanceSync} disabled={syncing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                       {syncing ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                       {syncing ? 'Conectando...' : 'Iniciar Conexão Segura'}
                     </Button>
                   </DialogFooter>
                 </>
            </DialogContent>
          </Dialog>

          {connectToken && (
             <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 p-4">
                <div className="flex justify-end w-full max-w-4xl mb-2">
                   <Button variant="ghost" className="text-white hover:bg-white/20 px-3 py-1 bg-black/40 rounded-full" onClick={() => setConnectToken("")}>
                      Cancelar e Fechar X
                   </Button>
                </div>
                <div className="w-full h-full max-w-4xl bg-white rounded-xl overflow-hidden shadow-2xl relative">
                   <PluggyConnect
                      connectToken={connectToken}
                      onSuccess={handlePluggySuccess}
                      onError={handlePluggyError}
                      onClose={() => setConnectToken("")}
                   />
                </div>
             </div>
          )}

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4" />
                Adicionar Conta / Cartão
              </Button>
            </DialogTrigger>
          <DialogContent>
             <DialogHeader>
               <DialogTitle>Nova Conta ou Cartão</DialogTitle>
               <DialogDescription>Cadastre um banco ou fatura de cartão de crédito.</DialogDescription>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Tipo</Label>
                 <select 
                   className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                   value={newAccount.type} 
                   onChange={e => setNewAccount({...newAccount, type: e.target.value})}
                 >
                   <option value="conta_corrente">Conta Corrente</option>
                   <option value="poupanca">Poupança / Investimento</option>
                   <option value="cartao_credito">Cartão de Crédito</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <Label>Nome (Ex: Nubank, Itaú, XP...)</Label>
                 <Input value={newAccount.name || ''} onChange={e => setNewAccount({...newAccount, name: e.target.value})} placeholder="Nome da instituição" />
               </div>
               <div className="space-y-2">
                 <Label>
                   {newAccount.type === 'cartao_credito' ? 'Valor da Fatura Atual (R$)' : 'Saldo Atual (R$)'}
                 </Label>
                 <Input type="number" value={newAccount.balance === 0 && !newAccount.name ? '' : newAccount.balance} onChange={e => setNewAccount({...newAccount, balance: parseFloat(e.target.value)})} placeholder="Ex: 1500.00" />
               </div>
               {newAccount.type === 'cartao_credito' && (
                 <div className="space-y-2">
                   <Label>Limite do Cartão (R$)</Label>
                   <Input type="number" value={newAccount.limit || ''} onChange={e => setNewAccount({...newAccount, limit: parseFloat(e.target.value)})} placeholder="Ex: 5000.00" />
                 </div>
               )}
             </div>
             <DialogFooter>
               <Button onClick={handleAdd} disabled={adding || !newAccount.name}>
                 {adding ? 'Salvando...' : 'Adicionar'}
               </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-emerald-500" />
              Saldo nas Contas
            </p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              R$ {totalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-rose-500" />
              Faturas (Cartões)
            </p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              R$ {totalDebt.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </h3>
          </CardContent>
        </Card>
        <Card className={netBalance >= 0 ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-800/50" : "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-800/50"}>
          <CardContent className="p-6">
            <p className={`text-sm font-medium flex items-center gap-2 mb-2 ${netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              <Landmark className="w-4 h-4" />
              Situação Líquida (Caixa Real)
            </p>
            <h3 className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              R$ {netBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Bank Accounts List */}
         <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
               <Wallet className="w-5 h-5 text-slate-800 dark:text-slate-200" />
               <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Contas e Investimentos</h3>
            </div>
            
            {loading ? (
                 <div className="p-6 text-slate-500 text-sm">Carregando...</div>
            ) : bankAccounts.length === 0 ? (
                 <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                   Você ainda não adicionou contas bancárias.
                 </div>
            ) : (
                bankAccounts.map((account) => (
                    <Card key={account.id} className="transition-all hover:shadow-md">
                      <CardContent className="p-5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold shrink-0">
                               {account.name.charAt(0)}
                            </div>
                            <div>
                               <h4 className="font-semibold text-slate-800 dark:text-slate-100">{account.name}</h4>
                               <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{account.type.replace('_', ' ')}</span>
                            </div>
                         </div>
                         <div className="text-right">
                           <p className="font-bold text-emerald-600 dark:text-emerald-400">
                              + R$ {Number(account.balance).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                           </p>
                           <p className="text-xs text-slate-400">Saldo atual</p>
                         </div>
                      </CardContent>
                    </Card>
                ))
            )}
         </div>

         {/* Credit Cards List */}
         <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
               <CreditCard className="w-5 h-5 text-slate-800 dark:text-slate-200" />
               <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Cartões de Crédito</h3>
            </div>
            
            {loading ? (
                 <div className="p-6 text-slate-500 text-sm">Carregando...</div>
            ) : creditCards.length === 0 ? (
                 <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                   Você ainda não adicionou cartões de crédito.
                 </div>
            ) : (
                creditCards.map((card) => {
                    const limitPercentage = card.limit && card.limit > 0 ? (Number(card.balance) / Number(card.limit)) * 100 : 0;
                    return (
                        <Card key={card.id} className="transition-all hover:shadow-md">
                          <CardContent className="p-5">
                             <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold shrink-0">
                                     {card.name.charAt(0)}
                                  </div>
                                  <div>
                                     <h4 className="font-semibold text-slate-800 dark:text-slate-100">{card.name}</h4>
                                     <span className="text-xs text-slate-500 dark:text-slate-400">Fatura Atual</span>
                                  </div>
                               </div>
                               <div className="text-right">
                                 <p className="font-bold text-rose-600 dark:text-rose-400">
                                    R$ {Number(card.balance).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                 </p>
                                 <p className="text-xs text-slate-400">
                                    {card.limit ? `Limite: R$ ${Number(card.limit).toLocaleString('pt-BR')}` : 'Sem limite definido'}
                                 </p>
                               </div>
                             </div>
                             
                             {card.limit ? (
                               <div className="space-y-1">
                                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                     <div className={`h-1.5 rounded-full ${limitPercentage > 80 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(limitPercentage, 100)}%` }}></div>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                                     <span>Limite Comprometido</span>
                                     <span className={limitPercentage > 80 ? 'text-rose-500 font-bold' : ''}>{limitPercentage.toFixed(1)}%</span>
                                  </div>
                               </div>
                             ) : null}
                          </CardContent>
                        </Card>
                    )
                })
            )}
         </div>
      </div>

    </div>
  );
}
