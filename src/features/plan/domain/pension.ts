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
export const EARNINGS_RELATED_FACTOR = 0.12;

/** 厚生年金相当部分の概算上限（円） */
export const EARNINGS_RELATED_CAP = 1_500_000;

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

/** 繰上げ受給の減額率（1962/4/2 以降生まれ、月あたり） */
const EARLY_REDUCTION_RATE_PER_MONTH = 0.004;

/** 繰下げ受給の増額率（月あたり） */
const LATE_INCREASE_RATE_PER_MONTH = 0.007;

/** 受給開始年齢の下限（繰上げの下限） */
const MIN_PENSION_START_AGE = 60;

/** 受給開始年齢の上限（繰下げの上限、2022/4 以降） */
const MAX_PENSION_START_AGE = 75;

/** 標準の受給開始年齢 */
const STANDARD_PENSION_START_AGE = 65;

/**
 * 老齢年金の繰上げ/繰下げ受給による年金額の調整係数（純関数、engine 未接続）。
 *
 * `annualPension`（本アプリの入力項目）は「65歳受給開始時点の基準年額」を意味する。
 * この関数は基準年額に掛けるべき「係数」のみを返し、実際の年額計算（基準年額 ×
 * 係数）は行わない。基準年額への乗算・シミュレーションエンジンへの接続は
 * 将来項目（lp-029）の範囲であり、本関数はそれに接続していない。
 *
 * 計算式（日本年金機構の公表値に基づく）:
 * - 60〜64歳（繰上げ）: 1 − 0.004 × (65 − age) × 12
 *   出典: 減額率0.4%/月
 *   http://www.nenkin.go.jp/service/jukyu/seido/roureinenkin/kuriage-kurisage/20140421-01.html
 * - 65歳: 厳密に 1.0（浮動小数点誤差を避けるため月数の計算を経由しない）
 * - 66〜75歳（繰下げ）: 1 + 0.007 × (age − 65) × 12
 *   出典: 増額率0.7%/月、繰下げ上限75歳（2022/4〜）
 *   http://www.nenkin.go.jp/service/jukyu/seido/roureinenkin/kuriage-kurisage/20140421-02.html
 *
 * 対象生年の前提: 繰上げの減額率0.4%/月は 1962/4/2 以降生まれが対象
 * （1962/4/1 以前生まれは 0.5%/月）。本関数は 1962/4/2 以降生まれのみを
 * 前提としており、生年による差は扱わない。
 *
 * 範囲外の扱い: 60〜75 の範囲にクランプし、非整数は Math.round で最も近い
 * 整数歳に丸める（NaN を無言で返すことはしない）。
 *
 * @param startAge 受給開始年齢
 * @returns 65歳受給開始時点の基準年額に掛ける係数
 */
export function pensionAdjustmentFactor(startAge: number): number {
  const roundedAge = Math.round(startAge);
  const clampedAge = Math.min(
    Math.max(roundedAge, MIN_PENSION_START_AGE),
    MAX_PENSION_START_AGE,
  );

  if (clampedAge === STANDARD_PENSION_START_AGE) {
    return 1.0;
  }

  if (clampedAge < STANDARD_PENSION_START_AGE) {
    const months = (STANDARD_PENSION_START_AGE - clampedAge) * 12;
    return 1 - EARLY_REDUCTION_RATE_PER_MONTH * months;
  }

  const months = (clampedAge - STANDARD_PENSION_START_AGE) * 12;
  return 1 + LATE_INCREASE_RATE_PER_MONTH * months;
}
