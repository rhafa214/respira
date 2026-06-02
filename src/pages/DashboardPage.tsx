import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowUpRight, ArrowDownRight, CreditCard, Sparkles, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, ShieldAlert, Target, Calendar, TrendingUp, Info, Activity, ReceiptText, Bot, Wallet } from "lucide-react";

import { useCollection } from "@/hooks/useFirestore";
import { useAuth } from "@/components/AuthProvider";
import { SeedDataAlert } from "@/components/SeedDataAlert";
import { BarChart, Bar, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, Cell } from "recharts";

import { getCategoryIcon, getCategoryColor } from "@/lib/categories";
import { useMonth } from "@/components/MonthContext";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export default function DashboardPage() {
  const ObjectEntries = Object.entries;
  const navigate = useNavigate();
  
  const { user } = useAuth();
  const { data: allTransactions, update: updateTx, add: addTx, loading: txLoading, error: txError } = useCollection<any>('transactions');
  const { data: debts, loading: dbLoading, error: dbError } = useCollection<any>('debts');
  
  const totalDebts = debts ? debts.reduce((acc, d) => acc + Number(d.remaining || 0), 0) : 0;

  // Use actual current date so the selected month is synced out of the box
  const { currentDate, setCurrentDate } = useMonth();

  const monthYearString = format(currentDate, "MMMM yyyy", { locale: ptBR });
  
    const {
      monthTransactions,
      grossIncome,
      automaticDeductions,
      realIncome,
      totalExpense,
      totalPaid,
      totalPending,
      realBalance,
      expectedEndMonthBalance,
      progressPercentage,
      savingsPercentage,
      riskLabel,
      riskColor,
      riskBg,
      chartData,
      categoryData,
      predictiveAlerts
    } = useMemo(() => {
      if (!allTransactions) return { monthTransactions: [], grossIncome: 0, automaticDeductions: 0, realIncome: 0, totalExpense: 0, totalPaid: 0, totalPending: 0, realBalance: 0, expectedEndMonthBalance: 0, progressPercentage: 0, savingsPercentage: 0, riskLabel: "Calculando...", riskColor: "text-slate-500", riskBg: "bg-slate-50", chartData: [], categoryData: [], predictiveAlerts: [] };
    
    // Filter by current month
    const currentMonthTxs = allTransactions.filter(t => {
      // Avoid timezone shift issues by extracting just yyyy-MM
      const tMonth = t.date.substring(0, 7); 
      const currMonth = format(currentDate, "yyyy-MM");
      return tMonth === currMonth;
    });

    let grossInc = 0;
    let autoDed = 0;
    let expAll = 0;
    let expPaid = 0;
    let expPending = 0;
    
    // For 'extrato' real feel
    let currentlyReceivedIncome = 0;
    const nowTime = new Date().getTime();
    
    const categoryMap: Record<string, number> = {};

    currentMonthTxs.forEach(t => {
      const amt = Number(t.amount);
      const isPastOrToday = new Date(t.date + 'T12:00:00').getTime() <= nowTime;

      if (t.type === "income") {
        grossInc += amt;
        if (t.status === "paid" || isPastOrToday) {
           currentlyReceivedIncome += amt;
        }
      } else if (t.type === "deduction") {
        autoDed += amt;
      } else if (t.type === "expense") {
        expAll += amt;
        if (t.status === "paid") {
          expPaid += amt;
        } else {
          expPending += amt;
        }
        
        const cat = t.category || "Outros";
        categoryMap[cat] = (categoryMap[cat] || 0) + amt;
      }
    });

    const categoryData = Object.keys(categoryMap).map(key => ({
      name: key,
      value: categoryMap[key]
    })).sort((a, b) => b.value - a.value);

    const realInc = grossInc - autoDed;
    // Current available balance: what has dropped minus what was spent and paid
    const realBalance = currentlyReceivedIncome - expPaid - autoDed; 
    const expectedEndMonthBalance = realInc - expAll; // Livre real no final do mes
    
    const progress = expAll > 0 ? Math.round((expPaid / expAll) * 100) : 0;

    // Predictive Alerts Logic
    const upcomingBills = currentMonthTxs.filter(tx => 
      tx.type === "expense" && 
      tx.status !== "paid" && 
      new Date(tx.date).getTime() <= new Date().getTime() + 2 * 24 * 60 * 60 * 1000
    ).map(tx => `Atenção: Sua conta "${tx.description}" ${new Date(tx.date).getTime() < new Date().getTime() ? 'venceu ou vence hoje' : 'vence em breve'} (R$ ${Number(tx.amount).toFixed(2).replace('.',',')}) e não foi marcada como paga.`);
    
    // Budget constraints warning
    const budgetAlerts: string[] = [];
    if (Object.keys(categoryMap).length > 0 && realInc > 0) {
      const sortedCats = Object.entries(categoryMap).sort((a,b) => b[1] - a[1]);
      if (sortedCats.length > 0) {
        const [highestCategory, amount] = sortedCats[0];
        const ratio = amount / realInc;
        if (ratio > 0.4) {
          budgetAlerts.push(`Cuidado: você já gastou ${(ratio * 100).toFixed(0)}% do seu cenário flexível só com ${highestCategory}. Se continuar nesse ritmo, faltará dinheiro.`);
        }
      }
      
      if (expAll > realInc * 0.85 && expAll < realInc) {
        budgetAlerts.push(`Cuidado: Você já comprometeu ${((expAll/realInc)*100).toFixed(0)}% do seu orçamento flexível este mês.`);
      }
    }
    
    const predictiveAlerts = Array.from(new Set([...upcomingBills, ...budgetAlerts]));

    // Build chart data for the last 6 months
    const last6Months = Array.from({length: 6}).map((_, i) => subMonths(currentDate, 5 - i));
    const chartData = last6Months.map(d => {
      const monthStr = format(d, "yyyy-MM");
      const monthTxs = allTransactions.filter(t => t.date.substring(0, 7) === monthStr);
      let mInc = 0; let mExp = 0; let mAuto = 0;
      monthTxs.forEach(t => {
        const amt = Number(t.amount);
        if (t.type === 'income') mInc += amt;
        else if (t.type === 'deduction') mAuto += amt;
        else if (t.type === 'expense') mExp += amt;
      });
      const mReal = (mInc - mAuto) - mExp;
      return {
        name: format(d, "MMM", { locale: ptBR }).substring(0, 3).toUpperCase(),
        saldo: mReal
      };
    });

    let rLabel = "Estável (Sob Controle)";
    let rColor = "text-emerald-600";
    let rBg = "bg-emerald-50 text-emerald-600";

    if (realInc > 0) {
      const ratio = expAll / realInc;
      if (ratio > 0.98) {
         rLabel = "Sufoco Financeiro (Risco)";
         rColor = "text-rose-600";
         rBg = "bg-rose-50 text-rose-600";
      } else if (ratio > 0.85) {
         rLabel = "Margem Apertada (Atenção)";
         rColor = "text-orange-600";
         rBg = "bg-orange-50 text-orange-600";
      }
    }

    // Sort by date then amount
    currentMonthTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || Number(b.amount) - Number(a.amount));

    return {
      monthTransactions: currentMonthTxs,
      grossIncome: grossInc,
      automaticDeductions: autoDed,
      realIncome: realInc,
      totalExpense: expAll,
      totalPaid: expPaid,
      totalPending: expPending,
      realBalance,
      expectedEndMonthBalance,
      progressPercentage: progress,
      savingsPercentage: realInc > 0 ? (realBalance / realInc) * 100 : 0,
      riskLabel: rLabel,
      riskColor: rColor,
      riskBg: rBg,
      chartData,
      categoryData,
      predictiveAlerts
    };
  }, [allTransactions, currentDate]);

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Usuário';
  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  const [isSyncing, setIsSyncing] = useState(false);
  
  const [openSalaryConfig, setOpenSalaryConfig] = useState(false);
  const [salaryConfigForm, setSalaryConfigForm] = useState({ amount: "", date: "" });

  const handleSaveSalary = async () => {
    if (!salaryConfigForm.amount || !salaryConfigForm.date) return;
    
    // Find existing salary in the selected month
    const targetMonthStr = salaryConfigForm.date.substring(0, 7);
    const existingSalary = allTransactions?.find(t => 
      t.type === "income" && 
      (t.category === "Salário" || t.description.toLowerCase().includes("salário")) && 
      t.date.substring(0, 7) === targetMonthStr
    );

    if (existingSalary) {
      await updateTx(existingSalary.id, {
        amount: parseFloat(salaryConfigForm.amount),
        date: salaryConfigForm.date,
        description: "Salário",
      });
    } else {
      await addTx({
        description: "Salário",
        amount: parseFloat(salaryConfigForm.amount),
        category: "Salário",
        type: "income",
        date: salaryConfigForm.date,
        status: "pending", 
        isFixed: true,
        isRecurring: true
      });
    }
    
    setOpenSalaryConfig(false);
    setSalaryConfigForm({ amount: "", date: "" });
  };
  
  // Sincronização Automática de Despesas Fixas do Mês Anterior
  useEffect(() => {
    if (txLoading || !allTransactions || isSyncing) return;

    const currentMonthStr = format(currentDate, "yyyy-MM");
    const prevMonthDate = new Date(currentDate);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonthStr = format(prevMonthDate, "yyyy-MM");

    const prevFixed = allTransactions.filter(t => t.isFixed && t.date.substring(0, 7) === prevMonthStr);
    const currentFixed = allTransactions.filter(t => t.isFixed && t.date.substring(0, 7) === currentMonthStr);

    const missingFixed = prevFixed.filter(pf => 
      !currentFixed.some(cf => cf.description === pf.description && cf.amount === pf.amount)
    );

    if (missingFixed.length > 0) {
      setIsSyncing(true);
      const syncFixed = async () => {
        for (const pf of missingFixed) {
          const newDate = new Date(pf.date + 'T12:00:00');
          newDate.setMonth(currentDate.getMonth());
          newDate.setFullYear(currentDate.getFullYear());
          
          await addTx({
            description: pf.description,
            amount: pf.amount,
            category: pf.category,
            type: pf.type,
            date: format(newDate, "yyyy-MM-dd"),
            status: 'pending',
            isFixed: true,
            isRecurring: pf.isRecurring,
            installmentInfo: pf.installmentInfo
          });
        }
        setIsSyncing(false);
      };
      syncFixed();
    }
  }, [allTransactions, currentDate, txLoading, addTx, isSyncing]);

  const handleMarkAsPaid = async (txId: string) => {
    await updateTx(txId, { status: "paid" });
  };

  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));

  if (txError || dbError) {
    return <div className="p-12 text-center text-red-500">
      Falha ao carregar seus dados. Isso normalmente acontece quando a configuração do banco não está conectada ou suas regras bloqueiam a leitura.
      <br/><br/>
      [{txError || dbError}]
    </div>;
  }

  if (txLoading || dbLoading) {
    return <div className="p-12 text-center text-slate-500">Sincronizando o mês...</div>;
  }

  const aiInsights = () => {
    if (realBalance < 0) {
      return "Seu orçamento está extremamente comprometido. O foco atual é estabilidade financeira. Evite novas dívidas ou parcelamentos a todo custo.";
    } else if (realBalance < 400) {
      return `Você tem apenas ${formatCurrency(realBalance)} de margem real. Você conseguiu manter o mês dentro do controle. Lembre-se: pequenas vitórias também são progresso. Mantenha os nervos calmos.`;
    }
    
    if (savingsPercentage > 0) {
      return `Mês sob controle! Você economizou ${savingsPercentage.toFixed(1)}% da sua renda esse mês (${formatCurrency(realBalance)} livres). Aproveite sua Verba de Respiro sem culpa, ela é importante para a sua saúde mental.`;
    }
    
    return "Mês sob controle! Aproveite sua Verba de Respiro sem culpa excessiva, ela é importante para a sua saúde mental.";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <SeedDataAlert />

      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
             Visão Geral
          </h1>
          <Button 
            variant="outline" 
            className="rounded-full gap-2 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 h-9"
            onClick={() => navigate('/app/assistente', { state: { initialMessage: `Olá IA, gere um relatório detalhado das minhas finanças referente ao mês de ${format(currentDate, "MMMM", { locale: ptBR })}. Analise meus gastos, ganhos, identifique onde posso melhorar e sugira ações.` } })}
          >
            <Bot className="w-4 h-4" /> Relatório Mês
          </Button>

          <Dialog open={openSalaryConfig} onOpenChange={setOpenSalaryConfig}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="rounded-full gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 h-9"
                onClick={() => {
                  const currentMonthStr = format(currentDate, "yyyy-MM");
                  const existingSalary = allTransactions?.find(t => 
                    t.type === "income" && 
                    (t.category === "Salário" || t.description.toLowerCase().includes("salário")) && 
                    t.date.substring(0, 7) === currentMonthStr
                  );
                  if (existingSalary) {
                    setSalaryConfigForm({ amount: existingSalary.amount.toString(), date: existingSalary.date });
                  } else {
                    setSalaryConfigForm({ amount: "", date: "" });
                  }
                }}
              >
                <Wallet className="w-4 h-4" /> Configurar Salário
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>Quando seu salário cai?</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Valor Estimado Previsto (R$)</Label>
                  <Input 
                     type="number" 
                     placeholder="Ex: 3500.00" 
                     value={salaryConfigForm.amount} 
                     onChange={e => setSalaryConfigForm({...salaryConfigForm, amount: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Prevista</Label>
                  <Input 
                     type="date" 
                     value={salaryConfigForm.date} 
                     onChange={e => setSalaryConfigForm({...salaryConfigForm, date: e.target.value})} 
                  />
                  <p className="text-[11px] text-slate-500">Ele será lançado como uma entrada "Pendente" no extrato para te ajudar na projeção, e você pode dar "Check" quando receber!</p>
                </div>
              </div>
              <DialogFooter>
                 <Button onClick={handleSaveSalary} className="w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
                    Registrar Previsão
                 </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-full shadow-sm border border-slate-100">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-full w-9 h-9 hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <span className="w-28 text-center font-bold text-slate-800 text-sm capitalize">
            {format(currentDate, "MMMM", { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-full w-9 h-9 hover:bg-slate-100">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Saldo Atual Pill */}
          <div className={`${realBalance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'} border rounded-[2rem] px-6 py-6 flex flex-col justify-center relative overflow-hidden transition-colors`}>
             <div className="flex items-center gap-4 mb-4">
               <div className={`w-12 h-12 rounded-full ${realBalance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} text-white flex items-center justify-center shrink-0 shadow-sm transition-colors z-10`}>
                 {realBalance >= 0 ? (
                   <ArrowUpRight className="w-6 h-6" />
                 ) : (
                   <ArrowDownRight className="w-6 h-6" />
                 )}
               </div>
               <div className={`ml-auto ${realBalance >= 0 ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'} px-3 py-1 text-xs font-bold rounded-full uppercase tracking-widest z-10 transition-colors`}>
                  Saldo
               </div>
             </div>
             <p className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-800 z-10">{formatCurrency(realBalance)}</p>
             <p className="text-xs text-slate-500 font-medium mt-1">Estimativa livre fim do mês: {formatCurrency(expectedEndMonthBalance)}</p>
          </div>

          {/* Entradas */}
          <div className="bg-[#f8f5ff] border border-violet-100 rounded-[2rem] p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                   <div className="bg-violet-100 p-3 rounded-2xl text-violet-600 shadow-sm">
                      <TrendingUp className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Entradas</p>
                      <div className="flex items-center gap-1.5 text-violet-400 text-sm font-medium mt-0.5">
                         {monthYearString} <Calendar className="w-3.5 h-3.5" />
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="mt-2">
                <p className="text-3xl lg:text-4xl font-bold tracking-tight text-violet-950">{formatCurrency(grossIncome)}</p>
             </div>
          </div>

          {/* Gastos */}
          <div className="bg-[#f0fdf4] border border-emerald-100 rounded-[2rem] p-6 relative overflow-hidden group hover:shadow-md transition-shadow flex flex-col justify-between">
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-emerald-400 rounded-r-lg" />
             <div className="flex justify-between items-start pl-2 mb-4">
                <div className="flex items-center gap-3 text-emerald-500">
                   <ReceiptText className="w-7 h-7" />
                   <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Gastos</p>
                      <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium mt-0.5">
                         Neste mês <Calendar className="w-3.5 h-3.5" />
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="pl-2 mt-2">
                <p className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">{formatCurrency(totalExpense)}</p>
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left/Middle Column (Insights) */}
        <div className="space-y-6">
          
          {/* Desafios & Insights */}
          <div>
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-900">IA Financeira</h3>
               <span className="text-emerald-600 text-sm font-semibold cursor-pointer hover:underline">Ver Análise</span>
            </div>
            
            <Card className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden">
              <CardContent className="p-0">
                 <div className="p-5 border-b border-slate-100 flex items-start gap-4">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 shrink-0">
                       <Target className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="font-bold text-slate-800">Progresso do Mês</p>
                       <p className="text-sm text-slate-500 mt-1 leading-relaxed">{aiInsights()}</p>
                    </div>
                 </div>
                 
                 {predictiveAlerts.length > 0 && predictiveAlerts.slice(0,1).map((alert, idx) => (
                   <div key={idx} className="p-5 bg-orange-50 flex items-start gap-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <AlertCircle className="w-20 h-20 text-orange-900" />
                      </div>
                      <div className="bg-white p-2.5 rounded-xl text-orange-500 shadow-sm shrink-0 z-10">
                         <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="z-10 relative">
                         <p className="font-bold text-orange-900">Alerta de Gastos</p>
                         <p className="text-sm text-orange-800 mt-1 leading-relaxed">{alert}</p>
                      </div>
                   </div>
                 ))}
              </CardContent>
            </Card>
          </div>

          {/* Dívidas Consolidadas */}
          <div>
            <div className="flex justify-between items-center mb-4 mt-6">
               <h3 className="text-lg font-bold text-slate-900">Endividamento</h3>
               <span className="text-emerald-600 text-sm font-semibold cursor-pointer hover:underline" onClick={() => navigate('/app/dividas')}>Ver Detalhes</span>
            </div>
            <Card className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden" onClick={() => navigate('/app/dividas')}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="bg-rose-50 p-3 rounded-2xl text-rose-600 shrink-0">
                      <ShieldAlert className="w-6 h-6" />
                   </div>
                   <div>
                      <p className="font-bold text-slate-800">Saldo Devedor Total</p>
                      <p className="text-sm text-slate-500">{debts?.length || 0} contas sob gestão</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-xl font-bold tracking-tight text-rose-600">{formatCurrency(totalDebts)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column (Transactions) */}
        <div>
          {/* Transações Recentes Simplificado */}
          <div>
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-900">Transações</h3>
            </div>
            <div className="space-y-3">
              {monthTransactions.length === 0 ? (
                <div className="text-center px-6 py-8 border border-dashed border-slate-200 rounded-[1.5rem]">
                   <p className="text-slate-500 text-sm">Nenhum registro encontrado.</p>
                </div>
              ) : (
                 monthTransactions.map((tx: any) => {
                  const isIncome = tx.type === "income";
                  const isDeduction = tx.type === "deduction";
                  const isPaid = tx.status === "paid" || isDeduction;
                  const isPastOrToday = new Date(tx.date + 'T12:00:00').getTime() <= new Date().getTime();
                  const isOverdue = !isPaid && !isIncome && !isDeduction && isPastOrToday;
                  
                  return (
                    <div key={tx.id} className={`flex items-center justify-between bg-white p-4 rounded-[1.25rem] border shadow-sm transition-all ${isOverdue ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/50 relative overflow-hidden' : 'border-slate-100'}`}>
                       {isOverdue && (
                         <div className="absolute top-0 right-0 w-8 h-8 bg-rose-50 rounded-bl-[1.25rem] flex items-center justify-center">
                           <AlertCircle className="w-4 h-4 text-rose-500" />
                         </div>
                       )}
                       <div className="flex items-center gap-4">
                         <div className={`p-2.5 rounded-[14px] shrink-0 ${isOverdue ? 'bg-rose-100 text-rose-600' : isPaid && !isIncome && !isDeduction ? 'bg-slate-100 text-slate-400' : getCategoryColor(tx.category || tx.description, tx.type)}`}>
                           {getCategoryIcon(tx.category || tx.description, tx.type, "w-5 h-5 stroke-[1.5]")}
                         </div>
                         <div>
                            <p className={`font-semibold text-sm tracking-tight ${isOverdue ? 'text-rose-900' : isPaid && !isDeduction && !isIncome ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              {tx.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                               <p className="text-xs text-slate-400 font-medium">{new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</p>
                               {isOverdue && (
                                 <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded text-left mt-0">Atrasado</span>
                               )}
                               {!isPaid && !isOverdue && !isIncome && (
                                 <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded text-left mt-0">Pendente</span>
                               )}
                               {!isPaid && isIncome && (
                                 <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded text-left mt-0">Previsto</span>
                               )}
                            </div>
                         </div>
                       </div>
                       <div className="flex items-center gap-2 z-10">
                         <div className="text-right">
                            <p className={`font-bold text-[15px] tracking-tight ${isOverdue ? 'text-rose-600' : isIncome ? 'text-violet-600' : isDeduction ? 'text-rose-600' : 'text-slate-800'}`}>
                               {isIncome ? '+' : '-'} {formatCurrency(Number(tx.amount))}
                            </p>
                         </div>
                         {!isPaid && !isDeduction && (
                           <button 
                             onClick={() => handleMarkAsPaid(tx.id)}
                             title="Marcar como Pago/Recebido"
                             className="ml-2 w-8 h-8 rounded-full border-2 border-slate-200 text-slate-300 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 flex items-center justify-center shrink-0 transition-all bg-white"
                           >
                             <CheckCircle2 className="w-5 h-5" />
                           </button>
                         )}
                       </div>
                    </div>
                  )
                 })
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
