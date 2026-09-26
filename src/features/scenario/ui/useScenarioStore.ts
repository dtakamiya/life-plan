/**
 * 比較用スナップショットのグローバルストア。Zustand + persist で localStorage の
 * `life-plan/scenarios/v1` に保存する。旧データ（`life-plan/v1` に同居していた
 * snapshots）の移行は plan ストアの persist `migrate` が行う。このファイルは
 * plan ストアを import するため、scenario のハイドレートは常に plan の移行の後になる。
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PlanInput } from "@/features/plan/domain";
import {
  SCENARIOS_STORAGE_KEY,
  SCENARIOS_STORAGE_VERSION,
  makeId,
} from "@/features/plan/infrastructure";
import { usePlanStore } from "@/features/plan/ui";
import type { Snapshot, SnapshotOrigin } from "@/features/scenario/domain";
import {
  loadSnapshot,
  removeSnapshot,
  saveSnapshot,
} from "@/features/scenario/application";
import { mergePersistedScenarioState } from "@/features/scenario/infrastructure";

type ScenarioState = {
  /** 比較用に保存した計画のスナップショット一覧。 */
  snapshots: Snapshot[];
  /**
   * 計画を名前付きスナップショットとして保存する。
   * input を省略すると plan の現在の入力を複製する。ゲームモードは
   * 射影済みの PlanInput と origin: "game" を渡す。
   */
  saveSnapshot: (
    name: string,
    input?: PlanInput,
    origin?: SnapshotOrigin,
  ) => void;
  /** スナップショットを削除する。 */
  removeSnapshot: (id: string) => void;
  /** スナップショットの内容を plan の現在の入力に読み込む（plan の replaceInput）。 */
  loadSnapshot: (id: string) => void;
  /** 全消去。plan の入力を既定値へ戻し、保存済み比較プランも空にする。 */
  reset: () => void;
};

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set, get) => ({
      snapshots: [],

      saveSnapshot: (name, input, origin = "manual") =>
        set((s) => ({
          snapshots: saveSnapshot(
            s.snapshots,
            name,
            input ?? usePlanStore.getState().input,
            origin,
            makeId,
          ),
        })),

      removeSnapshot: (id) =>
        set((s) => ({ snapshots: removeSnapshot(s.snapshots, id) })),

      loadSnapshot: (id) => {
        const input = loadSnapshot(get().snapshots, id);
        if (input) usePlanStore.getState().replaceInput(input);
      },

      reset: () => {
        usePlanStore.getState().reset();
        set({ snapshots: [] });
      },
    }),
    {
      name: SCENARIOS_STORAGE_KEY,
      version: SCENARIOS_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      merge: mergePersistedScenarioState,
    },
  ),
);
