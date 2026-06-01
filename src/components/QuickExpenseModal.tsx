import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Loader2 } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { format } from "date-fns";
import { guessCategoryFromDescription } from "@/lib/categories";

export function QuickExpenseFAB() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Diversos");
  const [loading, setLoading] = useState(false);
  const { add } = useCollection<any>("transactions");

  // Auto-categorize based on description
  useEffect(() => {
    if (description) {
      setCategory(guessCategoryFromDescription(description));
    } else {
      setCategory("Diversos");
    }
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    
    setLoading(true);
    const numAmount = parseFloat(amount.replace(",", "."));
    
    await add({
      description,
      amount: numAmount,
      type: "expense",
      category: category,
      date: format(new Date(), "yyyy-MM-dd"),
      status: "paid",
      tags: ["pix", "rápido"]
    });
    
    setLoading(false);
    setOpen(false);
    setAmount("");
    setDescription("");
    setCategory("Diversos");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-40 md:bottom-8 right-4 md:right-28 w-14 h-14 rounded-full shadow-[0_10px_40px_-10px_rgba(16,185,129,0.5)] bg-emerald-600 hover:bg-emerald-700 p-0 overflow-hidden flex items-center justify-center z-50 group hover:-translate-y-1 transition-all duration-300"
        >
          <Zap className="w-6 h-6 text-emerald-100 group-hover:text-white group-hover:animate-pulse" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
              <Zap className="w-5 h-5" />
            </div>
            Lançamento Rápido
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl h-14"
              required
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label>O que foi?</Label>
            <Input
              placeholder="Ex: Almoço, Uber, Pix para João..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            {description && (
              <p className="text-xs text-slate-500 mt-1">
                Categoria detectada: <span className="font-semibold text-emerald-600">{category}</span>
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Lançar Despesa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
