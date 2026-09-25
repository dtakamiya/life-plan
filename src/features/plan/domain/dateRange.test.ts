import { describe, it, expect } from "vitest";
import { correctDateRange } from "./dateRange";

/** lp-019 / QA#1: correctDateRange の単体テスト。 */
describe("correctDateRange", () => {
  it("正常系: 期間が2年以上なら補正されない", () => {
    const result = correctDateRange(2026, 2091);
    expect(result).toEqual({ startYear: 2026, endYear: 2091, corrected: false });
  });

  it("境界値: endYear - startYear === 1 のときは補正されない", () => {
    const result = correctDateRange(2026, 2027);
    expect(result).toEqual({ startYear: 2026, endYear: 2027, corrected: false });
  });

  it("異常系: 開始年 > 終了年のとき endYear = startYear + 1 に補正される", () => {
    const result = correctDateRange(2030, 2020);
    expect(result).toEqual({ startYear: 2030, endYear: 2031, corrected: true });
  });

  it("異常系: 開始年 === 終了年（期間0年）のとき endYear = startYear + 1 に補正される", () => {
    const result = correctDateRange(2030, 2030);
    expect(result).toEqual({ startYear: 2030, endYear: 2031, corrected: true });
  });
});
