import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, ShieldCheck, Sparkles, LayoutDashboard, Target, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useState } from "react";

export default function LandingPage() {
  const { user, signIn } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  if (user) {
    return <Navigate to="/app" replace />;
  }

  const handleSignIn = async () => {
    setIsSigningIn(true);
    await signIn();
    // It will automatically navigate away due to the user check above once auth state resolves
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 py-4 px-6 md:px-12 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-1.5 rounded-lg text-white">
            <Heart className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">Respira</span>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={handleSignIn} disabled={isSigningIn} className="rounded-full shadow-sm hover:shadow-md transition-all">
            {isSigningIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isSigningIn ? "Acessando..." : "Acessar Família"}
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          Para uso pessoal e familiar
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.1]">
          Organize sua vida financeira sem <span className="text-emerald-500">planilhas complicadas.</span>
        </h1>
        <p className="mt-8 text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Nós sabemos que lidar com dívidas cansa. O Respira foi criado para te dar clareza, reduzir a ansiedade e te ajudar a construir o futuro que vocês merecem.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button onClick={handleSignIn} disabled={isSigningIn} size="lg" className="rounded-full w-full sm:w-auto text-base h-14 px-8 shadow-lg shadow-emerald-500/20">
            {isSigningIn ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
            {isSigningIn ? "Entrando no sistema..." : "Acessar Sistema Família"}
          </Button>
          <p className="text-sm text-slate-400 sm:ml-4">Acesso direto e seguro.</p>
        </div>

        {/* Hero Image Mockup (Abstracted) */}
        <div className="mt-20 relative mx-auto w-full max-w-4xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-100 to-indigo-100 rounded-[2.5rem] blur-2xl opacity-50"></div>
          <div className="relative rounded-3xl border border-slate-200/50 bg-white shadow-2xl overflow-hidden aspect-[16/9] flex items-center justify-center bg-slate-50">
             <div className="flex flex-col items-center gap-4 text-slate-300">
                <LayoutDashboard className="w-16 h-16" />
                <p className="font-medium text-lg">Preview do Dashboard</p>
             </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Não é só matemática, é sobre paz mental.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                color: "text-emerald-500",
                bg: "bg-emerald-50",
                title: "Gerenciador de Dívidas",
                desc: "Descubra quanto tempo falta para quitar tudo e saiba exatamente qual priorizar para economizar em juros."
              },
              {
                icon: Sparkles,
                color: "text-indigo-500",
                bg: "bg-indigo-50",
                title: "Assistente Inteligente",
                desc: "Uma IA que analisa seus gastos com carinho e te e avisa onde você pode economizar sem cortar o que te faz bem."
              },
              {
                icon: Target,
                color: "text-rose-500",
                bg: "bg-rose-50",
                title: "Planejamento de Sonhos",
                desc: "Transforme dívidas em metas. Planeje sua reserva de emergência, viagens ou a casa própria em um só lugar."
              }
            ].map((i, k) => (
              <div key={k} className="p-8 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 transition-all">
                <div className={`${i.bg} ${i.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6`}>
                  <i.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{i.title}</h3>
                <p className="text-slate-500 leading-relaxed">{i.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
