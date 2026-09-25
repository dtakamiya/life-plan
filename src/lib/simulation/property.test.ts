import { describe, it, expect } from "vitest";
import { propertyValueForYear, PROPERTY_VALUE_FLOOR_RATIO } from "./property";
import type { Property } from "./types";

/** 子育て共働きペルソナレビュー #2: 不動産の評価額。 */

const home: Property = {
  id: "p",
  label: "自宅",
  purchaseYear: 2031,
  price: 50_000_000,
  annualDepreciationRate: 0.015,
};

describe("propertyValueForYear", () => {
  it("購入年より前は0円、購入年は購入価格", () => {
    expect(propertyValueForYear([home], 2030)).toBe(0);
    expect(propertyValueForYear([home], 2031)).toBe(50_000_000);
  });

  it("購入後は毎年一定率で減価する", () => {
    expect(propertyValueForYear([home], 2033)).toBeCloseTo(50_000_000 * 0.985 ** 2);
  });

  it("購入価格の一定割合（土地分）を下限とする", () => {
    expect(PROPERTY_VALUE_FLOOR_RATIO).toBe(0.3);
    expect(propertyValueForYear([home], 2031 + 200)).toBe(15_000_000);
  });

  it("複数の不動産を合計する", () => {
    const second = { ...home, id: "q", purchaseYear: 2040, price: 10_000_000 };
    expect(propertyValueForYear([home, second], 2040)).toBeCloseTo(
      50_000_000 * 0.985 ** 9 + 10_000_000,
    );
  });
});
