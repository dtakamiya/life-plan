import { describe, it, expect } from "vitest";
import { defaultPlanInput } from "./defaults";
import { runSimulation } from "./engine";
import { findDepletion } from "./summary";
import { findDepletionRemedies } from "./depletionRemedies";
import type { PlanInput } from "./types";

/** 低収入ペルソナ（35歳単身・年収240万円・国民年金のみ）。 */
const lowIncome: PlanInput = {
  ...defaultPlanInput,
  endYear: 1991 + 95,
  self: {
    ...defaultPlanInput.self,
    birthYear: 1991,
    grossAnnualIncome: 2_400_000,
    incomeGrowthRate: 0,
    retirementAge: 65,
    pensionStartAge: 65,
    annualPension: 800_000,
    retirementBenefit: 0,
  },
  spouse: null,
  children: [],
  expenses: { baseAnnualLivingExpense: 1_500_000, inflationRate: 0.01 },
  assets: {
    ...defaultPlanInput.assets,
    taxableAssets: 300_000,
    taxFreeAssets: 0,
    annualTaxFreeContribution: 0,
  },
  events: [],
  recurringExpenses: [],
  loans: [],
};

describe("findDepletionRemedies", () => {
  it("尽きない計画では null を返す", () => {
    const rich = { ...lowIncome, assets: { ...lowIncome.assets, taxableAssets: 1e9 } };
    expect(findDepletionRemedies(rich)).toBeNull();
  });

  it("生活費の最小削減額（1,000円/月単位）を返し、その額で尽きなくなる", () => {
    expect(findDepletion(runSimulation(lowIncome))).not.toBeNull();
    const r = findDepletionRemedies(lowIncome);
    const cut = r?.monthlyExpenseCut;
    expect(cut).not.toBeNull();
    expect(cut! % 1000).toBe(0);
    const apply = (m: number) => ({
      ...lowIncome,
      expenses: { ...lowIncome.expenses, baseAnnualLivingExpense: 1_500_000 - m * 12 },
    });
    expect(findDepletion(runSimulation(apply(cut!)))).toBeNull();
    expect(findDepletion(runSimulation(apply(cut! - 1000)))).not.toBeNull();
  });

  it("働き続ける年齢は現在の退職年齢より後で、その年齢なら尽きない", () => {
    const r = findDepletionRemedies(lowIncome);
    const age = r?.retirementAge;
    if (age === null || age === undefined) return;
    expect(age).toBeGreaterThan(65);
    const next = { ...lowIncome, self: { ...lowIncome.self, retirementAge: age } };
    expect(findDepletion(runSimulation(next))).toBeNull();
  });
});
