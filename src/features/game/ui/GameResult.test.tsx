// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { GameState, GameStats, SatisfactionSummary } from "@/features/game/domain";
import { defaultPlanInput } from "@/features/plan/domain";
import { GameResult } from "./GameResult";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom は <dialog> の showModal/close を持たないため最小限の代替を積む。
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

/** board #9: 「基本計画との違い」の最終資産が実額と誤読される不具合の回帰テスト。 */

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

function gameState(): GameState {
  return {
    seed: 1,
    baseInput: {} as GameState["baseInput"],
    stages: [],
    stageIndex: 0,
    phase: "finished",
    satisfaction: 40,
    applied: [],
    log: [],
    pendingEvent: null,
  };
}

const satisfaction: SatisfactionSummary = {
  value: 40,
  level: "普通",
  lowStages: 0,
  confirmedStages: 6,
} as unknown as SatisfactionSummary;

/** board #9 の値: シナリオ最終資産 -¥73.7M、ベース比 -¥14.2M（ベース最終資産は -¥59,452,593）。 */
function stats(): GameStats {
  return {
    finalAssets: -73_700_000,
    minAssets: -80_000_000,
    minAssetsAge: 80,
    minAssetsYear: 2071,
    depletionAge: 60,
    assetLifeAge: 59,
    lastAge: 85,
    finalYear: 2076,
  };
}

function baseStats(): GameStats {
  return {
    ...stats(),
    finalAssets: -59_452_593,
    depletionAge: 62,
    assetLifeAge: 61,
  };
}

/** lp-034: ゲームの効果を持つ state（1 件は cash 効果、1 件は満足度のみ）。 */
function gameStateWithEffects(): GameState {
  return {
    ...gameState(),
    applied: [
      {
        id: "g1",
        year: defaultPlanInput.startYear + 3,
        label: "住宅の修繕",
        effect: { cash: -300_000, satisfaction: 0 },
        source: { kind: "stage-option", stageIndex: 0, optionId: "frugal" },
      },
      {
        id: "g2",
        year: defaultPlanInput.startYear + 5,
        label: "家族旅行",
        effect: { cash: 0, satisfaction: 8 },
        source: { kind: "event-choice", stageIndex: 1, eventId: "ev", choiceId: "c" },
      },
    ],
  };
}

describe("GameResult 本プランへ反映（lp-034）", () => {
  it("未反映のときは差分プレビューと反映されない項目の件数を表示する", () => {
    const el = mount(
      <GameResult
        state={gameStateWithEffects()}
        stats={stats()}
        baseStats={baseStats()}
        satisfaction={satisfaction}
        planInput={defaultPlanInput}
        onSave={() => {}}
        onRestart={() => {}}
        onApplyToPlan={() => {}}
        onUndoApply={() => {}}
      />,
    );
    const text = el.textContent ?? "";
    expect(text).toContain("本プランへ反映");
    expect(text).toContain("住宅の修繕");
    expect(text).toContain("1 件のイベントが本プランの入力に追加されます");
    expect(text).toContain("満足度のみに影響した選択（1 件）");
    expect(text).not.toContain("家族旅行");
  });

  it("反映ボタン→確認ダイアログの確定操作で onApplyToPlan が呼ばれる（確認なしには変更されない）", () => {
    let applied = false;
    const el = mount(
      <GameResult
        state={gameStateWithEffects()}
        stats={stats()}
        baseStats={baseStats()}
        satisfaction={satisfaction}
        planInput={defaultPlanInput}
        onSave={() => {}}
        onRestart={() => {}}
        onApplyToPlan={() => {
          applied = true;
        }}
        onUndoApply={() => {}}
      />,
    );
    const applyButton = Array.from(el.querySelectorAll("button")).find(
      (b) => b.textContent === "本プランへ反映する",
    )!;
    act(() => applyButton.click());
    expect(applied).toBe(false); // ダイアログを開いただけでは反映されない

    const confirmButton = Array.from(el.querySelectorAll("button")).find(
      (b) => b.textContent === "反映する",
    )!;
    act(() => confirmButton.click());
    expect(applied).toBe(true);
  });

  it("反映済み（差分が無い）ときは取り消しボタンを表示する", () => {
    const state = gameStateWithEffects();
    const reflectedInput = {
      ...defaultPlanInput,
      events: [
        ...defaultPlanInput.events,
        { id: `game-${state.seed}-g1`, year: state.applied[0].year, label: "住宅の修繕", amount: -300_000 },
      ],
    };
    const el = mount(
      <GameResult
        state={state}
        stats={stats()}
        baseStats={baseStats()}
        satisfaction={satisfaction}
        planInput={reflectedInput}
        onSave={() => {}}
        onRestart={() => {}}
        onApplyToPlan={() => {}}
        onUndoApply={() => {}}
      />,
    );
    const text = el.textContent ?? "";
    expect(text).toContain("反映済みです");
    expect(text).toContain("反映を取り消す");
  });

  it("反映対象（cash 効果）が無ければ反映できない旨を表示する", () => {
    const state = { ...gameState(), applied: [gameStateWithEffects().applied[1]] };
    const el = mount(
      <GameResult
        state={state}
        stats={stats()}
        baseStats={baseStats()}
        satisfaction={satisfaction}
        planInput={defaultPlanInput}
        onSave={() => {}}
        onRestart={() => {}}
        onApplyToPlan={() => {}}
        onUndoApply={() => {}}
      />,
    );
    expect(el.textContent ?? "").toContain("反映できるイベントはありません");
  });
});

describe("GameResult 基本計画との違い", () => {
  it("board #9: 差額とこのシナリオの実額を別物として表示する", () => {
    const el = mount(
      <GameResult
        state={gameState()}
        stats={stats()}
        baseStats={baseStats()}
        satisfaction={satisfaction}
        planInput={defaultPlanInput}
        onSave={() => {}}
        onRestart={() => {}}
        onApplyToPlan={() => {}}
        onUndoApply={() => {}}
      />,
    );
    const text = el.textContent ?? "";
    // 差額（ベース比）
    expect(text).toContain("¥-14,247,407");
    // 実額（このシナリオそのもの）
    expect(text).toContain("¥-73,700,000");
    // ラベルで「ベース比」であることが分かる
    expect(text).toContain("ベース比");
    // 向き（悪化/改善）が示される
    expect(text).toContain("悪化");
  });
});
