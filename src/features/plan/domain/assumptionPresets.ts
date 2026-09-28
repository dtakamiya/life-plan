/**
 * lp-032: 前提プリセット（楽観・標準・悲観）。
 *
 * ここに並ぶ数値は「調査済みの予測値」ではなく、PO/Ryoko が置いた仮定である。
 * 標準は既定値（defaults.ts の annualReturnRate / expenses.inflationRate /
 * self・spouse.incomeGrowthRate）と完全に一致させ、プリセット適用による
 * 既定挙動の回帰をゼロにする。
 *
 * この定数は plan/application（適用ユースケース）と simulation/domain
 * （「計算の前提」パネルの表示）の両方から参照し、値を二重管理しない。
 */

export type AssumptionPresetKey = "optimistic" | "standard" | "pessimistic";

/** プリセットが指定する率。運用利回り・物価上昇率・（本人と配偶者に共通の）年収上昇率。 */
export type AssumptionPresetValues = {
  annualReturnRate: number;
  inflationRate: number;
  incomeGrowthRate: number;
};

export type AssumptionPreset = {
  key: AssumptionPresetKey;
  label: string;
  /** 「計算の前提」パネルとプリセット選択 UI の両方で使う、値と根拠の説明文。 */
  rationale: string;
  values: AssumptionPresetValues;
};

export const ASSUMPTION_PRESETS: readonly AssumptionPreset[] = [
  {
    key: "optimistic",
    label: "楽観",
    values: { annualReturnRate: 0.05, inflationRate: 0.005, incomeGrowthRate: 0.02 },
    rationale:
      "運用利回り5.0%・物価上昇率0.5%・年収上昇率2.0%。景気・賃上げが良好に推移する場合の仮定（PO/Ryoko 設定、予測値ではない）。",
  },
  {
    key: "standard",
    label: "標準",
    values: { annualReturnRate: 0.03, inflationRate: 0.01, incomeGrowthRate: 0.01 },
    rationale:
      "運用利回り3.0%・物価上昇率1.0%・年収上昇率1.0%。現行の既定値と同じ、現状の傾向が続く場合の仮定（PO/Ryoko 設定、予測値ではない）。",
  },
  {
    key: "pessimistic",
    label: "悲観",
    values: { annualReturnRate: 0.015, inflationRate: 0.02, incomeGrowthRate: 0 },
    rationale:
      "運用利回り1.5%・物価上昇率2.0%・年収上昇率0%。運用が振るわず物価だけ上がる場合の仮定（PO/Ryoko 設定、予測値ではない）。",
  },
];

/** プリセット適用の判定対象になる現在値。配偶者がいなければ spouse 側は null。 */
export type AssumptionPresetSnapshot = {
  annualReturnRate: number;
  inflationRate: number;
  selfIncomeGrowthRate: number;
  spouseIncomeGrowthRate: number | null;
};

/**
 * 現在値がどのプリセットと一致するかを返す。どれとも一致しなければ null（＝カスタム）。
 * 配偶者がいる場合は配偶者の年収上昇率もプリセット値と一致していることを要求する
 * （lp-032: プリセット適用は本人・配偶者の昇給率を同値で更新するため）。
 */
export function matchAssumptionPreset(
  snapshot: AssumptionPresetSnapshot,
): AssumptionPresetKey | null {
  const found = ASSUMPTION_PRESETS.find(
    (preset) =>
      preset.values.annualReturnRate === snapshot.annualReturnRate &&
      preset.values.inflationRate === snapshot.inflationRate &&
      preset.values.incomeGrowthRate === snapshot.selfIncomeGrowthRate &&
      (snapshot.spouseIncomeGrowthRate === null ||
        snapshot.spouseIncomeGrowthRate === preset.values.incomeGrowthRate),
  );
  return found?.key ?? null;
}
