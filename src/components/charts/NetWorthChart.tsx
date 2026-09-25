"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YearlyResult } from "@/lib/simulation/types";
import { findDepletion } from "@/lib/simulation/summary";
import { formatManYen, formatYen } from "@/shared/lib";
import { netWorthChartData } from "./netWorthChartData";
import { axisTick, chartColors, legendStyle, tooltipStyle } from "./chartTheme";

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
  // 主系列は金融資産、ローンや不動産がある期間だけ純資産を破線で重ねる（#11・#2）。
  // 枯渇後の期間は網掛けで示し、実際の不足額はツールチップと年次明細で確認できる（#13）。
  const data = netWorthChartData(results);
  const hasNetWorthLine = data.some((d) => d.netWorth !== null);
  const lastYear = results.at(-1)?.year;
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label={[
        "資産推移のグラフ（金融資産を面で表示",
        hasNetWorthLine
          ? "。ローンや不動産のある期間は純資産（金融資産＋不動産−ローン残高）を破線で表示"
          : "",
        depleted ? "。資産が尽きた後は0円で止め、網掛けで表示" : "",
        "）",
      ].join("")}
      aria-describedby={describedById}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
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
            formatter={(_value: number, name, item) => {
              const { assets, financialAssets } = item.payload as YearlyResult;
              if (name === "純資産") return [formatYen(assets), "純資産"];
              return financialAssets < 0
                ? [formatYen(-financialAssets), "不足額"]
                : [formatYen(financialAssets), "金融資産"];
            }}
            labelFormatter={(label) => `${label}年`}
          />
          {hasNetWorthLine && <Legend wrapperStyle={legendStyle} />}
          <Area
            type="monotone"
            dataKey="financial"
            name="金融資産"
            stroke={chartColors.brand}
            strokeWidth={2.25}
            fill="url(#nwGrad)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          {hasNetWorthLine && (
            <Line
              type="monotone"
              dataKey="netWorth"
              name="純資産"
              stroke={chartColors.ink}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
