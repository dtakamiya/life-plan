// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { defaultPlanInput } from "@/features/plan/domain";

/**
 * 旧形式（life-plan/v1 に snapshots を同居、version 1）の保存データからの移行を、
 * 実際の persist のハイドレートで確認する。ストアはモジュールの読み込み時に
 * localStorage から同期的にハイドレートするため、テストごとに localStorage を
 * 用意してからモジュールを読み込み直す。scenario ストアは plan ストアを import する
 * ので、plan の migrate が scenario のハイドレートより先に走ることもここで確かめる。
 */

const PLAN_KEY = "life-plan/v1";
const SCENARIOS_KEY = "life-plan/scenarios/v1";

const legacySnapshot = {
  id: "snap-old",
  name: "旧プラン",
  input: defaultPlanInput,
  origin: "manual",
};
const legacyInput = { ...defaultPlanInput, self: { ...defaultPlanInput.self, name: "旧データの本人" } };

function writeLegacyPlan() {
  localStorage.setItem(
    PLAN_KEY,
    JSON.stringify({
      state: { input: legacyInput, snapshots: [legacySnapshot], rangeAutoCorrected: false },
      version: 1,
    }),
  );
}

function readItem(key: string) {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

/** モジュールを読み込み直し、localStorage からハイドレートした新しいストアを返す。 */
async function loadStores() {
  vi.resetModules();
  const { useScenarioStore } = await import("./useScenarioStore");
  const { usePlanStore } = await import("@/features/plan/ui");
  return { useScenarioStore, usePlanStore };
}

beforeEach(() => {
  localStorage.clear();
});

describe("旧形式の保存データからの移行（life-plan/v1 → life-plan/scenarios/v1）", () => {
  it("旧 snapshots が scenario ストアへ引き継がれ、plan のキーは version 2 で snapshots を持たない", async () => {
    writeLegacyPlan();
    const { useScenarioStore, usePlanStore } = await loadStores();

    expect(usePlanStore.getState().input.self.name).toBe("旧データの本人");
    expect(useScenarioStore.getState().snapshots).toEqual([legacySnapshot]);

    const plan = readItem(PLAN_KEY);
    expect(plan.version).toBe(2);
    expect(plan.state).not.toHaveProperty("snapshots");
    expect(readItem(SCENARIOS_KEY)).toEqual({ state: { snapshots: [legacySnapshot] }, version: 1 });
  });

  it("再読み込み（2 回目のハイドレート）でもスナップショットが保たれる", async () => {
    writeLegacyPlan();
    await loadStores();
    const { useScenarioStore } = await loadStores();
    expect(useScenarioStore.getState().snapshots).toEqual([legacySnapshot]);
    expect(readItem(PLAN_KEY).version).toBe(2);
  });

  it("新キーが既にあれば、version 1 の旧キーが残っていても上書きしない", async () => {
    const current = { ...legacySnapshot, id: "snap-new", name: "移行後に保存" };
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify({ state: { snapshots: [current] }, version: 1 }));
    writeLegacyPlan();

    const { useScenarioStore } = await loadStores();
    expect(useScenarioStore.getState().snapshots).toEqual([current]);
  });

  it("保存データが無ければ、どちらのストアも既定値で始まり新キーを作らない", async () => {
    const { useScenarioStore, usePlanStore } = await loadStores();
    expect(usePlanStore.getState().input).toEqual(defaultPlanInput);
    expect(useScenarioStore.getState().snapshots).toEqual([]);
    expect(localStorage.getItem(SCENARIOS_KEY)).toBeNull();
  });

  it("移行後の保存は scenario のキーにだけ書かれ、plan のキーには snapshots を書かない", async () => {
    writeLegacyPlan();
    const { useScenarioStore, usePlanStore } = await loadStores();

    useScenarioStore.getState().saveSnapshot("移行後");
    usePlanStore.getState().updateSelf({ name: "編集" });

    expect(readItem(SCENARIOS_KEY).state.snapshots.map((s: { name: string }) => s.name)).toEqual([
      "旧プラン",
      "移行後",
    ]);
    expect(readItem(PLAN_KEY).state).not.toHaveProperty("snapshots");
  });
});
