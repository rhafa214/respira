import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Loader2, Bot, User, Mic, Square, Volume2, Phone, PhoneOff } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Helper for pcm
function pcmToBase64(pcmData: Float32Array): string {
  const pcm16 = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const buffer = new ArrayBuffer(pcm16.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < pcm16.length; i++) {
    view.setInt16(i * 2, pcm16[i], true); // little-endian
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function AssistantPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<{ role: "model" | "user", text: string }[]>([
    { role: "model", text: "Olá! Sou sua assistente financeira pessoal. Como posso te ajudar a organizar suas contas ou revisar seu mês?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);

  // Live WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (location.state?.initialMessage) {
      handleSend(undefined, location.state.initialMessage);
      // clear the state so it doesn't run again on reload if not intended, but usually it's fine
    }
  }, [location.state]);

  const handleSend = async (audioBase64?: string, textParam?: string) => {
    const textToSend = textParam || input;
    if ((!textToSend.trim() && !audioBase64) || !user) return;

    const userMessage = textToSend.trim();
    if (!textParam) setInput("");
    
    setMessages(prev => [...prev, { role: "user", text: userMessage || "🎙️ Áudio enviado" }]);
    setLoading(true);

    try {
      // Fetch user data context
      const uid = user.uid;
      const currentMonthStr = format(new Date(), "yyyy-MM");
      
      const transactionsSnap = await getDocs(query(collection(db, "transactions"), where("userId", "==", uid)));
      const debtsSnap = await getDocs(query(collection(db, "debts"), where("userId", "==", uid)));
      const goalsSnap = await getDocs(query(collection(db, "goals"), where("userId", "==", uid)));
      const marketSnap = await getDocs(query(collection(db, `market_items_${currentMonthStr}`), where("userId", "==", uid)));
      const marketBudgetSnap = await getDoc(doc(db, "market_budgets", currentMonthStr));

      const transactions = transactionsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const debts = debtsSnap.docs.map(d => d.data());
      const goals = goalsSnap.docs.map(d => d.data());
      const marketItems = marketSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const marketBudget = marketBudgetSnap.exists() ? marketBudgetSnap.data().amount : null;

      let contextStr = `Cenário Financeiro do Usuário (seja acolhedor, conciso, como um consultor pessoal expert):\n\n`;
      contextStr += `Transações recentes (${transactions.length}):\n${transactions.slice(-15).map(t => `- ID: ${t.id} | Descrição: ${t.description} | R$ ${t.amount} em ${t.category} (${t.type}) dia ${t.date} ${t.installmentInfo ? '| Parcela: '+t.installmentInfo : ''}`).join('\n')}\n`;
      contextStr += `Dívidas ativas:\n${debts.map(d => `- ${d.bank}: Restam R$ ${d.remaining} de R$ ${d.total} (Status: ${d.status})`).join('\n')}\n`;
      contextStr += `Metas:\n${goals.map(g => `- ${g.title}: R$ ${g.current} de R$ ${g.target}`).join('\n')}\n`;
      contextStr += `Lista de Mercado (Mês ${currentMonthStr}): ${marketBudget ? `(Orçamento Mensal Mercado: R$ ${marketBudget})` : ''}\n${marketItems.map(m => `- ID: ${m.id} | ${m.name} | Previsto: R$ ${m.estimatedPrice} | Gasto: R$ ${m.actualPrice} | Comprado: ${m.purchased ? 'Sim' : 'Não'}`).join('\n')}\n`;

      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { 
          role: "model", 
          text: "Erro: A chave da API do Gemini não foi encontrada! Acesse as Environment Variables do seu projeto, adicione a chave (GEMINI_API_KEY) e faça um novo deploy (Redeploy)." 
        }]);
        setLoading(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const promptContext = `${contextStr}\nPergunta do usuário: "${userMessage || 'Por favor, escute o áudio anexo e siga com a solicitação.'}"`;

      const addTransactionDeclaration: FunctionDeclaration = {
        name: "addTransaction",
        description: "Adiciona uma nova transação (gasto ou ganho) ao banco de dados financeiro do usuário.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "O valor da transação em Reais (positivo, ex: 54)." },
            category: { type: Type.STRING, description: "A categoria (ex: 'Mercado', 'Gasolina', 'Salário', 'Lazer')." },
            type: { type: Type.STRING, description: "'expense' para gastos ou 'income' para ganhos." },
            date: { type: Type.STRING, description: "A data no formato 'YYYY-MM-DDT12:00:00Z'. Tente deduzir a data correta para 'hoje'." },
            description: { type: Type.STRING, description: "Descrição opcional." },
            installmentInfo: { type: Type.STRING, description: "Informação sobre parcelas correspondentes ao mês dessa mesma transação, ex: '8/36'" }
          },
          required: ["amount", "category", "type", "date"]
        }
      };

      const updateTransactionDeclaration: FunctionDeclaration = {
        name: "updateTransaction",
        description: "Atualiza uma transação existente baseada no seu ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            transactionId: { type: Type.STRING, description: "O ID da transação a ser atualizada (você deve procurar o ID na lista de Transações recentes)." },
            amount: { type: Type.NUMBER, description: "O novo valor da transação, se houver alteração." },
            category: { type: Type.STRING, description: "A nova categoria." },
            description: { type: Type.STRING, description: "A nova descrição." },
            installmentInfo: { type: Type.STRING, description: "A nova informação de parcela ex: '8/36'." },
            status: { type: Type.STRING, description: "Status pago ('paid') ou pendente ('pending')" },
            date: { type: Type.STRING, description: "YYYY-MM-DD" }
          },
          required: ["transactionId"]
        }
      };

      const addMarketItemDeclaration: FunctionDeclaration = {
        name: "addMarketItem",
        description: "Adiciona um novo item à lista de compras de mercado do mês atual.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "O nome do item (ex: Arroz 5kg)" },
            estimatedPrice: { type: Type.NUMBER, description: "O preço estimado do item, se houver" }
          },
          required: ["name"]
        }
      };

      const updateMarketItemDeclaration: FunctionDeclaration = {
        name: "updateMarketItem",
        description: "Atualiza um item da lista de compras (preço real ou comprado).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            itemId: { type: Type.STRING, description: "O ID do item de mercado" },
            actualPrice: { type: Type.NUMBER, description: "O preço realmente pago ao colocar no carrinho" },
            purchased: { type: Type.BOOLEAN, description: "Se o item foi comprado / colocado no carrinho" }
          },
          required: ["itemId"]
        }
      };

      const contents: any[] = [promptContext];
      if (audioBase64) {
        contents.push({
          inlineData: {
            mimeType: "audio/webm",
            data: audioBase64
          }
        });
      }

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          systemInstruction: "Você é o 'Consultor IA', especialista financeiro. Você pode responder perguntas e ajudar o usuário a registrar ou atualizar transações com as funções fornecidas. Se ele pedir para atualizar ou editar algo, localize o ID na lista e use updateTransaction. Pode também atualizar itens na sua lista de mercado. Não mencione o ID textualmente na resposta, apenas diga que alterou de forma amigável.",
          temperature: 0.7,
          tools: [{ functionDeclarations: [addTransactionDeclaration, updateTransactionDeclaration, addMarketItemDeclaration, updateMarketItemDeclaration] }]
        }
      });
      
      let finalMessage = aiResponse.text || "";
      
      const functionCalls = aiResponse.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        let addedCount = 0;
        let updatedCount = 0;
        let addedMarketCount = 0;
        let updatedMarketCount = 0;
        for (const call of functionCalls) {
          if (call.name === 'addTransaction') {
            const args = call.args as any;
            try {
              await addDoc(collection(db, "transactions"), {
                amount: args.amount,
                category: args.category,
                type: args.type,
                date: args.date,
                description: args.description || "",
                installmentInfo: args.installmentInfo,
                userId: uid,
                status: 'paid', // default assumption
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              addedCount++;
            } catch (err) {
              console.error("Falha ao adicionar:", err);
            }
          }
          if (call.name === 'updateTransaction') {
             const args = call.args as any;
             try {
               const updateData: any = { updatedAt: new Date().toISOString() };
               if (args.amount !== undefined) updateData.amount = args.amount;
               if (args.category !== undefined) updateData.category = args.category;
               if (args.description !== undefined) updateData.description = args.description;
               if (args.installmentInfo !== undefined) updateData.installmentInfo = args.installmentInfo;
               if (args.status !== undefined) updateData.status = args.status;
               if (args.date !== undefined) updateData.date = args.date;
               
               await updateDoc(doc(db, "transactions", args.transactionId), updateData);
               updatedCount++;
             } catch (err) {
               console.error("Falha ao atualizar:", err);
             }
          }
          if (call.name === 'addMarketItem') {
            const args = call.args as any;
            try {
              await addDoc(collection(db, `market_items_${currentMonthStr}`), {
                name: args.name,
                estimatedPrice: args.estimatedPrice || 0,
                actualPrice: 0,
                purchased: false,
                userId: uid,
                createdAt: new Date().toISOString()
              });
              addedMarketCount++;
            } catch (err) {
              console.error("Falha ao adicionar item de mercado:", err);
            }
          }
          if (call.name === 'updateMarketItem') {
            const args = call.args as any;
            try {
              const updateData: any = {};
              if (args.actualPrice !== undefined) updateData.actualPrice = args.actualPrice;
              if (args.purchased !== undefined) updateData.purchased = args.purchased;
              
              await updateDoc(doc(db, `market_items_${currentMonthStr}`, args.itemId), updateData);
              updatedMarketCount++;
            } catch (err) {
              console.error("Falha ao atualizar item de mercado:", err);
            }
          }
        }
        
        if (!finalMessage) {
           if (addedCount > 0) finalMessage = `Pronto! Registrei ${addedCount > 1 ? 'as transações' : 'a transação'} pra você. Tudo certo.`;
           if (updatedCount > 0) finalMessage = finalMessage ? finalMessage + ` Ah, e atualizei ${updatedCount > 1 ? 'as informações que você pediu' : 'a informação que você pediu'} também.` : `Pronto! Atualizei a transação pra você.`;
           if (addedMarketCount > 0) finalMessage = `Adicionei ${addedMarketCount} itens na sua Lista de Mercado daquele mês!`;
           if (updatedMarketCount > 0) finalMessage = `Atualizei ${updatedMarketCount} itens no seu mercado.`;
        }
      }

      if (finalMessage) {
         setMessages(prev => [...prev, { role: "model", text: finalMessage }]);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: "model", text: "Desculpe, tive um problema de conexão. Poderia tentar novamente?" }]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          handleSend(base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar o microfone", err);
      setMessages(prev => [...prev, { role: "model", text: "Não foi possível acessar seu microfone. Verifique as permissões." }]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const playAudioChunk = (audioCtx: AudioContext, base64Audio: string) => {
    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const buffer = bytes.buffer;
      const int16Array = new Int16Array(buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);
      const sourceN = audioCtx.createBufferSource();
      sourceN.buffer = audioBuffer;
      sourceN.connect(audioCtx.destination);
      const startTime = Math.max(audioCtx.currentTime, nextStartTimeRef.current);
      sourceN.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
    } catch(e) {
      console.error(e);
    }
  };

  const startLiveSession = async () => {
    if (isLiveActive) return;
    try {
      const contextStr = encodeURIComponent(user ? `Nome: ${user.displayName || 'Vitor'}` : "");
      const wsUrl = `wss://${window.location.host}/live?context=${contextStr}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      nextStartTimeRef.current = audioCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      streamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.audio) playAudioChunk(audioCtx, msg.audio);
        if (msg.interrupted) {
           nextStartTimeRef.current = audioCtx.currentTime;
        }
      };
      
      ws.onclose = () => stopLiveSession();
      ws.onerror = () => stopLiveSession();

      setIsLiveActive(true);
      setMessages(prev => [...prev, { role: "model", text: "🎙️ (Modo Conversa Ativo) Olá! Estou te ouvindo, o que manda?" }]);
    } catch(e) {
      console.error("Live session failed:", e);
      setMessages(prev => [...prev, { role: "model", text: "Não foi possível iniciar a conversa. Verifique o microfone." }]);
    }
  };

  const stopLiveSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current && sourceRef.current) {
      processorRef.current.disconnect();
      sourceRef.current.disconnect();
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(()=>{});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsLiveActive(false);
  };

  const toggleLiveSession = () => {
    if (isLiveActive) stopLiveSession();
    else startLiveSession();
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-80px)] md:h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
             <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Seu Consultor</h1>
            <p className="text-sm text-slate-500">Tire dúvidas, peça conselhos ou monte estratégias</p>
          </div>
        </div>
        <Button 
          onClick={toggleLiveSession}
          variant="outline"
          className={`gap-2 rounded-full hidden sm:flex border ${isLiveActive ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
        >
          {isLiveActive ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          {isLiveActive ? "Encerrar Chamada" : "Chamada de Voz (Fluida)"}
        </Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 relative shadow-sm border border-slate-100">
        
        {isLiveActive && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center pointer-events-none rounded-xl">
            <div className="w-32 h-32 rounded-full bg-indigo-100 animate-ping absolute opacity-75"></div>
            <div className="w-32 h-32 rounded-full bg-indigo-200 flex items-center justify-center relative z-20 shadow-2xl">
              <Mic className="w-12 h-12 text-indigo-600 animate-pulse" />
            </div>
            <p className="mt-8 text-indigo-800 font-medium text-lg tracking-wide z-20 animate-pulse">Consultor está ouvindo você...</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((m, idx) => (
             <div key={idx} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
               <div className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center ${m.role === 'model' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                 {m.role === 'model' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
               </div>
               <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] text-sm sm:text-base ${m.role === 'model' ? 'bg-slate-50 text-slate-800 rounded-tl-sm' : 'bg-emerald-500 text-white rounded-tr-sm'}`}>
                  {m.role === 'model' ? (
                     <div className="flex flex-col gap-2">
                       <div className="markdown-body prose prose-slate prose-sm sm:prose-base leading-relaxed whitespace-pre-wrap">
                         <Markdown remarkPlugins={[remarkGfm]}>{m.text}</Markdown>
                       </div>
                       <button onClick={() => speakText(m.text)} className="self-end text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Ouvir mensagem">
                         <Volume2 className="w-4 h-4" />
                       </button>
                     </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.text}</span>
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
           <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3 items-center">
             <button
                type="button"
                onClick={toggleRecording}
                disabled={loading}
                className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center transition-colors ${isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
             >
                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
             </button>
             <Input 
                className="flex-1 h-12 text-base rounded-full border-slate-200 px-6 focus-visible:ring-indigo-500"
                placeholder={isRecording ? "Gravando áudio..." : "Pergunte sobre seus limites, como organizar suas contas..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading || isRecording}
             />
             <Button type="submit" size="icon" className="h-12 w-12 rounded-full shrink-0 bg-indigo-600 hover:bg-indigo-700" disabled={loading || (!input.trim() && !isRecording)}>
                <Send className="w-5 h-5" />
             </Button>
           </form>
        </div>
      </Card>
    </div>
  );
}
