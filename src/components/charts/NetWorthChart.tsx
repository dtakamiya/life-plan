"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YearlyResult } from "@/lib/simulation/types";
import { formatManYen, formatYen } from "@/lib/format";
import { axisTick, chartColors, tooltipStyle } from "./chartTheme";

/**
 * lp-ui-ux-audit-fix / FR6.1: `aria-describedby` で既存の `ResultTable`
 * （数値表）と明示的に関連付ける。
 */
export function NetWorthChart({
  results,
  describedById = "result-table",
}: {
  results: YearlyResult[];
  describedById?: string;
}) {
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="純資産推移の面グラフ"
      aria-describedby={describedById}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={results} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.brand} stopOpacity={0.28} />
              <stop offset="100%" stopColor={chartColors.brand} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={{ stroke: chartColors.grid }} />
          <YAxis
            tickFormatter={(v: number) => formatManYen(v)}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <ReferenceLine y={0} stroke={chartColors.zeroLine} />
          <Tooltip
            {...tooltipStyle}
            formatter={(value: number) => [formatYen(value), "純資産"]}
            labelFormatter={(label) => `${label}年`}
          />
          <Area
            type="monotone"
            dataKey="assets"
            name="純資産"
            stroke={chartColors.brand}
            strokeWidth={2.25}
            fill="url(#nwGrad)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
