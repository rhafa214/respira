import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Target, Plane, Home, Rocket, Star } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Goal = {
  id?: string;
  title: string;
  target: number;
  current: number;
  label: string;
};

export default function GoalsPage() {
  const { data: goals, add, loading } = useCollection<Goal>('goals');
  const [openDialog, setOpenDialog] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({ label: 'Sonho', current: 0 });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newGoal.title || !newGoal.target) return;
    setAdding(true);
    await add(newGoal as Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
    setAdding(false);
    setOpenDialog(false);
    setNewGoal({ label: 'Sonho', current: 0 });
  };

  const getIcon = (label: string) => {
    if (label.includes("Viagem") || label.includes("Lazer")) return Plane;
    if (label.includes("Casa") || label.includes("Reforma")) return Home;
    if (label.includes("Emergência")) return Target;
    return Star;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-3">
             <Rocket className="w-3.5 h-3.5" />
             Área de Sonhos
           </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Suas Metas</h1>
          <p className="text-lg text-slate-500 mt-1">
            Transforme dívidas em planos. Para onde vamos agora?
          </p>
        </div>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4" />
              Novo Sonho
            </Button>
          </DialogTrigger>
          <DialogContent>
             <DialogHeader>
               <DialogTitle>Criar Novo Sonho</DialogTitle>
               <DialogDescription>Qual o próximo passo financeiro?</DialogDescription>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Título do Sonho</Label>
                 <Input value={newGoal.title || ''} onChange={e => setNewGoal({...newGoal, title: e.target.value})} placeholder="Ex: Viagem para Europa" />
               </div>
               <div className="space-y-2">
                 <Label>Categoria / Etiqueta</Label>
                 <Input value={newGoal.label || ''} onChange={e => setNewGoal({...newGoal, label: e.target.value})} placeholder="Ex: Viagem, Carro, Emergência..." />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Alvo (R$)</Label>
                   <Input type="number" value={newGoal.target || ''} onChange={e => setNewGoal({...newGoal, target: parseFloat(e.target.value)})} placeholder="10000" />
                 </div>
                 <div className="space-y-2">
                   <Label>Já Guardado (R$)</Label>
                   <Input type="number" value={newGoal.current !== undefined ? newGoal.current : ''} onChange={e => setNewGoal({...newGoal, current: parseFloat(e.target.value)})} placeholder="500" />
                 </div>
               </div>
             </div>
             <DialogFooter>
               <Button onClick={handleAdd} disabled={adding || !newGoal.title || !newGoal.target}>
                 {adding ? 'Salvando...' : 'Salvar Sonho'}
               </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
             <div className="p-12 col-span-full text-center text-slate-500">Buscando seus sonhos...</div>
        ) : goals.map((goal) => {
          const Icon = getIcon(goal.label);
          const percentage = Math.max(0, Math.min(100, Math.round((goal.current / goal.target) * 100)));
          const bg = "bg-indigo-500";
          
          return (
            <Card key={goal.id} className="transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 cursor-pointer overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity">
                <Icon className="w-32 h-32 text-slate-900 -rotate-12 transform translate-x-8 -translate-y-8" />
              </div>
              <CardContent className="p-6 h-full flex flex-col justify-between">
                 <div className="space-y-4">
                   <div className="flex justify-between items-start">
                     <div className={`${bg} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                        <Icon className="w-6 h-6" />
                     </div>
                     <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                       {goal.label}
                     </span>
                   </div>
                   
                   <div>
                     <h3 className="text-xl font-bold text-slate-800">{goal.title}</h3>
                     <p className="text-sm font-medium text-slate-400 mt-1">Faltam R$ {Math.max(0, goal.target - goal.current).toLocaleString('pt-BR')}</p>
                   </div>
                 </div>

                 <div className="mt-8 space-y-2">
                   <div className="flex justify-between text-sm font-bold">
                     <span className={`text-indigo-600`}>R$ {goal.current?.toLocaleString('pt-BR') || 0}</span>
                     <span className="text-slate-400">R$ {goal.target?.toLocaleString('pt-BR') || 0}</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`${bg} h-2 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
                   </div>
                   <p className="text-xs text-right text-slate-500 font-medium pt-1">{percentage}% concluído</p>
                 </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Add Goal Empty State Trigger */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
           <DialogTrigger asChild>
             <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-colors cursor-pointer group">
                <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center space-y-4 min-h-[280px]">
                   <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8" />
                   </div>
                   <div>
                      <p className="font-bold text-slate-800 text-lg">Criar novo sonho</p>
                      <p className="text-sm text-slate-500 mt-1 max-w-[200px]">Carro novo? Faculdade? Casamento? O limite é seu.</p>
                   </div>
                </CardContent>
             </Card>
           </DialogTrigger>
        </Dialog>
      </div>

    </div>
  );
}
