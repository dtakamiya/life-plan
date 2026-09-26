import { describe, it, expect } from "vitest";
import { newRecurringExpense } from "@/features/plan/application";
import { runSimulation } from "@/lib/simulation/engine";
import type { PlanInput, Person } from "@/features/plan/domain";

/**
 * 継続支出の新規行（newRecurringExpense）をシミュレーションに通したときの回帰テスト。
 * plan は simulation を import できない（下流機能）ため、plan/application/newRecurringExpense.test.ts から移した。
 */

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
      annualDividendYield: 0,
      annualTaxFreeContribution: 0,
    },
    events: [],
    recurringExpenses: [],
    loans: [],
    ...overrides,
  };
}

describe("newRecurringExpense", () => {
  it("追加直後の行は年次系列を一切変えない", () => {
    const before = runSimulation(makeInput({ recurringExpenses: [] }));
    const after = runSimulation(
      makeInput({ recurringExpenses: [newRecurringExpense("rec-1", 2030)] }),
    );
    expect(after).toEqual(before);
  });
});
