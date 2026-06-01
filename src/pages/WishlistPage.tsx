import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ShoppingBag, Smartphone, Monitor, Gamepad, Sofa, Search, Star, ExternalLink, Sparkles, Popcorn, Plane, Check, Trash2, Edit2, PartyPopper } from "lucide-react";
import { useCollection } from "@/hooks/useFirestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

type WishlistItem = {
  id?: string;
  title: string;
  target: number;
  category: string;
  priority: string;
  link?: string;
  imageUrl?: string;
  purchased?: boolean;
};

export default function WishlistPage() {
  const { data: wishlist, add, update, remove, loading } = useCollection<WishlistItem>('wishlist');
  const { data: transactions } = useCollection<any>('transactions');
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<WishlistItem>>({ category: 'Eletrônicos', priority: 'Média' });
  const [adding, setAdding] = useState(false);
  
  const [purchasedModal, setPurchasedModal] = useState<WishlistItem | null>(null);

  const getAiAnalysis = (target: number) => {
    if (!transactions || transactions.length === 0) return "Analisando seu fluxo de caixa... Guarde dinheiro regularmente para atingir esse objetivo logo!";
    
    let totalReceitas = 0;
    let totalDespesas = 0;
    
    transactions.forEach(t => {
       if (t.type === 'Receita') totalReceitas += Number(t.amount || 0);
       if (t.type === 'Despesa') totalDespesas += Number(t.amount || 0);
    });
    
    // Estimate unique months of history
    const uniqueMonths = new Set(transactions.map(t => typeof t.date === 'string' ? t.date.substring(0, 7) : '')).size || 1;
    let monthlySurplus = (totalReceitas - totalDespesas) / uniqueMonths;
    
    if (monthlySurplus <= 0) {
      return "No momento, seu orçamento está no limite. Aconselho focar em reduzir algumas despesas ou aumentar a receita antes de priorizar esta compra.";
    }
    
    const monthsToWait = Math.ceil(target / monthlySurplus);
    
    if (monthsToWait <= 1) {
      return "Incrível! De acordo com seu fluxo de caixa mensal, você tem fôlego para realizar essa compra agora. Apenas cuide para não comprometer sua reserva de emergência e boas compras!";
    } else {
      return `Com base na sua situação financeira (fôlego médio de R$ ${monthlySurplus.toFixed(0)}/mês livres), uma análise realista sugere que você talvez tenha que esperar ${monthsToWait} meses guardando esse valor para comprar à vista sem estresse.`;
    }
  }

  const handleOpenEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setNewItem({ ...item });
    setOpenDialog(true);
  };

  const handleOpenNew = () => {
    setEditingItem(null);
    setNewItem({ category: 'Eletrônicos', priority: 'Média' });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!newItem.title || !newItem.target) return;
    setAdding(true);
    
    let finalImageUrl = newItem.imageUrl;
    // Sempre tentamos usar IA se não houver um link manual pré-preenchido e o nome mudar
    if (!finalImageUrl || (editingItem && newItem.title !== editingItem.title)) {
      const prompt = `high quality product photography of ${newItem.title} ${newItem.category}`;
      finalImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=400&nologo=true`;
    }

    const itemToSave = { ...newItem, imageUrl: finalImageUrl };

    if (editingItem && editingItem.id) {
       await update(editingItem.id, itemToSave);
    } else {
       await add(itemToSave as Omit<WishlistItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
    }
    
    setAdding(false);
    setOpenDialog(false);
    setEditingItem(null);
    setNewItem({ category: 'Eletrônicos', priority: 'Média' });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Deseja realmente remover este item da lista de desejos?")) {
      await remove(id);
    }
  };

  const handleMarkPurchased = async (e: React.MouseEvent, item: WishlistItem) => {
    e.stopPropagation();
    if (item.id) {
      await update(item.id, { purchased: true });
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#d946ef', '#ec4899', '#8b5cf6', '#10b981']
      });
      setPurchasedModal(item);
    }
  };

  const getIcon = (category: string) => {
    category = category.toLowerCase();
    if (category.includes("eletrônico") || category.includes("celular") || category.includes("pc")) return Smartphone;
    if (category.includes("tv") || category.includes("monitor")) return Monitor;
    if (category.includes("game") || category.includes("jogo")) return Gamepad;
    if (category.includes("casa") || category.includes("sofá") || category.includes("decoração")) return Sofa;
    if (category.includes("roupa") || category.includes("moda")) return ShoppingBag;
    if (category.includes("experiência") || category.includes("cinema") || category.includes("restaurante") || category.includes("saída")) return Popcorn;
    if (category.includes("viagem") || category.includes("passagem") || category.includes("hotel")) return Plane;
    return Star;
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'Alta') return 'bg-rose-100 text-rose-700';
    if (priority === 'Média') return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700'; // Baixa
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-50 text-fuchsia-700 text-xs font-semibold mb-3">
             <ShoppingBag className="w-3.5 h-3.5" />
             Compras Planejadas
           </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Lista de Desejos</h1>
          <p className="text-lg text-slate-500 mt-1 max-w-2xl">
            Sonhando com um iPad, sofá novo ou videogame? Cadastre seus desejos de consumo e nossa IA indicará o melhor momento financeiro e buscará ofertas nas próximas atualizações.
          </p>
        </div>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew} className="gap-2 shrink-0 bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-lg shadow-fuchsia-600/20">
              <Plus className="w-4 h-4" />
              Novo Desejo
            </Button>
          </DialogTrigger>
          <DialogContent>
             <DialogHeader>
               <DialogTitle>{editingItem ? 'Editar Desejo' : 'O que você quer comprar?'}</DialogTitle>
               <DialogDescription>{editingItem ? 'Atualize as informações do seu desejo.' : 'Adicione um item para acompanharmos promoções.'}</DialogDescription>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Nome do Produto</Label>
                 <Input value={newItem.title || ''} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="Ex: iPad Pro 11" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Preço Alvo (R$)</Label>
                   <Input type="number" value={newItem.target || ''} onChange={e => setNewItem({...newItem, target: parseFloat(e.target.value)})} placeholder="8000" />
                 </div>
                 <div className="space-y-2">
                   <Label>Prioridade</Label>
                   <select 
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                      value={newItem.priority || 'Média'} 
                      onChange={e => setNewItem({...newItem, priority: e.target.value})}
                   >
                     <option value="Baixa">Baixa (Pode esperar)</option>
                     <option value="Média">Média (Gostaria em breve)</option>
                     <option value="Alta">Alta (Preciso logo)</option>
                   </select>
                 </div>
               </div>
               <div className="space-y-2">
                 <Label>Categoria</Label>
                 <select 
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                      value={newItem.category || 'Eletrônicos'} 
                      onChange={e => setNewItem({...newItem, category: e.target.value})}
                   >
                     <option value="Eletrônicos">Eletrônicos</option>
                     <option value="Casa/Decoração">Casa e Decoração</option>
                     <option value="Jogos/Lazer">Videogames e Lazer</option>
                     <option value="Roupas/Acessórios">Roupas e Acessórios</option>
                     <option value="Experiências/Saídas">Experiências (Cinema, Jantar, etc)</option>
                     <option value="Viagens">Viagens</option>
                     <option value="Outros">Outros</option>
                   </select>
               </div>
               <div className="space-y-2">
                 <Label>Link do Produto (Opcional)</Label>
                 <Input value={newItem.link || ''} onChange={e => setNewItem({...newItem, link: e.target.value})} placeholder="https://..." />
               </div>
             </div>
             <DialogFooter>
               <Button onClick={handleSave} disabled={adding || !newItem.title || !newItem.target}>
                 {adding ? 'Salvando...' : (editingItem ? 'Salvar Alterações' : 'Adicionar Desejo')}
               </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={{
          visible: { transition: { staggerChildren: 0.1 } }
        }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {loading ? (
             <div className="p-12 col-span-full text-center text-slate-500">Buscando seus itens desejados...</div>
        ) : wishlist.length === 0 ? (
             <motion.div 
               variants={{
                 hidden: { opacity: 0, scale: 0.9 },
                 visible: { opacity: 1, scale: 1 }
               }}
               transition={{ duration: 0.3 }}
               className="col-span-full py-16 flex flex-col items-center justify-center text-center"
             >
                <div className="w-24 h-24 bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-500 rounded-full flex items-center justify-center mb-6">
                   <Search className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nada na lista de desejos</h3>
                <p className="text-slate-500 mt-2 max-w-md">Sabe aquele lançamento incrível ou item de decoração que você queria? Cadastre-o aqui e a IA cuidará de lembrar e verificar preços ideais no futuro.</p>
             </motion.div>
        ) : wishlist.map((item) => {
          const Icon = getIcon(item.category);
          const priorityClass = getPriorityColor(item.priority || 'Média');
          
          return (
            <motion.div 
               key={item.id}
               variants={{
                 hidden: { opacity: 0, y: 20 },
                 visible: { opacity: 1, y: 0 }
               }}
            >
              <Card className={`transition-all ${!item.purchased ? 'hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50' : 'opacity-80 grayscale'} overflow-hidden relative group h-full border border-slate-200 bg-white flex flex-col`}>
              
              <div className="absolute top-2 right-2 z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 {!item.purchased && (
                   <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full bg-white/90 text-indigo-600 hover:bg-white" onClick={(e) => handleOpenEdit(item)}>
                     <Edit2 className="w-4 h-4" />
                   </Button>
                 )}
                 <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full bg-white/90 text-rose-600 hover:bg-white" onClick={(e) => { if(item.id) handleDelete(e, item.id) }}>
                   <Trash2 className="w-4 h-4" />
                 </Button>
              </div>

              {item.purchased && (
                <div className="absolute inset-0 bg-emerald-500/10 z-20 pointer-events-none flex items-center justify-center">
                  <div className="bg-emerald-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 transform -rotate-12">
                    <Check className="w-5 h-5" /> COMPRADO
                  </div>
                </div>
              )}

              {item.imageUrl ? (
                <div className="w-full h-40 relative overflow-hidden bg-slate-100 flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 z-20">
                     <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${priorityClass}`}>
                       Prioridade {item.priority}
                     </span>
                  </div>
                  <div className="absolute bottom-4 left-4 z-20 text-white">
                     <p className="text-xs font-medium opacity-90 flex items-center gap-1"><Icon className="w-3.5 h-3.5" /> {item.category}</p>
                  </div>
                </div>
              ) : (
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity">
                  <Icon className="w-32 h-32 text-slate-900 -rotate-12 transform translate-x-8 -translate-y-8" />
                </div>
              )}

              <CardContent className="p-6 flex-1 flex flex-col justify-between relative z-10">
                 <div className="space-y-4">
                   {!item.imageUrl && (
                     <div className="flex justify-between items-start">
                       <div className={`bg-fuchsia-50 text-fuchsia-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm`}>
                          <Icon className="w-6 h-6" />
                       </div>
                       <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${priorityClass}`}>
                         Prioridade {item.priority}
                       </span>
                     </div>
                   )}
                   
                   <div>
                     <h3 className="text-xl font-bold text-slate-800 line-clamp-2">{item.title}</h3>
                     {!item.imageUrl && <p className="text-xs font-medium text-slate-400 mt-1">{item.category}</p>}
                   </div>
                   
                   {!item.purchased && (
                     <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 text-[11px] leading-relaxed text-indigo-700">
                        <strong><Sparkles className="inline w-3 h-3 mb-0.5 text-indigo-500 mr-1" />Análise da IA:</strong> {getAiAnalysis(item.target)}
                     </div>
                   )}
                 </div>

                 <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">Preço Alvo</p>
                      <p className="font-bold text-lg font-mono tracking-tight text-slate-800">
                        R$ {item.target?.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                       {!item.purchased && (
                         <Button onClick={(e) => handleMarkPurchased(e, item)} size="sm" variant="outline" className="h-8 rounded-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700">
                           <Check className="w-4 h-4 mr-1" /> Marcar
                         </Button>
                       )}
                       {item.link ? (
                         <a href={item.link} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors">
                           <ExternalLink className="w-4 h-4" />
                         </a>
                       ) : (
                         <div className="text-[10px] text-fuchsia-500 font-medium flex items-center gap-1 opacity-60">
                           <Sparkles className="w-3 h-3" />
                         </div>
                       )}
                    </div>
                 </div>
              </CardContent>
            </Card>
            </motion.div>
          )
        })}

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
             <DialogTrigger asChild>
               <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-fuchsia-300 transition-colors cursor-pointer group h-full min-h-[250px]">
                  <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center space-y-4">
                     <div className="w-16 h-16 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-500 group-hover:scale-110 transition-transform">
                        <Plus className="w-8 h-8" />
                     </div>
                     <div>
                        <p className="font-bold text-slate-800 text-lg">Adicionar Desejo</p>
                        <p className="text-sm text-slate-500 mt-1 max-w-[200px] mx-auto">Coloque aquele item especial aqui.</p>
                     </div>
                  </CardContent>
               </Card>
             </DialogTrigger>
          </Dialog>
        </motion.div>
      </motion.div>

      <AnimatePresence>
         {purchasedModal && (
            <Dialog open={!!purchasedModal} onOpenChange={(v) => !v && setPurchasedModal(null)}>
               <DialogContent className="sm:max-w-md text-center">
                  <DialogHeader className="flex flex-col items-center">
                     <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 relative">
                        <PartyPopper className="w-10 h-10" />
                        <motion.div 
                          className="absolute inset-0 rounded-full border-4 border-emerald-400"
                          initial={{ scale: 0.8, opacity: 1 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                     </div>
                     <DialogTitle className="text-2xl text-emerald-700">Parabéns!</DialogTitle>
                     <DialogDescription className="text-base mt-2">
                        Você conquistou o seu <strong>{purchasedModal.title}</strong>!
                     </DialogDescription>
                  </DialogHeader>
                  <p className="py-4 text-emerald-800 font-medium">
                     "Pequenas ou grandes vitórias, todas fazem a diferença na sua jornada financeira. Continue assim!"
                  </p>
                  <DialogFooter className="sm:justify-center">
                     <Button type="button" onClick={() => setPurchasedModal(null)} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                        Comemorar e Fechar
                     </Button>
                  </DialogFooter>
               </DialogContent>
            </Dialog>
         )}
      </AnimatePresence>

    </div>
  );
}
