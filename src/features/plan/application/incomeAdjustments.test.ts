import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import {
  addIncomeAdjustment,
  removeIncomeAdjustment,
  updateIncomeAdjustment,
} from "./incomeAdjustments";

const base = (): PlanInput => structuredClone(defaultPlanInput);
const idGen = (prefix: string) => `${prefix}-t1`;

describe("収入調整のユースケース", () => {
  it("配偶者がいれば、開始年の1年間・割合100%・課税の行を配偶者向けに追加する", () => {
    const input = base();
    const before = structuredClone(input);
    expect(addIncomeAdjustment(input, idGen).incomeAdjustments).toEqual([
      {
        id: "adj-t1",
        person: "spouse",
        label: "収入の調整",
        startYear: input.startYear,
        endYear: input.startYear,
        ratio: 1,
        nonTaxable: false,
      },
    ]);
    expect(input).toEqual(before);
  });

  it("配偶者がいなければ本人向けに追加する", () => {
    const input: PlanInput = { ...base(), spouse: null };
    expect(addIncomeAdjustment(input, idGen).incomeAdjustments?.[0].person).toBe("self");
  });

  it("incomeAdjustments が未定義の入力でも追加・更新・削除できる", () => {
    const input: PlanInput = { ...base(), incomeAdjustments: undefined };
    expect(addIncomeAdjustment(input, idGen).incomeAdjustments).toHaveLength(1);
    expect(updateIncomeAdjustment(input, "adj-t1", { ratio: 0.5 }).incomeAdjustments).toEqual([]);
    expect(removeIncomeAdjustment(input, "adj-t1").incomeAdjustments).toEqual([]);
  });

  it("指定した id の行だけを更新・削除する", () => {
    const added = addIncomeAdjustment(base(), idGen);
    const updated = updateIncomeAdjustment(added, "adj-t1", { ratio: 0.67, nonTaxable: true });
    expect(updated.incomeAdjustments?.[0]).toMatchObject({ ratio: 0.67, nonTaxable: true });
    expect(added.incomeAdjustments?.[0].ratio).toBe(1);
    expect(removeIncomeAdjustment(updated, "adj-t1").incomeAdjustments).toEqual([]);
  });
});
