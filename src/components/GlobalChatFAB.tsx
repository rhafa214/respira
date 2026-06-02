import { useState, useRef, useEffect } from "react";
import { useChat } from "./ChatContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Bot, X, Send, Loader2, User, Sparkles, Mic, Square, Volume2, Phone, PhoneOff } from "lucide-react";
import Markdown from "react-markdown";
import { useAuth } from "./AuthProvider";

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

export function GlobalChatFAB() {
  const { isOpen, toggleChat } = useChat();

  return (
    <>
      <Button
        onClick={toggleChat}
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 w-14 h-14 rounded-full shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] bg-indigo-600 hover:bg-indigo-700 p-0 overflow-hidden flex items-center justify-center z-50 group hover:-translate-y-1 transition-all duration-300"
      >
        <Sparkles className="w-6 h-6 text-indigo-100 group-hover:text-white group-hover:animate-pulse" />
      </Button>
      {isOpen && <ChatPanel />}
    </>
  );
}

function ChatPanel() {
  const { messages, input, setInput, loading, sendMessage, toggleChat, setMessages } = useChat() as any;
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Live WebSocket
  const [isLiveActive, setIsLiveActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);
  
  useEffect(() => {
    return () => { stopLiveSession(); };
  }, []);

  const handleSend = (audioBase64?: string) => {
    if (isLiveActive) stopLiveSession();
    sendMessage(input, audioBase64);
    setInput("");
  };

  const startRecording = async () => {
    try {
      if (isLiveActive) stopLiveSession();
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
      if (setMessages) setMessages((prev: any) => [...prev, { role: "model", text: "🎙️ (Modo Conversa Ativo) Olá! Estou te ouvindo, o que manda?" }]);
    } catch(e) {
      console.error("Live session failed:", e);
      if (setMessages) setMessages((prev: any) => [...prev, { role: "model", text: "Não foi possível iniciar a conversa. Verifique o microfone." }]);
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
    <div className="fixed bottom-24 md:bottom-24 right-4 md:right-8 w-[calc(100vw-32px)] sm:w-[400px] h-[500px] max-h-[calc(100vh-140px)] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Header */}
      <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide">Copiloto Financeiro</h3>
            <p className="text-xs text-indigo-200">Online e conectado às suas contas</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="icon" onClick={toggleLiveSession} className={`rounded-xl hover:bg-white/20 hover:text-white ${isLiveActive ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'text-white'}`}>
            {isLiveActive ? <PhoneOff className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleChat} className="text-white hover:bg-white/20 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {isLiveActive && (
        <div className="absolute inset-y-0 inset-x-0 mt-[72px] bg-white/90 backdrop-blur z-10 flex flex-col items-center justify-center pointer-events-none rounded-b-3xl">
          <div className="w-24 h-24 rounded-full bg-indigo-100 animate-ping absolute opacity-70"></div>
          <div className="w-24 h-24 rounded-full bg-indigo-200 flex items-center justify-center relative z-20 shadow-xl">
            <Mic className="w-10 h-10 text-indigo-600 animate-pulse" />
          </div>
          <p className="mt-8 text-indigo-800 font-medium tracking-wide z-20 animate-pulse">Ouvindo você...</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white ${m.role === 'model' ? 'bg-indigo-600' : 'bg-emerald-500'}`}>
              {m.role === 'model' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
              m.role === 'model' 
                ? 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-sm' 
                : 'bg-emerald-500 text-white shadow-sm rounded-tr-sm'
            }`}>
              {m.role === 'model' ? (
                <div className="flex flex-col gap-2">
                  <div className="markdown-body prose prose-slate prose-sm max-w-none leading-relaxed">
                    <Markdown>{m.text}</Markdown>
                  </div>
                  <button onClick={() => speakText(m.text)} className="self-end text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Ouvir mensagem">
                    <Volume2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 flex-row">
            <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center gap-2 text-slate-500 rounded-tl-sm text-sm">
              <Loader2 className="w-3 h-3 animate-spin" />
              Pensando...
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center">
          <button
             type="button"
             onClick={toggleRecording}
             disabled={loading}
             className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center transition-colors ${isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
             {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
          </button>
          <Input 
            className="flex-1 h-11 text-sm rounded-full border-slate-200 px-4 focus-visible:ring-indigo-500 bg-slate-50/50"
            placeholder={isRecording ? "Gravando áudio..." : "Diga 'Paguei o aluguel'..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || isRecording}
          />
          <Button type="submit" size="icon" className="h-11 w-11 rounded-full shrink-0 bg-indigo-600 hover:bg-indigo-700" disabled={loading || (!input.trim() && !isRecording)}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
