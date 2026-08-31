/**
 * 所得税・住民税の概算。
 *
 * 注意: これは大まかな概算であり、厳密な制度計算ではない。
 * 各種控除や復興特別所得税などは簡略化している。
 */

import { estimateSocialInsurance } from "./socialInsurance";

/** 基礎控除の概算（円） */
export const BASIC_DEDUCTION = 480_000;

/**
 * 給与所得控除の概算（円）。
 * 実際は年収帯ごとの段階式だが、ここでは「年収×20% + 44万円」を
 * 上限195万円で頭打ちにする単純式で近似する。
 */
function estimateEmploymentIncomeDeduction(grossSalary: number): number {
  if (grossSalary <= 0) return 0;
  const deduction = grossSalary * 0.2 + 440_000;
  return Math.min(deduction, 1_950_000);
}

/**
 * 課税所得の概算（円）。
 * 給与所得控除・社会保険料控除・基礎控除を差し引く。
 */
export function estimateTaxableIncome(grossSalary: number): number {
  if (grossSalary <= 0) return 0;
  const social = estimateSocialInsurance(grossSalary);
  const taxable =
    grossSalary -
    estimateEmploymentIncomeDeduction(grossSalary) -
    social -
    BASIC_DEDUCTION;
  return Math.max(0, taxable);
}

/** 所得税の簡易累進ブラケット（課税所得の下限と限界税率）。 */
export const INCOME_TAX_BRACKETS: { threshold: number; rate: number }[] = [
  { threshold: 0, rate: 0.05 },
  { threshold: 1_950_000, rate: 0.1 },
  { threshold: 3_300_000, rate: 0.2 },
  { threshold: 6_950_000, rate: 0.23 },
  { threshold: 9_000_000, rate: 0.33 },
  { threshold: 18_000_000, rate: 0.4 },
  { threshold: 40_000_000, rate: 0.45 },
];

/** 課税所得に簡易累進ブラケットを適用した所得税額（円）。 */
export function applyIncomeTaxBrackets(taxable: number): number {
  if (taxable <= 0) return 0;

  let tax = 0;
  for (let i = 0; i < INCOME_TAX_BRACKETS.length; i++) {
    const { threshold, rate } = INCOME_TAX_BRACKETS[i];
    if (taxable <= threshold) break;
    const upper =
      i + 1 < INCOME_TAX_BRACKETS.length
        ? INCOME_TAX_BRACKETS[i + 1].threshold
        : Infinity;
    const amountInBracket = Math.min(taxable, upper) - threshold;
    tax += amountInBracket * rate;
  }
  return Math.round(tax);
}

/**
 * 所得税の概算（円）。課税所得に簡易累進ブラケットを適用する。
 * @param grossSalary 給与の税込年収
 */
export function estimateIncomeTax(grossSalary: number): number {
  return applyIncomeTaxBrackets(estimateTaxableIncome(grossSalary));
}

/** 住民税の概算率（課税所得比、おおよそ一律10%） */
export const RESIDENCE_TAX_RATE = 0.1;

/**
 * 住民税の概算（円）。課税所得に一律10%を適用する。
 * @param grossSalary 給与の税込年収
 */
export function estimateResidenceTax(grossSalary: number): number {
  const taxable = estimateTaxableIncome(grossSalary);
  return Math.round(taxable * RESIDENCE_TAX_RATE);
}

/**
 * 上場株式等の運用益（譲渡益・配当）に対する概算税率。
 * 所得税15.315%＋住民税5%の合算（NISA/iDeCo 等の非課税口座には課さない）。
 */
export const CAPITAL_GAINS_RATE = 0.20315;

/** 退職所得控除（円）。勤続年数に応じた非課税枠。 */
function retirementIncomeDeduction(serviceYears: number): number {
  const years = Math.max(1, serviceYears);
  return years <= 20 ? 400_000 * years : 8_000_000 + 700_000 * (years - 20);
}

/**
 * 退職一時金にかかる税の概算（円）。
 * 退職所得控除を差し引き、1/2 にした課税退職所得へ所得税＋住民税10%を適用する
 * （分離課税の簡易版。復興特別所得税などは省略）。
 * @param benefit 退職一時金の額面
 * @param serviceYears 勤続年数
 */
export function estimateRetirementIncomeTax(
  benefit: number,
  serviceYears: number,
): number {
  if (benefit <= 0) return 0;
  const taxable = Math.max(
    0,
    (benefit - retirementIncomeDeduction(serviceYears)) / 2,
  );
  return (
    applyIncomeTaxBrackets(taxable) + Math.round(taxable * RESIDENCE_TAX_RATE)
  );
}
