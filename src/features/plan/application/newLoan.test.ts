import { describe, it, expect } from "vitest";
import { newLoan } from "./newLoan";

describe("newLoan — ローン新規行ファクトリ（lp-013）", () => {
  it("AC1/AC4: 新規行は借入額0・金利0・期間35年、開始年は当年", () => {
    expect(newLoan("loan-1", 2030)).toEqual({
      id: "loan-1",
      label: "ローン",
      startYear: 2030,
      principal: 0,
      annualRate: 0,
      termYears: 35,
    });
  });
});
