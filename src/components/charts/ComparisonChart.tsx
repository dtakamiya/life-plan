"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YearlyResult } from "@/lib/simulation/types";
import { runSimulation } from "@/lib/simulation/engine";
import type { Snapshot } from "@/lib/store/usePlanStore";
import { formatManYen, formatYen } from "@/lib/format";

/** 各系列に割り当てる色（現在＝先頭の青、以降はスナップショット）。 */
const COLORS = [
  "#2563eb",
  "#16a34a",
  "#db2777",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];

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
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v: number) => formatManYen(v)}
            tick={{ fontSize: 12 }}
            width={64}
          />
          <Tooltip
            formatter={(value: number, key) => [
              formatYen(value),
              nameByKey[key as string] ?? key,
            ]}
            labelFormatter={(label) => `${label}年`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
