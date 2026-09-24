import { describe, it, expect } from "vitest";
import type { YearlyResult } from "./simulation/types";
import { buildComparisonDiff, diffDepletion } from "./comparisonDiff";
import { summarizeResults } from "./simulation/summary";

function row(year: number, selfAge: number, assets: number): YearlyResult {
  return { year, selfAge, assets } as YearlyResult;
}

const solvent = [row(2030, 40, 5_000_000), row(2060, 70, 3_000_000)];
const depletesAt2051 = [row(2030, 40, 5_000_000), row(2050, 60, 100), row(2051, 61, -500_000)];
const depletesAt2054 = [row(2030, 40, 5_000_000), row(2053, 63, 100), row(2054, 64, -900_000)];

const build = (a: YearlyResult[], b: YearlyResult[]) =>
  buildComparisonDiff([
    { key: "current", name: "現在", results: a },
    { key: "s1", name: "案A", results: b },
  ]);

describe("buildComparisonDiff（lp-035）", () => {
  it("既知ケース: 同一シナリオ同士の差分はゼロ（枯渇なし）", () => {
    const [base, target] = build(solvent, solvent);
    expect(base.assetDiffText).toBeNull();
    expect(target.assetDiffText).toBe("¥0");
    expect(target.assetDirection).toBe("同じ");
    expect(target.depletionText).toBe("なし");
    expect(target.depletionDirection).toBe("同じ");
  });

  it("既知ケース: 同一シナリオ同士の差分はゼロ（両方枯渇）", () => {
    const [, target] = build(depletesAt2051, depletesAt2051);
    expect(target.assetDiffText).toBe("¥0");
    expect(target.depletionDiffText).toBe("±0年");
    expect(target.depletionDirection).toBe("同じ");
  });

  it("最終資産の差額は「比較対象 − 基準」で符号付き", () => {
    const more = [row(2030, 40, 1), row(2060, 70, 4_000_000)];
    const [, up] = build(solvent, more);
    expect(up.assetDiffText).toBe("+¥1,000,000");
    expect(up.assetDirection).toBe("改善");
    const [, down] = build(more, solvent);
    expect(down.assetDiffText).toBe("¥-1,000,000");
    expect(down.assetDirection).toBe("悪化");
  });

  it("両方枯渇: 枯渇年の差を年数で示し、遅いほど改善", () => {
    const [, later] = build(depletesAt2051, depletesAt2054);
    expect(later.depletionText).toBe("2054年（64歳）");
    expect(later.depletionDiffText).toBe("+3年（枯渇が遅い）");
    expect(later.depletionDirection).toBe("改善");
    const [, earlier] = build(depletesAt2054, depletesAt2051);
    expect(earlier.depletionDiffText).toBe("−3年（枯渇が早い）");
    expect(earlier.depletionDirection).toBe("悪化");
  });

  it("境界値: 片方のみ枯渇（基準が枯渇なし／比較対象が枯渇なし）", () => {
    const [, onlyTarget] = build(solvent, depletesAt2051);
    expect(onlyTarget.depletionText).toBe("2051年（61歳）");
    expect(onlyTarget.depletionDiffText).toBe("枯渇あり（基準は枯渇なし）");
    expect(onlyTarget.depletionDirection).toBe("悪化");

    const [base, onlyBase] = build(depletesAt2051, solvent);
    expect(base.depletionText).toBe("2051年（61歳）");
    expect(onlyBase.depletionText).toBe("なし");
    expect(onlyBase.depletionDiffText).toBe("枯渇を回避（基準は枯渇あり）");
    expect(onlyBase.depletionDirection).toBe("改善");
  });

  it("判定基準は lp-003 と同一: ちょうど 0 は枯渇とみなさない／summarizeResults と一致", () => {
    const zero = [row(2030, 40, 100), row(2031, 41, 0)];
    const [base] = build(zero, zero);
    expect(base.depletionText).toBe("なし");
    for (const r of [solvent, depletesAt2051, zero]) {
      const s = summarizeResults(r)!;
      const [b] = build(r, r);
      expect(b.finalAssetsText).toBe(`¥${s.last.assets.toLocaleString("ja-JP")}`);
      expect(b.depletionText).toBe(s.depleted ? `${s.depleted.year}年（${s.depleted.selfAge}歳）` : "なし");
    }
  });

  it("算出不可（結果が空）の行は available=false、差は出さない", () => {
    const [, bad] = build(solvent, []);
    expect(bad.available).toBe(false);
    expect(bad.assetDiffText).toBeNull();
    const [baseBad, other] = build([], solvent);
    expect(baseBad.available).toBe(false);
    expect(other.available).toBe(true);
    expect(other.assetDiffText).toBeNull(); // 基準がないので比較しない
  });
});

describe("diffDepletion", () => {
  it("どちらも枯渇なしは差なし", () => {
    expect(diffDepletion(null, null)).toEqual({ text: "差なし（どちらも枯渇なし）", direction: "同じ" });
  });
});
