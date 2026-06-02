import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type WaterfallData = {
  name: string;
  start: number;
  end: number;
  isTotal: boolean;
  color: string;
};

interface WaterfallChartProps {
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  remaining: number;
}

export function WaterfallChart({
  income,
  fixedExpenses,
  variableExpenses,
  remaining,
}: WaterfallChartProps) {
  const data = [
    {
      name: "Renda",
      range: [0, income],
      value: income,
      isTotal: true,
      color: "#10b981", // emerald-500
    },
    {
      name: "C. Fixos",
      range: [income - fixedExpenses, income],
      value: fixedExpenses,
      isTotal: false,
      color: "#f43f5e", // rose-500
    },
    {
      name: "C. Variáveis",
      range: [income - fixedExpenses - variableExpenses, income - fixedExpenses],
      value: variableExpenses,
      isTotal: false,
      color: "#fb923c", // orange-400
    },
    {
      name: "Saldo",
      range: [0, remaining],
      value: remaining,
      isTotal: true,
      color: remaining >= 0 ? "#10b981" : "#f43f5e",
    },
  ];

  const formatCurrency = (val: number) =>
    `R$ ${val.toFixed(2).replace(".", ",")}`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const value = dataPoint.value;

      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-slate-100 dark:border-slate-800 p-3 rounded-2xl shadow-lg">
          <p className="font-bold text-slate-800 dark:text-slate-100">{dataPoint.name}</p>
          <p
            className="font-bold font-mono"
            style={{ color: dataPoint.color }}
          >
            {dataPoint.isTotal ? "" : "-"}
            {formatCurrency(Math.abs(value))}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 0,
            left: -20,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `R$${(value / 1000).toFixed(1)}k`}
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
          <Bar dataKey="range" radius={[4, 4, 4, 4]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
