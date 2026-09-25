"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YearlyResult } from "@/lib/simulation/types";
import { findDepletion } from "@/lib/simulation/summary";
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
  // 枯渇年（年末の金融資産が初めて0未満）。枯渇なしなら参照線は描かない。
  const depleted = findDepletion(results);
  // 低収入ペルソナレビュー #13: 枯渇後もマイナス側へ線が大きく伸びると必要以上に
  // 悲観的に見えるため、描画は0円で止め、枯渇後の期間は網掛けで示す。
  // 実際の値（不足額）はツールチップと年次明細で確認できる。
  // ローン残高による一時的なマイナス（枯渇前）はそのまま描く。
  const data = results.map((r) => ({
    ...r,
    plotted:
      depleted && r.year >= depleted.year ? Math.max(r.assets, 0) : r.assets,
  }));
  const lastYear = results.at(-1)?.year;
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label={
        depleted
          ? "純資産推移の面グラフ（資産が尽きた後は0円で止め、網掛けで表示）"
          : "純資産推移の面グラフ"
      }
      aria-describedby={describedById}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
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
          {depleted && lastYear !== undefined && (
            <ReferenceArea
              x1={depleted.year}
              x2={lastYear}
              fill={chartColors.expense}
              fillOpacity={0.08}
              ifOverflow="extendDomain"
            />
          )}
          {depleted && (
            <ReferenceLine
              x={depleted.year}
              stroke={chartColors.expense}
              strokeDasharray="4 3"
              label={{
                value: `枯渇 ${depleted.year}年（${depleted.selfAge}歳）`,
                position: "insideTopRight",
                fontSize: 11,
                fill: chartColors.expense,
              }}
            />
          )}
          <Tooltip
            {...tooltipStyle}
            formatter={(_value: number, _name, item) => {
              const { assets, year } = item.payload as YearlyResult;
              return depleted && year >= depleted.year && assets < 0
                ? [formatYen(-assets), "不足額"]
                : [formatYen(assets), "純資産"];
            }}
            labelFormatter={(label) => `${label}年`}
          />
          <Area
            type="monotone"
            dataKey="plotted"
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
