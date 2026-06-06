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
import { axisTick, chartColors, legendStyle, tooltipStyle } from "./chartTheme";

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
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: chartColors.grid }} />
          <YAxis
            tickFormatter={(v: number) => formatManYen(v)}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            {...tooltipStyle}
            cursor={{ fill: "rgba(15,118,110,0.06)" }}
            formatter={(value: number, name) => [formatYen(value), name]}
            labelFormatter={(label) => `${label}年`}
          />
          <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={9} />
          <ReferenceLine y={0} stroke={chartColors.zeroLine} />
          <Bar dataKey="収入" fill={chartColors.income} radius={[3, 3, 0, 0]} />
          <Bar dataKey="支出" fill={chartColors.expense} radius={[3, 3, 0, 0]} />
          <Bar dataKey="収支" fill={chartColors.net} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
