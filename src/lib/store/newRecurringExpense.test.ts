import { describe, it, expect } from "vitest";
import { newRecurringExpense } from "./newRecurringExpense";
import { runSimulation } from "@/lib/simulation/engine";
import type { PlanInput, Person } from "@/lib/simulation/types";

const basePerson: Person = {
  name: "本人",
  birthYear: 2000,
  grossAnnualIncome: 5_000_000,
  incomeGrowthRate: 0,
  retirementAge: 65,
  pensionStartAge: 65,
  annualPension: 1_000_000,
  retirementBenefit: 0,
};

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: 2030,
    endYear: 2033,
    self: basePerson,
    spouse: null,
    children: [],
    expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0 },
    assets: {
      taxableAssets: 1_000_000,
      taxFreeAssets: 0,
      annualReturnRate: 0,
      annualTaxFreeContribution: 0,
    },
    events: [],
    recurringExpenses: [],
    loans: [],
    ...overrides,
  };
}

describe("newRecurringExpense", () => {
  it("開始年・終了年は当年、年額は 0 で始まる", () => {
    const item = newRecurringExpense("rec-1", 2030);
    expect(item.id).toBe("rec-1");
    expect(item.startYear).toBe(2030);
    expect(item.endYear).toBe(2030);
    expect(item.annualAmount).toBe(0);
  });

  it("追加直後の行は年次系列を一切変えない", () => {
    const before = runSimulation(makeInput({ recurringExpenses: [] }));
    const after = runSimulation(
      makeInput({ recurringExpenses: [newRecurringExpense("rec-1", 2030)] }),
    );
    expect(after).toEqual(before);
  });
});
