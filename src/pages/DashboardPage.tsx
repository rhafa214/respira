import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  parseISO,
  isPast,
  differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
  Target,
  Calendar,
  TrendingUp,
  Info,
  Activity,
  ReceiptText,
  Bot,
  Wallet,
  Bell,
  Droplet,
  Zap,
  AlertOctagon,
} from "lucide-react";

import { useCollection } from "@/hooks/useFirestore";
import { useAuth } from "@/components/AuthProvider";
import { SeedDataAlert } from "@/components/SeedDataAlert";
import { TransactionStack } from "@/components/TransactionStack";
import { MonthlyContextWidget } from "@/components/MonthlyContextWidget";
import { WaterfallChart } from "@/components/WaterfallChart";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  Cell,
} from "recharts";

import { getCategoryIcon, getCategoryColor } from "@/lib/categories";
import { useMonth } from "@/components/MonthContext";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#64748b",
];

export default function DashboardPage() {
  const ObjectEntries = Object.entries;
  const navigate = useNavigate();

  const { user } = useAuth();
  const {
    data: allTransactions,
    update: updateTx,
    add: addTx,
    loading: txLoading,
    error: txError,
  } = useCollection<any>("transactions");
  const {
    data: debts,
    loading: dbLoading,
    error: dbError,
  } = useCollection<any>("debts");

  const totalDebts = debts
    ? debts.reduce((acc, d) => acc + Number(d.remaining || 0), 0)
    : 0;

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
    predictiveAlerts,
    fixedTotal,
    variableTotal,
  } = useMemo(() => {
    if (!allTransactions)
      return {
        monthTransactions: [],
        grossIncome: 0,
        automaticDeductions: 0,
        realIncome: 0,
        totalExpense: 0,
        totalPaid: 0,
        totalPending: 0,
        realBalance: 0,
        expectedEndMonthBalance: 0,
        progressPercentage: 0,
        savingsPercentage: 0,
        riskLabel: "Calculando...",
        riskColor: "text-slate-500",
        riskBg: "bg-slate-50",
        chartData: [],
        categoryData: [],
        predictiveAlerts: [],
        fixedTotal: 0,
        variableTotal: 0,
      };

    // Filter by current month
    const currMonthStr = format(currentDate, "yyyy-MM");

    // Get all transactions for the currently selected month
    const currentMonthTxs = allTransactions.filter((t) => {
      const tMonth = t.date.substring(0, 7);
      return tMonth === currMonthStr;
    });

    // Also bring in any UNPAID expense/deduction from PAST months to carry the debt forward
    const pastOverdueBills = allTransactions.filter(
      (t) =>
        (t.type === "expense" || t.type === "deduction") &&
        t.status !== "paid" &&
        t.date.substring(0, 7) < currMonthStr,
    );

    // Combine them so past debts are accounted for in the current month's totals and visible for payment
    for (const overdue of pastOverdueBills) {
      if (!currentMonthTxs.find((tx) => tx.id === overdue.id)) {
        currentMonthTxs.push(overdue);
      }
    }

    let grossInc = 0;
    let autoDedAll = 0;
    let autoDedPaid = 0;
    let expAll = 0;
    let expPaid = 0;
    let expPending = 0;
    let fixedTotal = 0;
    let variableTotal = 0;

    // For 'extrato' real feel
    let currentlyReceivedIncome = 0;
    const nowTime = new Date().getTime();

    const categoryMap: Record<string, number> = {};

    currentMonthTxs.forEach((t) => {
      const amt = Number(t.amount);

      if (t.type === "income") {
        grossInc += amt;
        if (t.status === "paid") {
          currentlyReceivedIncome += amt;
        }
      } else if (t.type === "deduction") {
        autoDedAll += amt;
        fixedTotal += amt; // Deductions are usually fixed
        if (t.status === "paid") {
          autoDedPaid += amt;
        } else {
          // If a deduction is pending, it shouldn't mathematically affect the real balance until paid
          expPending += amt;
        }
      } else if (t.type === "expense") {
        expAll += amt;
        if (t.isFixed || t.isRecurring) {
          fixedTotal += amt;
        } else {
          variableTotal += amt;
        }

        if (t.status === "paid") {
          expPaid += amt;
        } else {
          expPending += amt;
        }

        const cat = t.category || "Outros";
        categoryMap[cat] = (categoryMap[cat] || 0) + amt;
      }
    });

    const categoryData = Object.keys(categoryMap)
      .map((key) => ({
        name: key,
        value: categoryMap[key],
      }))
      .sort((a, b) => b.value - a.value);

    const realInc = grossInc - autoDedAll;
    // Current available balance: what has dropped minus what was spent and paid
    const realBalance = currentlyReceivedIncome - expPaid - autoDedPaid;
    const expectedEndMonthBalance = realInc - expAll; // Livre real no final do mes

    const progress = expAll > 0 ? Math.round((expPaid / expAll) * 100) : 0;

    // Predictive Alerts Logic
    const upcomingBills = currentMonthTxs
      .filter(
        (tx) =>
          tx.type === "expense" &&
          tx.status !== "paid" &&
          new Date(tx.date).getTime() <=
            new Date().getTime() + 2 * 24 * 60 * 60 * 1000,
      )
      .map(
        (tx) =>
          `Atenção: Sua conta "${tx.description}" ${new Date(tx.date).getTime() < new Date().getTime() ? "venceu ou vence hoje" : "vence em breve"} (R$ ${Number(tx.amount).toFixed(2).replace(".", ",")}) e não foi marcada como paga.`,
      );

    // Budget constraints warning
    const budgetAlerts: string[] = [];
    if (Object.keys(categoryMap).length > 0 && realInc > 0) {
      const sortedCats = Object.entries(categoryMap).sort(
        (a, b) => b[1] - a[1],
      );
      if (sortedCats.length > 0) {
        const [highestCategory, amount] = sortedCats[0];
        const ratio = amount / realInc;
        if (ratio > 0.4) {
          budgetAlerts.push(
            `Cuidado: você já gastou ${(ratio * 100).toFixed(0)}% do seu cenário flexível só com ${highestCategory}. Se continuar nesse ritmo, faltará dinheiro.`,
          );
        }
      }

      if (expAll > realInc * 0.85 && expAll < realInc) {
        budgetAlerts.push(
          `Cuidado: Você já comprometeu ${((expAll / realInc) * 100).toFixed(0)}% do seu orçamento flexível este mês.`,
        );
      }
    }

    const pastOverdueAlerts =
      pastOverdueBills.length > 0
        ? [
            `Urgente: Você tem ${pastOverdueBills.length} conta(s) pendente(s) de meses anteriores somando ${formatCurrency(pastOverdueBills.reduce((acc, t) => acc + Number(t.amount), 0))}. Você pode liquidá-las diretamente abaixo na lista de transações.`,
          ]
        : [];

    const predictiveAlerts = Array.from(
      new Set([...pastOverdueAlerts, ...upcomingBills, ...budgetAlerts]),
    );

    // Build chart data for the last 6 months
    const last6Months = Array.from({ length: 6 }).map((_, i) =>
      subMonths(currentDate, 5 - i),
    );
    const chartData = last6Months.map((d) => {
      const monthStr = format(d, "yyyy-MM");
      const monthTxs = allTransactions.filter(
        (t) => t.date.substring(0, 7) === monthStr,
      );
      let mInc = 0;
      let mExp = 0;
      let mAuto = 0;
      monthTxs.forEach((t) => {
        const amt = Number(t.amount);
        if (t.type === "income") mInc += amt;
        else if (t.type === "deduction") mAuto += amt;
        else if (t.type === "expense") mExp += amt;
      });
      const mReal = mInc - mAuto - mExp;
      return {
        name: format(d, "MMM", { locale: ptBR }).substring(0, 3).toUpperCase(),
        saldo: mReal,
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

    // Sort by fixed/variable then date then amount
    currentMonthTxs.sort((a, b) => {
      const aIsFixed =
        a.isFixed ||
        a.isRecurring ||
        !!a.installmentInfo ||
        (a.description && a.description.toLowerCase().includes("empréstimo")) ||
        (a.description && a.description.toLowerCase().includes("emprestimo"))
          ? 1
          : 0;
      const bIsFixed =
        b.isFixed ||
        b.isRecurring ||
        !!b.installmentInfo ||
        (b.description && b.description.toLowerCase().includes("empréstimo")) ||
        (b.description && b.description.toLowerCase().includes("emprestimo"))
          ? 1
          : 0;

      if (aIsFixed !== bIsFixed) {
        return bIsFixed - aIsFixed; // 1 goes before 0
      }
      return (
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        Number(b.amount) - Number(a.amount)
      );
    });

    return {
      monthTransactions: currentMonthTxs,
      grossIncome: grossInc,
      automaticDeductions: autoDedAll,
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
      predictiveAlerts,
    };
  }, [allTransactions, currentDate]);

  const firstName = user?.displayName
    ? user.displayName.split(" ")[0]
    : "Usuário";
  const formatCurrency = (val: number) =>
    `R$ ${val.toFixed(2).replace(".", ",")}`;

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    "Notification" in window ? Notification.permission === "granted" : false,
  );

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Seu navegador não suporta notificações.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    if (permission === "granted") {
      new Notification("Lembretes Ativados!", {
        body: "Você será avisado sobre contas vencendo e pendentes.",
      });
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const [openSalaryConfig, setOpenSalaryConfig] = useState(false);
  const [salaryConfigForm, setSalaryConfigForm] = useState({
    amount: "",
    date: "",
  });

  const [editingUtility, setEditingUtility] = useState<any>(null);
  const [utilityAmount, setUtilityAmount] = useState<string>("");

  const handleSaveSalary = async () => {
    if (!salaryConfigForm.amount || !salaryConfigForm.date) return;

    // Find existing salary in the selected month
    const targetMonthStr = salaryConfigForm.date.substring(0, 7);
    const existingSalary = allTransactions?.find(
      (t) =>
        t.type === "income" &&
        (t.category === "Salário" ||
          t.description.toLowerCase().includes("salário")) &&
        t.date.substring(0, 7) === targetMonthStr,
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
        isRecurring: true,
      });
    }

    setOpenSalaryConfig(false);
    setSalaryConfigForm({ amount: "", date: "" });
  };

  // Sincronização Automática de Despesas Fixas do Mês Anterior
  useEffect(() => {
    if (txLoading || !allTransactions || isSyncing) return;

    const currentMonthStr = format(currentDate, "yyyy-MM");

    // Encontra todos os lançamentos fixos do passado
    const pastFixed = allTransactions.filter(
      (t) =>
        (t.isFixed || t.isRecurring) &&
        t.date.substring(0, 7) < currentMonthStr,
    );

    // Pega a versão mais recente de cada lançamento fixo (agrupando por descrição)
    const latestPastFixedMap = new Map();
    pastFixed.forEach((pf) => {
      const existing = latestPastFixedMap.get(pf.description);
      if (!existing || pf.date > existing.date) {
        latestPastFixedMap.set(pf.description, pf);
      }
    });

    const currentFixed = allTransactions.filter(
      (t) =>
        (t.isFixed || t.isRecurring) &&
        t.date.substring(0, 7) === currentMonthStr,
    );

    const missingFixed = Array.from(latestPastFixedMap.values()).filter(
      (pf) => !currentFixed.some((cf) => cf.description === pf.description),
    );

    if (missingFixed.length > 0) {
      setIsSyncing(true);
      const syncFixed = async () => {
        for (const pf of missingFixed) {
          const newDate = new Date(pf.date + "T12:00:00");
          newDate.setMonth(currentDate.getMonth());
          newDate.setFullYear(currentDate.getFullYear());

          await addTx({
            description: pf.description,
            amount: (pf as any).originalFixedAmount || pf.amount,
            category: pf.category,
            type: pf.type,
            date: format(newDate, "yyyy-MM-dd"),
            status: "pending",
            isFixed: true,
            isRecurring: pf.isRecurring,
            installmentInfo: pf.installmentInfo,
          });
        }
        setIsSyncing(false);
      };
      syncFixed();
    }
  }, [allTransactions, currentDate, txLoading, addTx, isSyncing]);

  useEffect(() => {
    if (notificationsEnabled && predictiveAlerts.length > 0) {
      const today = new Date().toDateString();
      const lastNotified = localStorage.getItem("lastNotificationDate");
      if (lastNotified !== today) {
        new Notification("Atenção com suas contas!", {
          body: predictiveAlerts[0],
        });
        localStorage.setItem("lastNotificationDate", today);
      }
    }
  }, [predictiveAlerts, notificationsEnabled]);

  const handleMarkAsPaid = async (txId: string) => {
    await updateTx(txId, { status: "paid" });
  };

  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));

  if (txError || dbError) {
    return (
      <div className="p-12 text-center text-red-500">
        Falha ao carregar seus dados. Isso normalmente acontece quando a
        configuração do banco não está conectada ou suas regras bloqueiam a
        leitura.
        <br />
        <br />[{txError || dbError}]
      </div>
    );
  }

  if (txLoading || dbLoading) {
    return (
      <div className="p-12 text-center text-slate-500">
        Sincronizando o mês...
      </div>
    );
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const utilityBills =
    allTransactions
      ?.filter((t: any) => {
        if (t.type !== "expense" && t.type !== "deduction") return false;

        const desc = t.description?.toLowerCase() || "";
        // Match common utility names
        const isUtility = desc.match(
          /(água|agua|luz|energia|enel|sabesp|sanepar|copasa|cemig|copel|celesc|light)/,
        );

        // Only monitor pending ones, or ones that were just recently paid (this month)
        if (!isUtility) return false;

        const currentMonthStr = format(currentDate, "yyyy-MM");
        const txMonth = t.date ? t.date.substring(0, 7) : "";

        if (t.status === "paid") {
          // If paid, only show it if it belongs to the currently viewed month
          return txMonth === currentMonthStr;
        }

        // If pending, show if it's from the currently viewed month OR if it is overdue (any past month)
        if (txMonth === currentMonthStr) return true;
        if (t.date < todayStr) return true; // Overdue

        return false;
      })
      .map((t: any) => {
        const daysLate =
          t.status === "pending" && t.date < todayStr
            ? differenceInDays(new Date(), parseISO(t.date))
            : 0;
        return { ...t, daysLate };
      })
      .sort((a: any, b: any) => {
        if (a.status !== b.status) {
          return a.status === "pending" ? -1 : 1;
        }
        return b.daysLate - a.daysLate;
      }) || [];

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
            onClick={() =>
              navigate("/app/assistente", {
                state: {
                  initialMessage: `Olá IA, gere um relatório detalhado das minhas finanças referente ao mês de ${format(currentDate, "MMMM", { locale: ptBR })}. Analise meus gastos, ganhos, identifique onde posso melhorar e sugira ações.`,
                },
              })
            }
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
                  const existingSalary = allTransactions?.find(
                    (t) =>
                      t.type === "income" &&
                      (t.category === "Salário" ||
                        t.description.toLowerCase().includes("salário")) &&
                      t.date.substring(0, 7) === currentMonthStr,
                  );
                  if (existingSalary) {
                    setSalaryConfigForm({
                      amount: existingSalary.amount.toString(),
                      date: existingSalary.date,
                    });
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
                    onChange={(e) =>
                      setSalaryConfigForm({
                        ...salaryConfigForm,
                        amount: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Prevista</Label>
                  <Input
                    type="date"
                    value={salaryConfigForm.date}
                    onChange={(e) =>
                      setSalaryConfigForm({
                        ...salaryConfigForm,
                        date: e.target.value,
                      })
                    }
                  />
                  <p className="text-[11px] text-slate-500">
                    Ele será lançado como uma entrada "Pendente" no extrato para
                    te ajudar na projeção, e você pode dar "Check" quando
                    receber!
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSaveSalary}
                  className="w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  Registrar Previsão
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!editingUtility}
            onOpenChange={(open) => !open && setEditingUtility(null)}
          >
            <DialogContent className="rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>Mês Atual</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-slate-600">
                  Informe o valor para{" "}
                  <strong>{editingUtility?.description}</strong>
                </p>
                <div className="space-y-2">
                  <Label>Valor da Conta (R$)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 150.00"
                    value={utilityAmount}
                    onChange={(e) => setUtilityAmount(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (editingUtility && utilityAmount) {
                      await updateTx(editingUtility.id, {
                        amount: parseFloat(utilityAmount),
                      });
                      setEditingUtility(null);
                      setUtilityAmount("");
                    }
                  }}
                  className="w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  Salvar Valor
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 rounded-full shadow-sm border border-slate-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="rounded-full w-9 h-9 hover:bg-slate-100"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <span className="w-28 text-center font-bold text-slate-800 text-sm capitalize">
            {format(currentDate, "MMMM", { locale: ptBR })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="rounded-full w-9 h-9 hover:bg-slate-100"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 auto-rows-min">
        {/* Saldo Atual Pill */}
        <div
          className={`col-span-1 md:col-span-2 ${realBalance >= 0 ? "bg-slate-900 border-slate-800 dark:bg-slate-800 dark:border-slate-700" : "bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20"} border rounded-[2rem] px-6 py-6 flex flex-col justify-center relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-sm cursor-default group`}
        >
          {realBalance >= 0 && (
            <div className="absolute right-0 top-0 -mt-8 -mr-8 w-32 h-32 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all duration-500" />
          )}
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div
              className={`w-12 h-12 rounded-full ${realBalance >= 0 ? "bg-emerald-500 dark:bg-emerald-600" : "bg-rose-500 dark:bg-rose-600"} text-white flex items-center justify-center shrink-0 shadow-sm transition-colors`}
            >
              <Wallet className="w-6 h-6" />
            </div>
            <div
              className={`ml-auto ${realBalance >= 0 ? "text-slate-300 bg-slate-800 dark:bg-slate-900 dark:text-slate-400 border border-slate-700" : "text-rose-700 bg-rose-100 dark:bg-rose-900/50 dark:text-rose-300"} px-3 py-1 text-xs font-bold rounded-full uppercase tracking-widest transition-colors`}
            >
              Saldo em Conta
            </div>
          </div>
          <p
            className={`text-3xl lg:text-4xl font-bold tracking-tight ${realBalance >= 0 ? "text-white" : "text-slate-800 dark:text-slate-50"} relative z-10`}
          >
            {formatCurrency(realBalance)}
          </p>
          <p
            className={`text-xs ${realBalance >= 0 ? "text-slate-400" : "text-slate-500 dark:text-slate-400"} font-medium mt-1 relative z-10`}
          >
            Estimativa livre ao final do mês:{" "}
            <span
              className={`font-bold ${realBalance >= 0 ? "text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}
            >
              {formatCurrency(expectedEndMonthBalance)}
            </span>
          </p>
        </div>

        {/* Entradas */}
        <div className="col-span-1 bg-[#f0fdf4] dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-[2rem] p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:scale-[1.01] cursor-default">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 dark:bg-emerald-800/50 p-3 rounded-2xl text-emerald-600 dark:text-emerald-300 shadow-sm">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Entradas
                </p>
                <div className="flex items-center gap-1.5 text-emerald-400 dark:text-emerald-500/80 text-sm font-medium mt-0.5">
                  {monthYearString} <Calendar className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 truncate">
              {formatCurrency(grossIncome)}
            </p>
          </div>
        </div>

        {/* Gastos */}
        <div className="col-span-1 bg-[#fff5f5] dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-[2rem] p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between cursor-default">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-rose-100 dark:bg-rose-800/50 p-3 rounded-2xl text-rose-500 dark:text-rose-400 shadow-sm">
                <ReceiptText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">
                  Gastos
                </p>
                <div className="flex items-center gap-1.5 text-rose-400 dark:text-rose-500/80 text-sm font-medium mt-0.5">
                  Neste mês <Calendar className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-rose-950 dark:text-rose-100 truncate">
              {formatCurrency(totalExpense)}
            </p>
          </div>
        </div>

        {/* Waterfall Chart */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            Fluxo de Caixa
          </h3>
          <div className="flex-1 min-h-[250px]">
            <WaterfallChart
              income={grossIncome}
              fixedExpenses={fixedTotal}
              variableExpenses={variableTotal}
              remaining={realBalance}
            />
          </div>
        </div>

        {/* IA Financeira */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] shadow-sm overflow-hidden h-full flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start gap-4 flex-1">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    IA Financeira: Análise do Mês
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {aiInsights()}
                  </p>
                </div>
              </div>

              {!notificationsEnabled && "Notification" in window && (
                <div className="p-5 bg-blue-50 dark:bg-blue-900/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl text-blue-500 dark:text-blue-400 shadow-sm shrink-0">
                      <Bell className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium leading-relaxed">
                      Lembretes para contas?
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={requestNotifications}
                    className="bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 shrink-0 whitespace-nowrap w-full sm:w-auto"
                  >
                    Ativar
                  </Button>
                </div>
              )}

              {predictiveAlerts.length > 0 &&
                predictiveAlerts.slice(0, 1).map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-orange-50 dark:bg-orange-900/10 flex items-start gap-4 relative overflow-hidden flex-1"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <AlertCircle className="w-20 h-20 text-orange-900 dark:text-orange-500" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl text-orange-500 shadow-sm shrink-0 z-10">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="z-10 relative">
                      <p className="font-bold text-orange-900 dark:text-orange-400">
                        Alerta de Gastos
                      </p>
                      <p className="text-sm text-orange-800 dark:text-orange-200 mt-1 leading-relaxed">
                        {alert}
                      </p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        {/* Transações (Row span 2) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Transações
            </h3>
          </div>
          <TransactionStack
            transactions={monthTransactions}
            onMarkAsPaid={handleMarkAsPaid}
          />
        </div>

        {/* Contexto do Mês (Modo Crítico) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <MonthlyContextWidget currentDate={currentDate} />
        </div>

        {/* Serviços Essenciais */}
        <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-500" />
            Monitoramento de Serviços Essenciais
          </h3>
          {utilityBills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {utilityBills.map((util: any) => {
                const isWater = util.description
                  .toLowerCase()
                  .match(/(água|agua|sabesp|sanepar|copasa)/);
                const isEnergy = util.description
                  .toLowerCase()
                  .match(/(luz|energia|enel|cemig|copel|celesc|light)/);
                const Icon = isWater ? Droplet : Zap;

                const isPaid = util.status === "paid";

                const iconColor = isPaid
                  ? "text-emerald-500"
                  : isWater
                    ? "text-cyan-500"
                    : "text-yellow-500";
                const iconBg = isPaid
                  ? "bg-emerald-100"
                  : isWater
                    ? "bg-cyan-100"
                    : "bg-yellow-100";

                const severeRisk =
                  util.status === "pending" && util.daysLate >= 30;

                let borderStyle = isPaid
                  ? "bg-[#f0fdf4] border-emerald-100"
                  : "bg-white border-slate-200";
                if (severeRisk) {
                  borderStyle = "bg-rose-50 border-rose-200";
                } else if (!isPaid && util.daysLate > 0) {
                  borderStyle = "bg-orange-50 border-orange-200";
                }

                return (
                  <div
                    key={util.id}
                    className={`p-4 rounded-3xl border ${borderStyle} flex items-center gap-4 relative overflow-hidden group`}
                  >
                    <div
                      className={`${iconBg} p-3 rounded-2xl ${iconColor} shrink-0`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 line-clamp-1">
                        {util.description}
                      </p>

                      {isPaid ? (
                        <p className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Em dia
                        </p>
                      ) : util.daysLate > 0 ? (
                        <p
                          className={`text-sm font-medium ${severeRisk ? "text-rose-600" : "text-orange-600"}`}
                        >
                          Atrasada há {util.daysLate} dias
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-slate-500">
                          Pendente ({format(parseISO(util.date), "dd/MM")})
                        </p>
                      )}

                      <p
                        className={`text-sm font-bold ${isPaid ? "text-emerald-700" : "text-slate-900"} mt-1 ${!isPaid ? "cursor-pointer hover:text-slate-600 underline decoration-slate-300 underline-offset-2" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isPaid) {
                            setEditingUtility(util);
                            setUtilityAmount(util.amount?.toString() || "");
                          }
                        }}
                        title={!isPaid ? "Clique para alterar o valor" : ""}
                      >
                        {util.amount > 0
                          ? formatCurrency(util.amount)
                          : "Definir Valor"}
                      </p>
                    </div>
                    {severeRisk && (
                      <div className="absolute top-4 right-4 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shadow-sm animate-pulse pointer-events-none">
                        Risco de Corte
                      </div>
                    )}

                    {!isPaid && util.amount > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsPaid(util.id);
                        }}
                        className="ml-auto flex-shrink-0 w-10 h-10 rounded-full hover:bg-emerald-100 hover:text-emerald-600 text-slate-400 mt-4 md:mt-0 z-10"
                        title="Marcar como paga"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center flex flex-col items-center justify-center space-y-2 text-slate-500">
              <div className="bg-slate-200/50 p-4 rounded-full mb-2">
                <AlertOctagon className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-700">
                Nenhuma conta de consumo rastreada
              </p>
              <p className="text-sm max-w-[400px]">
                Crie uma despesa e inclua palavras como{" "}
                <span className="font-bold">Água</span>,{" "}
                <span className="font-bold">Luz</span>, ou{" "}
                <span className="font-bold">Energia</span> no nome para ativar o
                monitoramento inteligente contra cortes.
              </p>
            </div>
          )}
        </div>

        {/* Dívidas Consolidadas */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <Card
            className="bg-zinc-900 border-zinc-800 dark:bg-black dark:border-zinc-900 rounded-[1.5rem] shadow-md cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-300 overflow-hidden relative group"
            onClick={() => navigate("/app/dividas")}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all duration-500 pointer-events-none" />
            <CardContent className="p-5 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="bg-rose-500/20 p-3 rounded-2xl text-rose-400 shrink-0 border border-rose-500/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-zinc-100 flex items-center gap-2">
                    Endividamento Total
                  </p>
                  <p className="text-sm text-zinc-400">
                    {debts?.length || 0} contas sob gestão
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold tracking-tight text-white">
                  {formatCurrency(totalDebts)}
                </p>
                <div className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full mt-1">
                  Ver Plano de Quitação
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
