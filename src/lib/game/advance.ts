/**
 * ゲームの状態遷移。すべて純関数で、GameState を受け取り新しい GameState を返す。
 *
 * 1 ターンの流れ:
 *   方針カード（必須）→ イベント抽選 → 反映 → 次のステージへ
 * 選択型イベントが出たときだけ phase が awaiting-event-choice で止まる。
 */

import { runSimulation } from "@/lib/simulation/engine";
import type { PlanInput } from "@/lib/simulation/types";
import type {
  AppliedEffect,
  GameEffect,
  GameEvent,
  GameState,
  LogEntry,
  Stage,
} from "./types";
import { deriveStages, stageOptionsFor } from "./stages";
import { GAME_EVENTS, pickEvent } from "./events";
import { stageRng } from "./rng";
import { toLifeEvents } from "./project";

/** ステージごとにイベントが発生する確率。 */
export const EVENT_RATE = 0.6;

/** 満足度の初期値。 */
export const INITIAL_SATISFACTION = 50;

/** ステージ終了ごとの満足度の減衰。減衰がないと上限に張り付く。 */
export const SATISFACTION_DECAY_PER_STAGE = 3;

/** 満足度を 0〜100 に収める。 */
function clampSatisfaction(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** 進行中のステージ。finished なら null。 */
export function currentStage(state: GameState): Stage | null {
  return state.stages[state.stageIndex] ?? null;
}

/** 選択待ちのイベント定義。なければ null。 */
export function pendingGameEvent(state: GameState): GameEvent | null {
  if (!state.pendingEvent) return null;
  return GAME_EVENTS.find((e) => e.id === state.pendingEvent!.eventId) ?? null;
}

/** ゲームを初期化する。seed は呼び出し側（ユーザー操作 / useEffect）で作る。 */
export function createGame(baseInput: PlanInput, seed: number): GameState {
  return {
    seed,
    baseInput: structuredClone(baseInput),
    stages: deriveStages(baseInput),
    stageIndex: 0,
    phase: "awaiting-stage-option",
    satisfaction: INITIAL_SATISFACTION,
    applied: [],
    log: [],
    pendingEvent: null,
  };
}

/** 適用済み効果からステージ末時点の純資産を求める。 */
function assetsAtStageEnd(
  baseInput: PlanInput,
  applied: AppliedEffect[],
  stage: Stage,
): number {
  const results = runSimulation({
    ...baseInput,
    events: [...baseInput.events, ...toLifeEvents(applied)],
  });
  const row = results.find((r) => r.year === stage.endYear) ?? results.at(-1);
  return row ? row.assets : 0;
}

/** 効果を積み、ログ 1 行を足した中間状態を返す。 */
function applyEffect(
  state: GameState,
  stage: Stage,
  effect: GameEffect,
  label: string,
  text: string,
  source: AppliedEffect["source"],
  effectId: string,
): GameState {
  const applied: AppliedEffect[] = [
    ...state.applied,
    { id: effectId, year: stage.midYear, label, effect, source },
  ];
  const satisfaction = clampSatisfaction(state.satisfaction + effect.satisfaction);
  const entry: LogEntry = {
    stageIndex: stage.index,
    text,
    cash: effect.cash,
    satisfaction,
    assetsAtStageEnd: assetsAtStageEnd(state.baseInput, applied, stage),
  };
  return { ...state, applied, satisfaction, log: [...state.log, entry] };
}

/** ステージを 1 つ進める（満足度の減衰つき）。終端なら finished。 */
function advanceStage(state: GameState): GameState {
  const nextIndex = state.stageIndex + 1;
  return {
    ...state,
    stageIndex: nextIndex,
    phase: nextIndex >= state.stages.length ? "finished" : "awaiting-stage-option",
    satisfaction: clampSatisfaction(
      state.satisfaction - SATISFACTION_DECAY_PER_STAGE,
    ),
    pendingEvent: null,
  };
}

/** これまでに発生したイベント id の集合（once の判定に使う）。 */
function usedEventIds(state: GameState): Set<string> {
  const ids = new Set<string>();
  for (const a of state.applied) {
    if (a.source.kind === "event-choice") ids.add(a.source.eventId);
  }
  if (state.pendingEvent) ids.add(state.pendingEvent.eventId);
  return ids;
}

/**
 * 方針カードを確定し、イベント抽選まで進める。
 * 選択型イベント（選択肢 2 件以上）が出たらそこで止まる。
 */
export function chooseStageOption(state: GameState, optionId: string): GameState {
  if (state.phase !== "awaiting-stage-option") return state;
  const stage = currentStage(state);
  if (!stage) return state;

  const option = stageOptionsFor(stage).find((o) => o.id === optionId);
  if (!option) return state;

  const afterOption = applyEffect(
    state,
    stage,
    option.effect,
    `${stage.label}の暮らし（${option.label}）`,
    `${stage.label}は「${option.label}」を選んだ。`,
    { kind: "stage-option", stageIndex: stage.index, optionId: option.id },
    `s${stage.index}-option`,
  );

  const event = pickEvent(
    {
      input: afterOption.baseInput,
      stage,
      usedEventIds: usedEventIds(afterOption),
    },
    stageRng(afterOption.seed, stage.index),
    EVENT_RATE,
  );

  if (!event) return advanceStage(afterOption);

  if (event.choices.length === 1) {
    // 無選択型: そのまま確定して次のステージへ
    const choice = event.choices[0];
    const afterEvent = applyEffect(
      afterOption,
      stage,
      choice.effect,
      `${event.title}`,
      choice.resultText,
      {
        kind: "event-choice",
        stageIndex: stage.index,
        eventId: event.id,
        choiceId: choice.id,
      },
      `s${stage.index}-event`,
    );
    return advanceStage(afterEvent);
  }

  return {
    ...afterOption,
    phase: "awaiting-event-choice",
    pendingEvent: { stageIndex: stage.index, eventId: event.id },
  };
}

/** 選択型イベントを確定し、次のステージへ進める。 */
export function resolveEventChoice(state: GameState, choiceId: string): GameState {
  if (state.phase !== "awaiting-event-choice" || !state.pendingEvent) return state;
  const stage = state.stages[state.pendingEvent.stageIndex];
  const event = pendingGameEvent(state);
  if (!stage || !event) return state;

  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) return state;

  const afterEvent = applyEffect(
    state,
    stage,
    choice.effect,
    event.title,
    choice.resultText,
    {
      kind: "event-choice",
      stageIndex: stage.index,
      eventId: event.id,
      choiceId: choice.id,
    },
    `s${stage.index}-event`,
  );
  return advanceStage(afterEvent);
}
