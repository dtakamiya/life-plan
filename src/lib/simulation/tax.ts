/**
 * 所得税・住民税の概算。
 *
 * 注意: これは大まかな概算であり、厳密な制度計算ではない。
 * 各種控除や復興特別所得税などは簡略化している。
 */

import { estimateSocialInsurance } from "./socialInsurance";

/** 基礎控除の概算（円） */
const BASIC_DEDUCTION = 480_000;

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
const INCOME_TAX_BRACKETS: { threshold: number; rate: number }[] = [
  { threshold: 0, rate: 0.05 },
  { threshold: 1_950_000, rate: 0.1 },
  { threshold: 3_300_000, rate: 0.2 },
  { threshold: 6_950_000, rate: 0.23 },
  { threshold: 9_000_000, rate: 0.33 },
  { threshold: 18_000_000, rate: 0.4 },
  { threshold: 40_000_000, rate: 0.45 },
];

/**
 * 所得税の概算（円）。課税所得に簡易累進ブラケットを適用する。
 * @param grossSalary 給与の税込年収
 */
export function estimateIncomeTax(grossSalary: number): number {
  const taxable = estimateTaxableIncome(grossSalary);
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

/** 住民税の概算率（課税所得比、おおよそ一律10%） */
const RESIDENCE_TAX_RATE = 0.1;

/**
 * 住民税の概算（円）。課税所得に一律10%を適用する。
 * @param grossSalary 給与の税込年収
 */
export function estimateResidenceTax(grossSalary: number): number {
  const taxable = estimateTaxableIncome(grossSalary);
  return Math.round(taxable * RESIDENCE_TAX_RATE);
}
