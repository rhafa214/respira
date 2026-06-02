import React, { useState } from "react";
import { Users, UserPlus, Heart, Target, Send, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function FamilyPage() {
  const [inviteSent, setInviteSent] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-rose-500" />
            Família e Casal
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie objetivos e divida os gastos com quem você ama.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white rounded-[2rem] border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-6 md:p-8 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Convide seu Parceiro(a)
            </h2>
            <p className="text-slate-500 mb-6 px-4">
              Compartilhe este espaço financeiro. Vocês poderão ver metas em
              comum e registrar quem pagou cada conta, mantendo as finanças
              integradas.
            </p>
            {inviteSent ? (
              <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm w-full animate-in fade-in zoom-in">
                Convite enviado com sucesso!
              </div>
            ) : (
              <Button
                onClick={() => setInviteSent(true)}
                className="w-full rounded-2xl bg-slate-900 border-none hover:bg-slate-800 text-white gap-2 font-bold p-6"
              >
                <UserPlus className="w-5 h-5" />
                Criar Link de Convite
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-rose-50 border-rose-100 rounded-[2rem] shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm text-rose-500 shrink-0">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-900 mb-1">
                    Como Funciona o Modo Casal?
                  </h3>
                  <p className="text-sm text-rose-800 leading-relaxed font-medium">
                    1.{" "}
                    <strong className="font-bold">Gastos Partilhados:</strong>{" "}
                    Na hora de lançar um gasto, vocês podem marcar quem pagou. O
                    sistema equilibra automaticamente quem deve pra quem no
                    final do mês.
                  </p>
                  <p className="text-sm text-rose-800 leading-relaxed font-medium mt-2">
                    2. <strong className="font-bold">Sonhos em Comum:</strong>{" "}
                    Crie metas conjuntas (ex: "Viagem de Final de Ano" ou
                    "Casamento") e ambos podem contribuir para a mesma caixinha.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 rounded-[1.5rem] shadow-sm">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">
                  Visualização de Saldo
                </p>
                <p className="text-sm text-slate-500">
                  Separar saldos ou juntar tudo na dashboard?
                </p>
              </div>
              <div className="bg-slate-100 p-1 rounded-full flex gap-1">
                <button className="px-4 py-1.5 rounded-full text-xs font-bold bg-white shadow-sm text-slate-800">
                  Separado
                </button>
                <button className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-700">
                  Junto
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
