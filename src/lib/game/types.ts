/**
 * ゲームモードのドメイン型。
 * すべての効果は cash（円）と satisfaction（0〜100 のスコア）の 2 軸で表す。
 * 金額は「円」、cash のマイナスは支出。
 */

import type { PlanInput } from "@/lib/simulation/types";

/** 効果の 2 軸。金銭と満足度は互いに換算しない。 */
export type GameEffect = {
  /** 円。マイナスは支出。LifeEvent.amount としてそのまま計上する */
  cash: number;
  /** 満足度の増減（ポイント） */
  satisfaction: number;
};

/** 本人の年齢を 10 歳区切りで切ったターン単位。 */
export type Stage = {
  index: number;
  /** 「40代」「35〜39歳」 */
  label: string;
  startYear: number;
  endYear: number;
  /** cash 効果を計上する年（決定論を保つため乱数で散らさない） */
  midYear: number;
  startAge: number;
  endAge: number;
};

/** 方針カードの 1 択。 */
export type StageOption = {
  id: string;
  label: string;
  description: string;
  effect: GameEffect;
};

/** イベントの 1 択。無選択型イベントは choices を 1 つだけ持つ。 */
export type EventChoice = {
  id: string;
  label: string;
  effect: GameEffect;
  /** 選択後に冒険の記録へ出す一文 */
  resultText: string;
};

/** イベントの発生条件。未指定の項目は制約なしとして扱う。 */
export type EventCondition = {
  minSelfAge?: number;
  maxSelfAge?: number;
  /** ステージ中央年に、この年齢範囲の子がいること */
  requiresChildAged?: { min: number; max: number };
  requiresSpouse?: boolean;
  /** ステージ中央年に返済中のローンがあること */
  requiresActiveLoan?: boolean;
  /** 1 プレイ 1 回に限定する */
  once?: boolean;
};

export type GameEvent = {
  id: string;
  title: string;
  description: string;
  /** 候補内での抽選の重み（正の数） */
  weight: number;
  condition?: EventCondition;
  choices: EventChoice[];
};

/** 適用済みの効果。project.ts が LifeEvent へ射影する。 */
export type AppliedEffect = {
  id: string;
  year: number;
  label: string;
  effect: GameEffect;
  source:
    | { kind: "stage-option"; stageIndex: number; optionId: string }
    | { kind: "event-choice"; stageIndex: number; eventId: string; choiceId: string };
};

/** 冒険の記録の 1 行。 */
export type LogEntry = {
  stageIndex: number;
  text: string;
  cash: number;
  satisfaction: number;
  /** その効果を反映した後の、ステージ末時点の純資産（円） */
  assetsAtStageEnd: number;
};

/** 次にユーザーへ求める操作。 */
export type GamePhase =
  | "awaiting-stage-option"
  | "awaiting-event-choice"
  | "finished";

export type GameState = {
  seed: number;
  /** 開始時に固定する。本体の入力を変えても進行が壊れない */
  baseInput: PlanInput;
  stages: Stage[];
  stageIndex: number;
  phase: GamePhase;
  /** 0〜100。初期値 50 */
  satisfaction: number;
  applied: AppliedEffect[];
  log: LogEntry[];
  pendingEvent: { stageIndex: number; eventId: string } | null;
};
