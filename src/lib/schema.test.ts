import { describe, it, expect } from "vitest";
import { snapshotSchema, planInputSchema } from "./schema";
import { defaultPlanInput } from "./simulation/defaults";

describe("snapshotSchema", () => {
  it("origin を持たない既存の保存データは manual として通る", () => {
    const parsed = snapshotSchema.safeParse({
      id: "snap-1",
      name: "プラン1",
      input: defaultPlanInput,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.origin).toBe("manual");
  });

  it("origin: game を保持する", () => {
    const parsed = snapshotSchema.safeParse({
      id: "snap-2",
      name: "ゲームの結果",
      input: defaultPlanInput,
      origin: "game",
    });
    expect(parsed.success && parsed.data.origin).toBe("game");
  });

  it("未知の origin は弾く", () => {
    const parsed = snapshotSchema.safeParse({
      id: "snap-3",
      name: "壊れたデータ",
      input: defaultPlanInput,
      origin: "unknown",
    });
    expect(parsed.success).toBe(false);
  });

  it("input が壊れていれば弾く", () => {
    const parsed = snapshotSchema.safeParse({
      id: "snap-4",
      name: "壊れたデータ",
      input: { startYear: "2030" },
    });
    expect(parsed.success).toBe(false);
  });

  it("id / name が文字列でなければ弾く", () => {
    expect(
      snapshotSchema.safeParse({ id: 1, name: "x", input: defaultPlanInput })
        .success,
    ).toBe(false);
    expect(
      snapshotSchema.safeParse({ id: "x", name: 1, input: defaultPlanInput })
        .success,
    ).toBe(false);
  });
});

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
