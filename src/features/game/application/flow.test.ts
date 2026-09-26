import { describe, it, expect } from "vitest";
import {
  STAGE_OPTION_TABLE,
  createGame,
  currentStage,
  pendingGameEvent,
  projectInput,
  stageOptionCashLabel,
} from "@/features/game/domain";
import { createFlow, gameFlowReducer, selectableIds, type GameFlow } from "./flow";
import { runSimulation } from "@/features/simulation/domain";
import { defaultPlanInput } from "@/features/plan/domain";

const select = (f: GameFlow, id: string) =>
  gameFlowReducer(f, { type: "select", choiceId: id });
const confirm = (f: GameFlow) => gameFlowReducer(f, { type: "confirm" });

/** 現在のカードの index 番目の選択肢を選んで確定する（選択→確定の 2 段階）。 */
function pickAndConfirm(f: GameFlow, index: number): GameFlow {
  const ids = selectableIds(f.game);
  return confirm(select(f, ids[Math.min(index, ids.length - 1)]));
}

function playAll(f: GameFlow, index: number): { flow: GameFlow; confirms: number } {
  let confirms = 0;
  let guard = 0;
  while (f.game.phase !== "finished") {
    if (guard++ > 200) throw new Error("進行が終わらない");
    f = pickAndConfirm(f, index);
    confirms++;
  }
  return { flow: f, confirms };
}

describe("gameFlowReducer: 選択と確定の分離", () => {
  const start = () => createFlow(createGame(defaultPlanInput, 7));

  it("初期状態は未選択（AC12）", () => {
    expect(start().selectedId).toBeNull();
  });

  it("選択アクションでは stageIndex も phase も変わらない（AC1/5）", () => {
    const f = start();
    for (const id of selectableIds(f.game)) {
      const s = select(f, id);
      expect(s.selectedId).toBe(id);
      expect(s.game).toBe(f.game);
      expect(s.game.stageIndex).toBe(0);
    }
  });

  it("未選択で確定しても何も起きない（AC2/5）", () => {
    const f = start();
    expect(confirm(f)).toBe(f);
  });

  it("既に選択中のカードを再選択しても確定しない（AC3）", () => {
    const f = select(start(), "standard");
    const again = select(f, "standard");
    expect(again).toBe(f);
    expect(again.game.stageIndex).toBe(0);
    expect(again.game.applied).toEqual([]);
  });

  it("存在しない id は選択できない", () => {
    const f = start();
    expect(select(f, "nope")).toBe(f);
  });

  it("確定でのみ進み、確定後は未選択に戻る（AC5/6: board #4 手順）", () => {
    let f = start();
    // カードをクリック（選択）×2: 進まない
    f = select(f, "frugal");
    f = select(f, "frugal");
    expect(f.game.stageIndex).toBe(0);
    expect(f.game.log).toHaveLength(0);
    // 確定で初めて方針が反映される
    f = confirm(f);
    expect(f.game.log.length).toBeGreaterThanOrEqual(1);
    expect(f.game.applied[0].source).toMatchObject({ kind: "stage-option", optionId: "frugal" });
    expect(f.selectedId).toBeNull();
    // 直後の confirm は未選択なので no-op
    expect(confirm(f)).toBe(f);
  });

  it("イベント選択でも選択のみでは進まず、確定で +1（AC1/5）", () => {
    // イベントが出る seed を探す
    for (let seed = 1; seed < 200; seed++) {
      let f = createFlow(createGame(defaultPlanInput, seed));
      f = pickAndConfirm(f, 0);
      if (f.game.phase !== "awaiting-event-choice") continue;
      const idx = f.game.stageIndex;
      const ev = pendingGameEvent(f.game)!;
      const s = select(f, ev.choices[0].id);
      expect(s.game.stageIndex).toBe(idx);
      expect(s.game.phase).toBe("awaiting-event-choice");
      expect(confirm(select(f, "x")) ).toBe(f); // 不正 id は未選択のまま no-op
      expect(confirm(s).game.stageIndex).toBe(idx + 1);
      return;
    }
    throw new Error("選択型イベントが見つからない");
  });

  it("確定は 1 回につき stageIndex が最大 +1（オフバイワンなし）", () => {
    let f = start();
    while (f.game.phase !== "finished") {
      const before = f.game.stageIndex;
      f = pickAndConfirm(f, 1);
      // 選択型イベントで止まれば同じ index、そうでなければ +1
      expect([before, before + 1]).toContain(f.game.stageIndex);
    }
  });
});

describe("境界値（AC7）", () => {
  it("最初のステージは index 0、最終ステージ確定で finished かつ index === stages.length", () => {
    let f = createFlow(createGame(defaultPlanInput, 3));
    const total = f.game.stages.length;
    expect(currentStage(f.game)?.index).toBe(0);

    const visited: number[] = [];
    let guard = 0;
    while (f.game.phase !== "finished") {
      if (guard++ > 200) throw new Error("loop");
      const st = currentStage(f.game);
      if (f.game.phase === "awaiting-stage-option") visited.push(st!.index);
      f = pickAndConfirm(f, 0);
    }
    expect(visited).toEqual(Array.from({ length: total }, (_, i) => i));
    expect(f.game.stageIndex).toBe(total);
    expect(currentStage(f.game)).toBeNull();
    // 終了後は選択も確定も何も起こさない
    expect(select(f, "standard")).toBe(f);
    expect(confirm(f)).toBe(f);
  });

  it("1 ステージだけのプランでも 1 回の確定で終了する", () => {
    const input = { ...defaultPlanInput, endYear: defaultPlanInput.startYear + 2 };
    let f = createFlow(createGame(input, 1));
    expect(f.game.stages).toHaveLength(1);
    f = pickAndConfirm(f, 0);
    if (f.game.phase === "awaiting-event-choice") f = pickAndConfirm(f, 0);
    expect(f.game.phase).toBe("finished");
    expect(f.game.stageIndex).toBe(1);
  });
});

describe("確定結果は従来と同一（AC11）", () => {
  it.each([0, 1, 2])("選択列 %i を 2 段階操作で確定しても、旧 API 直呼びと完全一致", async (idx) => {
    const { chooseStageOption, resolveEventChoice } = await import("@/features/game/domain");
    // 旧挙動: 選択と同時に確定
    let legacy = createGame(defaultPlanInput, 42);
    while (legacy.phase !== "finished") {
      const ids = selectableIds(legacy);
      const id = ids[Math.min(idx, ids.length - 1)];
      legacy =
        legacy.phase === "awaiting-stage-option"
          ? chooseStageOption(legacy, id)
          : resolveEventChoice(legacy, id);
    }
    const { flow } = playAll(createFlow(createGame(defaultPlanInput, 42)), idx);
    expect(flow.game).toEqual(legacy);
    const a = runSimulation(projectInput(flow.game.baseInput, flow.game));
    const b = runSimulation(projectInput(legacy.baseInput, legacy));
    expect(a).toEqual(b);
  });

  it("方針の効果値（cash / satisfaction）は従来のテーブルのまま", () => {
    expect(STAGE_OPTION_TABLE.map((r) => [r.id, r.cashPerYear, r.satisfaction])).toEqual([
      ["frugal", 0, -4],
      ["standard", -60_000, 2],
      ["rich", -180_000, 8],
    ]);
  });
});

describe("stageOptionCashLabel（AC12）", () => {
  const stage = createGame(defaultPlanInput, 1).stages[0];
  const years = stage.endYear - stage.startYear + 1;

  it("質素は ¥0 でなく節約効果を表示する", () => {
    const label = stageOptionCashLabel("frugal", stage);
    expect(label).not.toContain("¥0");
    expect(label).toContain("年間6万円の節約");
    expect(label).toContain(`${6 * years}万円`);
  });

  it("標準・充実は年間の支出増を表示する", () => {
    expect(stageOptionCashLabel("standard", stage)).toContain("年間6万円の支出増");
    expect(stageOptionCashLabel("rich", stage)).toContain("年間18万円の支出増");
  });
});
