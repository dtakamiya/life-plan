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
 * 資産枯渇年（lp-003）: 年末純資産（`assets` = taxableAssets + taxFreeAssets）が
 * 初めて 0 未満になった年次結果を返す。ちょうど 0 は枯渇とみなさない。
 * 枯渇しなければ null。エンジンは呼ばず、runSimulation の出力を後処理するだけの純関数。
 *
 * NOTE: 表示層の枯渇判定（`assets < 0`）と重複する実装がある。統合は lp-028 の
 * スコープで、本タスクでは既存側を変更しない。
 */
export function findDepletion(results: YearlyResult[]): YearlyResult | null {
  return results.find((r) => r.assets < 0) ?? null;
}

/**
 * 年次結果からサマリー用の行を取り出す。
 * 結果が空のときは例外を投げず null を返す。
 */
export function summarizeResults(results: YearlyResult[]): ResultSummary | null {
  if (results.length === 0) return null;
  const last = results[results.length - 1];
  const min = results.reduce((m, r) => (r.assets < m.assets ? r : m), results[0]);
  const depleted = findDepletion(results);
  return { last, min, depleted };
}
