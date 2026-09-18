// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { PlanInput } from "@/lib/simulation/types";
import type { GameStats } from "@/lib/game/stats";
import type { SatisfactionSummary } from "@/lib/game/satisfaction";
import { GameHud } from "./GameHud";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** board #8: ゲーム終了直後に世帯メンバーの最終年齢が「—」になる不具合の回帰テスト。 */

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function mount(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return container;
}

/** board #8 のペルソナ: 田中太郎35/花子33/長男10/次男7、開始年2026。 */
function personaInput(): PlanInput {
  return {
    startYear: 2026,
    endYear: 2076,
    self: { name: "田中太郎", birthYear: 1991 } as PlanInput["self"],
    spouse: { name: "花子", birthYear: 1993 } as NonNullable<PlanInput["spouse"]>,
    children: [
      { id: "c1", name: "長男", birthYear: 2016 } as PlanInput["children"][number],
      { id: "c2", name: "次男", birthYear: 2019 } as PlanInput["children"][number],
    ],
    loans: [],
  } as unknown as PlanInput;
}

const satisfaction: SatisfactionSummary = {
  value: 40,
  level: "普通",
  lowStages: 0,
  confirmedStages: 6,
} as unknown as SatisfactionSummary;

/** ゲームを85歳まで通しプレイし終えた（stage=null, finished）状態の stats。 */
function finishedStats(): GameStats {
  return {
    finalAssets: 12_000_000,
    minAssets: -500_000,
    minAssetsAge: 37,
    minAssetsYear: 2028,
    depletionAge: null,
    assetLifeAge: 85,
    lastAge: 85,
    finalYear: 2076,
  };
}

function memberAges(el: HTMLElement, labels: string[]) {
  const rows = Array.from(
    el.querySelectorAll(".flex.items-baseline.justify-between.gap-3"),
  );
  return labels.map((label) => {
    const row = rows.find(
      (r) => r.querySelector("span.shrink-0")?.textContent === label,
    );
    return row?.querySelector("span.text-right span")?.textContent ?? null;
  });
}

describe("GameHud 世帯パネル", () => {
  it("ゲーム終了直後（stage=null）でも世帯4メンバー全員の最終年齢が数値で出る（board #8 固定）", () => {
    const el = mount(
      <GameHud
        input={personaInput()}
        stage={null}
        stageCount={5}
        stats={finishedStats()}
        satisfaction={satisfaction}
      />,
    );
    const values = memberAges(el, ["田中太郎", "花子", "長男", "次男"]);
    expect(values).toEqual(["85歳", "83歳", "60歳", "57歳"]);
    for (const v of values) {
      expect(v).not.toBe("—");
    }
  });

  it("進行中（stage あり）はステージ開始年基準の年齢を出す（リグレッションなし）", () => {
    const stage = {
      index: 0,
      label: "30代",
      startYear: 2030,
      endYear: 2039,
      midYear: 2035,
      startAge: 39,
      endAge: 48,
    };
    const el = mount(
      <GameHud
        input={personaInput()}
        stage={stage}
        stageCount={5}
        stats={{ ...finishedStats(), lastAge: 39 }}
        satisfaction={satisfaction}
      />,
    );
    const values = memberAges(el, ["田中太郎", "花子", "長男", "次男"]);
    expect(values).toEqual(["39歳", "37歳", "14歳", "11歳"]);
  });

  it("本人のみ（配偶者・子なし）でも本人の最終年齢は数値で出る", () => {
    const input = { ...personaInput(), spouse: null, children: [] };
    const el = mount(
      <GameHud
        input={input}
        stage={null}
        stageCount={5}
        stats={finishedStats()}
        satisfaction={satisfaction}
      />,
    );
    expect(memberAges(el, ["田中太郎"])).toEqual(["85歳"]);
  });
});
