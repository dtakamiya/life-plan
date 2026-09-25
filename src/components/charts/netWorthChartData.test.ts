import { describe, it, expect } from "vitest";
import type { YearlyResult } from "@/lib/simulation/types";
import { netWorthChartData } from "./netWorthChartData";

/**
 * 子育て共働きペルソナレビュー #11 の回帰テスト。
 * 主系列は金融資産（尽きた後は0円で止める）、ローンがある年だけ純資産を重ねる。
 */

function row(year: number, financialAssets: number, loanBalance: number): YearlyResult {
  return {
    year,
    selfAge: year - 1991,
    spouseAge: null,
    grossIncome: 0,
    tax: 0,
    socialInsurance: 0,
    investmentTax: 0,
    pension: 0,
    childAllowance: 0,
    housingLoanCredit: 0,
    netIncome: 0,
    livingExpense: 0,
    loanPayment: 0,
    eventNet: 0,
    recurringExpense: 0,
    retirementBenefit: 0,
    dividendIncome: 0,
    dividendTax: 0,
    cashFlow: 0,
    assets: financialAssets - loanBalance,
    propertyValue: 0,
    financialAssets,
    loanBalance,
    taxableAssets: financialAssets,
    taxFreeAssets: 0,
  };
}

describe("netWorthChartData", () => {
  it("主系列は金融資産で、ローン残高を引かない", () => {
    const [d] = netWorthChartData([row(2031, 3_000_000, 40_000_000)]);
    expect(d.financial).toBe(3_000_000);
  });

  it("ローンがある年だけ純資産を持ち、ない年は null（線を描かない）", () => {
    const data = netWorthChartData([row(2030, 5_000_000, 0), row(2031, 3_000_000, 40_000_000)]);
    expect(data[0].netWorth).toBeNull();
    expect(data[1].netWorth).toBe(-37_000_000);
  });

  it("資産が尽きた年以降は金融資産を0円で止め、純資産は描かない", () => {
    const data = netWorthChartData([
      row(2031, 1_000_000, 40_000_000),
      row(2032, -2_000_000, 39_000_000),
      row(2033, 500_000, 38_000_000),
    ]);
    expect(data[1].financial).toBe(0);
    expect(data[1].netWorth).toBeNull();
    // 尽きた後に回復した年はそのまま描く（0円で止めるのは負の値だけ）
    expect(data[2].financial).toBe(500_000);
    expect(data[2].netWorth).toBeNull();
  });

  it("ローン完済後も不動産があれば純資産を描く（#2）", () => {
    const [d] = netWorthChartData([{ ...row(2070, 10_000_000, 0), propertyValue: 15_000_000, assets: 25_000_000 }]);
    expect(d.netWorth).toBe(25_000_000);
  });
});
