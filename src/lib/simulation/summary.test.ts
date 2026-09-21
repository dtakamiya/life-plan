import { describe, it, expect } from "vitest";
import type { YearlyResult } from "./types";
import { findDepletion, summarizeResults } from "./summary";
import { runSimulation } from "./engine";
import { defaultPlanInput } from "./defaults";

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

describe("findDepletion（lp-003）: 年末純資産が初めて0未満になる年", () => {
  it("途中で負転する場合はその年を返す", () => {
    const r = findDepletion([row(2030, 40, 100), row(2031, 41, -1), row(2032, 42, -50)]);
    expect(r?.year).toBe(2031);
    expect(r?.selfAge).toBe(41);
  });

  it("全年プラスなら null", () => {
    expect(findDepletion([row(2030, 40, 100), row(2031, 41, 0)])).toBeNull();
  });

  it("初年から負なら初年を返す（開始年ちょうど）", () => {
    expect(findDepletion([row(2030, 40, -1), row(2031, 41, 5)])?.year).toBe(2030);
  });

  it("一度負→回復しても最初の負年を返す", () => {
    const r = findDepletion([row(2030, 40, 10), row(2031, 41, -5), row(2032, 42, 20), row(2033, 43, -3)]);
    expect(r?.year).toBe(2031);
  });

  it("最終年ちょうどで負転する場合はその最終年を返す", () => {
    expect(findDepletion([row(2030, 40, 10), row(2031, 41, 5), row(2032, 42, -1)])?.year).toBe(2032);
  });

  it("空配列は null", () => {
    expect(findDepletion([])).toBeNull();
  });

  it("デフォルト入力では枯渇なしで、判定は runSimulation の出力を変えない", () => {
    const results = runSimulation(defaultPlanInput);
    const before = JSON.stringify(results);
    expect(findDepletion(results)).toBeNull();
    expect(JSON.stringify(results)).toBe(before);
    expect(JSON.stringify(runSimulation(defaultPlanInput))).toBe(before);
  });
});
