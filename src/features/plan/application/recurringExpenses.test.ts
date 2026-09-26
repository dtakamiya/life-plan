import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { newRecurringExpense } from "./newRecurringExpense";
import {
  addRecurringExpense,
  removeRecurringExpense,
  updateRecurringExpense,
} from "./recurringExpenses";

const base = (): PlanInput => structuredClone(defaultPlanInput);

describe("継続支出のユースケース", () => {
  it("追加・更新・削除ができ、引数の入力は変わらない", () => {
    const input = base();
    const before = structuredClone(input);

    const added = addRecurringExpense(input, (prefix) => `${prefix}-t1`);
    expect(added.recurringExpenses).toEqual([newRecurringExpense("rec-t1", input.startYear)]);

    const updated = updateRecurringExpense(added, "rec-t1", { annualAmount: 120_000 });
    expect(updated.recurringExpenses[0].annualAmount).toBe(120_000);
    expect(added.recurringExpenses[0].annualAmount).toBe(0);

    expect(removeRecurringExpense(updated, "rec-t1").recurringExpenses).toEqual([]);
    expect(input).toEqual(before);
  });
});
