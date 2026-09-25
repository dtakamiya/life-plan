import { describe, it, expect } from "vitest";
import { annualLoanPayment, loanBalanceForYear } from "./loan";
import type { Loan } from "./types";

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "l1",
    label: "住宅ローン",
    startYear: 2031,
    principal: 3_000_000,
    annualRate: 0,
    termYears: 3,
    ...overrides,
  };
}

describe("loanBalanceForYear — 年末のローン残高", () => {
  it("返済開始前の年は借入前なので 0", () => {
    expect(loanBalanceForYear([loan()], 2030)).toBe(0);
  });

  it("金利0なら元本を返済額ぶんずつ線形に減らし、完済年で 0", () => {
    const loans = [loan()];
    expect(loanBalanceForYear(loans, 2031)).toBe(2_000_000);
    expect(loanBalanceForYear(loans, 2032)).toBe(1_000_000);
    expect(loanBalanceForYear(loans, 2033)).toBe(0);
    expect(loanBalanceForYear(loans, 2040)).toBe(0);
  });

  it("元利均等では 1 回目の返済後の残高 = 元本×(1+r) − 年間返済額", () => {
    const l = loan({ principal: 10_000_000, annualRate: 0.02, termYears: 10 });
    const expected = 10_000_000 * 1.02 - annualLoanPayment(l);
    expect(loanBalanceForYear([l], 2031)).toBeCloseTo(expected, 4);
    // 利息があるぶん、元本/期間より残高の減りは遅い。
    expect(loanBalanceForYear([l], 2031)).toBeGreaterThan(9_000_000);
  });

  it("元利均等でも最終返済年で残高は 0（浮動小数の誤差でマイナスにならない）", () => {
    const l = loan({ principal: 36_000_000, annualRate: 0.008, termYears: 35 });
    expect(loanBalanceForYear([l], 2031 + 34)).toBe(0);
    expect(loanBalanceForYear([l], 2031 + 33)).toBeGreaterThan(0);
  });

  it("開始年より前から返済中の既存ローンも、経過年数ぶん返済した残高になる", () => {
    const l = loan({ startYear: 2020, principal: 3_000_000, termYears: 30 });
    // 2020〜2030 の 11 回返済後。
    expect(loanBalanceForYear([l], 2030)).toBe(3_000_000 - 100_000 * 11);
  });

  it("複数ローンの残高を合算し、借入額0・期間0の行は寄与しない", () => {
    const loans = [
      loan(),
      loan({ id: "l2", principal: 0 }),
      loan({ id: "l3", termYears: 0 }),
    ];
    expect(loanBalanceForYear(loans, 2031)).toBe(2_000_000);
  });
});
