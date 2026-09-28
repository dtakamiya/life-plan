import { describe, expect, it } from "vitest";
import { defaultPlanInput } from "./defaults";
import { ASSUMPTION_PRESETS, matchAssumptionPreset } from "./assumptionPresets";

describe("ASSUMPTION_PRESETS", () => {
  it("標準プリセットは既定値（defaultPlanInput）と完全に一致する", () => {
    const standard = ASSUMPTION_PRESETS.find((p) => p.key === "standard")!;
    expect(standard.values).toEqual({
      annualReturnRate: defaultPlanInput.assets.annualReturnRate,
      inflationRate: defaultPlanInput.expenses.inflationRate,
      incomeGrowthRate: defaultPlanInput.self.incomeGrowthRate,
    });
  });

  it("楽観は標準より運用利回り・年収上昇率が高く、物価上昇率が低い", () => {
    const optimistic = ASSUMPTION_PRESETS.find((p) => p.key === "optimistic")!;
    const standard = ASSUMPTION_PRESETS.find((p) => p.key === "standard")!;
    expect(optimistic.values.annualReturnRate).toBeGreaterThan(standard.values.annualReturnRate);
    expect(optimistic.values.incomeGrowthRate).toBeGreaterThan(standard.values.incomeGrowthRate);
    expect(optimistic.values.inflationRate).toBeLessThan(standard.values.inflationRate);
  });

  it("悲観は標準より運用利回り・年収上昇率が低く、物価上昇率が高い", () => {
    const pessimistic = ASSUMPTION_PRESETS.find((p) => p.key === "pessimistic")!;
    const standard = ASSUMPTION_PRESETS.find((p) => p.key === "standard")!;
    expect(pessimistic.values.annualReturnRate).toBeLessThan(standard.values.annualReturnRate);
    expect(pessimistic.values.incomeGrowthRate).toBeLessThan(standard.values.incomeGrowthRate);
    expect(pessimistic.values.inflationRate).toBeGreaterThan(standard.values.inflationRate);
  });

  it("すべての値が zod のレート範囲（-1〜1）に収まる", () => {
    for (const preset of ASSUMPTION_PRESETS) {
      for (const value of Object.values(preset.values)) {
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it("根拠の説明に「予測値ではなく仮定」である旨を含む", () => {
    for (const preset of ASSUMPTION_PRESETS) {
      expect(preset.rationale).toContain("仮定");
    }
  });
});

describe("matchAssumptionPreset", () => {
  it("配偶者なしで値がプリセットと一致すればそのキーを返す", () => {
    expect(
      matchAssumptionPreset({
        annualReturnRate: 0.03,
        inflationRate: 0.01,
        selfIncomeGrowthRate: 0.01,
        spouseIncomeGrowthRate: null,
      }),
    ).toBe("standard");
  });

  it("配偶者ありで配偶者の年収上昇率もプリセット値と一致しないとカスタム扱い", () => {
    expect(
      matchAssumptionPreset({
        annualReturnRate: 0.03,
        inflationRate: 0.01,
        selfIncomeGrowthRate: 0.01,
        spouseIncomeGrowthRate: 0.02,
      }),
    ).toBeNull();
  });

  it("配偶者ありで両者ともプリセット値と一致すればそのキーを返す", () => {
    expect(
      matchAssumptionPreset({
        annualReturnRate: 0.05,
        inflationRate: 0.005,
        selfIncomeGrowthRate: 0.02,
        spouseIncomeGrowthRate: 0.02,
      }),
    ).toBe("optimistic");
  });

  it("いずれのプリセットとも一致しなければ null（カスタム）を返す", () => {
    expect(
      matchAssumptionPreset({
        annualReturnRate: 0.02,
        inflationRate: 0.01,
        selfIncomeGrowthRate: 0.01,
        spouseIncomeGrowthRate: null,
      }),
    ).toBeNull();
  });
});
