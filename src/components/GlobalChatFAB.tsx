import { useState, useRef, useEffect } from "react";
import { useChat } from "./ChatContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Bot, X, Send, Loader2, User, Sparkles } from "lucide-react";
import Markdown from "react-markdown";

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
  const { messages, input, setInput, loading, sendMessage, toggleChat } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = () => {
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[400px] h-[500px] max-h-[calc(100vh-140px)] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
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
        <Button variant="ghost" size="icon" onClick={toggleChat} className="text-white hover:bg-white/20 hover:text-white rounded-xl">
          <X className="w-5 h-5" />
        </Button>
      </div>

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
                <div className="markdown-body prose prose-slate prose-sm max-w-none leading-relaxed">
                  <Markdown>{m.text}</Markdown>
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
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input 
            className="flex-1 h-11 text-sm rounded-full border-slate-200 px-4 focus-visible:ring-indigo-500 bg-slate-50/50"
            placeholder="Diga 'Paguei o aluguel'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" size="icon" className="h-11 w-11 rounded-full shrink-0 bg-indigo-600 hover:bg-indigo-700" disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
