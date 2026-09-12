import { describe, it, expect } from "vitest";
import { newLoan } from "./newLoan";
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
    endYear: 2035,
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

describe("newLoan — ローン新規行ファクトリ（lp-013）", () => {
  it("AC1/AC4: 新規行は借入額0・金利0・期間0、開始年は当年", () => {
    expect(newLoan("loan-1", 2030)).toEqual({
      id: "loan-1",
      label: "ローン",
      startYear: 2030,
      principal: 0,
      annualRate: 0,
      termYears: 0,
    });
  });

  it("AC4: 空ローン行を含む PlanInput でも runSimulation が例外を出さず返済額0", () => {
    const input = makeInput({ loans: [newLoan("loan-1", 2030)] });
    expect(() => runSimulation(input)).not.toThrow();
    const results = runSimulation(input);
    expect(results.every((r) => r.loanPayment === 0)).toBe(true);
  });

  it("AC5/AC10: 空ローン行の追加前後で年次系列が完全一致（負債が混入しない）", () => {
    const before = runSimulation(makeInput({ loans: [] }));
    const after = runSimulation(makeInput({ loans: [newLoan("loan-1", 2030)] }));
    expect(after).toEqual(before);
  });

  it("AC6: ローン0行→1行→複数行の追加/削除でインデックスずれが無い", () => {
    const loans = [
      newLoan("loan-1", 2030),
      newLoan("loan-2", 2030),
      newLoan("loan-3", 2030),
    ];
    // 全行が空なので、行数に関わらず系列は空配列時と一致する。
    const base = runSimulation(makeInput({ loans: [] }));
    for (let n = 1; n <= loans.length; n++) {
      const series = runSimulation(makeInput({ loans: loans.slice(0, n) }));
      expect(series).toEqual(base);
    }
    // 中間行を削除しても残りの空行は無影響。
    const removedMiddle = runSimulation(
      makeInput({ loans: [loans[0], loans[2]] }),
    );
    expect(removedMiddle).toEqual(base);
  });

  it("AC1: ユーザーが値を入れた行のみ返済に寄与する（空行は据え置きでも無影響）", () => {
    const filled = { ...newLoan("loan-1", 2030), principal: 3_000_000, termYears: 3 };
    const empty = newLoan("loan-2", 2030);
    const withEmpty = runSimulation(makeInput({ loans: [filled, empty] }));
    const withoutEmpty = runSimulation(makeInput({ loans: [filled] }));
    expect(withEmpty).toEqual(withoutEmpty);
    // 入力済み行はちゃんと返済計上される（r=0 なので P/n=1,000,000）。
    expect(withEmpty.filter((r) => r.loanPayment === 1_000_000)).toHaveLength(3);
  });
});
