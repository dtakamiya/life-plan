/**
 * 社会保険料の概算。
 *
 * 注意: これは大まかな概算であり、厳密な制度計算ではない。
 * 給与所得者の社会保険料（健康保険・厚生年金・雇用保険など）を、
 * 税込年収に一定率を掛けた額として近似する。標準報酬月額の上限に
 * 相当する年収上限を設け、それ以上は頭打ちにする。
 */

/** 社会保険料の概算率（税込年収比） */
export const SOCIAL_INSURANCE_RATE = 0.15;

/** 概算上限の対象年収（おおよその標準報酬上限の目安、円） */
export const SOCIAL_INSURANCE_INCOME_CAP = 12_000_000;

/**
 * 給与収入に対する社会保険料の概算（円）。
 * @param grossSalary 給与の税込年収（年金収入は含めない）
 */
export function estimateSocialInsurance(grossSalary: number): number {
  if (grossSalary <= 0) return 0;
  const base = Math.min(grossSalary, SOCIAL_INSURANCE_INCOME_CAP);
  return Math.round(base * SOCIAL_INSURANCE_RATE);
}

/** 公的年金等控除の概算（65歳以上の最低額、円）。 */
export const PENSION_INCOME_DEDUCTION = 1_100_000;

/** 年金受給者の国民健康保険料＋介護保険料の概算率（年金所得比）。 */
export const PENSION_SOCIAL_INSURANCE_RATE = 0.15;

/** 年金受給者の国民健康保険料＋介護保険料の最低額（均等割の軽減後の目安、円）。 */
export const PENSION_SOCIAL_INSURANCE_MIN = 30_000;

/**
 * 年金収入に対する国民健康保険料・介護保険料の概算（円）。
 * 公的年金等控除後の所得に一定率を掛け、低所得でも最低額（均等割）を課す。
 * @param annualPension 年金の年額
 */
export function estimatePensionSocialInsurance(annualPension: number): number {
  if (annualPension <= 0) return 0;
  const income = Math.max(0, annualPension - PENSION_INCOME_DEDUCTION);
  return Math.max(
    PENSION_SOCIAL_INSURANCE_MIN,
    Math.round(income * PENSION_SOCIAL_INSURANCE_RATE),
  );
}
