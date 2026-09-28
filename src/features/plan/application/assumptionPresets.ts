import {
  ASSUMPTION_PRESETS,
  type AssumptionPresetKey,
  type PlanInput,
} from "@/features/plan/domain";

/**
 * 前提プリセット（楽観・標準・悲観）を適用する。運用利回り・物価上昇率・
 * 本人（と配偶者がいれば配偶者も同値の）年収上昇率を書き換え、それ以外
 * （生活費の額・資産額・退職年齢など）には触れない。
 */
export function applyAssumptionPreset(
  input: PlanInput,
  key: AssumptionPresetKey,
): PlanInput {
  const preset = ASSUMPTION_PRESETS.find((p) => p.key === key);
  if (!preset) return input;
  const { annualReturnRate, inflationRate, incomeGrowthRate } = preset.values;
  return {
    ...input,
    expenses: { ...input.expenses, inflationRate },
    assets: { ...input.assets, annualReturnRate },
    self: { ...input.self, incomeGrowthRate },
    spouse: input.spouse ? { ...input.spouse, incomeGrowthRate } : null,
  };
}
