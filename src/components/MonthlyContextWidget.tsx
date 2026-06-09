import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCollection } from "@/hooks/useFirestore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Flame, Save, Edit3, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

type MonthlyLog = {
  id?: string;
  month: string;
  notes: string;
  isCritical: boolean;
};

export function MonthlyContextWidget({ currentDate }: { currentDate: Date }) {
  const { user } = useAuth();
  const currentMonthStr = format(currentDate, "yyyy-MM");
  const monthName = format(currentDate, "MMMM", { locale: ptBR });

  const { data: logs, add, update } = useCollection<MonthlyLog>("monthly_logs");

  const currentLog = logs.find((log) => log.month === currentMonthStr) || null;

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ notes: "", isCritical: false });

  // Update local form state when selected month changes or we finish fetching
  useEffect(() => {
    if (currentLog && !isEditing) {
      setForm({ notes: currentLog.notes, isCritical: currentLog.isCritical });
    } else if (!currentLog && !isEditing) {
      setForm({ notes: "", isCritical: false });
    }
  }, [currentLog, isEditing, currentMonthStr]);

  const handleSave = async () => {
    if (!user) return;

    if (currentLog?.id) {
      await update(currentLog.id, {
        notes: form.notes,
        isCritical: form.isCritical,
      });
    } else {
      await add({
        month: currentMonthStr,
        notes: form.notes,
        isCritical: form.isCritical,
      });
    }
    setIsEditing(false);
  };

  const isCritical = currentLog?.isCritical || false;

  return (
    <div
      className={`p-6 rounded-3xl border relative overflow-hidden transition-colors duration-300 ${isCritical && !isEditing ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200 shadow-sm"}`}
    >
      {/* Background decorations for critical mode */}
      {isCritical && !isEditing && (
        <div className="absolute -top-10 -right-10 text-rose-500/10 rotate-12 pointer-events-none">
          <Flame className="w-48 h-48" />
        </div>
      )}

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <h3
            className={`text-lg font-bold flex items-center gap-2 ${isCritical && !isEditing ? "text-rose-700" : "text-slate-900"}`}
          >
            {isCritical && !isEditing ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Edit3 className="w-5 h-5 text-slate-400" />
            )}
            Contexto do Mês
            {isCritical && !isEditing && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white px-2 py-0.5 rounded-full ml-2">
                Modo Crítico
              </span>
            )}
          </h3>
          <p
            className={`text-xs mt-1 ${isCritical && !isEditing ? "text-rose-600/80" : "text-slate-500"}`}
          >
            Resumo ou eventos atípicos em{" "}
            <span className="capitalize">{monthName}</span>
          </p>
        </div>

        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className={`w-8 h-8 p-0 rounded-full ${isCritical ? "hover:bg-rose-100 text-rose-600" : "hover:bg-slate-100 text-slate-400"}`}
          >
            <Edit3 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="relative z-10">
        {isEditing ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <textarea
              placeholder="Descreva por que este mês foi diferente. Ex: 'Desconto maior no empréstimo devido a parcelas acumuladas, compras mensais maiores por estoque, etc.'"
              className="w-full resize-y min-h-[120px] rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl transition-colors ${form.isCritical ? "bg-rose-100 text-rose-600" : "bg-slate-200 text-slate-400"}`}
                >
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <Label
                    htmlFor="critical-toggle"
                    className="font-bold text-slate-700 cursor-pointer block leading-none mb-1"
                  >
                    Ativar Modo Crítico
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Marca este mês como sobrevivência/anômalo
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="critical-toggle"
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.isCritical}
                  onChange={(e) =>
                    setForm({ ...form, isCritical: e.target.checked })
                  }
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setForm({
                    notes: currentLog?.notes || "",
                    isCritical: currentLog?.isCritical || false,
                  });
                }}
                className="rounded-xl text-slate-500"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Nota
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {currentLog?.notes ? (
              <div
                className={`text-sm leading-relaxed whitespace-pre-wrap rounded-2xl p-4 ${isCritical ? "bg-white/60 text-rose-900" : "bg-slate-50 text-slate-700 font-medium"}`}
              >
                {currentLog.notes}
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors group"
                onClick={() => setIsEditing(true)}
              >
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-white group-hover:shadow-sm transition-all text-slate-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">
                  Nada registrado neste mês
                </p>
                <p className="text-xs text-slate-500">
                  Clique aqui para adicionar contexto sobre gastos atípicos,
                  modo sobrevivência ou anomalias financeiras.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
