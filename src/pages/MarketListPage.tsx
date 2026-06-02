import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCollection, useDoc } from "@/hooks/useFirestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Trash2,
  Pencil,
  Calculator,
  AlertTriangle,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/AuthProvider";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type MarketItem = {
  id?: string;
  name: string;
  estimatedPrice: number;
  actualPrice: number;
  purchased: boolean;
  previousPrice?: number;
};

export default function MarketListPage() {
  const { user } = useAuth();
  const currentMonthStr = format(new Date(), "yyyy-MM");
  const prevMonthStr = format(subMonths(new Date(), 1), "yyyy-MM");

  const {
    data: items,
    add,
    update,
    remove,
  } = useCollection<MarketItem>(`market_items_${currentMonthStr}`);
  const { data: budgetData, update: updateBudget } = useDoc<any>(
    "market_budgets",
    currentMonthStr,
  );

  const [openAdd, setOpenAdd] = useState(false);
  const [newItem, setNewItem] = useState<{
    name: string;
    estimatedPrice: number;
  }>({ name: "", estimatedPrice: 0 });

  const [openEdit, setOpenEdit] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketItem | null>(null);

  const [importing, setImporting] = useState(false);

  const [budgetVal, setBudgetVal] = useState<string>("");
  const [editingBudget, setEditingBudget] = useState(false);

  const budget = budgetData?.amount || 0;
  const totalEstimated = items.reduce(
    (acc, item) => acc + (Number(item.estimatedPrice) || 0),
    0,
  );
  const totalActual = items.reduce(
    (acc, item) => acc + (Number(item.purchased ? item.actualPrice : 0) || 0),
    0,
  );

  // Predict final cost: paid actual price + estimated for non-purchased
  const predictedTotal = items.reduce(
    (acc, item) =>
      acc +
      (item.purchased
        ? Number(item.actualPrice || 0)
        : Number(item.estimatedPrice || 0)),
    0,
  );

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
    if (toggled && item.actualPrice === 0 && item.estimatedPrice > 0) {
      // Auto fill with estimated if no actual price was provided yet
      await update(item.id, {
        purchased: true,
        actualPrice: item.estimatedPrice,
      });
    } else {
      await update(item.id, { purchased: toggled });
    }
  };

  const handleInlinePriceChange = async (item: MarketItem, val: string) => {
    if (!item.id) return;
    const num = parseFloat(val);
    await update(item.id, { actualPrice: isNaN(num) ? 0 : num });
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

  const importPreviousMonth = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const q = query(
        collection(db, `market_items_${prevMonthStr}`),
        where("userId", "==", user.uid),
      );
      const snap = await getDocs(q);
      const prevItems: MarketItem[] = [];
      snap.forEach((d) => prevItems.push(d.data() as MarketItem));

      for (const pItem of prevItems) {
        // Avoid duplicating if already imported
        if (
          !items.find((i) => i.name.toLowerCase() === pItem.name.toLowerCase())
        ) {
          await add({
            name: pItem.name,
            estimatedPrice:
              pItem.actualPrice > 0 ? pItem.actualPrice : pItem.estimatedPrice, // Use last actual price as new estimate
            actualPrice: 0,
            purchased: false,
            previousPrice:
              pItem.actualPrice > 0 ? pItem.actualPrice : pItem.estimatedPrice,
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    setImporting(false);
  };

  const formatCurrency = (val: number) =>
    `R$ ${Number(val).toFixed(2).replace(".", ",")}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-emerald-500" /> Mercado
        </h1>
        {items.length === 0 && (
          <Button
            variant="outline"
            onClick={importPreviousMonth}
            disabled={importing}
            className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 h-10 gap-2"
          >
            <Copy className="w-4 h-4" />
            {importing ? "Importando..." : "Repetir Mês Passado"}
          </Button>
        )}
      </div>

      {/* Budget Summary */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-8 shadow-xl shadow-slate-900/10 text-white space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">
              Orçamento Previsto
            </p>
            {editingBudget ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="w-32 bg-slate-800 border-slate-700 text-white"
                  value={budgetVal}
                  onChange={(e) => setBudgetVal(e.target.value)}
                  placeholder="0.00"
                />
                <Button
                  onClick={handleSaveBudget}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                >
                  Salvar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold">{formatCurrency(budget)}</p>
                <button
                  onClick={() => {
                    setBudgetVal(budget.toString());
                    setEditingBudget(true);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="text-center hidden sm:block">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">
              Gasto até o momento
            </p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(totalActual)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">
              Previsão Final
            </p>
            <p
              className={`text-2xl font-bold ${isOverBudget ? "text-rose-400" : "text-white"}`}
            >
              {formatCurrency(predictedTotal)}
            </p>
          </div>
        </div>

        {isOverBudget && (
          <div className="bg-rose-500/20 border border-rose-500/50 rounded-xl p-3 flex items-center gap-3 text-rose-200">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              Aviso: Sua previsão de compras ultrapassou o orçamento em{" "}
              <strong>{formatCurrency(predictedTotal - budget)}</strong>.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg">Lista de Compras</h3>
          <Button
            onClick={() => setOpenAdd(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingCart className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Sua lista está vazia</p>
            <p className="text-sm text-slate-400 mt-1">
              Nenhum item adicionado para o mês atual.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <MarketListItem
                key={item.id}
                item={item}
                onToggle={() => togglePurchased(item)}
                onUpdate={(val) => handleInlinePriceChange(item, val)}
                onEdit={() => {
                  setEditingItem(item);
                  setOpenEdit(true);
                }}
                onRemove={() =>
                  update(item.id!, { purchased: false }).then(() =>
                    remove(item.id!),
                  )
                }
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Produto</Label>
              <Input
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
                placeholder="Ex: Arroz 5kg"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Preço Esperado/Previsto (R$)</Label>
              <Input
                type="number"
                value={newItem.estimatedPrice || ""}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    estimatedPrice: parseFloat(e.target.value),
                  })
                }
                placeholder="0.00"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddItem}
              disabled={!newItem.name}
              className="w-full bg-slate-900 text-white rounded-xl h-11"
            >
              Adicionar Produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Produto</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, name: e.target.value })
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Previsto (R$)</Label>
                  <Input
                    type="number"
                    value={editingItem.estimatedPrice || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        estimatedPrice: parseFloat(e.target.value),
                      })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Pago (R$)</Label>
                  <Input
                    type="number"
                    value={editingItem.actualPrice || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        actualPrice: parseFloat(e.target.value),
                      })
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={handleUpdateItem}
              className="w-full bg-slate-900 text-white rounded-xl h-11"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MarketListItem({
  item,
  onToggle,
  onUpdate,
  onEdit,
  onRemove,
  formatCurrency,
}: {
  item: MarketItem;
  onToggle: () => void;
  onUpdate: (val: string) => void;
  onEdit: () => void;
  onRemove: () => void;
  formatCurrency: (v: number) => string;
}) {
  const [localPrice, setLocalPrice] = useState(
    item.actualPrice?.toString() || "",
  );

  useEffect(() => {
    setLocalPrice(item.actualPrice?.toString() || "");
  }, [item.actualPrice]);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 rounded-[20px] border transition-all ${item.purchased ? "bg-slate-50 border-slate-200 opacity-80" : "bg-white border-slate-200 shadow-sm"}`}
    >
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onToggle}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${item.purchased ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-slate-400"}`}
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p
            className={`font-semibold text-slate-800 text-lg leading-tight ${item.purchased ? "line-through text-slate-500" : ""}`}
          >
            {item.name}
          </p>
          <div className="flex gap-4 mt-1">
            <p className="text-xs text-slate-500 font-medium">
              Previsto:{" "}
              <span className="text-slate-700">
                {formatCurrency(item.estimatedPrice)}
              </span>
            </p>
            {item.previousPrice !== undefined && item.previousPrice > 0 && (
              <p className="text-xs text-blue-500 font-medium flex items-center gap-1">
                Mês passado: {formatCurrency(item.previousPrice)}
                {item.actualPrice && item.actualPrice > item.previousPrice ? (
                  <span className="text-rose-500 text-[10px] bg-rose-50 px-1 rounded">
                    ▲
                  </span>
                ) : item.actualPrice &&
                  item.actualPrice < item.previousPrice ? (
                  <span className="text-emerald-500 text-[10px] bg-emerald-50 px-1 rounded">
                    ▼
                  </span>
                ) : null}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <Label className="text-xs text-slate-400 uppercase font-semibold hidden sm:block">
            Preço Final
          </Label>
          <div className="relative flex-1 sm:w-28">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
              R$
            </span>
            <Input
              type="number"
              className={`pl-8 rounded-xl font-mono text-sm h-10 ${item.purchased ? "bg-transparent border-slate-200" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`}
              value={localPrice}
              onChange={(e) => setLocalPrice(e.target.value)}
              onBlur={() => onUpdate(localPrice)}
              placeholder="0.00"
            />
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-slate-400 hover:text-slate-600 p-2 shrink-0"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onRemove}
          className="text-rose-400 hover:text-rose-600 p-2 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
