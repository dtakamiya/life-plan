import { describe, it, expect } from "vitest";
import type { YearlyResult } from "./types";
import { summarizeResults } from "./summary";

/** テストで使うフィールドだけを持つ年次結果を作る。 */
function row(year: number, selfAge: number, assets: number): YearlyResult {
  return { year, selfAge, assets } as YearlyResult;
}

describe("summarizeResults（issue #17）", () => {
  it("空配列なら null を返す", () => {
    expect(summarizeResults([])).toBeNull();
  });

  it("最終行・資産最小の行・最初に資産がマイナスになった行を返す", () => {
    const results = [
      row(2030, 40, 5_000_000),
      row(2040, 50, -1_200_000),
      row(2041, 51, -800_000),
      row(2060, 70, 3_000_000),
    ];
    const summary = summarizeResults(results);
    expect(summary?.last.year).toBe(2060);
    expect(summary?.min.year).toBe(2040);
    expect(summary?.depleted?.year).toBe(2040);
  });

  it("資産が一度もマイナスにならなければ depleted は null", () => {
    const summary = summarizeResults([row(2030, 40, 100), row(2031, 41, 50)]);
    expect(summary?.min.year).toBe(2031);
    expect(summary?.depleted).toBeNull();
  });

  it("最小値が同額で複数あるときは先に現れた行を返す", () => {
    const summary = summarizeResults([row(2030, 40, 10), row(2031, 41, 10)]);
    expect(summary?.min.year).toBe(2030);
  });
});
