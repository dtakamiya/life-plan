import { describe, expect, it } from "vitest";
import type { YearlyResult } from "@/features/simulation/domain";
import { computeStats } from "./stats";
import {
  describeDepletion,
  describeDepletionDiff,
  NO_DEPLETION_TEXT,
} from "./depletionText";

const rows = (assets: number[]): YearlyResult[] =>
  assets.map(
    (a, i) => ({ year: 2030 + i, selfAge: 35 + i, assets: a, financialAssets: a, loanBalance: 0 }) as unknown as YearlyResult,
  );

const text = (assets: number[]) => describeDepletion(computeStats(rows(assets)));

describe("describeDepletion", () => {
  it("途中で負転: 尽きる年齢のみ 1 つ（資産寿命を併記しない）", () => {
    const t = text([100, 50, -10, -20]);
    expect(t).toBe("資産は 37歳で尽きます");
    expect(t).not.toContain("資産寿命");
    expect(t.match(/\d+歳/g)).toHaveLength(1);
  });
  it("初年から負", () => {
    expect(text([-1, -2, -3])).toBe("資産は 35歳で尽きます");
  });
  it("最終年ちょうどで負", () => {
    expect(text([100, 50, 10, -5])).toBe("資産は 38歳で尽きます");
  });
  it("負→回復でも最初に負になった年齢", () => {
    expect(text([100, -5, 30, 80])).toBe("資産は 36歳で尽きます");
  });
  it("枯渇なし", () => {
    expect(text([100, 50, 10, 5])).toBe(NO_DEPLETION_TEXT);
  });
});

describe("describeDepletionDiff", () => {
  it("同じ / 早い / 長い", () => {
    expect(describeDepletionDiff(0)).toBe("資産が尽きる年齢は基本計画と同じです");
    expect(describeDepletionDiff(-3)).toBe("基本計画より 3 年早く資産が尽きました");
    expect(describeDepletionDiff(2)).toBe("基本計画より 2 年長く資産が持ちました");
  });
});
