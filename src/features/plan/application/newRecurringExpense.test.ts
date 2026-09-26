import { describe, it, expect } from "vitest";
import { newRecurringExpense } from "./newRecurringExpense";

describe("newRecurringExpense", () => {
  it("開始年・終了年は当年、年額は 0 で始まる", () => {
    const item = newRecurringExpense("rec-1", 2030);
    expect(item.id).toBe("rec-1");
    expect(item.startYear).toBe(2030);
    expect(item.endYear).toBe(2030);
    expect(item.annualAmount).toBe(0);
  });
});
