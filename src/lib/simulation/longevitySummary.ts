/**
 * 結果冒頭に出す「何歳まで持つか」の1行判定（lp-031）。
 *
 * 判定そのものは lp-003 の `summarizeResults` / `findDepletion`（summary.ts）を
 * そのまま再利用し、ここでは文言の組み立てだけを行う（判定ロジックの重複実装禁止）。
 */

import { formatManYen } from "@/shared/lib";
import { summarizeResults } from "./summary";
import type { YearlyResult } from "./types";

/**
 * 年次結果から1行判定の文言を作る。結果が空のときは null。
 *
 * - 枯渇しない場合: 「生涯枯渇なし（最終年で◯万円の余裕）」
 * - 枯渇する場合: 「◯歳まで資産が持つ」（枯渇直前の年＝資産が正だった最後の年の本人年齢）
 * - 開始年（先頭要素）で既に枯渇している場合は「持った」年が存在しないため専用文言にする
 */
export function describeAssetLongevity(results: YearlyResult[]): string | null {
  const summary = summarizeResults(results);
  if (!summary) return null;
  const { last, depleted } = summary;

  if (depleted === null) {
    return `生涯枯渇なし（最終年で${formatManYen(last.assets)}円の余裕）`;
  }

  const depletedIndex = results.indexOf(depleted);
  const lastSolvent = depletedIndex > 0 ? results[depletedIndex - 1] : null;

  return lastSolvent
    ? `${lastSolvent.selfAge}歳まで資産が持ちます`
    : "初年から資産が不足しています";
}
