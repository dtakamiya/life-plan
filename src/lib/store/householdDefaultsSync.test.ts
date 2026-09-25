import { describe, it, expect } from "vitest";
import { applyHouseholdDefaults } from "./householdDefaultsSync";
import type { PlanInput } from "@/lib/simulation/types";

const START_YEAR = 2026;

function baseInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: START_YEAR,
    endYear: START_YEAR + 50,
    self: {
      name: "本人",
      birthYear: START_YEAR - 35,
      grossAnnualIncome: 5_000_000,
      incomeGrowthRate: 0.01,
      retirementAge: 65,
      pensionStartAge: 65,
      annualPension: 1_000_000,
      retirementBenefit: 20_000_000,
    },
    spouse: null,
    children: [],
    expenses: { baseAnnualLivingExpense: 2_400_000, inflationRate: 0.01 },
    assets: {
      taxableAssets: 5_000_000,
      taxFreeAssets: 0,
      annualReturnRate: 0.03,
      annualDividendYield: 0,
      annualTaxFreeContribution: 480_000,
    },
    events: [],
    recurringExpenses: [],
    loans: [],
    ...overrides,
  };
}

const NEW_IDS = { loan: "loan-new", event: "event-new" };

describe("applyHouseholdDefaults", () => {
  it("子なし→子1人: 生活費は240万のまま（子の人数で加算しない）、住宅ローン・イベントが新規追加される", () => {
    const input = baseInput({
      children: [
        { id: "c1", name: "子1", birthYear: START_YEAR, education: {
          kindergarten: "公立", elementary: "公立", juniorHigh: "公立", highSchool: "公立", university: "国公立",
        } },
      ],
    });
    const result = applyHouseholdDefaults(
      input,
      { hasSpouse: false, childCount: 0 },
      NEW_IDS,
    );
    expect(result.expenses.baseAnnualLivingExpense).toBe(2_400_000);
    expect(result.loans).toHaveLength(1);
    expect(result.loans[0]).toMatchObject({
      id: "loan-new",
      principal: 30_000_000,
      startYear: START_YEAR + 5,
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({ id: "event-new", amount: -5_000_000 });
  });

  it("子1人→子0人（往復）: 生活費が単身の既定へ戻り、住宅ローン・イベントの既定値が残留しない", () => {
    const withChildDefaults = applyHouseholdDefaults(
      baseInput({
        children: [
          { id: "c1", name: "子1", birthYear: START_YEAR, education: {
            kindergarten: "公立", elementary: "公立", juniorHigh: "公立", highSchool: "公立", university: "国公立",
          } },
        ],
      }),
      { hasSpouse: false, childCount: 0 },
      NEW_IDS,
    );

    const afterRemoveChild = applyHouseholdDefaults(
      { ...withChildDefaults, children: [] },
      { hasSpouse: false, childCount: 1 },
      { loan: "unused-loan", event: "unused-event" },
    );

    expect(afterRemoveChild.expenses.baseAnnualLivingExpense).toBe(2_400_000);
    expect(afterRemoveChild.loans).toEqual([]);
    expect(afterRemoveChild.events).toEqual([]);
  });

  it("編集済みの生活費は世帯構成が変わっても上書きされない", () => {
    const input = baseInput({
      expenses: { baseAnnualLivingExpense: 9_999_999, inflationRate: 0.01 }, // ユーザーが編集済み
      spouse: {
        name: "配偶者",
        birthYear: START_YEAR - 33,
        grossAnnualIncome: 3_000_000,
        incomeGrowthRate: 0.01,
        retirementAge: 65,
        pensionStartAge: 65,
        annualPension: 800_000,
        retirementBenefit: 10_000_000,
      },
    });
    const result = applyHouseholdDefaults(
      input,
      { hasSpouse: false, childCount: 0 },
      NEW_IDS,
    );
    expect(result.expenses.baseAnnualLivingExpense).toBe(9_999_999);
  });

  it("編集済みの住宅ローン・イベントは、子がいなくなっても削除されない", () => {
    const editedLoan = {
      id: "loan-1",
      label: "住宅ローン（編集済み）",
      startYear: START_YEAR + 5,
      principal: 45_000_000, // 既定値から編集済み
      annualRate: 0.01,
      termYears: 35,
    };
    const editedEvent = {
      id: "event-1",
      year: START_YEAR + 5,
      label: "住宅購入（頭金）",
      amount: -12_000_000, // 既定値から編集済み
    };
    const input = baseInput({
      children: [],
      loans: [editedLoan],
      events: [editedEvent],
    });
    const result = applyHouseholdDefaults(
      input,
      { hasSpouse: false, childCount: 1 }, // 直前は子1人だった想定
      NEW_IDS,
    );
    expect(result.loans).toEqual([editedLoan]);
    expect(result.events).toEqual([editedEvent]);
  });

  it("未編集の住宅ローン・イベントは子がいなくなると削除される", () => {
    const defaultLoan = {
      id: "loan-1",
      label: "住宅ローン",
      startYear: START_YEAR + 5,
      principal: 30_000_000,
      annualRate: 0.01,
      termYears: 35,
    };
    const defaultEvent = {
      id: "event-1",
      year: START_YEAR + 5,
      label: "住宅購入（頭金）",
      amount: -5_000_000,
    };
    const input = baseInput({
      children: [],
      loans: [defaultLoan],
      events: [defaultEvent],
    });
    const result = applyHouseholdDefaults(
      input,
      { hasSpouse: false, childCount: 1 },
      NEW_IDS,
    );
    expect(result.loans).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it("配偶者を追加しても子なしのままならローン・イベントは付与されない", () => {
    const input = baseInput({
      spouse: {
        name: "配偶者",
        birthYear: START_YEAR - 33,
        grossAnnualIncome: 3_000_000,
        incomeGrowthRate: 0.01,
        retirementAge: 65,
        pensionStartAge: 65,
        annualPension: 800_000,
        retirementBenefit: 10_000_000,
      },
    });
    const result = applyHouseholdDefaults(
      input,
      { hasSpouse: false, childCount: 0 },
      NEW_IDS,
    );
    expect(result.expenses.baseAnnualLivingExpense).toBe(3_000_000);
    expect(result.loans).toEqual([]);
    expect(result.events).toEqual([]);
  });
});
