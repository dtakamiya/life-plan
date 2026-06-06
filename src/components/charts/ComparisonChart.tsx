"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YearlyResult } from "@/lib/simulation/types";
import { runSimulation } from "@/lib/simulation/engine";
import type { Snapshot } from "@/lib/store/usePlanStore";
import { formatManYen, formatYen } from "@/lib/format";
import {
  axisTick,
  chartColors,
  legendStyle,
  seriesPalette,
  tooltipStyle,
} from "./chartTheme";

/**
 * 現在の計画と保存済みスナップショットの純資産推移を重ね描きする。
 * 系列のキーには衝突しない一意な id を使い、表示名は name で出す。
 */
export function ComparisonChart({
  current,
  snapshots,
}: {
  current: YearlyResult[];
  snapshots: Snapshot[];
}) {
  const series = [
    { key: "current", name: "現在", results: current },
    ...snapshots.map((snap) => ({
      key: snap.id,
      name: snap.name,
      results: runSimulation(snap.input),
    })),
  ];

  // 年でマージして、各年に系列ごとの純資産を持つ行を作る。
  const byYear = new Map<number, Record<string, number>>();
  for (const s of series) {
    for (const r of s.results) {
      const row = byYear.get(r.year) ?? { year: r.year };
      row[s.key] = r.assets;
      byYear.set(r.year, row);
    }
  }
  const data = [...byYear.values()].sort((a, b) => a.year - b.year);
  const nameByKey = Object.fromEntries(series.map((s) => [s.key, s.name]));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
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
            formatter={(value: number, key) => [
              formatYen(value),
              nameByKey[key as string] ?? key,
            ]}
            labelFormatter={(label) => `${label}年`}
          />
          <Legend wrapperStyle={legendStyle} iconType="plainline" iconSize={14} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={seriesPalette[i % seriesPalette.length]}
              strokeWidth={i === 0 ? 2.5 : 2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
