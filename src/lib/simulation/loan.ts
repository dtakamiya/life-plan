/**
 * ローン返済の概算。
 *
 * 元利均等返済を前提に、年間の返済額を求める。月次ではなく年次で近似する。
 */

import type { Loan } from "./types";

/**
 * 元利均等返済の年間返済額（円）。
 * 利率0の場合は元本を期間で割った定額。
 */
export function annualLoanPayment(loan: Loan): number {
  const { principal, annualRate: r, termYears: n } = loan;
  if (n <= 0 || principal <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * 指定年に発生するローン返済額の合計（円）。
 * 返済期間は startYear から termYears 年間（startYear を含む）。
 */
export function loanPaymentForYear(loans: Loan[], year: number): number {
  return loans.reduce((sum, loan) => {
    const inRepayment =
      year >= loan.startYear && year < loan.startYear + loan.termYears;
    return inRepayment ? sum + annualLoanPayment(loan) : sum;
  }, 0);
}
