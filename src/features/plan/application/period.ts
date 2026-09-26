import { correctDateRange, type PlanInput } from "@/features/plan/domain";

/**
 * lp-019 / QA#1: 開始年・終了年を更新する。`correctDateRange`
 * （純粋関数、例外を投げない）で相互検証し、無効な組み合わせ
 * （開始年>終了年、または期間1年未満）は endYear を自動補正する。
 * 補正の有無を `rangeAutoCorrected` で返し、UI 側（HouseholdForm）が
 * 注意文言の表示に利用する。
 */
export function setRange(
  input: PlanInput,
  startYear: number,
  endYear: number,
): { input: PlanInput; rangeAutoCorrected: boolean } {
  const corrected = correctDateRange(startYear, endYear);
  return {
    input: { ...input, startYear: corrected.startYear, endYear: corrected.endYear },
    rangeAutoCorrected: corrected.corrected,
  };
}
