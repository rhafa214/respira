import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Filter,
  ShoppingCart,
  Home,
  Car,
  Pill,
  GraduationCap,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Pencil,
  CalendarDays,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMonth } from "@/components/MonthContext";
import { getCategoryIcon, getCategoryColor } from "@/lib/categories";

type Transaction = {
  id?: string;
  description: string;
  amount: number;
  category:
    | "Alimentação"
    | "Moradia"
    | "Transporte"
    | "Saúde"
    | "Educação"
    | "Renda"
    | "Outros";
  date: string;
  type: "income" | "expense" | "deduction";
  isFixed?: boolean;
  isRecurring?: boolean;
  installmentInfo?: string;
  status?: "paid" | "pending";
};

export default function ExpensesPage() {
  const { currentDate, setCurrentDate } = useMonth();
  const {
    data: allTransactions,
    add,
    update,
    remove,
    loading,
  } = useCollection<Transaction>("transactions");

  const [activeTab, setActiveTab] = useState<
    "fixed" | "variable" | "income" | "overdue"
  >("variable");

  const monthStr = format(currentDate, "yyyy-MM");
  const monthName = format(currentDate, "MMMM yyyy", { locale: ptBR });

  // Filter by selected month from context
  const currentMonthTxs = allTransactions.filter(
    (t) => t.date && t.date.substring(0, 7) === monthStr,
  );

  const pastOverdueBills = allTransactions.filter(
    (t) =>
      (t.type === "expense" || t.type === "deduction") &&
      t.status !== "paid" &&
      t.date.substring(0, 7) < monthStr,
  );

  const mergedTxs = [...currentMonthTxs];
  for (const overdue of pastOverdueBills) {
    if (!mergedTxs.find((tx) => tx.id === overdue.id)) {
      mergedTxs.push(overdue);
    }
  }

  const transactionsThisMonth = mergedTxs.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const incomes = transactionsThisMonth.filter((t) => t.type === "income");
  const expenses = transactionsThisMonth.filter(
    (t) => t.type === "expense" || t.type === "deduction",
  );

  const variableExpenses = expenses.filter(
    (t) =>
      !t.isFixed &&
      !t.isRecurring &&
      !t.installmentInfo &&
      !(t.description && t.description.toLowerCase().includes("empréstimo")) &&
      !(t.description && t.description.toLowerCase().includes("emprestimo")) &&
      t.type !== "deduction" &&
      !(t.status === "pending" && t.date < todayStr),
  );
  const fixedExpenses = expenses.filter(
    (t) =>
      (t.isFixed ||
        t.isRecurring ||
        !!t.installmentInfo ||
        (t.description && t.description.toLowerCase().includes("empréstimo")) ||
        (t.description && t.description.toLowerCase().includes("emprestimo")) ||
        t.type === "deduction") &&
      !(t.status === "pending" && t.date < todayStr),
  );

  const overdueExpenses = allTransactions
    .filter(
      (t) =>
        (t.type === "expense" || t.type === "deduction") &&
        t.status === "pending" &&
        t.date < todayStr,
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const displayedTransactions =
    activeTab === "variable"
      ? variableExpenses
      : activeTab === "fixed"
        ? fixedExpenses
        : activeTab === "overdue"
          ? overdueExpenses
          : incomes;
  const totalVariable = variableExpenses.reduce(
    (acc, t) => acc + Number(t.amount || 0),
    0,
  );
  const totalFixed = fixedExpenses.reduce(
    (acc, t) => acc + Number(t.amount || 0),
    0,
  );
  const totalIncome = incomes.reduce(
    (acc, t) => acc + Number(t.amount || 0),
    0,
  );
  const totalOverdue = overdueExpenses.reduce(
    (acc, t) => acc + Number(t.amount || 0),
    0,
  );

  const [openDialog, setOpenDialog] = useState(false);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: "expense",
    category: "Alimentação",
    status: "paid",
  });
  const [adding, setAdding] = useState(false);

  const [editDialog, setEditDialog] = useState(false);
  const [editTx, setEditTx] = useState<Partial<Transaction> | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPartialPaymentMode, setIsPartialPaymentMode] = useState(false);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState<string>("");

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Sincronização Automática de Despesas Fixas (mesmo que na Dashboard)
    if (loading || !allTransactions || isSyncing) return;

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
          
          const isUtility = pf.description?.toLowerCase().match(/\b(água|agua|luz|energia|enel|sabesp|sanepar|copasa|cemig|copel|celesc|light)\b/);
          const newAmount = isUtility ? 0 : ((pf as any).originalFixedAmount || pf.amount);

          await add({
            description: pf.description,
            amount: newAmount,
            category: pf.category,
            type: pf.type,
            date: format(newDate, "yyyy-MM-dd"),
            status: "pending",
            isFixed: true,
            isRecurring: pf.isRecurring,
            installmentInfo: pf.installmentInfo,
          } as any);
        }
        setIsSyncing(false);
      };
      syncFixed();
    }
  }, [allTransactions, currentDate, loading, add, isSyncing]);

  useEffect(() => {
    // One-off data cleanup requested by user for "Ração dos cachorros"
    if (!allTransactions || localStorage.getItem("racaoCleanupDone")) return;

    const cleanup = async () => {
      let madeChanges = false;
      const racaoTxs = allTransactions.filter(
        (t) => t.description && t.description.toLowerCase().includes("ração"),
      );

      for (const tx of racaoTxs) {
        if (!tx.id) continue;

        // Remove from June 2026
        if (tx.date && tx.date.startsWith("2026-06")) {
          await remove(tx.id);
          madeChanges = true;
        }
        // Unset isFixed/isRecurring globally
        else if (tx.isFixed || tx.isRecurring) {
          await update(tx.id, { isFixed: false, isRecurring: false });
          madeChanges = true;
        }
      }

      localStorage.setItem("racaoCleanupDone", "true");
    };

    cleanup();
  }, [allTransactions, remove, update]);

  const handlePrevMonth = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleAdd = async () => {
    if (!newTx.description || !newTx.amount || !newTx.date) return;
    setAdding(true);

    try {
      const baseTx = {
        ...newTx,
        type: activeTab === "income" ? "income" : "expense",
        isFixed: activeTab === "fixed",
      } as Omit<Transaction, "id" | "userId" | "createdAt">;

      const dateObj = new Date(baseTx.date + "T12:00:00");

      let matchInstallment = baseTx.installmentInfo
        ? baseTx.installmentInfo.match(/^(\d+)\/(\d+)$/)
        : null;

      if (matchInstallment) {
        let current = parseInt(matchInstallment[1]);
        let total = parseInt(matchInstallment[2]);

        for (let i = 0; i <= total - current; i++) {
          let instDate = new Date(dateObj);
          instDate.setMonth(instDate.getMonth() + i);
          let tx = {
            ...baseTx,
            date: format(instDate, "yyyy-MM-dd"),
            installmentInfo: `${current + i}/${total}`,
          };
          if (i > 0) tx.status = "pending";
          await add(tx);
        }
      } else if (baseTx.isFixed) {
        // fixed expense without installment info - project 12 months
        for (let i = 0; i < 12; i++) {
          let instDate = new Date(dateObj);
          instDate.setMonth(instDate.getMonth() + i);
          let tx = {
            ...baseTx,
            date: format(instDate, "yyyy-MM-dd"),
          };
          if (i > 0) tx.status = "pending";
          await add(tx);
        }
      } else {
        // normal variable or income
        await add(baseTx);
      }
    } catch (e) {
      console.error("Error adding recurring tx:", e);
    }

    setAdding(false);
    setOpenDialog(false);
    setNewTx({
      type: activeTab === "income" ? "income" : "expense",
      category: activeTab === "income" ? "Renda" : "Alimentação",
      status: "paid",
    });
  };

  const handleEdit = async () => {
    if (!editTx || !editTx.id) return;
    setSaving(true);
    const { id, createdAt, userId, updatedAt, ...data } = editTx as any;
    await update(id, data);
    setSaving(false);
    setEditDialog(false);
    setEditTx(null);
    setIsPartialPaymentMode(false);
    setPartialPaymentAmount("");
  };

  const handlePartialPayment = async () => {
    if (!editTx || !editTx.id || !partialPaymentAmount) return;
    const partialAmt = parseFloat(partialPaymentAmount);
    if (isNaN(partialAmt) || partialAmt <= 0) return;
    if (partialAmt >= (editTx.amount || 0)) {
      // If paying full amount or more, just pay it
      setEditTx({ ...editTx, status: "paid" });
      await handleEdit();
      return;
    }

    setSaving(true);
    const { id, createdAt, userId, updatedAt, ...originalData } = editTx as any;

    // 1. Update the original transaction to reduce its amount
    const remainingAmount = (originalData.amount || 0) - partialAmt;
    const originalFixedAmt =
      originalData.originalFixedAmount || originalData.amount;

    await update(id, {
      ...originalData,
      amount: remainingAmount,
      originalFixedAmount: originalFixedAmt,
    });

    // 2. Create a new transaction for the paid amount
    await add({
      ...originalData,
      createdAt,
      userId,
      amount: partialAmt,
      status: "paid",
      description: `${originalData.description} (Parcial)`,
      isFixed: false, // Don't duplicate the fixed tag
      isRecurring: false,
    } as Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt">);

    setSaving(false);
    setEditDialog(false);
    setEditTx(null);
    setIsPartialPaymentMode(false);
    setPartialPaymentAmount("");
  };

  const handleDelete = async () => {
    if (!editTx || !editTx.id) return;
    setSaving(true);
    await remove(editTx.id);
    setSaving(false);
    setEditDialog(false);
    setEditTx(null);
    setIsPartialPaymentMode(false);
    setPartialPaymentAmount("");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Lançamentos
        </h1>
        <Button
          onClick={() => setOpenDialog(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100 p-1.5 rounded-full flex items-center">
        <button
          onClick={() => {
            setActiveTab("income");
            setNewTx({ ...newTx, type: "income", category: "Renda" });
          }}
          className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-full transition-all flex items-center justify-center gap-2 ${activeTab === "income" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Entradas
        </button>
        <button
          onClick={() => {
            setActiveTab("fixed");
            setNewTx({ ...newTx, type: "expense" });
          }}
          className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-full transition-all flex items-center justify-center gap-2 ${activeTab === "fixed" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Fixos
        </button>
        <button
          onClick={() => {
            setActiveTab("variable");
            setNewTx({ ...newTx, type: "expense" });
          }}
          className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-full transition-all flex items-center justify-center gap-2 ${activeTab === "variable" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Variáveis
        </button>
        <button
          onClick={() => {
            setActiveTab("overdue");
            setNewTx({ ...newTx, type: "expense" });
          }}
          className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-full transition-all flex items-center justify-center gap-2 ${activeTab === "overdue" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"} ${overdueExpenses.length > 0 ? "relative" : ""}`}
        >
          Atrasadas
          {overdueExpenses.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 sm:static"></span>
          )}
        </button>
      </div>

      {activeTab === "overdue" && (
        <div className="bg-rose-50 border border-rose-100/50 p-4 rounded-3xl relative overflow-hidden flex items-start gap-3">
          <div className="bg-rose-500 p-2.5 rounded-xl text-white shrink-0 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Contas Atrasadas</h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Aqui estão listadas todas as contas que constam como não pagas e
              passaram da data de vencimento.
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-0.5">
              Total Atrasado
            </p>
            <p className="text-xl font-bold text-rose-600">
              {formatCurrency(totalOverdue)}
            </p>
          </div>
        </div>
      )}

      {activeTab === "variable" && (
        <div className="bg-[#fef6ee] border border-orange-100/50 p-4 rounded-3xl relative overflow-hidden flex items-start gap-3">
          <div className="bg-orange-400 p-2.5 rounded-xl text-white shrink-0 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Gastos Variáveis</h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Gastos que mudam todo mês de acordo com seus hábitos e escolhas do
              dia a dia.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="bg-orange-100/60 text-orange-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">
                Mercado
              </span>
              <span className="bg-orange-100/60 text-orange-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">
                Restaurante
              </span>
              <span className="bg-orange-100/60 text-orange-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">
                Transporte
              </span>
              <span className="bg-orange-100/60 text-orange-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">
                Lazer
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "income" && (
        <div className="bg-emerald-50 border border-emerald-100/50 p-4 rounded-3xl relative overflow-hidden flex items-start gap-3">
          <div className="bg-emerald-500 p-2.5 rounded-xl text-white shrink-0 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Entradas e Receitas</h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Seus salários, rendimentos e rendas extras deste mês.
            </p>
          </div>
        </div>
      )}

      {/* Month Selector */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={handlePrevMonth}
          className="p-2 text-slate-400 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="font-bold text-slate-800 capitalize text-sm">
          {monthName}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2 text-slate-400 hover:text-slate-800 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div
        className={`rounded-[32px] p-8 shadow-xl relative overflow-hidden text-white ${activeTab === "income" ? "bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-emerald-500/20" : "bg-gradient-to-br from-slate-900 to-slate-800 shadow-slate-900/10"}`}
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TrendingUp className="w-24 h-24 stroke-[1]" />
        </div>
        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1 relative z-10">
          Total de{" "}
          {activeTab === "variable"
            ? "Gastos Variáveis"
            : activeTab === "fixed"
              ? "Gastos Fixos"
              : "Entradas"}
        </p>
        <p className="text-4xl text-white tracking-tight relative z-10">
          {formatCurrency(
            activeTab === "variable"
              ? totalVariable
              : activeTab === "fixed"
                ? totalFixed
                : totalIncome,
          )}
        </p>
      </div>

      <div className="space-y-4 pt-4">
        <div className="space-y-3">
          {displayedTransactions.length === 0 ? (
            <div className="bg-white border text-center border-slate-100 rounded-[28px] p-8 flex flex-col items-center justify-center gap-3">
              <div className="text-slate-200">
                <ReceiptText className="w-10 h-10 stroke-[1]" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Nenhum registro encontrado
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Clique no + para adicionar seu primeiro registro aqui.
                </p>
              </div>
            </div>
          ) : (
            displayedTransactions.map((tx: any) => (
              <div
                key={tx.id}
                onClick={() => {
                  setEditTx(tx);
                  setEditDialog(true);
                }}
                className="group bg-white p-4 rounded-[24px] border border-slate-100/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-2xl shrink-0 transition-colors ${tx.type === "income" ? "bg-emerald-100 text-emerald-600" : getCategoryColor(tx.category || tx.description, tx.type)}`}
                  >
                    {tx.type === "income" ? (
                      <ArrowUpRight className="w-6 h-6 stroke-[1.5]" />
                    ) : (
                      getCategoryIcon(
                        tx.category || tx.description,
                        tx.type,
                        "w-6 h-6 stroke-[1.5]",
                      )
                    )}
                  </div>
                  <div className="flex flex-col justify-center gap-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[15px] tracking-tight text-slate-800 leading-none">
                        {tx.description}
                      </p>
                      {tx.installmentInfo && (
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                          {tx.installmentInfo}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[13px] text-slate-400 font-medium">
                        {new Date(tx.date + "T12:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short" },
                        )}
                      </span>
                      {tx.status === "pending" ? (
                        <span
                          className={`flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                            new Date(tx.date + "T12:00:00").getMonth() <
                              new Date().getMonth() ||
                            new Date(tx.date + "T12:00:00").getFullYear() <
                              new Date().getFullYear()
                              ? "text-rose-600 bg-rose-50"
                              : "text-orange-500 bg-orange-50"
                          }`}
                        >
                          {new Date(tx.date + "T12:00:00").getMonth() <
                            new Date().getMonth() ||
                          new Date(tx.date + "T12:00:00").getFullYear() <
                            new Date().getFullYear()
                            ? `Atrasada de ${new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}`
                            : "Pendente"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Pago
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p
                      className={`font-semibold text-[15px] tracking-tight ${tx.type === "income" ? "text-emerald-600" : "text-slate-900"}`}
                    >
                      {tx.type === "income" ? "+" : "-"}{" "}
                      {formatCurrency(Number(tx.amount))}
                    </p>
                  </div>
                  <Pencil className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              Novo Gasto {activeTab === "variable" ? "Variável" : "Fixo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={newTx.description || ""}
                onChange={(e) =>
                  setNewTx({ ...newTx, description: e.target.value })
                }
                placeholder="Ex: Supermercado"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={newTx.amount || ""}
                  onChange={(e) =>
                    setNewTx({ ...newTx, amount: parseFloat(e.target.value) })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data / Vencimento</Label>
                <Input
                  type="date"
                  value={newTx.date || ""}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input
                  value={newTx.installmentInfo || ""}
                  onChange={(e) =>
                    setNewTx({ ...newTx, installmentInfo: e.target.value })
                  }
                  placeholder="Ex: 1/12"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  value={newTx.status || "paid"}
                  onChange={(e) =>
                    setNewTx({
                      ...newTx,
                      status: e.target.value as "paid" | "pending",
                    })
                  }
                >
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                value={newTx.category}
                onChange={(e) =>
                  setNewTx({ ...newTx, category: e.target.value as any })
                }
              >
                {activeTab === "income" ? (
                  <>
                    <option value="Salário">Salário / Renda Principal</option>
                    <option value="Renda Extra">Renda Extra</option>
                    <option value="Outros">Outros</option>
                  </>
                ) : (
                  <>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Moradia">Moradia</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Educação">Educação</option>
                    <option value="Lazer">Lazer</option>
                    <option value="Vestuário">Vestuário</option>
                    <option value="Beleza">Beleza</option>
                    <option value="Contas Base">Contas Base</option>
                    <option value="Cartões e Taxas">Cartões e Taxas</option>
                    <option value="Assinaturas">Assinaturas</option>
                    <option value="Serviços">Serviços</option>
                    <option value="Presentes/Doações">Presentes/Doações</option>
                    <option value="Outros">Outros</option>
                  </>
                )}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAdd}
              disabled={
                adding || !newTx.description || !newTx.amount || !newTx.date
              }
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 text-base"
            >
              {adding ? "Salvando..." : "Adicionar Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
          </DialogHeader>
          {editTx && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={editTx.description || ""}
                  onChange={(e) =>
                    setEditTx({ ...editTx, description: e.target.value })
                  }
                  placeholder="Ex: Supermercado"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    value={editTx.amount || ""}
                    onChange={(e) =>
                      setEditTx({
                        ...editTx,
                        amount: parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data / Vencimento</Label>
                  <Input
                    type="date"
                    value={editTx.date || ""}
                    onChange={(e) =>
                      setEditTx({ ...editTx, date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Input
                    value={editTx.installmentInfo || ""}
                    onChange={(e) =>
                      setEditTx({ ...editTx, installmentInfo: e.target.value })
                    }
                    placeholder="Ex: 1/12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                    value={editTx.status || "paid"}
                    onChange={(e) =>
                      setEditTx({
                        ...editTx,
                        status: e.target.value as "paid" | "pending",
                      })
                    }
                  >
                    <option value="paid">
                      {editTx.type === "income" ? "Recebido" : "Pago"}
                    </option>
                    <option value="pending">Pendente</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <select
                  className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  value={editTx.category}
                  onChange={(e) =>
                    setEditTx({ ...editTx, category: e.target.value as any })
                  }
                >
                  {editTx.type === "income" ? (
                    <>
                      <option value="Salário">Salário / Renda Principal</option>
                      <option value="Renda Extra">Renda Extra</option>
                      <option value="Outros">Outros</option>
                    </>
                  ) : (
                    <>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Moradia">Moradia</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Educação">Educação</option>
                      <option value="Lazer">Lazer</option>
                      <option value="Vestuário">Vestuário</option>
                      <option value="Beleza">Beleza</option>
                      <option value="Contas Base">Contas Base</option>
                      <option value="Cartões e Taxas">Cartões e Taxas</option>
                      <option value="Assinaturas">Assinaturas</option>
                      <option value="Serviços">Serviços</option>
                      <option value="Presentes/Doações">
                        Presentes/Doações
                      </option>
                      <option value="Obrigações">Obrigações</option>
                      <option value="Outros">Outros</option>
                    </>
                  )}
                </select>
              </div>
              <div className="flex items-center gap-2 mt-4 pb-2">
                <input
                  type="checkbox"
                  id="isFixedEdit"
                  checked={editTx.isFixed || editTx.isRecurring || false}
                  className="w-4 h-4 rounded border-slate-300"
                  onChange={(e) =>
                    setEditTx({
                      ...editTx,
                      isFixed: e.target.checked,
                      isRecurring: e.target.checked,
                    })
                  }
                />
                <Label
                  htmlFor="isFixedEdit"
                  className="cursor-pointer font-medium"
                >
                  Lançamento Fixo (Mês a Mês)
                </Label>
              </div>

              {editTx.type !== "income" && editTx.status === "pending" && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {!isPartialPaymentMode ? (
                    <Button
                      variant="outline"
                      className="w-full text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                      onClick={() => setIsPartialPaymentMode(true)}
                    >
                      Realizar Pagamento Parcial
                    </Button>
                  ) : (
                    <div className="space-y-3 bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                      <Label className="text-indigo-900 dark:text-indigo-300">
                        Valor pago agora (R$)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={partialPaymentAmount}
                          onChange={(e) =>
                            setPartialPaymentAmount(e.target.value)
                          }
                          placeholder="Ex: 50.00"
                          className="bg-white"
                        />
                        <Button
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={handlePartialPayment}
                          disabled={saving || !partialPaymentAmount}
                        >
                          Confirmar
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        className="w-full text-xs text-indigo-600/70 hover:text-indigo-700 hover:bg-indigo-100/50"
                        onClick={() => {
                          setIsPartialPaymentMode(false);
                          setPartialPaymentAmount("");
                        }}
                      >
                        Cancelar pagamento parcial
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleDelete}
                className="w-14 rounded-xl h-11 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditDialog(false)}
                className="flex-1 rounded-xl h-11 text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEdit}
                disabled={
                  saving ||
                  !editTx?.description ||
                  !editTx?.amount ||
                  !editTx?.date
                }
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
