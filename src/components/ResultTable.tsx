"use client";

import { useState, useSyncExternalStore } from "react";
import type { YearlyResult } from "@/lib/simulation/types";
import { formatYen } from "@/lib/format";
import {
  CARD_DETAIL_FIELDS,
  CARD_SUMMARY_FIELDS,
  isCardLayout,
  toggleExpanded,
} from "./result-table-cards";

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
  { key: "housingLoanCredit", label: "うちローン控除" },
  { key: "socialInsurance", label: "社会保険" },
  { key: "childAllowance", label: "児童手当" },
  { key: "netIncome", label: "手取り" },
  { key: "livingExpense", label: "生活費" },
  { key: "recurringExpense", label: "継続支出" },
  { key: "loanPayment", label: "ローン返済" },
  { key: "eventNet", label: "イベント" },
  { key: "retirementBenefit", label: "退職金" },
  { key: "dividendIncome", label: "配当(手取)" },
  { key: "cashFlow", label: "収支" },
  { key: "assets", label: "純資産" },
  { key: "financialAssets", label: "金融資産" },
  { key: "taxFreeAssets", label: "うち非課税" },
  { key: "loanBalance", label: "ローン残高" },
  { key: "propertyValue", label: "不動産評価額" },
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

/** ビューポート幅の変化を購読する（resize のみ。向き変更も resize として届く）。 */
function subscribeViewport(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** SSR / 初回ハイドレーションは従来どおりテーブル表示（false）にする。 */
function useCardLayout(): boolean {
  return useSyncExternalStore(
    subscribeViewport,
    () => isCardLayout(window.innerWidth),
    () => false,
  );
}

/** lp-025: 640px 未満用。1年=1カードで、タップで残りの項目を展開する。 */
function ResultCards({ results, id }: { results: YearlyResult[]; id: string }) {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());

  return (
    <ul
      id={id}
      className="max-h-[70vh] space-y-2 overflow-auto rounded-xl border border-line p-2"
    >
      {results.map((row) => {
        const open = expanded.has(row.year);
        const detailId = `${id}-detail-${row.year}`;
        return (
          <li
            key={row.year}
            className="rounded-xl border border-line-soft bg-surface"
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailId}
              onClick={() =>
                setExpanded((prev) => toggleExpanded(prev, row.year))
              }
              className="block w-full rounded-xl p-3 text-left tabular-nums transition-colors hover:bg-brand-50"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink">
                  {row.year}
                  <span className="ml-2 text-xs font-normal text-ink-soft">
                    本人 {row.selfAge}歳
                  </span>
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[11px] text-ink-mute">純資産</span>
                  <span
                    className={`font-display text-base font-semibold ${
                      row.assets < 0 ? "text-danger" : "text-ink"
                    }`}
                  >
                    {formatYen(row.assets)}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className={`h-3 w-3 self-center text-ink-mute transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="M2 4.5 6 8.5 10 4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
              <span className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                {CARD_SUMMARY_FIELDS.map((f) => (
                  <span
                    key={f.key}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="text-ink-mute">{f.label}</span>
                    <span className="text-ink-soft">
                      {renderCell(row, f.key)}
                    </span>
                  </span>
                ))}
              </span>
            </button>
            <dl
              id={detailId}
              hidden={!open}
              className={`${open ? "grid" : "hidden"} grid-cols-1 gap-y-1.5 border-t border-line-soft px-3 py-2.5 text-xs tabular-nums`}
            >
              {CARD_DETAIL_FIELDS.map((f) => (
                <div
                  key={f.key}
                  className="flex items-baseline justify-between gap-2"
                >
                  <dt className="text-ink-mute">{f.label}</dt>
                  <dd className="text-ink-soft">{renderCell(row, f.key)}</dd>
                </div>
              ))}
            </dl>
          </li>
        );
      })}
    </ul>
  );
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
  const cardLayout = useCardLayout();
  if (cardLayout) return <ResultCards results={results} id={id} />;
  return (
    <div
      id={id}
      className="max-h-96 overflow-auto rounded-xl border border-line"
    >
      <table className="w-full border-collapse text-right text-xs tabular-nums">
        <thead className="sticky top-0 z-20 bg-paper-deep/95 backdrop-blur">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`whitespace-nowrap border-b border-line px-3 py-2.5 text-[11px] font-semibold tracking-wide text-ink-soft ${
                  c.sticky
                    ? `${STICKY_CLASSES[c.sticky]} z-30 bg-paper-deep`
                    : ""
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
