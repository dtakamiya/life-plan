import { describe, it, expect } from "vitest";
import { planInputSchema } from "./persistedPlanSchema";
import { defaultPlanInput } from "@/features/plan/domain";

describe("planInputSchema — recurringExpenses（#18）", () => {
  it("recurringExpenses を持たない既存の保存データは空配列として通る", () => {
    // 旧データを模すため recurringExpenses キー自体を落とす
    // （未使用変数への分割代入は ESLint に触れるので delete を使う）。
    const legacy: Record<string, unknown> = { ...defaultPlanInput };
    delete legacy.recurringExpenses;
    const parsed = planInputSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.recurringExpenses).toEqual([]);
  });

  it("正しい継続支出はそのまま保持する", () => {
    const parsed = planInputSchema.safeParse({
      ...defaultPlanInput,
      recurringExpenses: [
        {
          id: "rec-1",
          label: "賃貸家賃",
          startYear: 2026,
          endYear: 2030,
          annualAmount: 1_200_000,
        },
      ],
    });
    expect(parsed.success && parsed.data.recurringExpenses).toHaveLength(1);
    expect(parsed.success && parsed.data.recurringExpenses[0].label).toBe(
      "賃貸家賃",
    );
  });

  it("継続支出の形が壊れていれば input 全体を弾く（既定値へフォールバックさせる）", () => {
    const parsed = planInputSchema.safeParse({
      ...defaultPlanInput,
      recurringExpenses: [{ id: "rec-1", label: "賃貸家賃" }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("planInputSchema — annualDividendYield（配当利回り）", () => {
  it("annualDividendYield を持たない既存の保存データは 0 として通る", () => {
    // 旧データを模すため assets から annualDividendYield キー自体を落とす。
    const legacyAssets: Record<string, unknown> = { ...defaultPlanInput.assets };
    delete legacyAssets.annualDividendYield;
    const parsed = planInputSchema.safeParse({
      ...defaultPlanInput,
      assets: legacyAssets,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.assets.annualDividendYield).toBe(0);
  });

  it("入力された配当利回りを保持する", () => {
    const parsed = planInputSchema.safeParse({
      ...defaultPlanInput,
      assets: { ...defaultPlanInput.assets, annualDividendYield: 0.025 },
    });
    expect(parsed.success && parsed.data.assets.annualDividendYield).toBe(0.025);
  });
});

/** 子育て共働きペルソナレビュー #2・#3・#4: 追加フィールドの互換性。 */
describe("planInputSchema — 家族向けの拡張", () => {
  it("incomeAdjustments / properties を持たない既存の保存データは空配列として通る", () => {
    const legacy: Record<string, unknown> = { ...defaultPlanInput };
    delete legacy.incomeAdjustments;
    delete legacy.properties;
    const parsed = planInputSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.incomeAdjustments).toEqual([]);
    expect(parsed.success && parsed.data.properties).toEqual([]);
  });

  it("taxCredit を持たない既存のローンも通る", () => {
    const parsed = planInputSchema.safeParse({
      ...defaultPlanInput,
      loans: [{ id: "l", label: "住宅ローン", startYear: 2031, principal: 1, annualRate: 0.01, termYears: 35 }],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.loans[0].taxCredit).toBeUndefined();
  });

  it("収入調整・不動産・ローン控除の指定を保持する", () => {
    const input = {
      ...defaultPlanInput,
      incomeAdjustments: [
        { id: "a", person: "spouse", label: "育休", startYear: 2028, endYear: 2028, ratio: 0.67, nonTaxable: true },
      ],
      properties: [{ id: "p", label: "自宅", purchaseYear: 2031, price: 35_000_000, annualDepreciationRate: 0.015 }],
      loans: defaultPlanInput.loans.map((l) => ({ ...l, taxCredit: true })),
    };
    const parsed = planInputSchema.safeParse(input);
    expect(parsed.success && parsed.data.incomeAdjustments).toEqual(input.incomeAdjustments);
    expect(parsed.success && parsed.data.properties).toEqual(input.properties);
    expect(parsed.success && parsed.data.loans[0].taxCredit).toBe(true);
  });

  it("収入調整の対象者が不正なら input 全体を弾く", () => {
    const parsed = planInputSchema.safeParse({
      ...defaultPlanInput,
      incomeAdjustments: [
        { id: "a", person: "child", label: "x", startYear: 2028, endYear: 2028, ratio: 1, nonTaxable: false },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
