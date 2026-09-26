import type { PlanInput, RecurringExpense } from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";
import { newRecurringExpense } from "./newRecurringExpense";

// 新規行は年額 0 円・当年開始/終了。ユーザーが値を入れるまで収支に寄与しない。
export function addRecurringExpense(input: PlanInput, idGen: IdGenerator): PlanInput {
  return {
    ...input,
    recurringExpenses: [
      ...input.recurringExpenses,
      newRecurringExpense(idGen("rec"), input.startYear),
    ],
  };
}

export function updateRecurringExpense(
  input: PlanInput,
  id: string,
  patch: Partial<RecurringExpense>,
): PlanInput {
  return {
    ...input,
    recurringExpenses: input.recurringExpenses.map((r) =>
      r.id === id ? { ...r, ...patch } : r,
    ),
  };
}

export function removeRecurringExpense(input: PlanInput, id: string): PlanInput {
  return {
    ...input,
    recurringExpenses: input.recurringExpenses.filter((r) => r.id !== id),
  };
}
