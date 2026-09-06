/**
 * 年次結果からゲームの HUD・リザルトで使う指標を取り出す。
 *
 * 純資産は「金融資産のみ」であり持ち家もローン残債も含まない。
 * 老後の計画的な取り崩しは正常なので、減少そのものは失点として扱わない。
 * 実際に動く指標は「これまでの最小純資産」と「資産寿命」の 2 つ。
 */

import type { YearlyResult } from "@/lib/simulation/types";

export type GameStats = {
  /** 集計対象の最終年の純資産（円） */
  finalAssets: number;
  /** 集計対象での最小純資産（円） */
  minAssets: number;
  /** 最小純資産をとった年齢（同値なら最初の年） */
  minAssetsAge: number;
  /** 最小純資産をとった西暦年 */
  minAssetsYear: number;
  /** 純資産が初めてマイナスになった年齢。枯渇しなければ null */
  depletionAge: number | null;
  /** 資産がプラスを保った最終年齢（枯渇しなければ最終年の年齢） */
  assetLifeAge: number;
  /** 集計対象の最終年の年齢 */
  lastAge: number;
};

/**
 * @param results runSimulation の結果
 * @param throughYear ここまでの年で集計する（省略時は全期間）
 */
export function computeStats(
  results: YearlyResult[],
  throughYear?: number,
): GameStats {
  const scope =
    throughYear === undefined
      ? results
      : results.filter((r) => r.year <= throughYear);

  if (scope.length === 0) {
    return {
      finalAssets: 0,
      minAssets: 0,
      minAssetsAge: 0,
      minAssetsYear: 0,
      depletionAge: null,
      assetLifeAge: 0,
      lastAge: 0,
    };
  }

  let min = scope[0];
  for (const row of scope) {
    if (row.assets < min.assets) min = row;
  }

  const depleted = scope.find((r) => r.assets < 0) ?? null;
  const last = scope[scope.length - 1];

  return {
    finalAssets: last.assets,
    minAssets: min.assets,
    minAssetsAge: min.selfAge,
    minAssetsYear: min.year,
    depletionAge: depleted ? depleted.selfAge : null,
    assetLifeAge: depleted ? depleted.selfAge - 1 : last.selfAge,
    lastAge: last.selfAge,
  };
}
