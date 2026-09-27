/**
 * lp-034: ゲームの結果を本プランへ反映する導線の純関数。
 *
 * 「反映」は baseInput ではなく、呼び出し時点の PlanInput（本体の入力）を対象にする。
 * ゲーム中に本体の入力が変わっていても、その入力を壊さず game-* イベントだけを足し引きする。
 *
 * id は `game-<seed>-<AppliedEffect.id>` で本体イベントの id と衝突しないようにする。
 * AppliedEffect.id 自体（`s0-option` 等）はステージ番号だけで決まり、プレイのたびに
 * 同じ値になるため、project.ts の toLifeEvents（1 プレイ内の射影専用）とは別に、
 * ゲームの seed を id へ混ぜて「やり直し後の 2 回目のプレイを反映」しても
 * 前回反映したイベントと衝突しないようにする。
 */

import type { LifeEvent, PlanInput } from "@/features/plan/domain";
import type { AppliedEffect, GameState } from "./types";

/** 反映対象（cash を伴う効果）を LifeEvent へ変換したもの。 */
export function reflectableEvents(state: GameState): LifeEvent[] {
  return state.applied
    .filter((a) => a.effect.cash !== 0)
    .map((a) => ({
      id: `game-${state.seed}-${a.id}`,
      year: a.year,
      label: a.label,
      amount: a.effect.cash,
    }));
}

/** 反映されない効果（満足度のみで金額を伴わない選択）。前提の明示に使う。 */
export function unreflectedEffects(state: GameState): AppliedEffect[] {
  return state.applied.filter((a) => a.effect.cash === 0);
}

/** 反映によって追加される差分（まだ input に無いイベント）。プレビュー表示に使う。 */
export function pendingReflectDiff(input: PlanInput, state: GameState): LifeEvent[] {
  const existingIds = new Set(input.events.map((e) => e.id));
  return reflectableEvents(state).filter((e) => !existingIds.has(e.id));
}

/** 既に全件反映済みか（差分が無く、かつ反映対象が 1 件以上ある）。 */
export function isReflected(input: PlanInput, state: GameState): boolean {
  const reflectable = reflectableEvents(state);
  return reflectable.length > 0 && pendingReflectDiff(input, state).length === 0;
}

/** 本プランの入力にゲームの効果イベントを追加する（input は破壊しない・冪等）。 */
export function applyGameToInput(input: PlanInput, state: GameState): PlanInput {
  const diff = pendingReflectDiff(input, state);
  if (diff.length === 0) return input;
  return { ...input, events: [...input.events, ...diff] };
}

/** applyGameToInput が追加したイベントだけを取り除く（取り消し・input は破壊しない）。 */
export function undoGameFromInput(input: PlanInput, state: GameState): PlanInput {
  const gameIds = new Set(reflectableEvents(state).map((e) => e.id));
  if (gameIds.size === 0) return input;
  const filtered = input.events.filter((e) => !gameIds.has(e.id));
  if (filtered.length === input.events.length) return input;
  return { ...input, events: filtered };
}
