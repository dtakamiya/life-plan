// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { GameState } from "@/lib/game/types";
import type { GameStats } from "@/lib/game/stats";
import type { SatisfactionSummary } from "@/lib/game/satisfaction";
import { GameResult } from "./GameResult";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

describe("GameResult 基本計画との違い", () => {
  it("board #9: 差額とこのシナリオの実額を別物として表示する", () => {
    const el = mount(
      <GameResult
        state={gameState()}
        stats={stats()}
        baseStats={baseStats()}
        satisfaction={satisfaction}
        onSave={() => {}}
        onRestart={() => {}}
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
