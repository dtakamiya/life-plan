import { describe, expect, it } from "vitest";
import {
  defaultPlanInput,
  singleRenterPlanInput,
  type PlanInput,
} from "@/features/plan/domain";
import { resetInput, resetSingleInput, startBlank } from "./presets";

describe("プリセットのユースケース", () => {
  it("resetInput は既定値と等しい別オブジェクトを返し、書き換えても既定値は汚染されない", () => {
    const before = structuredClone(defaultPlanInput);
    const input = resetInput();
    expect(input).toEqual(defaultPlanInput);
    input.children.push({ ...input.children[0], id: "child-x" });
    input.self.name = "変更";
    expect(defaultPlanInput).toEqual(before);
  });

  it("resetSingleInput は単身・賃貸プリセットと等しい別オブジェクトを返す", () => {
    const before = structuredClone(singleRenterPlanInput);
    const input = resetSingleInput();
    expect(input).toEqual(singleRenterPlanInput);
    input.events.push({ id: "event-x", year: 2030, label: "x", amount: 0 });
    expect(singleRenterPlanInput).toEqual(before);
  });

  it("startBlank は基礎生活費を0、ローン・イベントを空にし、それ以外には触れない", () => {
    const input: PlanInput = structuredClone(defaultPlanInput);
    const before = structuredClone(input);
    const next = startBlank(input);
    expect(next).toEqual({
      ...before,
      expenses: { ...before.expenses, baseAnnualLivingExpense: 0 },
      loans: [],
      events: [],
    });
    expect(input).toEqual(before);
  });
});
