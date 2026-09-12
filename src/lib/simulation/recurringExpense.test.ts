import { describe, it, expect } from "vitest";
import { recurringExpenseForYear } from "./recurringExpense";
import type { RecurringExpense } from "./types";

/** テスト用の継続支出を作るヘルパー。 */
function item(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: "rec-1",
    label: "賃貸家賃",
    startYear: 2026,
    endYear: 2030,
    annualAmount: 1_200_000,
    ...overrides,
  };
}

describe("recurringExpenseForYear", () => {
  it("開始年から終了年まで（両端を含む）計上する", () => {
    const items = [item()];
    expect(recurringExpenseForYear(items, 2026)).toBe(1_200_000);
    expect(recurringExpenseForYear(items, 2028)).toBe(1_200_000);
    expect(recurringExpenseForYear(items, 2030)).toBe(1_200_000);
  });

  it("期間外の年は 0 を返す", () => {
    const items = [item()];
    expect(recurringExpenseForYear(items, 2025)).toBe(0);
    expect(recurringExpenseForYear(items, 2031)).toBe(0);
  });

  it("開始年と終了年が同じなら その1年だけ計上する", () => {
    const items = [item({ startYear: 2026, endYear: 2026 })];
    expect(recurringExpenseForYear(items, 2026)).toBe(1_200_000);
    expect(recurringExpenseForYear(items, 2027)).toBe(0);
  });

  it("終了年が開始年より前なら どの年も 0（例外は投げない）", () => {
    const items = [item({ startYear: 2030, endYear: 2026 })];
    expect(recurringExpenseForYear(items, 2026)).toBe(0);
    expect(recurringExpenseForYear(items, 2028)).toBe(0);
    expect(recurringExpenseForYear(items, 2030)).toBe(0);
  });

  it("複数件を合算する", () => {
    const items = [
      item({ id: "rec-1", startYear: 2026, endYear: 2030, annualAmount: 1_200_000 }),
      item({ id: "rec-2", startYear: 2028, endYear: 2032, annualAmount: 300_000 }),
    ];
    expect(recurringExpenseForYear(items, 2027)).toBe(1_200_000);
    expect(recurringExpenseForYear(items, 2028)).toBe(1_500_000);
    expect(recurringExpenseForYear(items, 2031)).toBe(300_000);
  });

  it("空配列は 0", () => {
    expect(recurringExpenseForYear([], 2028)).toBe(0);
  });
});
