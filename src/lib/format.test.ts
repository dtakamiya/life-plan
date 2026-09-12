import { describe, it, expect } from "vitest";
import { formatManYenLabel, formatManYen, formatYen, formatPercent } from "./format";

/**
 * lp-022 / #16: 金額入力欄に併記する万円換算の表記を固定する。
 */
describe("formatManYenLabel — 万円換算の併記表記（#16）", () => {
  const table: Array<[number, string]> = [
    [10_000, "1万円"],
    [3_000_000, "300万円"],
    [30_000_000, "3,000万円"],
    [1_234_567, "約123万円"], // 端数ありは概算であることを示す
    [-3_000_000, "-300万円"],
  ];

  it.each(table)("%j → %j", (input, expected) => {
    expect(formatManYenLabel(input)).toBe(expected);
  });
});

describe("既存フォーマッタの回帰", () => {
  it("formatYen / formatManYen / formatPercent の表記を維持する", () => {
    expect(formatYen(1_234_567)).toBe("￥1,234,567");
    expect(formatManYen(12_340_000)).toBe("1,234万");
    expect(formatPercent(0.03)).toBe("3.0%");
  });
});
