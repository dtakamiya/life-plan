/**
 * 住宅ローン控除の概算（子育て共働きペルソナレビュー #4）。
 *
 * 2024〜2025年入居の子育て世帯・省エネ基準適合住宅を想定し、
 * 年末残高（上限4,000万円）の0.7%を返済開始年から13年間、税額から差し引く。
 * 控除しきれない分は住民税から差し引けるが、住民税分は9.75万円を上限とする。
 * 住宅の種類・入居年による上限の違いや、借入者の按分は扱わない。
 */

import { loanBalanceForYear, type Loan } from "@/features/plan/domain";

/** 控除率。 */
export const HOUSING_LOAN_CREDIT_RATE = 0.007;
/** 控除の対象となる年末残高の上限（円）。 */
export const HOUSING_LOAN_CREDIT_BALANCE_CAP = 40_000_000;
/** 控除を受けられる年数。 */
export const HOUSING_LOAN_CREDIT_YEARS = 13;
/** 住民税から差し引ける上限（円）。 */
export const RESIDENCE_TAX_CREDIT_CAP = 97_500;

/**
 * 指定年の住宅ローン控除額（円）。
 * @param taxes 控除を受ける人（本人）のその年の所得税・住民税
 */
export function housingLoanCreditForYear(
  loans: Loan[],
  year: number,
  taxes: { incomeTax: number; residenceTax: number },
): number {
  const eligible = loans.filter(
    (l) => l.taxCredit === true && year >= l.startYear && year < l.startYear + HOUSING_LOAN_CREDIT_YEARS,
  );
  if (eligible.length === 0) return 0;
  const balance = Math.min(loanBalanceForYear(eligible, year), HOUSING_LOAN_CREDIT_BALANCE_CAP);
  const credit = Math.round(balance * HOUSING_LOAN_CREDIT_RATE);
  const limit = taxes.incomeTax + Math.min(taxes.residenceTax, RESIDENCE_TAX_CREDIT_CAP);
  return Math.min(credit, limit);
}
