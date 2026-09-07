import { describe, it, expect, beforeEach } from "vitest";
import { usePlanStore } from "./usePlanStore";
import { defaultPlanInput } from "@/lib/simulation/defaults";
import { runSimulation } from "@/lib/simulation/engine";
import type { YearlyResult } from "@/lib/simulation/types";

/** 既定入力に対する年次系列（reset の前後で不変であるべき基準値）。 */
const BASELINE_SERIES: YearlyResult[] = runSimulation(defaultPlanInput);

/** 系列内に NaN / 非有限値が無いことを確認する。 */
function assertFiniteSeries(series: YearlyResult[]) {
  expect(series.length).toBeGreaterThan(0);
  for (const row of series) {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "number") {
        expect(Number.isFinite(value), `${key} が有限値でない: ${value}`).toBe(
          true,
        );
      }
    }
  }
}

describe("usePlanStore.reset", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  it("リセット後の input が既定値と deep-equal（新規セッションと完全一致）", () => {
    const { input } = usePlanStore.getState();
    expect(input).toEqual(defaultPlanInput);
    // 共有参照のまま返していないこと（以降の編集で既定値を汚染しない）
    expect(input).not.toBe(defaultPlanInput);
    expect(input.children).not.toBe(defaultPlanInput.children);
  });

  it("30歳ペルソナ（配偶者・子・ローン・イベント・保存プラン）を全消去する", () => {
    const store = usePlanStore.getState();

    store.setRange(2026, 2091);
    store.updateSelf({ birthYear: 1996, grossAnnualIncome: 6_000_000 });
    store.toggleSpouse(true);
    store.updateSpouse({ birthYear: 1997 });
    store.addChild();
    store.addChild();
    store.addLoan();
    store.addEvent();
    store.saveSnapshot("プランA");
    store.saveSnapshot("プランB");

    const dirty = usePlanStore.getState();
    expect(dirty.input.loans.length).toBeGreaterThan(0);
    expect(dirty.input.events.length).toBeGreaterThan(0);
    expect(dirty.snapshots.length).toBe(2);

    usePlanStore.getState().reset();

    const after = usePlanStore.getState();
    // self / spouse / children / loans / events / assets すべて既定へ
    expect(after.input).toEqual(defaultPlanInput);
    // 保存済み比較プラン（シナリオ）も全消去
    expect(after.snapshots).toEqual([]);
  });

  it("リセット後に別ペルソナ（20歳）を入力しても前ペルソナのローン・イベントが混入しない", () => {
    const first = usePlanStore.getState();
    first.updateSelf({ birthYear: 1996 });
    first.addLoan();
    first.addLoan();
    first.addEvent();
    first.saveSnapshot("前ペルソナ");

    usePlanStore.getState().reset();

    // 20歳ペルソナを新規入力
    const second = usePlanStore.getState();
    second.updateSelf({ birthYear: 2006, grossAnnualIncome: 2_500_000 });

    const state = usePlanStore.getState();
    // 前ペルソナで追加したローン・イベントは既定の1件ずつのまま
    expect(state.input.loans).toEqual(defaultPlanInput.loans);
    expect(state.input.events).toEqual(defaultPlanInput.events);
    expect(state.snapshots).toEqual([]);
    expect(state.input.self.birthYear).toBe(2006);
  });

  it("保存済み比較プランが0件でもエラーなくリセットできる", () => {
    expect(usePlanStore.getState().snapshots).toEqual([]);
    expect(() => usePlanStore.getState().reset()).not.toThrow();
    expect(usePlanStore.getState().snapshots).toEqual([]);
  });

  it("保存済み比較プランが複数件でもエラーなく全消去できる", () => {
    const store = usePlanStore.getState();
    store.saveSnapshot("a");
    store.saveSnapshot("b");
    store.saveSnapshot("c");
    expect(usePlanStore.getState().snapshots.length).toBe(3);

    expect(() => usePlanStore.getState().reset()).not.toThrow();
    expect(usePlanStore.getState().snapshots).toEqual([]);
  });

  it("リセット直後に runSimulation を呼んでも NaN/例外なく正常系列を返す", () => {
    usePlanStore.getState().reset();
    const series = runSimulation(usePlanStore.getState().input);
    assertFiniteSeries(series);
  });

  it("既定入力に対する runSimulation の年次系列が reset 前後で完全一致する", () => {
    // 入力をひとしきり汚してから reset
    const store = usePlanStore.getState();
    store.updateSelf({ grossAnnualIncome: 9_999_999 });
    store.addLoan();
    store.addEvent();
    store.saveSnapshot("noise");

    usePlanStore.getState().reset();

    const afterReset = runSimulation(usePlanStore.getState().input);
    expect(afterReset).toEqual(BASELINE_SERIES);
  });
});
