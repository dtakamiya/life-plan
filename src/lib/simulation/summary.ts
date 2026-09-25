import type { YearlyResult } from "./types";

/** サマリー表示に使う代表的な年次結果（issue #17）。 */
export type ResultSummary = {
  /** 計画期間の最終年 */
  last: YearlyResult;
  /** 純資産が最小の年（同額なら先に現れた年） */
  min: YearlyResult;
  /** 金融資産が初めてマイナスになった年。枯渇しなければ null */
  depleted: YearlyResult | null;
};

/**
 * 資産枯渇年（lp-003）: 年末の金融資産（`financialAssets` = taxableAssets + taxFreeAssets）が
 * 初めて 0 未満になった年次結果を返す。ちょうど 0 は枯渇とみなさない。
 * 純資産（`assets` = 金融資産 − ローン残高）ではなく金融資産で判定するのは、
 * 「資産が尽きる年」＝手元資金が尽きる年という意味を保つため（純資産で判定すると
 * 住宅ローンを組んだ年に即「枯渇」と出てしまう）。
 * 枯渇しなければ null。エンジンは呼ばず、runSimulation の出力を後処理するだけの純関数。
 */
export function findDepletion(results: YearlyResult[]): YearlyResult | null {
  return results.find((r) => r.financialAssets < 0) ?? null;
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
