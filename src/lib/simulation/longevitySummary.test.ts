import { describe, it, expect } from "vitest";
import type { YearlyResult } from "./types";
import { describeAssetLongevity } from "./longevitySummary";

/** テストで使うフィールドだけを持つ年次結果を作る（summary.test.ts と同じパターン）。 */
function row(year: number, selfAge: number, assets: number): YearlyResult {
  return { year, selfAge, assets, financialAssets: assets, loanBalance: 0 } as YearlyResult;
}

describe("describeAssetLongevity（lp-031）", () => {
  it("結果が空なら null", () => {
    expect(describeAssetLongevity([])).toBeNull();
  });

  it("枯渇しない場合は「生涯枯渇なし」＋最終年の余裕額を示す", () => {
    const results = [row(2030, 40, 5_000_000), row(2060, 70, 3_200_000)];
    expect(describeAssetLongevity(results)).toBe("生涯枯渇なし（最終年で320万円の余裕）");
  });

  it("途中で枯渇する場合は枯渇直前の年（資産が正だった最後の年）の年齢で「◯歳まで資産が持ちます」", () => {
    const results = [
      row(2030, 40, 5_000_000),
      row(2050, 60, 1_000_000),
      row(2051, 61, -500_000),
      row(2052, 62, -900_000),
    ];
    expect(describeAssetLongevity(results)).toBe("60歳まで資産が持ちます");
  });

  it("初年（先頭の年次結果）から資産が負の場合は専用文言を返す", () => {
    const results = [row(2030, 40, -100), row(2031, 41, -50)];
    expect(describeAssetLongevity(results)).toBe("初年から資産が不足しています");
  });
});
