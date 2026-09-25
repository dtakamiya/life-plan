/**
 * シミュレーション期間（開始年・終了年）の相互検証。
 *
 * lp-019 / QA#1: 開始年 > 終了年、または期間が1年未満（endYear - startYear < 1）
 * となる入力を、例外を投げずに戻り値の型で補正して表現する
 * （project.md Mandated/Forbidden: 異常系は try/catch ではなく戻り値で表現する）。
 */

/** `correctDateRange` の結果。`corrected` が true のとき endYear を補正している。 */
export type DateRangeCorrection = {
  startYear: number;
  endYear: number;
  /** 入力をそのまま採用できず補正した場合に true。 */
  corrected: boolean;
};

/**
 * 開始年・終了年の組を検証し、必要なら endYear を補正する純粋関数。
 *
 * `endYear - startYear < 1`（終了年が開始年以下、または期間が1年未満）の場合、
 * `endYear = startYear + 1` に補正し `corrected: true` を返す。
 * それ以外は入力をそのまま返し `corrected: false` を返す。
 * 例外は投げない。
 */
export function correctDateRange(
  startYear: number,
  endYear: number,
): DateRangeCorrection {
  if (endYear - startYear < 1) {
    return { startYear, endYear: startYear + 1, corrected: true };
  }
  return { startYear, endYear, corrected: false };
}
