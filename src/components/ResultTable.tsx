"use client";

import type { YearlyResult } from "@/lib/simulation/types";
import { formatYen } from "@/lib/format";

const columns: { key: keyof YearlyResult; label: string }[] = [
  { key: "year", label: "年" },
  { key: "selfAge", label: "本人年齢" },
  { key: "grossIncome", label: "収入(税込)" },
  { key: "tax", label: "税" },
  { key: "socialInsurance", label: "社会保険" },
  { key: "netIncome", label: "手取り" },
  { key: "livingExpense", label: "生活費" },
  { key: "loanPayment", label: "ローン返済" },
  { key: "eventNet", label: "イベント" },
  { key: "retirementBenefit", label: "退職金" },
  { key: "cashFlow", label: "収支" },
  { key: "assets", label: "純資産" },
  { key: "taxFreeAssets", label: "うち非課税" },
];

/** 金額列はキーごとに円フォーマットし、年・年齢はそのまま表示する。 */
function renderCell(row: YearlyResult, key: keyof YearlyResult): string {
  const value = row[key];
  if (value === null) return "-";
  if (key === "year" || key === "selfAge" || key === "spouseAge") {
    return String(value);
  }
  return formatYen(value as number);
}

export function ResultTable({ results }: { results: YearlyResult[] }) {
  return (
    <div className="max-h-96 overflow-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-right text-xs tabular-nums">
        <thead className="sticky top-0 z-10 bg-paper-deep/95 backdrop-blur">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="whitespace-nowrap border-b border-line px-3 py-2.5 text-[11px] font-semibold tracking-wide text-ink-soft"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row) => (
            <tr
              key={row.year}
              className="border-t border-line-soft transition-colors odd:bg-paper/40 hover:bg-brand-50/60"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`whitespace-nowrap px-3 py-1.5 ${
                    c.key === "year"
                      ? "font-medium text-ink"
                      : c.key === "assets" && row.assets < 0
                        ? "font-semibold text-danger"
                        : "text-ink-soft"
                  }`}
                >
                  {renderCell(row, c.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
