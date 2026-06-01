import { useState, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, CreditCard, Sparkles, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, ShieldAlert, Target } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { useAuth } from "@/components/AuthProvider";
import { SeedDataAlert } from "@/components/SeedDataAlert";
import { BarChart, Bar, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, Cell } from "recharts";

import { useMonth } from "@/components/MonthContext";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: allTransactions, update: updateTx, loading: txLoading, error: txError } = useCollection<any>('transactions');
  const { data: debts, loading: dbLoading, error: dbError } = useCollection<any>('debts');
  
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
      progressPercentage,
      savingsPercentage,
      riskLabel,
      riskColor,
      riskBg,
      chartData,
      categoryData
    } = useMemo(() => {
      if (!allTransactions) return { monthTransactions: [], grossIncome: 0, automaticDeductions: 0, realIncome: 0, totalExpense: 0, totalPaid: 0, totalPending: 0, realBalance: 0, progressPercentage: 0, savingsPercentage: 0, riskLabel: "Calculando...", riskColor: "text-slate-500", riskBg: "bg-slate-50", chartData: [], categoryData: [] };
    
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
    
    const categoryMap: Record<string, number> = {};

    currentMonthTxs.forEach(t => {
      const amt = Number(t.amount);
      if (t.type === "income") {
        grossInc += amt;
      } else if (t.type === "deduction") {
        autoDed += amt;
      } else if (t.type === "expense") {
        expAll += amt;
        if (t.status === "paid") {
          expPaid += amt;
        } else {
          // Both "pending" and "late"
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
    // Livre real = Receita Total Disponível - Total Comprometido
    const realBalance = realInc - expAll; 
    const progress = expAll > 0 ? Math.round((expPaid / expAll) * 100) : 0;

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
      progressPercentage: progress,
      savingsPercentage: realInc > 0 ? (realBalance / realInc) * 100 : 0,
      riskLabel: rLabel,
      riskColor: rColor,
      riskBg: rBg,
      chartData,
      categoryData
    };
  }, [allTransactions, currentDate]);

  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Usuário';
  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-6 animate-in fade-in duration-500 pb-20">
      <SeedDataAlert />

      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
             Central do Mês
          </h1>
          <p className="text-sm text-slate-500 mt-1">Organize sua linha de sobrevivência.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-xl hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <span className="w-32 text-center font-bold text-slate-800 capitalize">
            {monthYearString}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-xl hover:bg-slate-100">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </Button>
        </div>
      </div>

      {/* Target/Remaining Limit Indicator */}
      <Card className={`border-none shadow-sm ${realBalance >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
         <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${realBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
               <Target className="w-6 h-6" />
            </div>
            <div>
               <p className={`text-sm font-semibold uppercase tracking-wider ${realBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {realBalance >= 0 ? 'Limite Mensal' : 'Alerta de Limite'}
               </p>
               <h2 className={`text-xl sm:text-2xl font-bold mt-1 ${realBalance >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {realBalance >= 0 
                    ? `Faltam ${formatCurrency(realBalance)} para atingir seu limite do mês.`
                    : `Você ultrapassou seu limite em ${formatCurrency(Math.abs(realBalance))}.`}
               </h2>
            </div>
         </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evolution Chart */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
           <CardContent className="p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-4">Evolução do Saldo (Últimos 6 meses)</h3>
              <div className="h-48 w-full mt-2" style={{ minWidth: 0, minHeight: 0 }}>
                 <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                   <BarChart data={chartData} margin={{ top: 0, left: -20, right: 0, bottom: 0 }}>
                     <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fontSize: 12, fill: '#94a3b8' }} 
                       dy={10} 
                     />
                     <Tooltip 
                       cursor={{ fill: 'transparent' }}
                       content={({ active, payload }) => {
                         if (active && payload && payload.length) {
                           const val = Number(payload[0].value);
                           return (
                             <div className="bg-slate-900 text-white text-xs py-1 px-2 rounded-md shadow-xl border-none">
                               {formatCurrency(val)}
                             </div>
                           );
                         }
                         return null;
                       }} 
                     />
                     <Bar dataKey="saldo" radius={[4, 4, 4, 4]}>
                       {chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.saldo >= 0 ? '#10b981' : '#f43f5e'} opacity={index === chartData.length - 1 ? 1 : 0.4} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
              </div>
           </CardContent>
        </Card>

        {/* Categories Pie Chart */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
           <CardContent className="p-5 flex flex-col h-full">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-4">Despesas por Categoria</h3>
              {categoryData.length > 0 ? (
                <div className="h-48 w-full flex-1" style={{ minWidth: 0, minHeight: 0 }}>
                   <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                  Sem despesas no mês
                </div>
              )}
           </CardContent>
        </Card>
      </div>

      {/* Month Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        
        <Card className="bg-slate-100 border-slate-200 text-slate-700 shadow-sm overflow-hidden relative">
           <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
             <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita Bruta</p>
             <p className="text-xl font-bold mt-1 text-slate-400">{formatCurrency(grossIncome)}</p>
             
             <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs font-medium text-rose-500">Descontos Automáticos (BB)</p>
                <p className="text-sm font-bold text-rose-600 mt-0.5">- {formatCurrency(automaticDeductions)}</p>
             </div>
           </CardContent>
        </Card>

        <Card className="bg-indigo-600 text-white border-none shadow-md overflow-hidden relative">
           <div className="absolute top-0 right-0 p-4 opacity-10 blur-md pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-white"></div>
           </div>
           <CardContent className="p-4 sm:p-5 relative z-10 flex flex-col justify-between h-full">
             <div className="flex gap-2 items-center">
               <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Renda Real Disponível</p>
             </div>
             <p className="text-2xl sm:text-3xl font-bold mt-2">{formatCurrency(realIncome)}</p>
             <p className="text-xs text-indigo-300 mt-2">O que realmente sobra para suas contas.</p>
           </CardContent>
        </Card>
        
        <Card className="bg-white border-slate-200 shadow-sm relative overflow-hidden">
           <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
             <div className="flex justify-between items-start">
               <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Comprometido</p>
             </div>
             <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-2">{formatCurrency(totalExpense)}</p>
             <p className="text-xs text-slate-400 mt-2">A soma de todos os gastos no mês.</p>
           </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-md relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10 blur-md pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-emerald-500"></div>
           </div>
           <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full relative z-10">
             <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Livre Real</p>
             <p className={`text-2xl sm:text-3xl font-bold mt-2 ${realBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
               {formatCurrency(realBalance)}
             </p>
             <p className="text-xs text-slate-500 mt-2">
               {savingsPercentage > 0 ? `Isso representa ${savingsPercentage.toFixed(1)}% da sua renda real.` : "Previsão no fim do mês."}
             </p>
           </CardContent>
        </Card>
      </div>

      {/* Progress & Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 text-sm">Status das Contas ({progressPercentage}%)</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
               <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-600">Pagas</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
               </div>
               <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <p className="text-xs font-medium text-orange-600">Pendentes</p>
                  <p className="text-lg font-bold text-orange-700">{formatCurrency(totalPending)}</p>
               </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-4 flex flex-col">
          <Card className={`border shadow-sm flex-1 ${riskBg}`}>
             <CardContent className="p-5 flex flex-col justify-center h-full">
               <p className="text-xs font-semibold opacity-80 uppercase tracking-wider mb-1">Diagnóstico do Mês</p>
               <div className="flex items-center gap-3">
                 <ShieldAlert className={`w-8 h-8 ${riskColor}`} />
                 <p className={`text-xl font-bold ${riskColor}`}>{riskLabel}</p>
               </div>
             </CardContent>
          </Card>
          
          <Card className="bg-indigo-50/50 border-indigo-100 shadow-sm flex-1">
             <CardContent className="p-4 flex items-start gap-3 h-full">
               <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0 mt-0.5">
                 <Sparkles className="w-5 h-5" />
               </div>
               <div>
                 <p className="text-sm font-semibold text-indigo-900">Análise do Consultor</p>
                 <p className="text-xs sm:text-sm text-indigo-700 leading-relaxed mt-1">
                   {aiInsights()}
                 </p>
               </div>
             </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerta Julho */}
      <Card className="border-orange-200 bg-orange-50 mt-6 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="bg-orange-100 p-2 rounded-xl text-orange-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-orange-900">Atenção para o próximo mês</h4>
            <p className="text-sm text-orange-800 mt-1">
              <strong>Julho</strong> terá maior pressão financeira. O terceiro empréstimo do Banco do Brasil (<strong>R$ 448,17</strong>) entrará nos descontos automáticos, reduzindo ainda mais sua <strong>Renda Real Disponível</strong>. Prepare-se cortando gastos supérfluos agora.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Timeline / Transactions List Header with Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 px-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Contas do Mês ({monthTransactions.length})</h2>
        <Button 
           variant="outline" 
           className="shadow-sm gap-2"
           onClick={() => {
              const headers = "Data,Descrição,Categoria,Tipo,Valor\n";
              const rows = monthTransactions.map(t => `${t.date},"${t.description}",${t.category || ''},${t.type},${t.amount}`);
              const csvContent = headers + rows.join("\n");
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement("a");
              const url = URL.createObjectURL(blob);
              link.setAttribute("href", url);
              link.setAttribute("download", `Transacoes_${monthYearString.replace(' ', '_')}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
           }}
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
           Exportar CSV
        </Button>
      </div>

      <div className="space-y-3">
        {monthTransactions.length === 0 ? (
          <div className="text-center bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200">
             <p className="text-slate-500">Nenhum registro encontrado para este mês.</p>
          </div>
        ) : (
          monthTransactions.map((tx: any) => {
            const isIncome = tx.type === "income";
            const isDeduction = tx.type === "deduction";
            const isPaid = tx.status === "paid" || isDeduction; // Deductions are treated as paid automatically
            const isPending = !isPaid && !isIncome;
            
            return (
              <Card key={tx.id} className={`transition-all ${
                 isDeduction ? 'opacity-80 bg-rose-50 border-rose-100' :
                 isPaid ? 'opacity-70 bg-slate-50 border-slate-100' : 
                 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}>
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-2xl shrink-0 ${
                      isIncome ? 'bg-emerald-100 text-emerald-600' :
                      isDeduction ? 'bg-rose-200 text-rose-700' :
                      isPaid ? 'bg-slate-200 text-slate-500' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {isIncome ? <ArrowUpRight className="w-5 h-5" /> :
                       isDeduction ? <ArrowDownRight className="w-5 h-5" /> :
                       isPaid ? <CheckCircle2 className="w-5 h-5" /> :
                       <Clock className="w-5 h-5" />}
                    </div>
                    
                    {/* Details */}
                    <div>
                      <h4 className={`font-semibold ${isPaid && !isDeduction ? 'text-slate-500 line-through' : isDeduction ? 'text-rose-800' : 'text-slate-800'}`}>
                        {tx.description}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${isDeduction ? 'text-rose-600' : 'text-slate-500'}`}>{tx.category}</span>
                        {tx.installmentInfo && (
                          <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            Parcela {tx.installmentInfo}
                          </span>
                        )}
                        {tx.isRecurring && !isDeduction && (
                          <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                            Recorrente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                    <div className="text-left sm:text-right">
                      <p className={`font-bold ${
                        isIncome ? 'text-emerald-600' :
                        isDeduction ? 'text-rose-700' :
                        isPaid ? 'text-slate-500' :
                        'text-slate-800'
                      }`}>
                        {isIncome ? '+' : '-'} {formatCurrency(Number(tx.amount))}
                      </p>
                      <p className={`text-xs font-medium mt-1 ${isDeduction ? 'text-rose-600' : isPaid ? 'text-emerald-600' : isIncome ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {isDeduction ? "Desconto Fixo" : isPaid ? "Pago" : isIncome ? "Recebido" : "Pendente"}
                      </p>
                    </div>

                    {!isIncome && isPending && (
                      <Button size="sm" onClick={() => handleMarkAsPaid(tx.id)} className="shrink-0 bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 shadow-sm transition-colors">
                        Pagar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {debts && debts.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-slate-900 pt-8 px-1">Seu Mapa de Dívidas Ativas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debts.sort((a: any, b: any) => a.remaining - b.remaining).map((debt: any) => (
              <Card key={debt.id} className="border-slate-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-100 p-2 rounded-xl text-rose-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{debt.bank}</p>
                      <p className="text-xs text-slate-500">{debt.type} - {debt.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{formatCurrency(Number(debt.remaining || 0))}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

    </div>
  );
}

