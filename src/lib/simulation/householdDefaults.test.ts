import { describe, it, expect } from "vitest";
import {
  computeHouseholdDefaults,
  HOUSEHOLD_DEFAULT_CONSTANTS,
} from "./householdDefaults";

const START_YEAR = 2026;

describe("computeHouseholdDefaults", () => {
  it("単身・子なし: 240万円、ローン・イベントなし", () => {
    const result = computeHouseholdDefaults(
      { hasSpouse: false, childCount: 0 },
      START_YEAR,
    );
    expect(result.baseAnnualLivingExpense).toBe(2_400_000);
    expect(result.loan).toBeNull();
    expect(result.event).toBeNull();
  });

  it("夫婦・子なし: 300万円、ローン・イベントなし", () => {
    const result = computeHouseholdDefaults(
      { hasSpouse: true, childCount: 0 },
      START_YEAR,
    );
    expect(result.baseAnnualLivingExpense).toBe(3_000_000);
    expect(result.loan).toBeNull();
    expect(result.event).toBeNull();
  });

  it("夫婦＋子1人: 300万円（子の養育費は education.ts 側で計上）、住宅ローン・購入イベントあり", () => {
    const result = computeHouseholdDefaults(
      { hasSpouse: true, childCount: 1 },
      START_YEAR,
    );
    expect(result.baseAnnualLivingExpense).toBe(3_000_000);
    expect(result.loan).toEqual({
      label: "住宅ローン",
      startYear: START_YEAR + 5,
      principal: 30_000_000,
      annualRate: 0.01,
      termYears: 35,
    });
    expect(result.event).toEqual({
      year: START_YEAR + 5,
      label: "住宅購入（頭金）",
      amount: -5_000_000,
    });
  });

  it("単身＋子2人: 240万円（子の人数で加算しない）、住宅ローン・購入イベントあり", () => {
    const result = computeHouseholdDefaults(
      { hasSpouse: false, childCount: 2 },
      START_YEAR,
    );
    expect(result.baseAnnualLivingExpense).toBe(2_400_000);
    expect(result.loan).not.toBeNull();
    expect(result.event).not.toBeNull();
  });

  it("住宅購入年はシミュレーション開始年+5年", () => {
    const result = computeHouseholdDefaults(
      { hasSpouse: true, childCount: 1 },
      2030,
    );
    expect(result.loan?.startYear).toBe(2035);
    expect(result.event?.year).toBe(2035);
  });

  it("既定値表の定数を書き換えていないことの回帰確認（定数自体の変化はコードコメントの表と齟齬を生むため）", () => {
    expect(HOUSEHOLD_DEFAULT_CONSTANTS.singleBaseLivingExpense).toBe(2_400_000);
    expect(HOUSEHOLD_DEFAULT_CONSTANTS.coupleBaseLivingExpense).toBe(3_000_000);
    // 子の基礎養育費は education.ts の BASE_CHILD_ANNUAL_COST だけで計上する（二重計上の回帰防止）
    expect("perChildLivingExpense" in HOUSEHOLD_DEFAULT_CONSTANTS).toBe(false);
  });
});
