import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Clock,
  Landmark,
  Calendar,
  Trash2,
  HandCoins,
  Pencil,
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
  const {
    data: loans,
    add,
    remove,
    update: updateLoan,
    loading,
  } = useCollection<Loan>("loans");
  const {
    add: addTx,
    data: allTransactions,
    remove: removeTx,
    update: updateTx,
  } = useCollection<any>("transactions");
  const [openDialog, setOpenDialog] = useState(false);
  const [newLoan, setNewLoan] = useState<
    Partial<Loan> & { originalDescription?: string }
  >({});
  const [adding, setAdding] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);

  const handleEditClick = (loan: any) => {
    setNewLoan({
      bank: loan.bank === "Lançamento Manual" ? "" : loan.bank,
      description: loan.description || "",
      installmentValue: loan.installmentValue,
      remainingInstallments: loan.remainingInstallments,
      totalInstallments: loan.totalInstallments,
      dueDate: loan.dueDate,
      originalDescription: loan.description,
    } as any);
    setEditingLoanId(loan.id!);
    setOpenDialog(true);
  };

  const handleAdd = async () => {
    if (
      !newLoan.bank ||
      !newLoan.installmentValue ||
      !newLoan.remainingInstallments
    )
      return;
    setAdding(true);

    let loanIdToUse = editingLoanId;

    if (editingLoanId && editingLoanId.startsWith("manual-")) {
      // It's a manual loan being converted/edited into a real one
      const relatedTxs =
        allTransactions?.filter(
          (tx: any) =>
            tx.description === newLoan.originalDescription && !tx.loanId,
        ) || [];
      for (const tx of relatedTxs) {
        if (tx.id) await removeTx(tx.id);
      }
      loanIdToUse = null; // force creation of real loan
    }

    if (loanIdToUse) {
      // Updating an existing true loan
      await updateLoan(loanIdToUse, {
        bank: newLoan.bank,
        description: newLoan.description || "",
        installmentValue: newLoan.installmentValue,
        remainingInstallments: newLoan.remainingInstallments,
        totalInstallments:
          newLoan.totalInstallments || newLoan.remainingInstallments,
        dueDate: newLoan.dueDate || "10",
      } as any);

      // Remove pending transactions
      if (allTransactions) {
        const relatedTxs = allTransactions.filter(
          (tx: any) => tx.loanId === loanIdToUse && tx.status !== "paid",
        );
        for (const tx of relatedTxs) {
          if (tx.id) await removeTx(tx.id);
        }
      }
    } else {
      // Create new loan
      const addedId = await add({
        bank: newLoan.bank,
        description: newLoan.description || "",
        installmentValue: newLoan.installmentValue,
        remainingInstallments: newLoan.remainingInstallments,
        totalInstallments:
          newLoan.totalInstallments || newLoan.remainingInstallments,
        dueDate: newLoan.dueDate || "10",
      } as any);
      if (addedId && typeof addedId === "string") {
        loanIdToUse = addedId;
      }
    }

    if (loanIdToUse && typeof loanIdToUse === "string") {
      const now = new Date();
      const dueDate = newLoan.dueDate ? parseInt(newLoan.dueDate) : 10;

      let targetMonth = now.getMonth();
      let targetYear = now.getFullYear();
      if (now.getDate() > dueDate) {
        targetMonth += 1;
      }

      const remaining = Number(newLoan.remainingInstallments);
      const total = newLoan.totalInstallments
        ? Number(newLoan.totalInstallments)
        : remaining;
      const currentFixedInstallment = total - remaining + 1;

      for (let i = 0; i < remaining; i++) {
        let instDate = new Date(targetYear, targetMonth + i, dueDate, 12, 0, 0);
        await addTx({
          type: "expense",
          isFixed: true,
          category: "Outros",
          description: `Empréstimo: ${newLoan.bank} ${newLoan.description ? "- " + newLoan.description : ""}`,
          amount: Number(newLoan.installmentValue),
          date: format(instDate, "yyyy-MM-dd"),
          status: i === 0 && now.getDate() >= dueDate ? "paid" : "pending",
          installmentInfo: `${currentFixedInstallment + i}/${total}`,
          loanId: loanIdToUse,
        });
      }
    }

    setAdding(false);
    setOpenDialog(false);
    setNewLoan({});
    setEditingLoanId(null);
  };

  const handleDelete = async (
    id: string,
    isManual?: boolean,
    description?: string,
  ) => {
    if (isManual && description) {
      // Find all related manual transactions and delete them
      if (allTransactions) {
        const relatedTxs = allTransactions.filter(
          (tx: any) => tx.description === description && !tx.loanId,
        );
        for (const tx of relatedTxs) {
          if (tx.id) await removeTx(tx.id);
        }
      }
      return;
    }

    await remove(id);

    // Also remove related transactions
    if (allTransactions) {
      const relatedTxs = allTransactions.filter((tx: any) => tx.loanId === id);
      for (const tx of relatedTxs) {
        if (tx.id) await removeTx(tx.id);
      }
    }
  };

  const manualLoansTxs =
    allTransactions?.filter(
      (tx: any) =>
        (tx.type === "expense" || tx.type === "deduction") &&
        !tx.loanId &&
        ((tx.description &&
          tx.description.toLowerCase().includes("empréstimo")) ||
          (tx.description &&
            tx.description.toLowerCase().includes("emprestimo"))),
    ) || [];

  const groupedManualLoansMap = new Map();
  manualLoansTxs.forEach((tx: any) => {
    const existing = groupedManualLoansMap.get(tx.description);
    if (!existing || new Date(tx.date) > new Date(existing.date)) {
      groupedManualLoansMap.set(tx.description, tx);
    }
  });

  const manualLoans = Array.from(groupedManualLoansMap.values()).map((tx) => {
    let current = 0;
    let total = 0;
    if (tx.installmentInfo) {
      const match = tx.installmentInfo.match(/^(\d+)\/(\d+)$/);
      if (match) {
        current = parseInt(match[1], 10);
        total = parseInt(match[2], 10);
      }
    }
    return {
      id: `manual-${tx.id}`,
      originalTxId: tx.id,
      bank: "Lançamento Manual",
      description: tx.description,
      installmentValue: tx.amount,
      remainingInstallments: total > 0 ? total - current + 1 : 1,
      totalInstallments: total > 0 ? total : 1,
      dueDate: tx.date
        ? new Date(tx.date + "T12:00:00").getDate().toString()
        : "--",
      isManual: true,
    };
  });

  const displayLoans = [...loans, ...manualLoans];

  const totalMonthly = displayLoans.reduce(
    (acc, curr) => acc + Number(curr.installmentValue),
    0,
  );
  const totalRemaining = displayLoans.reduce(
    (acc, curr) =>
      acc + Number(curr.installmentValue) * Number(curr.remainingInstallments),
    0,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Empréstimos
          </h1>
          <p className="text-lg text-slate-500 mt-1">
            Controle os empréstimos debitados direto da sua conta.
          </p>
        </div>
        <Dialog
          open={openDialog}
          onOpenChange={(val) => {
            setOpenDialog(val);
            if (!val) {
              setEditingLoanId(null);
              setNewLoan({});
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0 bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-11">
              <Plus className="w-4 h-4" />
              Adicionar Empréstimo
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingLoanId ? "Editar Empréstimo" : "Cadastrar Empréstimo"}
              </DialogTitle>
              <DialogDescription>
                Acompanhe o que é debitado direto na sua conta.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Banco / Instituição</Label>
                <Input
                  value={newLoan.bank || ""}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, bank: e.target.value })
                  }
                  placeholder="Ex: Itaú, Caixa..."
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição (Opcional)</Label>
                <Input
                  value={newLoan.description || ""}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, description: e.target.value })
                  }
                  placeholder="Ex: Financiamento Carro"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor da Parcela (R$)</Label>
                  <Input
                    type="number"
                    value={newLoan.installmentValue || ""}
                    onChange={(e) =>
                      setNewLoan({
                        ...newLoan,
                        installmentValue: parseFloat(e.target.value),
                      })
                    }
                    placeholder="500.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia do Vencimento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={newLoan.dueDate || ""}
                    onChange={(e) =>
                      setNewLoan({ ...newLoan, dueDate: e.target.value })
                    }
                    placeholder="Ex: 10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parcelas Restantes</Label>
                  <Input
                    type="number"
                    value={newLoan.remainingInstallments || ""}
                    onChange={(e) =>
                      setNewLoan({
                        ...newLoan,
                        remainingInstallments: parseInt(e.target.value),
                      })
                    }
                    placeholder="Ex: 24"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total de Parcelas (Opcional)</Label>
                  <Input
                    type="number"
                    value={newLoan.totalInstallments || ""}
                    onChange={(e) =>
                      setNewLoan({
                        ...newLoan,
                        totalInstallments: parseInt(e.target.value),
                      })
                    }
                    placeholder="Ex: 48"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAdd}
                disabled={
                  adding ||
                  !newLoan.bank ||
                  !newLoan.installmentValue ||
                  !newLoan.remainingInstallments
                }
                className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                {adding
                  ? "Salvando..."
                  : editingLoanId
                    ? "Salvar Alterações"
                    : "Salvar Empréstimo"}
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
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">
              R${" "}
              {totalMonthly.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              Valor debitado mensalmente.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[24px]">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mb-2">
              <Landmark className="w-4 h-4 text-slate-400" />
              Saldo Devedor Estimado
            </p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">
              R${" "}
              {totalRemaining.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              Soma das parcelas restantes (sem desconto de amortização).
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-slate-800">
          Meus Empréstimos
        </h3>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 gap-4"
        >
          {loading ? (
            <div className="p-6 text-slate-500">Carregando...</div>
          ) : displayLoans.length === 0 ? (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
              className="p-12 text-center flex flex-col items-center justify-center text-slate-500 bg-white rounded-3xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                <HandCoins className="w-8 h-8" />
              </div>
              <p className="text-lg font-bold text-slate-800">
                Nenhum empréstimo cadastrado
              </p>
              <p className="max-w-xs mt-1 text-sm">
                Cadastre seus empréstimos para visualizar o quanto do seu
                salário está comprometido.
              </p>
            </motion.div>
          ) : (
            displayLoans.map((loan) => (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                key={loan.id}
              >
                <Card className="transition-all hover:shadow-md rounded-[24px] border-slate-100">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center p-5 gap-6">
                      <div className="flex items-center gap-4 w-full sm:w-1/3">
                        <div
                          className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white bg-slate-900`}
                        >
                          <HandCoins className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 leading-tight">
                            {loan.bank}
                          </h4>
                          {loan.description && (
                            <p className="text-sm text-slate-500">
                              {loan.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="w-full sm:w-1/4">
                        <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
                          Valor da Parcela
                        </p>
                        <p className="font-bold text-slate-800 text-lg font-mono tracking-tight">
                          R${" "}
                          {Number(loan.installmentValue).toLocaleString(
                            "pt-BR",
                            { minimumFractionDigits: 2 },
                          )}
                        </p>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" /> Vence dia{" "}
                          {loan.dueDate || "--"}
                        </p>
                      </div>

                      <div className="w-full sm:w-1/4">
                        <p className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">
                          Andamento
                        </p>
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-slate-400" /> Falta{" "}
                            {loan.remainingInstallments}{" "}
                            {loan.totalInstallments
                              ? `/ ${loan.totalInstallments}`
                              : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end w-full sm:w-auto ml-auto gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                          onClick={() => handleEditClick(loan)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() =>
                            loan.id &&
                            handleDelete(
                              loan.id,
                              (loan as any).isManual,
                              loan.description,
                            )
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
