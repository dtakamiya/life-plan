import { describe, it, expect, beforeEach } from "vitest";
import { usePlanStore } from "@/features/plan/ui";
import { defaultPlanInput } from "@/features/plan/domain";
import { runSimulation } from "@/lib/simulation/engine";
import type { YearlyResult } from "@/lib/simulation/types";

/**
 * plan ストアの操作結果をシミュレーションに通したときの回帰テスト。
 * plan は simulation を import できない（下流機能）ため、plan/ui/usePlanStore.test.ts から移した。
 */

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

describe("usePlanStore — 世帯構成連動の既定値（lp-030）", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  it("単身・子なしで runSimulation しても、以前の30年ローン残債で枯渇しない（lp-030 検証観点a）", () => {
    const store = usePlanStore.getState();
    store.toggleSpouse(false);
    const [firstChild] = usePlanStore.getState().input.children;
    usePlanStore.getState().removeChild(firstChild.id);

    const input = usePlanStore.getState().input;
    expect(input.loans).toEqual([]);
    expect(input.events).toEqual([]);

    const results = runSimulation(input);
    const depleted = results.find((r) => r.assets < 0);
    expect(depleted).toBeUndefined();
  });
});

describe("usePlanStore.startBlank — まっさらから入力（lp-030）", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  it("まっさら後に runSimulation しても NaN/例外なく、枯渇しない", () => {
    usePlanStore.getState().startBlank();
    const results = runSimulation(usePlanStore.getState().input);
    assertFiniteSeries(results);
    expect(results.find((r) => r.assets < 0)).toBeUndefined();
  });
});
