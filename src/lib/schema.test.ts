import { describe, it, expect } from "vitest";
import { snapshotSchema } from "./schema";
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
