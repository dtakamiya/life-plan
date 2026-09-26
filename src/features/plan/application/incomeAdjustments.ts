import type { IncomeAdjustment, PlanInput } from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";

/**
 * 収入調整（育休・時短）を追加する。配偶者がいれば配偶者向け、いなければ本人向け。
 * 新規行は開始年の1年間・割合100%（＝調整なし）。値を入れるまで収支は変わらない。
 */
export function addIncomeAdjustment(input: PlanInput, idGen: IdGenerator): PlanInput {
  const item: IncomeAdjustment = {
    id: idGen("adj"),
    person: input.spouse ? "spouse" : "self",
    label: "収入の調整",
    startYear: input.startYear,
    endYear: input.startYear,
    ratio: 1,
    nonTaxable: false,
  };
  return { ...input, incomeAdjustments: [...(input.incomeAdjustments ?? []), item] };
}

export function updateIncomeAdjustment(
  input: PlanInput,
  id: string,
  patch: Partial<IncomeAdjustment>,
): PlanInput {
  return {
    ...input,
    incomeAdjustments: (input.incomeAdjustments ?? []).map((a) =>
      a.id === id ? { ...a, ...patch } : a,
    ),
  };
}

export function removeIncomeAdjustment(input: PlanInput, id: string): PlanInput {
  return {
    ...input,
    incomeAdjustments: (input.incomeAdjustments ?? []).filter((a) => a.id !== id),
  };
}
