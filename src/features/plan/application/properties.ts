import {
  DEFAULT_PROPERTY_DEPRECIATION_RATE,
  type PlanInput,
  type Property,
} from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";

// 新規行は購入価格 0 円。値を入れるまで純資産は変わらない。
export function addProperty(input: PlanInput, idGen: IdGenerator): PlanInput {
  const item: Property = {
    id: idGen("property"),
    label: "不動産",
    purchaseYear: input.startYear,
    price: 0,
    annualDepreciationRate: DEFAULT_PROPERTY_DEPRECIATION_RATE,
  };
  return { ...input, properties: [...(input.properties ?? []), item] };
}

export function updateProperty(input: PlanInput, id: string, patch: Partial<Property>): PlanInput {
  return {
    ...input,
    properties: (input.properties ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
  };
}

export function removeProperty(input: PlanInput, id: string): PlanInput {
  return { ...input, properties: (input.properties ?? []).filter((p) => p.id !== id) };
}
