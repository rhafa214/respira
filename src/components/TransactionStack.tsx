import React, { useState, useRef, useEffect } from "react";
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

  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);
  const touchStart = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Prevent default scrolling when interacting with the stack
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener("wheel", preventScroll, { passive: false });
    el.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      el.removeEventListener("wheel", preventScroll);
      el.removeEventListener("touchmove", preventScroll);
    };
  }, []);

  const handleNext = () => {
    if (currentIndex < transactions.length - 1)
      setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (wheelTimeout.current) return;
    if (e.deltaY > 15) {
      handleNext();
      wheelTimeout.current = setTimeout(() => {
        wheelTimeout.current = null;
      }, 150);
    } else if (e.deltaY < -15) {
      handlePrev();
      wheelTimeout.current = setTimeout(() => {
        wheelTimeout.current = null;
      }, 150);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart.current - touchEnd;
    if (diff > 30) {
      handleNext();
    } else if (diff < -30) {
      handlePrev();
    }
  };

  // Calculate visible range (show up to 7 items instead of 5, centered around currentIndex)
  const getVisibleTx = () => {
    return transactions
      .map((tx, i) => {
        const offset = i - currentIndex;
        return { tx, offset };
      })
      .filter(({ offset }) => Math.abs(offset) <= 3);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div
        ref={containerRef}
        className="relative w-full h-[320px] flex justify-center items-center perspective-[1000px] mb-6 mt-4 overflow-hidden touch-none"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
                  y: offset * 45,
                  scale: 1 - Math.abs(offset) * 0.08,
                  opacity: Math.abs(offset) >= 3 ? 0 : 1,
                  zIndex: 10 - Math.abs(offset),
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`absolute w-[95%] max-w-[380px] mx-auto p-4 md:p-5 rounded-[1.5rem] border shadow-md flex items-center justify-between cursor-pointer ${
                  offset === 0
                    ? "bg-white border-slate-100 shadow-xl dark:bg-slate-900 dark:border-slate-800"
                    : "bg-white/90 border-slate-50/50 backdrop-blur-md dark:bg-slate-900/90 dark:border-slate-800/50"
                } ${isOverdue && offset === 0 ? "border-rose-300 ring-2 ring-rose-100 shadow-rose-100/50 ring-offset-2 dark:border-rose-500 dark:ring-rose-900 dark:shadow-rose-900/50" : ""}`}
                onClick={() => {
                  if (offset !== 0) setCurrentIndex(currentIndex + offset);
                }}
              >
                {isOverdue && offset === 0 && (
                  <div className="absolute top-0 right-0 w-8 h-8 bg-rose-50 dark:bg-rose-500/10 rounded-bl-[1.25rem] flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2.5 rounded-[14px] shrink-0 ${
                      isOverdue
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                        : isPaid && !isIncome
                          ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
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
                      className={`font-semibold text-[15px] tracking-tight overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px] md:max-w-[180px] ${
                        isOverdue
                          ? "text-rose-900 dark:text-rose-400"
                          : isPaid && !isIncome
                            ? "text-slate-500 line-through dark:text-slate-500"
                            : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {tx.description}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
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
                        ? "text-rose-600 dark:text-rose-400"
                        : isIncome
                          ? "text-violet-600 dark:text-violet-400"
                          : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {isIncome ? "+" : "-"} {formatCurrency(Number(tx.amount))}
                  </p>
                  {!isPaid && offset === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (navigator.vibrate) navigator.vibrate(50);
                        try {
                          const confetti = require("canvas-confetti");
                          confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 },
                            colors: ["#10b981", "#34d399", "#fef08a"], // Emerald and some gold
                          });
                        } catch (e) {}
                        onMarkAsPaid(tx.id);
                      }}
                      className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                    >
                      Dar Baixa
                    </button>
                  )}
                  {!isPaid && offset !== 0 && (
                    <span
                      className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isOverdue
                          ? "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/20"
                          : "text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/20"
                      }`}
                    >
                      {isOverdue
                        ? new Date(tx.date + "T12:00:00").getMonth() <
                            new Date().getMonth() ||
                          new Date(tx.date + "T12:00:00").getFullYear() <
                            new Date().getFullYear()
                          ? `Atrasada de ${new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}`
                          : "Atrasado"
                        : "Pendente"}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-4 justify-between w-[95%] max-w-[380px] px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === transactions.length - 1}
            className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
          {currentIndex + 1} de {transactions.length}
        </p>
        <Link
          to="/app/lancamentos"
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-full transition-colors"
        >
          Ver Todas <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
