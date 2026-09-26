import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { addLoan, removeLoan, updateLoan } from "./loans";
import { newLoan } from "./newLoan";

const base = (): PlanInput => structuredClone(defaultPlanInput);

describe("ローンのユースケース", () => {
  it("addLoan は開始年の新規ローン行を末尾に追加する", () => {
    const input = base();
    const before = structuredClone(input);
    const next = addLoan(input, (prefix) => `${prefix}-t1`);
    expect(next.loans.at(-1)).toEqual(newLoan("loan-t1", input.startYear));
    expect(input).toEqual(before);
  });

  it("updateLoan で返済開始年を変えると、同じ年の住宅購入（頭金）イベントと自宅も動く", () => {
    const input = base();
    const before = structuredClone(input);
    const moved = input.loans[0].startYear + 2;
    const next = updateLoan(input, "loan-1", { startYear: moved });
    expect(next.loans[0].startYear).toBe(moved);
    expect(next.events[0].year).toBe(moved);
    expect(next.properties?.[0].purchaseYear).toBe(moved);
    expect(input).toEqual(before);
  });

  it("updateLoan は年のずれた頭金イベントや他のラベルのイベント・物件を動かさない", () => {
    const input = base();
    const loanYear = input.loans[0].startYear;
    const withOthers: PlanInput = {
      ...input,
      events: [
        { ...input.events[0], year: loanYear - 1 },
        { id: "event-2", year: loanYear, label: "車の購入", amount: -2_000_000 },
      ],
      properties: [{ ...input.properties![0], label: "別荘" }],
    };
    const next = updateLoan(withOthers, "loan-1", { startYear: loanYear + 2 });
    expect(next.events).toEqual(withOthers.events);
    expect(next.properties).toEqual(withOthers.properties);
  });

  it("updateLoan は返済開始年以外の更新ではイベント・物件を動かさない", () => {
    const input = base();
    const next = updateLoan(input, "loan-1", { principal: 20_000_000 });
    expect(next.loans[0].principal).toBe(20_000_000);
    expect(next.events).toEqual(input.events);
    expect(next.properties).toEqual(input.properties);
  });

  it("updateLoan は properties が未定義の入力でも未定義のまま返す", () => {
    const input: PlanInput = { ...base(), properties: undefined };
    const next = updateLoan(input, "loan-1", { startYear: input.loans[0].startYear + 1 });
    expect(next.properties).toBeUndefined();
  });

  it("removeLoan は指定した id のローンを削除する", () => {
    const input = base();
    expect(removeLoan(input, "loan-1").loans).toEqual([]);
    expect(input.loans).toHaveLength(1);
  });
});
