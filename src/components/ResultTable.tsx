"use client";

import type { YearlyResult } from "@/lib/simulation/types";
import { formatYen } from "@/lib/format";

/** 横スクロール時に左側へ固定する列。値は固定位置を判別するための識別子。 */
type StickyPosition = "year" | "selfAge";

/** 固定列ごとの `left-*` オフセットと幅クラス（幅とオフセットの数値は必ず一致させる）。 */
const STICKY_CLASSES: Record<StickyPosition, string> = {
  year: "sticky left-0 w-16",
  selfAge: "sticky left-16 w-16 border-r border-line",
};

const columns: {
  key: keyof YearlyResult;
  label: string;
  sticky?: StickyPosition;
}[] = [
  { key: "year", label: "年", sticky: "year" },
  { key: "selfAge", label: "本人年齢", sticky: "selfAge" },
  { key: "grossIncome", label: "世帯収入(税込)" },
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

/**
 * lp-ui-ux-audit-fix / FR6.1: id はチャート側の aria-describedby から
 * 参照される（既定は "result-table"）。
 */
export function ResultTable({
  results,
  id = "result-table",
}: {
  results: YearlyResult[];
  id?: string;
}) {
  return (
    <div id={id} className="max-h-96 overflow-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-right text-xs tabular-nums">
        <thead className="sticky top-0 z-20 bg-paper-deep/95 backdrop-blur">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`whitespace-nowrap border-b border-line px-3 py-2.5 text-[11px] font-semibold tracking-wide text-ink-soft ${
                  c.sticky ? `${STICKY_CLASSES[c.sticky]} z-30 bg-paper-deep` : ""
                }`}
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
              className="group border-t border-line-soft transition-colors odd:bg-paper hover:bg-brand-50"
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
                  } ${
                    c.sticky
                      ? `${STICKY_CLASSES[c.sticky]} z-10 bg-surface group-odd:bg-paper group-hover:bg-brand-50`
                      : ""
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
