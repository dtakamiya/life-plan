import type { YearlyResult } from "@/lib/simulation/types";

/**
 * lp-025: 年次明細のモバイルカード表示に使う純関数群。
 * 表示の出し分けと展開状態だけを扱い、YearlyResult の値は加工しない。
 */

/** この幅（px）未満のビューポートではカード表示、以上では従来のテーブル表示。Tailwind の `sm` と同値。 */
export const CARD_BREAKPOINT_PX = 640;

/** ビューポート幅からカード表示にするかを判定する。 */
export function isCardLayout(viewportWidth: number): boolean {
  return viewportWidth < CARD_BREAKPOINT_PX;
}

/** 展開中の年の集合を不変更新でトグルする。 */
export function toggleExpanded(
  expanded: ReadonlySet<number>,
  year: number,
): ReadonlySet<number> {
  const next = new Set(expanded);
  if (next.has(year)) next.delete(year);
  else next.add(year);
  return next;
}

export type CardField = { key: keyof YearlyResult; label: string };

/** 2x2 グリッドで常時表示する項目。 */
export const CARD_SUMMARY_FIELDS: readonly CardField[] = [
  { key: "netIncome", label: "手取り" },
  { key: "livingExpense", label: "生活費" },
  { key: "cashFlow", label: "収支" },
  { key: "eventNet", label: "イベント" },
];

/** タップで展開する項目（テーブルの残り列）。 */
export const CARD_DETAIL_FIELDS: readonly CardField[] = [
  { key: "tax", label: "税" },
  { key: "socialInsurance", label: "社会保険" },
  { key: "loanPayment", label: "ローン返済" },
  { key: "retirementBenefit", label: "退職金" },
  { key: "taxFreeAssets", label: "うち非課税" },
  { key: "grossIncome", label: "世帯収入(税込)" },
  { key: "recurringExpense", label: "継続支出" },
  { key: "dividendIncome", label: "配当(手取)" },
];
