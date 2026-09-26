import { describe, it, expect } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { mergePersistedPlanState } from "./mergePersistedPlanState";

/**
 * lp-019 / QA#1: 永続化復元時（persist の merge）の自動補正の回帰テスト。
 * zustand persist は `localStorage` の無い実行環境（本プロジェクトのテストの
 * 既定 `environment: "node"` を含む）では merge を呼び出さない実装のため、
 * merge ロジックを切り出した純粋関数 `mergePersistedPlanState` を直接検証する。
 */
describe("usePlanStore — 永続化復元時の期間自動補正", () => {
  const currentFragment = {
    input: defaultPlanInput,
    rangeAutoCorrected: false,
  };

  it("復元データの期間が無効（開始年>終了年）なら merge 時に補正され、rangeAutoCorrected が true になる", () => {
    const persistedInput = {
      ...defaultPlanInput,
      startYear: 2040,
      endYear: 2020,
    };
    const merged = mergePersistedPlanState(
      { input: persistedInput },
      currentFragment,
    );

    expect(merged.input.startYear).toBe(2040);
    expect(merged.input.endYear).toBe(2041);
    expect(merged.rangeAutoCorrected).toBe(true);
  });

  it("復元データの期間が有効なら merge 時に補正されず、rangeAutoCorrected が false になる", () => {
    const persistedInput = {
      ...defaultPlanInput,
      startYear: 2026,
      endYear: 2091,
    };
    const merged = mergePersistedPlanState(
      { input: persistedInput },
      currentFragment,
    );

    expect(merged.input.startYear).toBe(2026);
    expect(merged.input.endYear).toBe(2091);
    expect(merged.rangeAutoCorrected).toBe(false);
  });

  it("永続化データが存在しない場合は既定入力にフォールバックし、rangeAutoCorrected は false になる", () => {
    const merged = mergePersistedPlanState(undefined, currentFragment);

    expect(merged.input).toEqual(defaultPlanInput);
    expect(merged.rangeAutoCorrected).toBe(false);
  });

  it("snapshots を含む旧形式のデータでも input だけを復元し、state に snapshots を持ち込まない", () => {
    const persistedInput: PlanInput = { ...defaultPlanInput, startYear: 2030, endYear: 2080 };
    const merged = mergePersistedPlanState(
      { input: persistedInput, snapshots: [{ id: "snap-1" }], rangeAutoCorrected: false },
      currentFragment,
    );
    expect(merged.input).toEqual(persistedInput);
    expect(merged).not.toHaveProperty("snapshots");
  });
});
