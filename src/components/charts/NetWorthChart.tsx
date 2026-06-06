"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YearlyResult } from "@/lib/simulation/types";
import { formatManYen, formatYen } from "@/lib/format";

export function NetWorthChart({ results }: { results: YearlyResult[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={results} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v: number) => formatManYen(v)}
            tick={{ fontSize: 12 }}
            width={64}
          />
          <Tooltip
            formatter={(value: number) => [formatYen(value), "純資産"]}
            labelFormatter={(label) => `${label}年`}
          />
          <Line
            type="monotone"
            dataKey="assets"
            name="純資産"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
