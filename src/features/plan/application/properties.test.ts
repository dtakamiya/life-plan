import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROPERTY_DEPRECIATION_RATE,
  defaultPlanInput,
  type PlanInput,
} from "@/features/plan/domain";
import { addProperty, removeProperty, updateProperty } from "./properties";

const base = (): PlanInput => structuredClone(defaultPlanInput);
const idGen = (prefix: string) => `${prefix}-t1`;

describe("不動産のユースケース", () => {
  it("addProperty は購入価格0・開始年購入・既定の減価率の行を末尾に追加する", () => {
    const input = base();
    const before = structuredClone(input);
    expect(addProperty(input, idGen).properties?.at(-1)).toEqual({
      id: "property-t1",
      label: "不動産",
      purchaseYear: input.startYear,
      price: 0,
      annualDepreciationRate: DEFAULT_PROPERTY_DEPRECIATION_RATE,
    });
    expect(input).toEqual(before);
  });

  it("properties が未定義の入力でも追加・更新・削除できる", () => {
    const input: PlanInput = { ...base(), properties: undefined };
    expect(addProperty(input, idGen).properties).toHaveLength(1);
    expect(updateProperty(input, "property-1", { price: 1 }).properties).toEqual([]);
    expect(removeProperty(input, "property-1").properties).toEqual([]);
  });

  it("指定した id の行だけを更新・削除する", () => {
    const input = base();
    const updated = updateProperty(input, "property-1", { price: 20_000_000 });
    expect(updated.properties?.[0].price).toBe(20_000_000);
    expect(input.properties?.[0].price).toBe(35_000_000);
    expect(removeProperty(updated, "property-1").properties).toEqual([]);
  });
});
