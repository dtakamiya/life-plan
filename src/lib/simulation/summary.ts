import type { YearlyResult } from "./types";

/** サマリー表示に使う代表的な年次結果（issue #17）。 */
export type ResultSummary = {
  /** 計画期間の最終年 */
  last: YearlyResult;
  /** 純資産が最小の年（同額なら先に現れた年） */
  min: YearlyResult;
  /** 純資産が初めてマイナスになった年。枯渇しなければ null */
  depleted: YearlyResult | null;
};

/**
 * 年次結果からサマリー用の行を取り出す。
 * 結果が空のときは例外を投げず null を返す。
 */
export function summarizeResults(results: YearlyResult[]): ResultSummary | null {
  if (results.length === 0) return null;
  const last = results[results.length - 1];
  const min = results.reduce((m, r) => (r.assets < m.assets ? r : m), results[0]);
  const depleted = results.find((r) => r.assets < 0) ?? null;
  return { last, min, depleted };
}
