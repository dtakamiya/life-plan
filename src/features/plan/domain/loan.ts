/**
 * ローン返済の概算。
 *
 * 元利均等返済を前提に、年間の返済額を求める。月次ではなく年次で近似する。
 */

/**
 * ローン・借入。元利均等返済を前提に、返済期間中だけ年間返済額を支出計上する。
 * 借入元本の受取（物件費・頭金など）はモデル化せず、頭金などの自己資金は
 * LifeEvent 側で表現する。ここでは毎年の返済負担と年末残高を扱い、年末残高は
 * 純資産（金融資産 − ローン残高）から差し引く。
 */
export type Loan = {
  id: string;
  label: string;
  /** 返済開始年（西暦） */
  startYear: number;
  /** 借入元本（円） */
  principal: number;
  /** 年利（小数） */
  annualRate: number;
  /** 返済期間（年） */
  termYears: number;
  /**
   * 住宅ローン控除の対象か（子育て共働きペルソナレビュー #4）。
   * 未指定は対象外（既存の保存データとの互換のため任意項目）。
   */
  taxCredit?: boolean;
};

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

/** 1 本のローンについて、指定年の返済を終えた時点の年末残高（円）。 */
function loanBalanceAfterYear(loan: Loan, year: number): number {
  const { principal, annualRate: r, termYears: n, startYear } = loan;
  if (n <= 0 || principal <= 0 || year < startYear) return 0;
  // 返済回数（startYear の年も 1 回返済済みとみなす）。完済後は n で頭打ち。
  const paid = Math.min(year - startYear + 1, n);
  if (paid >= n) return 0;
  if (r === 0) return principal - (principal / n) * paid;
  const growth = Math.pow(1 + r, paid);
  const balance =
    principal * growth - (annualLoanPayment(loan) * (growth - 1)) / r;
  return Math.max(balance, 0);
}

/**
 * 指定年の年末ローン残高の合計（円）。
 * 返済開始年より前は借入前として 0、完済年以降も 0。借入元本の受取は
 * モデル化しないため、純資産（金融資産−ローン残高）は借入年に残高ぶん下がる。
 */
export function loanBalanceForYear(loans: Loan[], year: number): number {
  return loans.reduce((sum, loan) => sum + loanBalanceAfterYear(loan, year), 0);
}
