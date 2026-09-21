/**
 * 資産枯渇の表示文言（表示層のみ。計算は stats.ts / runSimulation が担う）。
 *
 * 前提:
 * - 判定基準は年末の純資産（taxable + taxFree の合計）。
 * - 「尽きる年齢」＝純資産が初めてマイナスになった年の本人年齢（GameStats.depletionAge）。
 * - 画面には「尽きる年齢」だけを出す。その前年である assetLifeAge は差分計算
 *   （基本計画との比較）用に内部で保持するのみで、ラベルとしては表示しない。
 */

import type { GameStats } from "./stats";

export const DEPLETION_DEFINITION =
  "「尽きる年齢」は、年末の純資産（課税口座＋非課税口座の合計）が初めてマイナスになった年の本人の年齢です。";

export const NO_DEPLETION_TEXT = "生涯を通じて枯渇なし";

/** リザルトの一文。枯渇年齢は必ず 1 つだけ出す。 */
export function describeDepletion(stats: Pick<GameStats, "depletionAge">): string {
  return stats.depletionAge === null
    ? NO_DEPLETION_TEXT
    : `資産は ${stats.depletionAge}歳で尽きます`;
}

/** 基本計画との比較文。lifeDiff = シナリオの assetLifeAge − 基本計画の assetLifeAge。 */
export function describeDepletionDiff(lifeDiff: number): string {
  if (lifeDiff === 0) return "資産が尽きる年齢は基本計画と同じです";
  return lifeDiff < 0
    ? `基本計画より ${Math.abs(lifeDiff)} 年早く資産が尽きました`
    : `基本計画より ${lifeDiff} 年長く資産が持ちました`;
}
