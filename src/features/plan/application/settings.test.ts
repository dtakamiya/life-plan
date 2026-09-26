import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { updateAssets, updateExpenses } from "./settings";

const base = (): PlanInput => structuredClone(defaultPlanInput);

describe("支出・資産設定のユースケース", () => {
  it("updateExpenses は patch の項目だけを更新する", () => {
    const input = base();
    const before = structuredClone(input);
    const next = updateExpenses(input, { baseAnnualLivingExpense: 2_500_000 });
    expect(next.expenses).toEqual({ ...before.expenses, baseAnnualLivingExpense: 2_500_000 });
    expect(input).toEqual(before);
  });

  it("updateAssets は patch の項目だけを更新する", () => {
    const input = base();
    const before = structuredClone(input);
    const next = updateAssets(input, { taxFreeAssets: 1_000_000 });
    expect(next.assets).toEqual({ ...before.assets, taxFreeAssets: 1_000_000 });
    expect(input).toEqual(before);
  });
});
