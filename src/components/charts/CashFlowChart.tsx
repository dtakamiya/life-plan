"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YearlyResult } from "@/lib/simulation/types";
import { formatManYen, formatYen } from "@/lib/format";

/** 収入(+)・支出(-)・収支を年別に並べた棒グラフ用データに変換する。 */
function toChartData(results: YearlyResult[]) {
  return results.map((r) => ({
    year: r.year,
    収入: r.netIncome,
    支出: -(r.livingExpense + r.loanPayment),
    収支: r.cashFlow,
  }));
}

export function CashFlowChart({ results }: { results: YearlyResult[] }) {
  const data = toChartData(results);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v: number) => formatManYen(v)}
            tick={{ fontSize: 12 }}
            width={64}
          />
          <Tooltip
            formatter={(value: number, name) => [formatYen(value), name]}
            labelFormatter={(label) => `${label}年`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Bar dataKey="収入" fill="#16a34a" />
          <Bar dataKey="支出" fill="#dc2626" />
          <Bar dataKey="収支" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
