import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { setRange } from "./period";

const base = (): PlanInput => structuredClone(defaultPlanInput);

describe("setRange", () => {
  it("正常な期間はそのまま設定し、rangeAutoCorrected は false", () => {
    const input = base();
    const before = structuredClone(input);
    const result = setRange(input, 2030, 2080);
    expect(result.input).toEqual({ ...before, startYear: 2030, endYear: 2080 });
    expect(result.rangeAutoCorrected).toBe(false);
    expect(input).toEqual(before);
  });

  it("開始年 > 終了年なら endYear = startYear + 1 に補正し、rangeAutoCorrected は true", () => {
    const result = setRange(base(), 2040, 2030);
    expect(result.input.startYear).toBe(2040);
    expect(result.input.endYear).toBe(2041);
    expect(result.rangeAutoCorrected).toBe(true);
  });
});
