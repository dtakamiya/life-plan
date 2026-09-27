import { describe, it, expect } from "vitest";
import {
  applyGameToInput,
  isReflected,
  pendingReflectDiff,
  reflectableEvents,
  undoGameFromInput,
  unreflectedEffects,
} from "./reflect";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import type { AppliedEffect, GameState } from "./types";

function makeState(applied: AppliedEffect[]): GameState {
  return {
    seed: 1,
    baseInput: defaultPlanInput,
    stages: [],
    stageIndex: 0,
    phase: "finished",
    satisfaction: 50,
    applied,
    log: [],
    pendingEvent: null,
  };
}

function cashEffect(id: string, year: number, cash: number): AppliedEffect {
  return {
    id,
    year,
    label: `効果-${id}`,
    effect: { cash, satisfaction: 0 },
    source: { kind: "stage-option", stageIndex: 0, optionId: "frugal" },
  };
}

function satisfactionOnlyEffect(id: string, year: number): AppliedEffect {
  return {
    id,
    year,
    label: `満足度効果-${id}`,
    effect: { cash: 0, satisfaction: 5 },
    source: { kind: "event-choice", stageIndex: 0, eventId: "ev", choiceId: "c" },
  };
}

describe("unreflectedEffects", () => {
  it("cash が 0 の効果だけを返す（境界値: 全件が満足度のみ）", () => {
    const state = makeState([
      satisfactionOnlyEffect("g1", 2030),
      satisfactionOnlyEffect("g2", 2031),
    ]);
    expect(unreflectedEffects(state).map((e) => e.id)).toEqual(["g1", "g2"]);
    expect(reflectableEvents(state)).toEqual([]);
  });

  it("選択が 0 件なら空配列を返す（境界値）", () => {
    const state = makeState([]);
    expect(unreflectedEffects(state)).toEqual([]);
    expect(reflectableEvents(state)).toEqual([]);
  });
});

describe("pendingReflectDiff / isReflected", () => {
  it("未反映のイベントを差分として返す", () => {
    const base = defaultPlanInput;
    const state = makeState([cashEffect("g1", base.startYear + 3, -100_000)]);
    const diff = pendingReflectDiff(base, state);
    expect(diff).toHaveLength(1);
    expect(diff[0].id).toBe("game-1-g1");
    expect(isReflected(base, state)).toBe(false);
  });

  it("反映対象が無い場合は isReflected が false のまま（境界値）", () => {
    const base = defaultPlanInput;
    expect(isReflected(base, makeState([]))).toBe(false);
    expect(isReflected(base, makeState([satisfactionOnlyEffect("g1", 2030)]))).toBe(false);
  });
});

describe("applyGameToInput / undoGameFromInput 往復", () => {
  it("反映すると差分が本プランへ追加され、isReflected が true になる", () => {
    const base = defaultPlanInput;
    const state = makeState([
      cashEffect("g1", base.startYear + 3, -200_000),
      cashEffect("g2", base.startYear + 5, 100_000),
    ]);
    const applied = applyGameToInput(base, state);
    expect(applied.events).toHaveLength(base.events.length + 2);
    expect(isReflected(applied, state)).toBe(true);
    expect(pendingReflectDiff(applied, state)).toEqual([]);
  });

  it("反映は冪等（2 回呼んでも重複しない）", () => {
    const base = defaultPlanInput;
    const state = makeState([cashEffect("g1", base.startYear + 3, -200_000)]);
    const once = applyGameToInput(base, state);
    const twice = applyGameToInput(once, state);
    expect(twice.events).toHaveLength(base.events.length + 1);
    expect(twice).toEqual(once);
  });

  it("取り消すと反映前の入力に戻る（往復）", () => {
    const base = defaultPlanInput;
    const state = makeState([
      cashEffect("g1", base.startYear + 3, -200_000),
      cashEffect("g2", base.startYear + 5, 100_000),
    ]);
    const applied = applyGameToInput(base, state);
    const undone = undoGameFromInput(applied, state);
    expect(undone.events).toEqual(base.events);
    expect(isReflected(undone, state)).toBe(false);
  });

  it("base の元々のユーザー入力イベントは取り消しで消えない", () => {
    const base: PlanInput = {
      ...defaultPlanInput,
      events: [
        ...defaultPlanInput.events,
        { id: "user-1", year: defaultPlanInput.startYear + 1, label: "既存の支出", amount: -50_000 },
      ],
    };
    const state = makeState([cashEffect("g1", base.startYear + 3, -200_000)]);
    const applied = applyGameToInput(base, state);
    const undone = undoGameFromInput(applied, state);
    expect(undone.events).toEqual(base.events);
    expect(undone.events.some((e) => e.id === "user-1")).toBe(true);
  });

  it("input を破壊しない", () => {
    const base = defaultPlanInput;
    const before = structuredClone(base);
    const state = makeState([cashEffect("g1", base.startYear + 3, -200_000)]);
    const applied = applyGameToInput(base, state);
    undoGameFromInput(applied, state);
    expect(base).toEqual(before);
  });

  it("反映対象が 0 件なら input をそのまま返す（境界値）", () => {
    const base = defaultPlanInput;
    const state = makeState([satisfactionOnlyEffect("g1", 2030)]);
    expect(applyGameToInput(base, state)).toBe(base);
    expect(undoGameFromInput(base, state)).toBe(base);
  });

  it("同じステージ由来の id（s0-option 等）でも seed が違えば別プレイとして衝突しない", () => {
    const base = defaultPlanInput;
    const stateA: GameState = { ...makeState([cashEffect("s0-option", base.startYear + 3, -100_000)]), seed: 1 };
    const stateB: GameState = { ...makeState([cashEffect("s0-option", base.startYear + 3, -200_000)]), seed: 2 };

    const afterA = applyGameToInput(base, stateA);
    const afterBoth = applyGameToInput(afterA, stateB);

    // 2 プレイ分のイベントが両方とも残る（後勝ちで上書きされない）
    expect(afterBoth.events).toHaveLength(base.events.length + 2);
    expect(isReflected(afterBoth, stateA)).toBe(true);
    expect(isReflected(afterBoth, stateB)).toBe(true);

    // stateA だけ取り消しても stateB のイベントは残る
    const undoneA = undoGameFromInput(afterBoth, stateA);
    expect(undoneA.events).toHaveLength(base.events.length + 1);
    expect(isReflected(undoneA, stateB)).toBe(true);
    expect(isReflected(undoneA, stateA)).toBe(false);
  });
});
