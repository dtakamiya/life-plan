/**
 * 公的年金の概算。
 *
 * 注意: これは大まかな概算であり、厳密な制度計算ではない。
 * 受給開始後の年金年額を「基礎年金の定額」＋「現役年収に係数を掛けた
 * 厚生年金相当」で近似する。フォームの初期値として用い、ユーザーが
 * 上書きできる前提。
 */

/** 基礎年金（満額）の概算年額（円） */
export const BASIC_PENSION_ANNUAL = 780_000;

/** 厚生年金の概算係数（現役年収に対する割合） */
const EARNINGS_RELATED_FACTOR = 0.12;

/** 厚生年金相当部分の概算上限（円） */
const EARNINGS_RELATED_CAP = 1_500_000;

/**
 * 受給開始後の公的年金の概算年額（円）。
 * @param grossAnnualIncome 現役時の税込年収
 */
export function estimateAnnualPension(grossAnnualIncome: number): number {
  const earningsRelated = Math.min(
    Math.max(0, grossAnnualIncome) * EARNINGS_RELATED_FACTOR,
    EARNINGS_RELATED_CAP,
  );
  return Math.round(BASIC_PENSION_ANNUAL + earningsRelated);
}
