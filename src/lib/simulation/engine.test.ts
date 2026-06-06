import { describe, it, expect } from "vitest";
import { runSimulation } from "./engine";
import type { PlanInput, Person } from "./types";
import { estimateIncomeTax, estimateResidenceTax } from "./tax";
import { estimateSocialInsurance } from "./socialInsurance";

const basePerson: Person = {
  name: "本人",
  birthYear: 2000,
  grossAnnualIncome: 5_000_000,
  incomeGrowthRate: 0,
  retirementAge: 65,
  pensionStartAge: 65,
  annualPension: 1_000_000,
};

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: 2030,
    endYear: 2032,
    self: basePerson,
    spouse: null,
    children: [],
    expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0 },
    assets: { initialAssets: 1_000_000, annualReturnRate: 0 },
    events: [],
    ...overrides,
  };
}

describe("runSimulation", () => {
  it("produces one result per year in the inclusive range", () => {
    const results = runSimulation(makeInput());
    expect(results.map((r) => r.year)).toEqual([2030, 2031, 2032]);
    expect(results[0].selfAge).toBe(30);
  });

  it("computes cashFlow and assets via compounding plus net flow", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2030,
      assets: { initialAssets: 1_000_000, annualReturnRate: 0.05 },
    });
    const [year] = runSimulation(input);

    const expectedTax =
      estimateIncomeTax(5_000_000) + estimateResidenceTax(5_000_000);
    const expectedSocial = estimateSocialInsurance(5_000_000);
    const expectedNet = 5_000_000 - expectedTax - expectedSocial;
    const expectedCashFlow = expectedNet - 3_000_000;

    expect(year.grossIncome).toBe(5_000_000);
    expect(year.tax).toBe(expectedTax);
    expect(year.socialInsurance).toBe(expectedSocial);
    expect(year.netIncome).toBe(expectedNet);
    expect(year.cashFlow).toBe(expectedCashFlow);
    expect(year.assets).toBe(Math.round(1_000_000 * 1.05 + expectedCashFlow));
  });

  it("chains assets across years", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2032,
      assets: { initialAssets: 1_000_000, annualReturnRate: 0.1 },
    });
    const results = runSimulation(input);
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1].assets;
      expect(results[i].assets).toBe(
        Math.round(prev * 1.1 + results[i].cashFlow),
      );
    }
  });

  it("stops salary at retirement age and adds pension after pension start", () => {
    // 退職年齢 = 年金開始年齢 = 65。64歳までは給与、65歳から年金。
    const person: Person = {
      ...basePerson,
      birthYear: 1966, // 2030年に64歳
    };
    const input = makeInput({
      startYear: 2030,
      endYear: 2031,
      self: person,
    });
    const [working, retired] = runSimulation(input);

    expect(working.selfAge).toBe(64);
    expect(working.grossIncome).toBe(5_000_000);
    expect(working.pension).toBe(0);

    expect(retired.selfAge).toBe(65);
    expect(retired.grossIncome).toBe(1_000_000);
    expect(retired.pension).toBe(1_000_000);
    expect(retired.tax).toBe(0); // 給与0なので給与課税は0
    expect(retired.socialInsurance).toBe(0);
  });

  it("charges zero tax and social insurance when there is no income", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2030,
      self: { ...basePerson, grossAnnualIncome: 0 },
    });
    const [year] = runSimulation(input);
    expect(year.grossIncome).toBe(0);
    expect(year.tax).toBe(0);
    expect(year.socialInsurance).toBe(0);
  });

  it("applies inflation to living expenses and counts dependent children", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2031,
      expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0.02 },
      children: [{ id: "c1", name: "子", birthYear: 2025 }],
    });
    const [first, second] = runSimulation(input);
    // 子1人 (5歳/6歳) は扶養対象 → CHILD_ANNUAL_COST=1,200,000 加算
    expect(first.livingExpense).toBe(3_000_000 + 1_200_000);
    expect(second.livingExpense).toBe(
      Math.round(3_000_000 * 1.02) + 1_200_000,
    );
  });

  it("applies one-time life events in their year only", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2032,
      events: [{ id: "e1", year: 2031, label: "臨時支出", amount: -1_000_000 }],
    });
    const results = runSimulation(input);
    expect(results[0].eventNet).toBe(0);
    expect(results[1].eventNet).toBe(-1_000_000);
    expect(results[2].eventNet).toBe(0);
  });

  it("includes spouse income when present", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2030,
      spouse: { ...basePerson, name: "配偶者", grossAnnualIncome: 3_000_000 },
    });
    const [year] = runSimulation(input);
    expect(year.grossIncome).toBe(8_000_000);
    expect(year.spouseAge).toBe(30);
  });

  it("does not mutate the input", () => {
    const input = makeInput();
    const snapshot = JSON.parse(JSON.stringify(input));
    runSimulation(input);
    expect(input).toEqual(snapshot);
  });
});
