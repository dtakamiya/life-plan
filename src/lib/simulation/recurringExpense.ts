/**
 * 期間指定の継続支出の年次合計。
 *
 * 開始年から終了年まで（両端を含む）年額をそのまま計上する。
 * 終了年が開始年より前の不正な組み合わせは、例外を投げず単に 0 件扱いとする
 * （戻り値の型で異常系を表現する方針に従う）。
 */

import type { RecurringExpense } from "./types";

/** 指定年に発生する継続支出の合計（円）。 */
export function recurringExpenseForYear(
  items: RecurringExpense[],
  year: number,
): number {
  return items.reduce((sum, item) => {
    const inPeriod = year >= item.startYear && year <= item.endYear;
    return inPeriod ? sum + item.annualAmount : sum;
  }, 0);
}
