import { describe, it, expect } from "vitest";
import { computeStats } from "./stats";
import type { YearlyResult } from "@/lib/simulation/types";

/** assets と年齢だけを持つ最小の YearlyResult を作る。 */
function results(assetsByYear: number[], startYear = 2030, startAge = 35): YearlyResult[] {
  return assetsByYear.map((assets, i) => ({
    year: startYear + i,
    selfAge: startAge + i,
    spouseAge: null,
    grossIncome: 0,
    tax: 0,
    socialInsurance: 0,
    investmentTax: 0,
    pension: 0,
    netIncome: 0,
    livingExpense: 0,
    eventNet: 0,
    loanPayment: 0,
    retirementBenefit: 0,
    cashFlow: 0,
    assets,
    taxableAssets: assets,
    taxFreeAssets: 0,
  }));
}

describe("computeStats", () => {
  it("最終資産・最小純資産とその年齢を返す", () => {
    const stats = computeStats(results([500, 300, 180, 900]));
    expect(stats.finalAssets).toBe(900);
    expect(stats.minAssets).toBe(180);
    expect(stats.minAssetsAge).toBe(37);
    expect(stats.minAssetsYear).toBe(2032);
    expect(stats.lastAge).toBe(38);
  });

  it("最小値が複数あるときは最初の年を採る", () => {
    const stats = computeStats(results([500, 100, 100, 400]));
    expect(stats.minAssetsAge).toBe(36);
  });

  it("枯渇しなければ depletionAge は null、資産寿命は最終年齢", () => {
    const stats = computeStats(results([500, 600, 700]));
    expect(stats.depletionAge).toBeNull();
    expect(stats.assetLifeAge).toBe(37);
  });

  it("途中で枯渇したら最初にマイナスになった年齢を返す", () => {
    const stats = computeStats(results([500, 100, -50, -900]));
    expect(stats.depletionAge).toBe(37);
    expect(stats.assetLifeAge).toBe(36);
  });

  it("一度マイナスになって回復しても、最初の枯渇年齢を採る", () => {
    const stats = computeStats(results([500, -50, 200, 900]));
    expect(stats.depletionAge).toBe(36);
    expect(stats.assetLifeAge).toBe(35);
    expect(stats.finalAssets).toBe(900);
  });

  it("初年に枯渇したら資産寿命は開始年齢の 1 つ手前", () => {
    const stats = computeStats(results([-10, -20]));
    expect(stats.depletionAge).toBe(35);
    expect(stats.assetLifeAge).toBe(34);
  });

  it("資産 0 ちょうどは枯渇とみなさない", () => {
    const stats = computeStats(results([100, 0, 100]));
    expect(stats.depletionAge).toBeNull();
  });

  it("throughYear を渡すとその年までで集計する", () => {
    const stats = computeStats(results([500, 100, 900]), 2031);
    expect(stats.finalAssets).toBe(100);
    expect(stats.minAssets).toBe(100);
    expect(stats.lastAge).toBe(36);
  });

  it("空配列でも落ちない", () => {
    const stats = computeStats([]);
    expect(stats.finalAssets).toBe(0);
    expect(stats.minAssets).toBe(0);
    expect(stats.depletionAge).toBeNull();
  });
});
