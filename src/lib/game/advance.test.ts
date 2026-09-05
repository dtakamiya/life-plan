import { describe, it, expect } from "vitest";
import {
  EVENT_RATE,
  INITIAL_SATISFACTION,
  SATISFACTION_DECAY_PER_STAGE,
  createGame,
  chooseStageOption,
  currentStage,
  pendingGameEvent,
  resolveEventChoice,
} from "./advance";
import { defaultPlanInput } from "@/lib/simulation/defaults";
import type { GameState } from "./types";

/** 常に指定 id の方針を選び、イベントが出たら指定 index の選択肢を採って最後まで進める。 */
function playThrough(
  state: GameState,
  optionId: string,
  choiceIndex = 0,
): GameState {
  let s = state;
  let guard = 0;
  while (s.phase !== "finished") {
    if (guard++ > 100) throw new Error("進行が終わらない");
    if (s.phase === "awaiting-stage-option") {
      s = chooseStageOption(s, optionId);
    } else {
      const event = pendingGameEvent(s)!;
      const choice = event.choices[Math.min(choiceIndex, event.choices.length - 1)];
      s = resolveEventChoice(s, choice.id);
    }
  }
  return s;
}

describe("createGame", () => {
  it("初期状態を組み立てる", () => {
    const s = createGame(defaultPlanInput, 2026);
    expect(s.stageIndex).toBe(0);
    expect(s.phase).toBe("awaiting-stage-option");
    expect(s.satisfaction).toBe(INITIAL_SATISFACTION);
    expect(s.applied).toEqual([]);
    expect(s.log).toEqual([]);
    expect(s.pendingEvent).toBeNull();
    expect(s.stages.length).toBeGreaterThan(0);
    expect(currentStage(s)).toEqual(s.stages[0]);
  });

  it("EVENT_RATE は 0.6", () => {
    expect(EVENT_RATE).toBe(0.6);
  });
});

describe("chooseStageOption", () => {
  it("方針を選ぶと効果が applied に積まれ、ログが 1 行増える", () => {
    const s = chooseStageOption(createGame(defaultPlanInput, 1), "rich");
    expect(s.applied.length).toBeGreaterThanOrEqual(1);
    expect(s.applied[0].source).toEqual({
      kind: "stage-option",
      stageIndex: 0,
      optionId: "rich",
    });
    expect(s.applied[0].year).toBe(s.stages[0].midYear);
    expect(s.log.length).toBeGreaterThanOrEqual(1);
    expect(s.log[0].assetsAtStageEnd).toBeTypeOf("number");
  });

  it("イベント待ちでない限りステージが 1 つ進む", () => {
    const s = chooseStageOption(createGame(defaultPlanInput, 1), "frugal");
    if (s.phase === "awaiting-event-choice") {
      expect(s.stageIndex).toBe(0);
      expect(s.pendingEvent).not.toBeNull();
    } else {
      expect(s.stageIndex).toBe(1);
      expect(s.pendingEvent).toBeNull();
    }
  });

  it("awaiting-event-choice 中に呼んでも状態が変わらない", () => {
    let s = createGame(defaultPlanInput, 1);
    let guard = 0;
    while (s.phase !== "awaiting-event-choice") {
      if (guard++ > 50) throw new Error("イベント待ちにならない");
      s = chooseStageOption(s, "frugal");
      if (s.phase === "finished") throw new Error("イベント待ちにならない");
    }
    expect(chooseStageOption(s, "rich")).toBe(s);
  });

  it("baseInput を変化させない", () => {
    const before = structuredClone(defaultPlanInput);
    const s = playThrough(createGame(defaultPlanInput, 5), "rich");
    expect(s.baseInput).toEqual(before);
    expect(defaultPlanInput).toEqual(before);
  });

  it("最後のステージを終えると finished になる", () => {
    const s = playThrough(createGame(defaultPlanInput, 3), "standard");
    expect(s.phase).toBe("finished");
    expect(s.stageIndex).toBe(s.stages.length);
    expect(currentStage(s)).toBeNull();
    expect(s.pendingEvent).toBeNull();
  });
});

describe("resolveEventChoice", () => {
  it("イベント待ちでないときは状態が変わらない", () => {
    const s = createGame(defaultPlanInput, 1);
    expect(resolveEventChoice(s, "repair")).toBe(s);
  });

  it("知らない選択肢 id なら状態が変わらない", () => {
    let s = createGame(defaultPlanInput, 1);
    let guard = 0;
    while (s.phase !== "awaiting-event-choice") {
      if (guard++ > 50) throw new Error("イベント待ちにならない");
      s = chooseStageOption(s, "frugal");
    }
    expect(resolveEventChoice(s, "存在しない選択肢")).toBe(s);
  });
});

describe("満足度", () => {
  it("ステージ終了ごとに減衰する", () => {
    const s = createGame(defaultPlanInput, 1);
    const after = chooseStageOption(s, "frugal");
    if (after.phase === "awaiting-event-choice") return; // 減衰前
    // frugal は -4、加えてステージ終了の減衰 -3
    expect(after.satisfaction).toBe(
      INITIAL_SATISFACTION - 4 - SATISFACTION_DECAY_PER_STAGE,
    );
  });

  it("0 未満にならない", () => {
    const s = playThrough(createGame(defaultPlanInput, 11), "frugal", 0);
    expect(s.satisfaction).toBeGreaterThanOrEqual(0);
  });

  it("100 を超えない", () => {
    const high = { ...createGame(defaultPlanInput, 12), satisfaction: 99 };
    const s = playThrough(high, "rich", 1);
    expect(s.satisfaction).toBeLessThanOrEqual(100);
    for (const entry of s.log) {
      expect(entry.satisfaction).toBeGreaterThanOrEqual(0);
      expect(entry.satisfaction).toBeLessThanOrEqual(100);
    }
  });
});

describe("決定論", () => {
  it("同じ seed・同じ選択列なら最終状態が完全に一致する", () => {
    const a = playThrough(createGame(defaultPlanInput, 777), "standard", 1);
    const b = playThrough(createGame(defaultPlanInput, 777), "standard", 1);
    expect(a).toEqual(b);
  });

  it("seed が違えば進行が変わりうる", () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const logs = seeds.map(
      (seed) =>
        playThrough(createGame(defaultPlanInput, seed), "standard", 0).log.length,
    );
    expect(new Set(logs).size).toBeGreaterThan(1);
  });

  it("once のイベントは 1 プレイに 1 回しか出ない", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const s = playThrough(createGame(defaultPlanInput, seed), "standard", 0);
      const eventIds = s.applied
        .filter((a) => a.source.kind === "event-choice")
        .map((a) => (a.source as { eventId: string }).eventId);
      const parentCare = eventIds.filter((id) => id === "parent-care");
      expect(parentCare.length).toBeLessThanOrEqual(1);
    }
  });
});
