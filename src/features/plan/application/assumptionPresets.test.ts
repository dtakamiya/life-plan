import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { applyAssumptionPreset } from "./assumptionPresets";

describe("applyAssumptionPreset", () => {
  it("標準プリセットを適用しても既定値の PlanInput は一致する（回帰ゼロ）", () => {
    const input: PlanInput = structuredClone(defaultPlanInput);
    const next = applyAssumptionPreset(input, "standard");
    expect(next).toEqual(defaultPlanInput);
  });

  it("楽観プリセットは利回り・年収上昇率を引き上げ、物価上昇率を下げる", () => {
    const input: PlanInput = structuredClone(defaultPlanInput);
    const next = applyAssumptionPreset(input, "optimistic");
    expect(next.assets.annualReturnRate).toBe(0.05);
    expect(next.expenses.inflationRate).toBe(0.005);
    expect(next.self.incomeGrowthRate).toBe(0.02);
    expect(next.spouse?.incomeGrowthRate).toBe(0.02);
  });

  it("悲観プリセットは利回り・年収上昇率を引き下げ、物価上昇率を上げる", () => {
    const input: PlanInput = structuredClone(defaultPlanInput);
    const next = applyAssumptionPreset(input, "pessimistic");
    expect(next.assets.annualReturnRate).toBe(0.015);
    expect(next.expenses.inflationRate).toBe(0.02);
    expect(next.self.incomeGrowthRate).toBe(0);
    expect(next.spouse?.incomeGrowthRate).toBe(0);
  });

  it("配偶者がいなければ spouse は null のまま", () => {
    const input: PlanInput = { ...structuredClone(defaultPlanInput), spouse: null };
    const next = applyAssumptionPreset(input, "optimistic");
    expect(next.spouse).toBeNull();
  });

  it("生活費の額・資産額・退職年齢など、他の項目には触れない", () => {
    const input: PlanInput = structuredClone(defaultPlanInput);
    const next = applyAssumptionPreset(input, "pessimistic");
    expect(next.expenses.baseAnnualLivingExpense).toBe(input.expenses.baseAnnualLivingExpense);
    expect(next.assets.taxableAssets).toBe(input.assets.taxableAssets);
    expect(next.self.retirementAge).toBe(input.self.retirementAge);
  });

  it("入力を変更せず新しいオブジェクトを返す", () => {
    const input: PlanInput = structuredClone(defaultPlanInput);
    const before = structuredClone(input);
    applyAssumptionPreset(input, "optimistic");
    expect(input).toEqual(before);
  });
});
