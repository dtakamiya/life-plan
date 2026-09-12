/**
 * 継続支出行の「新規追加」時の初期値ファクトリ。
 *
 * 年額 0 円、開始年・終了年ともに当年（シミュレーション開始年）で返す。
 * 前提: 追加直後の行は年額 0 のため年次収支に一切寄与しない
 * （newLoan と同じ「0 円始まり」の方針）。
 */

import type { RecurringExpense } from "@/lib/simulation/types";

export function newRecurringExpense(
  id: string,
  currentYear: number,
): RecurringExpense {
  return {
    id,
    label: "継続支出",
    startYear: currentYear,
    endYear: currentYear,
    annualAmount: 0,
  };
}
