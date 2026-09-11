/**
 * ゲームモードの満足度指標。画面内の単一ソース。
 *
 * 定義: 満足度 ＝ 各ステージ確定時のスコアの平均（母数は確定したステージ数）。
 *   - スコアは 0〜100。確定したステージが 1 つも無いときは中立値 50 とする。
 *   - 「1 ステージのスコア」＝ そのステージで最後に記録されたログ行の満足度。
 *     方針カードとイベントを反映した後、ステージ終端の減衰を受ける前の値。
 *   - 表示値は平均を四捨五入した整数。
 *
 * ヘッダ HUD の表示値・区分（低い/ふつう/高い）、ゲーム結果テキストの平均満足度・
 * 「30 を割ったステージ数」は、すべてこのモジュールの戻り値だけを参照する。
 * 旧来あった「running 値をそのまま表示する経路」は撤去済みで、二重計算はしない。
 *
 * 満足度はゲームモード内の演出指標であり、runSimulation の年次財務系列
 *（純資産・枯渇年齢など）には一切影響しない。
 */

import type { LogEntry } from "./types";
import { INITIAL_SATISFACTION } from "./advance";

export type SatisfactionLevel = "低い" | "ふつう" | "高い";

/**
 * 区分の下限。value >= 高い で「高い」、value >= ふつう で「ふつう」、
 * それ未満で「低い」。閾値ちょうど（例: 30）は上側の区分に入る。
 */
export const SATISFACTION_LEVEL_MIN = { ふつう: 30, 高い: 60 } as const;

/** 満足度の値から区分ラベルを引く。 */
export function satisfactionLevel(value: number): SatisfactionLevel {
  if (value >= SATISFACTION_LEVEL_MIN.高い) return "高い";
  if (value >= SATISFACTION_LEVEL_MIN.ふつう) return "ふつう";
  return "低い";
}

/** 区分に対応する記号（色だけに依存させないための併記用）。 */
export function satisfactionMark(value: number): "◎" | "○" | "△" {
  const level = satisfactionLevel(value);
  return level === "高い" ? "◎" : level === "ふつう" ? "○" : "△";
}

/**
 * ゲームログを「ステージ別スコア列」に畳む。
 * 確定した各ステージにつき 1 個、記録順（＝ステージ順）で返す。
 * 1 ステージに複数ログ行があるときは最後の行の満足度を採る。
 */
export function stageEndScores(log: LogEntry[]): number[] {
  const byStage = new Map<number, number>();
  for (const entry of log) byStage.set(entry.stageIndex, entry.satisfaction);
  return [...byStage.values()];
}

export type SatisfactionSummary = {
  /** 表示用の満足度（平均を四捨五入した 0〜100 の整数） */
  value: number;
  /** 表示値に対応する区分ラベル */
  level: SatisfactionLevel;
  /** 集計に使った確定ステージ数（平均の母数） */
  confirmedStages: number;
  /** スコアが 30 を割った（＝区分が「低い」の）確定ステージ数 */
  lowStages: number;
};

/**
 * ステージ別スコア列から最終指標を組み立てる純関数。
 * scores が空なら中立値（初期満足度）を返す。
 */
export function summarizeSatisfactionFromScores(
  scores: number[],
): SatisfactionSummary {
  if (scores.length === 0) {
    return {
      value: INITIAL_SATISFACTION,
      level: satisfactionLevel(INITIAL_SATISFACTION),
      confirmedStages: 0,
      lowStages: 0,
    };
  }
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const value = Math.round(mean);
  return {
    value,
    level: satisfactionLevel(value),
    confirmedStages: scores.length,
    lowStages: scores.filter((s) => s < SATISFACTION_LEVEL_MIN.ふつう).length,
  };
}

/** ゲームログから満足度指標を作る。画面はすべてこれを参照する。 */
export function summarizeSatisfaction(log: LogEntry[]): SatisfactionSummary {
  return summarizeSatisfactionFromScores(stageEndScores(log));
}
