import { formatYen } from "@/lib/format";

/**
 * 「基本計画との違い」セクションは常にベースプランとの相対値（差額）を示す。
 * このシナリオの実額は別セクション（この人生に起きたこと）で表示するため、
 * ここでは差額と実額を混同しないよう分けて組み立てる。
 * 差額そのものの算出式（scenario - base）は新設・変更しない。既存の値を渡すだけ。
 */
export type AssetDiffRow = {
  /** 符号付きの差額表示（正なら + を前置） */
  diffText: string;
  /** 差額の向き。マイナス＝ベースより悪い、プラス＝ベースより良い */
  direction: "悪化" | "改善" | "同額";
  /** このシナリオの最終資産そのもの（実額）。差額と混同されないよう別出しする */
  actualText: string;
};

/**
 * @param scenarioFinalAssets このシナリオの最終資産（円）
 * @param baseFinalAssets ベースプランの最終資産（円）
 */
export function formatAssetDiff(
  scenarioFinalAssets: number,
  baseFinalAssets: number,
): AssetDiffRow {
  const diff = scenarioFinalAssets - baseFinalAssets;
  const direction = diff < 0 ? "悪化" : diff > 0 ? "改善" : "同額";
  const diffText = diff > 0 ? `+${formatYen(diff)}` : formatYen(diff);
  return {
    diffText,
    direction,
    actualText: formatYen(scenarioFinalAssets),
  };
}
