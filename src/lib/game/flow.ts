/**
 * ゲーム進行の UI 状態機械（lp-015 / QA#4）。すべて純関数。
 *
 * 状態機械:
 *   選択（select）  = プレビューのみ。selectedId を差し替えるだけで GameState は不変。
 *                     既に選択中の id を再度 select しても何も起きない（確定しない）。
 *   確定（confirm） = 不可逆遷移。selectedId がある場合のみ chooseStageOption /
 *                     resolveEventChoice を 1 回呼び、stageIndex/phase を進める。
 *                     確定後は selectedId を null（未選択）へ戻す。
 *   未選択（selectedId === null）での confirm は no-op（確定不可）。
 *
 * 初期状態・カード切替・ステージ進行後はいずれも「未選択」から始める。
 */

import {
  chooseStageOption,
  currentStage,
  pendingGameEvent,
  resolveEventChoice,
} from "./advance";
import { stageOptionsFor } from "./stages";
import type { GameState } from "./types";

export type GameFlow = {
  game: GameState;
  /** プレビュー中の選択肢 id。null は未選択。 */
  selectedId: string | null;
};

export type GameFlowAction =
  | { type: "select"; choiceId: string }
  | { type: "confirm" };

export function createFlow(game: GameState): GameFlow {
  return { game, selectedId: null };
}

/** 現在のカードで選べる選択肢 id。 */
export function selectableIds(game: GameState): string[] {
  if (game.phase === "awaiting-stage-option") {
    const stage = currentStage(game);
    return stage ? stageOptionsFor(stage).map((o) => o.id) : [];
  }
  if (game.phase === "awaiting-event-choice") {
    return pendingGameEvent(game)?.choices.map((c) => c.id) ?? [];
  }
  return [];
}

export function gameFlowReducer(flow: GameFlow, action: GameFlowAction): GameFlow {
  switch (action.type) {
    case "select": {
      if (flow.selectedId === action.choiceId) return flow;
      if (!selectableIds(flow.game).includes(action.choiceId)) return flow;
      return { ...flow, selectedId: action.choiceId };
    }
    case "confirm": {
      if (flow.selectedId === null) return flow;
      const { game, selectedId } = flow;
      const next =
        game.phase === "awaiting-stage-option"
          ? chooseStageOption(game, selectedId)
          : game.phase === "awaiting-event-choice"
            ? resolveEventChoice(game, selectedId)
            : game;
      return { game: next, selectedId: null };
    }
  }
}
