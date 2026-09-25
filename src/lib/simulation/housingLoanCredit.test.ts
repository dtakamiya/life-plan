import { describe, it, expect } from "vitest";
import {
  housingLoanCreditForYear,
  HOUSING_LOAN_CREDIT_RATE,
  HOUSING_LOAN_CREDIT_BALANCE_CAP,
  HOUSING_LOAN_CREDIT_YEARS,
  RESIDENCE_TAX_CREDIT_CAP,
} from "./housingLoanCredit";
import { loanBalanceForYear } from "./loan";
import type { Loan } from "./types";

/** 子育て共働きペルソナレビュー #4: 住宅ローン控除の概算。 */

const loan: Loan = {
  id: "l",
  label: "住宅ローン",
  startYear: 2031,
  principal: 30_000_000,
  annualRate: 0.01,
  termYears: 35,
  taxCredit: true,
};
const plenty = { incomeTax: 1_000_000, residenceTax: 1_000_000 };

describe("housingLoanCreditForYear", () => {
  it("定数: 0.7%・残高上限4,000万円・13年・住民税分の上限9.75万円", () => {
    expect(HOUSING_LOAN_CREDIT_RATE).toBe(0.007);
    expect(HOUSING_LOAN_CREDIT_BALANCE_CAP).toBe(40_000_000);
    expect(HOUSING_LOAN_CREDIT_YEARS).toBe(13);
    expect(RESIDENCE_TAX_CREDIT_CAP).toBe(97_500);
  });

  it("年末残高の0.7%を控除する", () => {
    const expected = Math.round(loanBalanceForYear([loan], 2031) * 0.007);
    expect(housingLoanCreditForYear([loan], 2031, plenty)).toBe(expected);
  });

  it("控除対象外のローン・返済開始前・14年目以降は0円", () => {
    expect(housingLoanCreditForYear([{ ...loan, taxCredit: false }], 2031, plenty)).toBe(0);
    expect(housingLoanCreditForYear([{ ...loan, taxCredit: undefined }], 2031, plenty)).toBe(0);
    expect(housingLoanCreditForYear([loan], 2030, plenty)).toBe(0);
    expect(housingLoanCreditForYear([loan], 2031 + 12, plenty)).toBeGreaterThan(0);
    expect(housingLoanCreditForYear([loan], 2031 + 13, plenty)).toBe(0);
  });

  it("残高は4,000万円を上限に計算する", () => {
    const big = { ...loan, principal: 60_000_000 };
    expect(housingLoanCreditForYear([big], 2031, plenty)).toBe(280_000);
  });

  it("所得税＋住民税（住民税分は9.75万円まで）を超えて控除しない", () => {
    expect(housingLoanCreditForYear([loan], 2031, { incomeTax: 50_000, residenceTax: 200_000 })).toBe(
      50_000 + 97_500,
    );
    expect(housingLoanCreditForYear([loan], 2031, { incomeTax: 0, residenceTax: 30_000 })).toBe(30_000);
  });
});
