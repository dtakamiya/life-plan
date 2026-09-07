/**
 * ローン行の「新規追加」時の初期値ファクトリ。
 *
 * 借入額・金利・返済期間をすべて 0（＝未入力相当）で返し、返済開始年だけ
 * 当年（シミュレーション開始年）を既定にする。
 *
 * 前提: 追加直後のローン行は返済に一切寄与しない。ユーザーが値を入力するまでは
 * termYears が 0 のままであり、annualLoanPayment / loanPaymentForYear は
 * ともに 0 を返す（loan.ts の `n <= 0` ガード、および
 * `year < startYear + termYears` が常に偽になるため）。したがって
 * runSimulation の年次系列に負債が混入することはない
 * （board bug-report-gamemode-qa-20260906 #2: ローン追加 → 中身未編集）。
 *
 * 計算エンジン・zod スキーマ本体には手を入れず、この既定値のみを変更する。
 * 既存の保存データ（v1 含む）のローン行はマイグレーション対象ではなく影響を受けない。
 */

import type { Loan } from "@/lib/simulation/types";

export function newLoan(id: string, currentYear: number): Loan {
  return {
    id,
    label: "ローン",
    // 未設定の代わりに当年を既定にする（借入年の入力を促すプレースホルダ的既定）。
    startYear: currentYear,
    // 借入額・金利・期間は 0 始まり。ユーザーが入れるまで返済額に寄与しない。
    principal: 0,
    annualRate: 0,
    termYears: 0,
  };
}
