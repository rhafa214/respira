import { useState } from "react";
import { GamificationWidget } from "@/components/GamificationWidget";

export default function JourneyPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b pb-4 mb-4">
          Minha Jornada
        </h1>
        <p className="text-slate-500">
          Acompanhe seu progresso, resgate recompensas e complete desafios
          financeiros.
        </p>
      </div>

      <div className="grid grid-cols-1">
        <GamificationWidget />
      </div>
    </div>
  );
}
