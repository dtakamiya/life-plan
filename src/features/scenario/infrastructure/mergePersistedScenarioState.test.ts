import { describe, it, expect } from "vitest";
import { defaultPlanInput } from "@/features/plan/domain";
import type { Snapshot } from "@/features/scenario/domain";
import { mergePersistedScenarioState } from "./mergePersistedScenarioState";

/**
 * zustand persist は `localStorage` の無い実行環境（本プロジェクトのテストの
 * 既定 `environment: "node"`）では merge を呼び出さないため、純粋関数を直接検証する。
 */

const current = { snapshots: [] as Snapshot[] };
const valid: Snapshot = { id: "snap-1", name: "A", input: defaultPlanInput, origin: "manual" };

describe("mergePersistedScenarioState", () => {
  it("有効なスナップショットを保持し、origin の無い旧要素は manual として復元する", () => {
    const legacy = { id: "snap-2", name: "B", input: defaultPlanInput };
    const merged = mergePersistedScenarioState({ snapshots: [valid, legacy] }, current);
    expect(merged.snapshots).toEqual([valid, { ...legacy, origin: "manual" }]);
  });

  it("一部の要素が壊れていれば、その要素だけを除外する", () => {
    const merged = mergePersistedScenarioState(
      {
        snapshots: [
          valid,
          { id: 1, name: "x", input: defaultPlanInput },
          "broken",
          { ...valid, id: "snap-3", input: { startYear: "2030" } },
        ],
      },
      current,
    );
    expect(merged.snapshots).toEqual([valid]);
  });

  it("保存データが無ければ空配列にする", () => {
    expect(mergePersistedScenarioState(undefined, current).snapshots).toEqual([]);
  });

  it("snapshots が配列でない・state が壊れていれば空配列にする（例外を出さない）", () => {
    for (const persisted of [{ snapshots: "x" }, { snapshots: { a: 1 } }, {}, null, "broken", 42]) {
      expect(mergePersistedScenarioState(persisted, current).snapshots).toEqual([]);
    }
  });
});
