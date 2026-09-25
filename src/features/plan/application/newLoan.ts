/**
 * ローン行の「新規追加」時の初期値ファクトリ。
 *
 * 借入額・金利は 0（＝未入力相当）、返済期間は住宅ローンで一般的な 35 年、
 * 返済開始年は当年（シミュレーション開始年）を既定にする。
 *
 * 返済期間は 1〜50 年が必須（lp-005）のため、0 を既定にすると追加直後から
 * 入力エラーになり結果が表示されなくなる（ペルソナ操作で発見）。期間に有効値を
 * 入れておいても、借入額が 0 のうちは annualLoanPayment・loanBalanceForYear が
 * ともに 0 を返すため、runSimulation の年次系列に負債は混入しない
 * （board bug-report-gamemode-qa-20260906 #2: ローン追加 → 中身未編集）。
 *
 * 既存の保存データ（v1 含む）のローン行はマイグレーション対象ではなく影響を受けない。
 */

import type { Loan } from "@/features/plan/domain";

export function newLoan(id: string, currentYear: number): Loan {
  return {
    id,
    label: "ローン",
    // 未設定の代わりに当年を既定にする（借入年の入力を促すプレースホルダ的既定）。
    startYear: currentYear,
    // 借入額・金利は 0 始まり。借入額を入れるまで返済額に寄与しない。
    principal: 0,
    annualRate: 0,
    // 追加直後から入力エラーにならないよう、有効範囲内の一般的な期間を既定にする。
    termYears: 35,
  };
}
