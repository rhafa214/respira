import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Loader2, Bot, User } from "lucide-react";
import Markdown from "react-markdown";

export default function AssistantPage() {
  const [messages, setMessages] = useState<{ role: "model" | "user", text: string }[]>([
    { role: "model", text: "Olá! Sou sua assistente financeira pessoal. Como posso te ajudar a organizar suas contas ou quitar suas dívidas hoje?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || !auth.currentUser) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      // Fetch user data context
      const uid = auth.currentUser.uid;
      const transactionsSnap = await getDocs(query(collection(db, "transactions"), where("userId", "==", uid)));
      const debtsSnap = await getDocs(query(collection(db, "debts"), where("userId", "==", uid)));
      const goalsSnap = await getDocs(query(collection(db, "goals"), where("userId", "==", uid)));

      const transactions = transactionsSnap.docs.map(d => d.data());
      const debts = debtsSnap.docs.map(d => d.data());
      const goals = goalsSnap.docs.map(d => d.data());

      let contextStr = `Cenário Financeiro do Usuário (seja acolhedor, conciso, como um consultor pessoal expert):\n\n`;
      contextStr += `Transações recentes (${transactions.length}):\n${transactions.slice(-5).map(t => `- R$ ${t.amount} em ${t.category} (${t.type}) no dia ${t.date}`).join('\n')}\n`;
      contextStr += `Dívidas ativas:\n${debts.map(d => `- ${d.bank}: Restam R$ ${d.remaining} de R$ ${d.total} (Status: ${d.status})`).join('\n')}\n`;
      contextStr += `Metas:\n${goals.map(g => `- ${g.title}: R$ ${g.current} de R$ ${g.target}`).join('\n')}\n`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const promptContext = `${contextStr}\nPergunta do usuário: "${userMessage}"`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: promptContext,
        config: {
          systemInstruction: "Você é o 'Consultor IA', especialista financeiro no Brasil focado em recuperação, estabilidade e saúde mental. DIRETRIZES: 1) O usuário possui alta pressão financeira, margem mensal extremamente sufocada (totalmente comprometida) e zero reserva. 2) Foco em estabilidade, sobrevivência financeira e orientar prioridades lógicas de pagamento do mês. 3) CUIDADO COM A CULPA: Evite culpa excessiva, aja com extrema empatia. O usuário está lutando para sobreviver. 4) Destaque que pequenas vitórias são progressos reais. 5) Incentive o uso da 'Verba de Respiro' (R$ 130) para o lazer controlado e consciente, mantendo a sanidade do usuário, isso NÃO é irresponsabilidade. 6) Alerte de forma calma que Julho será mais difícil devido à entrada do Empréstimo BB 3 (R$ 448). Seja direto, como um conselheiro parceiro e calmo. Sem formatação markdown exaustiva.",
          temperature: 0.7,
        }
      });
      
      if (response.text) {
         setMessages(prev => [...prev, { role: "model", text: response.text! }]);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: "model", text: "Desculpe, tive um problema de conexão. Poderia tentar novamente?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-80px)] md:h-screen">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
           <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Seu Consultor</h1>
          <p className="text-sm text-slate-500">Tire dúvidas, peça conselhos ou monte estratégias</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 relative shadow-sm border border-slate-100">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((m, idx) => (
             <div key={idx} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
               <div className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center ${m.role === 'model' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                 {m.role === 'model' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
               </div>
               <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] text-sm sm:text-base ${m.role === 'model' ? 'bg-slate-50 text-slate-800 rounded-tl-sm' : 'bg-emerald-500 text-white rounded-tr-sm'}`}>
                  {m.role === 'model' ? (
                     <div className="markdown-body prose prose-slate prose-sm sm:prose-base leading-relaxed">
                       <Markdown>{m.text}</Markdown>
                     </div>
                  ) : (
                     m.text
                  )}
               </div>
             </div>
          ))}
          {loading && (
             <div className="flex gap-4 flex-row">
               <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                 <Bot className="w-5 h-5" />
               </div>
               <div className="px-5 py-3.5 rounded-2xl bg-slate-50 flex items-center gap-2 text-slate-500 rounded-tl-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Pensando...</span>
               </div>
             </div>
          )}
          <div ref={bottomRef} />
        </div>
        
        <div className="p-4 bg-white border-t border-slate-100 rounded-b-3xl">
           <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
             <Input 
                className="flex-1 h-12 text-base rounded-full border-slate-200 px-6 focus-visible:ring-indigo-500"
                placeholder="Pergunte sobre seus limites, como quitar algo, ou se vale a pena gastar..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
             />
             <Button type="submit" size="icon" className="h-12 w-12 rounded-full shrink-0 bg-indigo-600 hover:bg-indigo-700" disabled={loading || !input.trim()}>
                <Send className="w-5 h-5" />
             </Button>
           </form>
        </div>
      </Card>
    </div>
  );
}
