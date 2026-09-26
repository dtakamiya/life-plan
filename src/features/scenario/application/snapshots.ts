import type { PlanInput } from "@/features/plan/domain";
import type { IdGenerator } from "@/features/plan/application";
import type { Snapshot, SnapshotOrigin } from "@/features/scenario/domain";

/** ゲーム由来のイベントのラベルに前置する標識。 */
const GAME_EVENT_LABEL_PREFIX = "（ゲーム）";

/**
 * 計画を名前付きスナップショットとして末尾に追加した一覧を返す。
 * 入力は複製して保存し、以降の編集が保存済みのスナップショットに波及しないようにする。
 */
export function saveSnapshot(
  snapshots: Snapshot[],
  name: string,
  input: PlanInput,
  origin: SnapshotOrigin,
  idGen: IdGenerator,
): Snapshot[] {
  const snapshot: Snapshot = {
    id: idGen("snap"),
    name,
    input: structuredClone(input),
    origin,
  };
  return [...snapshots, snapshot];
}

/** 指定した id のスナップショットを取り除いた一覧を返す。 */
export function removeSnapshot(snapshots: Snapshot[], id: string): Snapshot[] {
  return snapshots.filter((snap) => snap.id !== id);
}

/**
 * スナップショットの入力を、現在の入力へ読み込める複製にして返す。該当する id が無ければ null。
 * ゲーム由来の乱数イベントが本体入力に無標識で混ざるのを防ぐ（免責節の要件）ため、
 * origin が game のときは game- で始まる id のイベント label に「（ゲーム）」を前置する。
 * 既に前置済みなら二重付与しない（冪等）。
 */
export function loadSnapshot(snapshots: Snapshot[], id: string): PlanInput | null {
  const snapshot = snapshots.find((snap) => snap.id === id);
  if (!snapshot) return null;
  const input = structuredClone(snapshot.input);
  if (snapshot.origin !== "game") return input;
  return {
    ...input,
    events: input.events.map((e) =>
      e.id.startsWith("game-") && !e.label.startsWith(GAME_EVENT_LABEL_PREFIX)
        ? { ...e, label: `${GAME_EVENT_LABEL_PREFIX}${e.label}` }
        : e,
    ),
  };
}
