import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { getCategoryIcon, getCategoryColor } from "@/lib/categories";
import { Link } from "react-router-dom";

export function TransactionStack({
  transactions,
  onMarkAsPaid,
}: {
  transactions: any[];
  onMarkAsPaid: (id: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center px-6 py-8 border border-dashed border-slate-200 rounded-[1.5rem]">
        <p className="text-slate-500 text-sm">Nenhum registro encontrado.</p>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    `R$ ${val.toFixed(2).replace(".", ",")}`;

  const handleNext = () => {
    if (currentIndex < transactions.length - 1)
      setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  // Calculate visible range (show up to 5 items, centered around currentIndex)
  const getVisibleTx = () => {
    return transactions
      .map((tx, i) => {
        const offset = i - currentIndex;
        return { tx, offset };
      })
      .filter(({ offset }) => Math.abs(offset) <= 2);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full h-[220px] flex justify-center items-center perspective-[1000px] mb-4 overflow-hidden">
        <AnimatePresence>
          {getVisibleTx().map(({ tx, offset }) => {
            const isIncome = tx.type === "income";
            const isPaid = tx.status === "paid";
            const isPastOrToday =
              new Date(tx.date + "T12:00:00").getTime() <= new Date().getTime();
            const isOverdue = !isPaid && !isIncome && isPastOrToday;

            return (
              <motion.div
                key={tx.id}
                initial={false}
                animate={{
                  y: offset * 35,
                  scale: 1 - Math.abs(offset) * 0.1,
                  opacity: Math.abs(offset) >= 2 ? 0.3 : 1,
                  zIndex: 10 - Math.abs(offset),
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`absolute w-[90%] max-w-[320px] mx-auto p-4 rounded-[1.25rem] border shadow-md flex items-center justify-between cursor-pointer ${
                  offset === 0
                    ? "bg-white border-slate-100 shadow-xl"
                    : "bg-white/90 border-slate-50/50 backdrop-blur-md"
                } ${isOverdue && offset === 0 ? "border-rose-300 ring-2 ring-rose-100 shadow-rose-100/50 ring-offset-2" : ""}`}
                onClick={() => {
                  if (offset !== 0) setCurrentIndex(currentIndex + offset);
                }}
              >
                {isOverdue && offset === 0 && (
                  <div className="absolute top-0 right-0 w-8 h-8 bg-rose-50 rounded-bl-[1.25rem] flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2.5 rounded-[14px] shrink-0 ${
                      isOverdue
                        ? "bg-rose-100 text-rose-600"
                        : isPaid && !isIncome
                          ? "bg-slate-100 text-slate-400"
                          : getCategoryColor(
                              tx.category || tx.description,
                              tx.type,
                            )
                    }`}
                  >
                    {getCategoryIcon(
                      tx.category || tx.description,
                      tx.type,
                      "w-5 h-5 stroke-[1.5]",
                    )}
                  </div>
                  <div>
                    <p
                      className={`font-semibold text-sm tracking-tight overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px] ${
                        isOverdue
                          ? "text-rose-900"
                          : isPaid && !isIncome
                            ? "text-slate-500 line-through"
                            : "text-slate-800"
                      }`}
                    >
                      {tx.description}
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {new Date(tx.date + "T12:00:00").toLocaleDateString(
                        "pt-BR",
                        { day: "2-digit", month: "short" },
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold text-[15px] tracking-tight ${
                      isOverdue
                        ? "text-rose-600"
                        : isIncome
                          ? "text-violet-600"
                          : "text-slate-800"
                    }`}
                  >
                    {isIncome ? "+" : "-"} {formatCurrency(Number(tx.amount))}
                  </p>
                  {!isPaid && offset === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsPaid(tx.id);
                      }}
                      className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full hover:bg-emerald-100 transition-colors"
                    >
                      Dar Baixa
                    </button>
                  )}
                  {!isPaid && offset !== 0 && (
                    <span
                      className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isOverdue
                          ? "text-rose-600 bg-rose-100"
                          : "text-orange-500 bg-orange-50"
                      }`}
                    >
                      {isOverdue ? "Atrasado" : "Pendente"}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-4 justify-between w-[90%] max-w-[320px]">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === transactions.length - 1}
            className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs font-semibold text-slate-400">
          {currentIndex + 1} de {transactions.length}
        </p>
        <Link
          to="/app/lancamentos"
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-2 rounded-full transition-colors"
        >
          Ver Todas <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
