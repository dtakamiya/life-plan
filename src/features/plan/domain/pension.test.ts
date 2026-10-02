import { describe, it, expect } from "vitest";
import { pensionAdjustmentFactor } from "./pension";

describe("pensionAdjustmentFactor — 繰上げ/繰下げ受給の係数", () => {
  it("60歳（繰上げ上限）は 0.76", () => {
    expect(pensionAdjustmentFactor(60)).toBeCloseTo(0.76, 10);
  });

  it("61歳は 0.808", () => {
    expect(pensionAdjustmentFactor(61)).toBeCloseTo(0.808, 10);
  });

  it("62歳は 0.856", () => {
    expect(pensionAdjustmentFactor(62)).toBeCloseTo(0.856, 10);
  });

  it("63歳は 0.904", () => {
    expect(pensionAdjustmentFactor(63)).toBeCloseTo(0.904, 10);
  });

  it("64歳は 0.952", () => {
    expect(pensionAdjustmentFactor(64)).toBeCloseTo(0.952, 10);
  });

  it("65歳は浮動小数点誤差なく厳密に 1.0", () => {
    expect(pensionAdjustmentFactor(65)).toBe(1.0);
  });

  it("66歳は 1.084", () => {
    expect(pensionAdjustmentFactor(66)).toBeCloseTo(1.084, 10);
  });

  it("70歳は 1.42", () => {
    expect(pensionAdjustmentFactor(70)).toBeCloseTo(1.42, 10);
  });

  it("75歳（繰下げ上限）は 1.84", () => {
    expect(pensionAdjustmentFactor(75)).toBeCloseTo(1.84, 10);
  });

  it("60歳未満は60歳にクランプする", () => {
    expect(pensionAdjustmentFactor(50)).toBe(pensionAdjustmentFactor(60));
    expect(pensionAdjustmentFactor(0)).toBe(pensionAdjustmentFactor(60));
  });

  it("75歳超は75歳にクランプする", () => {
    expect(pensionAdjustmentFactor(80)).toBe(pensionAdjustmentFactor(75));
    expect(pensionAdjustmentFactor(100)).toBe(pensionAdjustmentFactor(75));
  });

  it("非整数の年齢は最も近い整数歳に丸める", () => {
    expect(pensionAdjustmentFactor(65.4)).toBe(1.0);
    expect(pensionAdjustmentFactor(64.6)).toBe(1.0);
    expect(pensionAdjustmentFactor(60.9)).toBeCloseTo(
      pensionAdjustmentFactor(61),
      10,
    );
  });

  it("NaN を無言で返さない（範囲外の入力でも有限の数値を返す）", () => {
    expect(Number.isFinite(pensionAdjustmentFactor(-10))).toBe(true);
    expect(Number.isFinite(pensionAdjustmentFactor(200))).toBe(true);
  });
});
