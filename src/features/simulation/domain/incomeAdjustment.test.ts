import { describe, it, expect } from "vitest";
import { incomeAdjustmentForYear } from "./incomeAdjustment";
import type { IncomeAdjustment } from "@/features/plan/domain";

/** 子育て共働きペルソナレビュー #3: 期間付きの収入調整（育休・時短）。 */

const leave: IncomeAdjustment = {
  id: "l",
  person: "spouse",
  label: "育休",
  startYear: 2028,
  endYear: 2028,
  ratio: 0.67,
  nonTaxable: true,
};
const shortHours: IncomeAdjustment = {
  id: "s",
  person: "spouse",
  label: "時短",
  startYear: 2029,
  endYear: 2031,
  ratio: 0.8,
  nonTaxable: false,
};

describe("incomeAdjustmentForYear", () => {
  it("該当なしの年は割合1・課税", () => {
    expect(incomeAdjustmentForYear([leave], "spouse", 2027)).toEqual({ ratio: 1, nonTaxable: false });
  });

  it("期間内（両端を含む）は割合と課税区分を返す", () => {
    expect(incomeAdjustmentForYear([leave, shortHours], "spouse", 2028)).toEqual({ ratio: 0.67, nonTaxable: true });
    expect(incomeAdjustmentForYear([leave, shortHours], "spouse", 2031)).toEqual({ ratio: 0.8, nonTaxable: false });
  });

  it("対象者が違う調整は無視する", () => {
    expect(incomeAdjustmentForYear([leave], "self", 2028)).toEqual({ ratio: 1, nonTaxable: false });
  });

  it("重なる調整は割合を掛け合わせ、どれかが非課税なら非課税", () => {
    const overlap = { ...shortHours, startYear: 2028 };
    const r = incomeAdjustmentForYear([leave, overlap], "spouse", 2028);
    expect(r.ratio).toBeCloseTo(0.67 * 0.8);
    expect(r.nonTaxable).toBe(true);
  });

  it("終了年が開始年より前の調整は無効", () => {
    const broken = { ...leave, startYear: 2030, endYear: 2028 };
    expect(incomeAdjustmentForYear([broken], "spouse", 2029)).toEqual({ ratio: 1, nonTaxable: false });
  });
});
