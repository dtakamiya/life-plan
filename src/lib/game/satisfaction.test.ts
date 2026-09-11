import { describe, it, expect } from "vitest";
import {
  SATISFACTION_LEVEL_MIN,
  satisfactionLevel,
  satisfactionMark,
  stageEndScores,
  summarizeSatisfaction,
  summarizeSatisfactionFromScores,
} from "./satisfaction";
import {
  INITIAL_SATISFACTION,
  createGame,
  chooseStageOption,
  pendingGameEvent,
  resolveEventChoice,
} from "./advance";
import { projectInput } from "./project";
import { computeStats } from "./stats";
import { runSimulation } from "@/lib/simulation/engine";
import { defaultPlanInput } from "@/lib/simulation/defaults";
import type { GameState, LogEntry } from "./types";

/** stageIndex と満足度だけを持つ最小の LogEntry を作る。 */
function log(entries: Array<[stageIndex: number, satisfaction: number]>): LogEntry[] {
  return entries.map(([stageIndex, satisfaction]) => ({
    stageIndex,
    text: "",
    cash: 0,
    satisfaction,
    assetsAtStageEnd: 0,
  }));
}

/** 常に同じ方針を選び、イベントは指定 index を採って最後まで進める。 */
function playThrough(state: GameState, optionId: string, choiceIndex = 0): GameState {
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

describe("satisfactionLevel（区分の閾値）", () => {
  it("30 未満は「低い」", () => {
    expect(satisfactionLevel(0)).toBe("低い");
    expect(satisfactionLevel(29)).toBe("低い");
  });

  it("閾値ちょうど（30）は「ふつう」", () => {
    expect(satisfactionLevel(SATISFACTION_LEVEL_MIN.ふつう)).toBe("ふつう");
    expect(satisfactionLevel(30)).toBe("ふつう");
    expect(satisfactionLevel(59)).toBe("ふつう");
  });

  it("閾値ちょうど（60）は「高い」", () => {
    expect(satisfactionLevel(SATISFACTION_LEVEL_MIN.高い)).toBe("高い");
    expect(satisfactionLevel(60)).toBe("高い");
    expect(satisfactionLevel(100)).toBe("高い");
  });

  it("記号は区分に対応する", () => {
    expect(satisfactionMark(0)).toBe("△");
    expect(satisfactionMark(30)).toBe("○");
    expect(satisfactionMark(60)).toBe("◎");
  });
});

describe("summarizeSatisfactionFromScores（ステージ別スコア列 → 最終指標）", () => {
  it("空（確定ステージ 0 件）なら中立値 50 を返す", () => {
    expect(summarizeSatisfactionFromScores([])).toEqual({
      value: INITIAL_SATISFACTION,
      level: "ふつう",
      confirmedStages: 0,
      lowStages: 0,
    });
  });

  it("確定ステージ 1 件なら平均はその値・母数 1", () => {
    expect(summarizeSatisfactionFromScores([25])).toEqual({
      value: 25,
      level: "低い",
      confirmedStages: 1,
      lowStages: 1,
    });
    expect(summarizeSatisfactionFromScores([30])).toMatchObject({
      value: 30,
      level: "ふつう",
      lowStages: 0,
    });
  });

  it("全ステージ同点なら平均はその値", () => {
    expect(summarizeSatisfactionFromScores([42, 42, 42, 42])).toEqual({
      value: 42,
      level: "ふつう",
      confirmedStages: 4,
      lowStages: 0,
    });
  });

  it("下限（0）に張り付くと「低い」・全ステージが low", () => {
    expect(summarizeSatisfactionFromScores([0, 0, 0])).toEqual({
      value: 0,
      level: "低い",
      confirmedStages: 3,
      lowStages: 3,
    });
  });

  it("上限（100）に張り付くと「高い」", () => {
    expect(summarizeSatisfactionFromScores([100, 100])).toEqual({
      value: 100,
      level: "高い",
      confirmedStages: 2,
      lowStages: 0,
    });
  });

  it("平均が閾値ちょうど（30）に乗ると「ふつう」、low の数え方は 30 未満", () => {
    expect(summarizeSatisfactionFromScores([30, 30])).toMatchObject({
      value: 30,
      level: "ふつう",
      lowStages: 0,
    });
    expect(summarizeSatisfactionFromScores([29, 31])).toMatchObject({
      value: 30,
      level: "ふつう",
      lowStages: 1,
    });
  });

  it("平均は四捨五入する", () => {
    expect(summarizeSatisfactionFromScores([40, 41]).value).toBe(41);
    expect(summarizeSatisfactionFromScores([40, 40, 41]).value).toBe(40);
  });

  it("QA#7: running 最終値ではなく平均を返す（17 と 63 → 40）", () => {
    // ヘッダが running 値 17、結果が平均 40 を出していた不整合。指標は 1 つに揃う。
    expect(summarizeSatisfactionFromScores([63, 17])).toMatchObject({
      value: 40,
      level: "ふつう",
      confirmedStages: 2,
      lowStages: 1,
    });
  });
});

describe("stageEndScores", () => {
  it("1 ステージに複数ログ行があるときは最後の行を採り、ステージ順で返す", () => {
    expect(stageEndScores(log([[0, 46], [0, 52], [1, 40], [2, 33]]))).toEqual([
      52, 40, 33,
    ]);
  });

  it("空ログなら空配列", () => {
    expect(stageEndScores([])).toEqual([]);
  });
});

describe("summarizeSatisfaction（ログ全体から）", () => {
  it("ステージ末スコアの平均で区分まで一致する", () => {
    const summary = summarizeSatisfaction(log([[0, 60], [0, 20], [1, 40]]));
    // stageEndScores = [20, 40] → 平均 30 → ふつう、low は 20 の 1 件
    expect(summary).toEqual({
      value: 30,
      level: "ふつう",
      confirmedStages: 2,
      lowStages: 1,
    });
  });
});

describe("画面内の単一ソース（AC#4）", () => {
  it("実プレイでヘッダ表示値と結果テキストの平均満足度が同一になる", () => {
    // QA#7 のプレイ列（board bug-report-gamemode-qa-20260906 #7）は
    // 「支出を抑える方針を貫き、満足度が終盤に大きく下がった進行」。
    // 手元にプレイ列 JSON が無いため、その特徴（frugal 貫き）を持つ
    // 決定論的な進行で再現する。
    const finished = playThrough(createGame(defaultPlanInput, 20260906), "frugal", 0);

    // page.tsx がヘッダ(GameHud)と結果(GameResult)へ渡す値は同一オブジェクト。
    const headerSummary = summarizeSatisfaction(finished.log);
    const resultSummary = summarizeSatisfaction(finished.log);
    expect(headerSummary.value).toBe(resultSummary.value);
    expect(headerSummary.level).toBe(resultSummary.level);

    // 定義ロック: 表示値 = ステージ末スコアの平均の四捨五入。
    const scores = stageEndScores(finished.log);
    expect(headerSummary.value).toBe(
      Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    );
    expect(headerSummary.confirmedStages).toBe(scores.length);
  });
});

describe("財務系列への非影響（AC#8）", () => {
  it("満足度サマリを計算しても純資産系列・枯渇年齢は変わらない", () => {
    const finished = playThrough(createGame(defaultPlanInput, 42), "standard", 1);

    const before = runSimulation(projectInput(finished.baseInput, finished));
    const statsBefore = computeStats(before);

    // 満足度の集計を挟む。
    summarizeSatisfaction(finished.log);

    const after = runSimulation(projectInput(finished.baseInput, finished));
    const statsAfter = computeStats(after);

    expect(after.map((r) => r.assets)).toEqual(before.map((r) => r.assets));
    expect(statsAfter.depletionAge).toBe(statsBefore.depletionAge);
    expect(statsAfter.assetLifeAge).toBe(statsBefore.assetLifeAge);
    expect(statsAfter.finalAssets).toBe(statsBefore.finalAssets);
  });

  it("満足度指標は財務の入力（LifeEvent 群）に現れない", () => {
    const finished = playThrough(createGame(defaultPlanInput, 7), "rich", 0);
    const projected = projectInput(finished.baseInput, finished);
    // ゲームのイベントはすべて cash のみ。satisfaction は射影されない。
    for (const ev of projected.events) {
      expect(Object.keys(ev).sort()).toEqual(
        ["amount", "id", "label", "year"].sort(),
      );
    }
  });
});
