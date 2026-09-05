import { describe, it, expect } from "vitest";
import { projectInput, toLifeEvents } from "./project";
import { runSimulation } from "@/lib/simulation/engine";
import { defaultPlanInput } from "@/lib/simulation/defaults";
import type { GameState, AppliedEffect } from "./types";
import type { PlanInput } from "@/lib/simulation/types";

function makeState(
  applied: AppliedEffect[],
  baseInput: PlanInput = defaultPlanInput,
): GameState {
  return {
    seed: 1,
    baseInput,
    stages: [],
    stageIndex: 0,
    phase: "awaiting-stage-option",
    satisfaction: 50,
    applied,
    log: [],
    pendingEvent: null,
  };
}

function effect(
  id: string,
  year: number,
  cash: number,
  label = "テスト効果",
): AppliedEffect {
  return {
    id,
    year,
    label,
    effect: { cash, satisfaction: 0 },
    source: { kind: "stage-option", stageIndex: 0, optionId: "frugal" },
  };
}

describe("projectInput", () => {
  it("効果が空なら runSimulation の結果がベースと全フィールド一致する", () => {
    const base = defaultPlanInput;
    const projected = projectInput(base, makeState([]));
    expect(runSimulation(projected)).toEqual(runSimulation(base));
  });

  it("baseInput を破壊しない", () => {
    const base = defaultPlanInput;
    const before = structuredClone(base);
    projectInput(base, makeState([effect("g1", base.startYear + 3, -200_000)]));
    expect(base).toEqual(before);
  });

  it("既存の events を保持したうえで効果を追加する", () => {
    const base = defaultPlanInput;
    const projected = projectInput(
      base,
      makeState([effect("g1", base.startYear + 3, -200_000)]),
    );
    expect(projected.events).toHaveLength(base.events.length + 1);
    for (const original of base.events) {
      expect(projected.events).toContainEqual(original);
    }
  });

  it("cash 効果が指定年の eventNet に載る", () => {
    const base = defaultPlanInput;
    const year = base.startYear + 3;
    const baseNet =
      runSimulation(base).find((r) => r.year === year)?.eventNet ?? 0;
    const projected = projectInput(base, makeState([effect("g1", year, -200_000)]));
    const net = runSimulation(projected).find((r) => r.year === year)?.eventNet;
    expect(net).toBe(baseNet - 200_000);
  });

  it("同じ年の複数の効果が合算される", () => {
    const base = defaultPlanInput;
    const year = base.startYear + 3;
    const baseNet =
      runSimulation(base).find((r) => r.year === year)?.eventNet ?? 0;
    const projected = projectInput(
      base,
      makeState([effect("g1", year, -200_000), effect("g2", year, -50_000)]),
    );
    const net = runSimulation(projected).find((r) => r.year === year)?.eventNet;
    expect(net).toBe(baseNet - 250_000);
  });

  it("同じ支出でも発生年が早いほど最終資産への影響が大きい", () => {
    const base = defaultPlanInput;
    const early = runSimulation(
      projectInput(base, makeState([effect("g1", base.startYear + 5, -200_000)])),
    );
    const late = runSimulation(
      projectInput(base, makeState([effect("g1", base.startYear + 45, -200_000)])),
    );
    const baseFinal = runSimulation(base).at(-1)!.assets;
    const earlyDelta = early.at(-1)!.assets - baseFinal;
    const lateDelta = late.at(-1)!.assets - baseFinal;
    expect(earlyDelta).toBeLessThan(lateDelta);
    expect(lateDelta).toBeLessThan(0);
  });

  it("cash が 0 の効果は LifeEvent に含めない", () => {
    const events = toLifeEvents([effect("g1", 2030, 0), effect("g2", 2031, -100)]);
    expect(events.map((e) => e.id)).toEqual(["game-g2"]);
  });

  it("生成する LifeEvent の id は既存 id と衝突しない接頭辞を持つ", () => {
    const events = toLifeEvents([effect("g1", 2030, -100)]);
    expect(events[0].id).toBe("game-g1");
    expect(events[0].label).toBe("テスト効果");
    expect(events[0].year).toBe(2030);
    expect(events[0].amount).toBe(-100);
  });
});
