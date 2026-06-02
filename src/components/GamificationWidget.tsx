import React, { useMemo } from "react";
import { useCollection } from "@/hooks/useFirestore";
import { Trophy, Star, Target, Zap, ShieldCheck, Flame } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function GamificationWidget() {
  const { data: transactions } = useCollection<any>("transactions");
  const { data: goals } = useCollection<any>("goals");
  const { data: debts } = useCollection<any>("debts");

  const { xp, level, nextLevelXp, rankName, rankColor, recentAchievements } =
    useMemo(() => {
      if (!transactions)
        return {
          xp: 0,
          level: 1,
          nextLevelXp: 100,
          rankName: "Iniciante",
          rankColor: "text-slate-500",
          recentAchievements: [],
        };

      let totalXp = 0;
      const achievements = [];

      // Rule 1: Paid expenses/bills on time
      const paidExpenses = transactions.filter(
        (t) =>
          (t.type === "expense" || t.type === "deduction") &&
          t.status === "paid",
      );
      totalXp += paidExpenses.length * 5;
      if (paidExpenses.length >= 10) achievements.push("Pagador Assíduo");

      // Rule 2: Month in the blue (positive balance)
      const monthBalances: Record<string, number> = {};
      transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!monthBalances[month]) monthBalances[month] = 0;
        if (t.type === "income" && t.status === "paid") monthBalances[month] += Number(t.amount);
        else if ((t.type === "expense" || t.type === "deduction") && t.status === "paid") monthBalances[month] -= Number(t.amount);
      });

      let positiveMonths = 0;
      Object.values(monthBalances).forEach(balance => {
        if (balance > 0) positiveMonths++;
      });

      totalXp += positiveMonths * 50;
      if (positiveMonths >= 1) achievements.push("Mês no Azul");
      if (positiveMonths >= 3) achievements.push("Mestre da Economia");

      // Rule 3: Debt Reduction (Paid off debts)
      if (debts) {
        const paidDebts = debts.filter(d => Number(d.remaining || 0) <= 0);
        totalXp += paidDebts.length * 150;
        if (paidDebts.length > 0) achievements.push("Livre das Dívidas");
        
        // Also give 10 XP for each debt that just exists and is being tracked (incentivize tracking)
        // Or perhaps give XP as remaining goes down, but since we just have remaining vs total we can give a small amount if remaining < initial
        const activeDebtsPaidPartially = debts.filter(d => Number(d.remaining || 0) > 0 && Number(d.remaining || 0) < Number(d.amount || 0));
        totalXp += activeDebtsPaidPartially.length * 20;
      }

      // Rule 4: Reached goals
      if (goals) {
        const reachedGoals = goals.filter(
          (g) => Number(g.currentAmount || 0) >= Number(g.targetAmount || 0),
        );
        totalXp += reachedGoals.length * 100;
        if (reachedGoals.length > 0) achievements.push("Realizador de Sonhos");
      }

      // Determine Level
      const level = Math.floor(totalXp / 200) + 1;
      const nextLevelXp = level * 200;
      const currentLevelProgress = totalXp % 200;

      // Ranks based on level
      let rankName = "Aprendiz";
      let rankColor = "text-amber-600";
      let RankIcon = Star;

      if (level >= 2 && level < 4) {
        rankName = "Estrategista";
        rankColor = "text-blue-600";
      } else if (level >= 4 && level < 7) {
        rankName = "Investidor";
        rankColor = "text-emerald-600";
      } else if (level >= 7 && level < 10) {
        rankName = "Mestre Financeiro";
        rankColor = "text-violet-600";
      } else if (level >= 10) {
        rankName = "Lenda do Patrimônio";
        rankColor = "text-fuchsia-600";
      }

      if (totalXp > 0 && achievements.length === 0) {
        achievements.push("Primeiros Passos");
      }

      // De-duplicate achievements and limit to 2
      const uniqueAchievements = Array.from(new Set(achievements));

      return {
        xp: totalXp,
        level,
        nextLevelXp,
        currentLevelProgress,
        rankName,
        rankColor,
        recentAchievements: uniqueAchievements.slice(0, 2),
      };
    }, [transactions, goals, debts]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 md:p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Minha Jornada
        </h3>
        <div className="bg-amber-50 dark:bg-amber-500/10 px-3 py-1 rounded-full border border-amber-100 dark:border-amber-500/20">
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
            Nível {level}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
          <Target className={`w-7 h-7 ${rankColor}`} />
        </div>
        <div className="flex-1">
          <p className={`font-bold ${rankColor}`}>{rankName}</p>
          <div className="flex justify-between items-end mt-1 mb-1.5">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Progresso para o Nível {level + 1}
            </p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {xp} / {nextLevelXp} XP
            </p>
          </div>
          <Progress
            value={((xp % 200) / 200) * 100}
            className="h-2 dark:bg-slate-800"
          />
        </div>
      </div>

      {recentAchievements.length > 0 && (
        <div className="flex items-center gap-2 mt-2 pt-4 border-t border-slate-50 dark:border-slate-800/50">
          <Flame className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-tight">
            Conquistas recentes:{" "}
            <span className="text-slate-700 dark:text-slate-300 font-bold">
              {recentAchievements.join(", ")}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
