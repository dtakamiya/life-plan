/**
 * GameState を PlanInput へ射影する。
 *
 * ゲームの効果はすべて LifeEvent（cash）として表現し、
 * projected input に対して runSimulation を 1 回だけ掛ける。
 * こうすることで engine.ts の eventNet → cashFlow → taxableEnd の経路を通り、
 * 複利・運用益課税・所得税・社会保険料・教育費の整合が完全に保たれる。
 * 区間分割はしない（区間の切り直しは昇給とインフレの複利を巻き戻すため）。
 */

import type { LifeEvent, PlanInput } from "@/lib/simulation/types";
import type { AppliedEffect, GameState } from "./types";

/** 適用済み効果のうち、金銭を伴うものを LifeEvent へ変換する。 */
export function toLifeEvents(applied: AppliedEffect[]): LifeEvent[] {
  return applied
    .filter((a) => a.effect.cash !== 0)
    .map((a) => ({
      id: `game-${a.id}`,
      year: a.year,
      label: a.label,
      amount: a.effect.cash,
    }));
}

/**
 * ベース入力に適用済み効果を足した PlanInput を返す（baseInput は破壊しない）。
 * projectInput と assetsAtStageEnd の両方から使う共通の射影ロジック。
 */
export function projectInputFromApplied(
  baseInput: PlanInput,
  applied: AppliedEffect[],
): PlanInput {
  return {
    ...baseInput,
    events: [...baseInput.events, ...toLifeEvents(applied)],
  };
}

/** ベース入力にゲームの効果を足した PlanInput を返す（baseInput は破壊しない）。 */
export function projectInput(baseInput: PlanInput, state: GameState): PlanInput {
  return projectInputFromApplied(baseInput, state.applied);
}
