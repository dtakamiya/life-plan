import { describe, it, expect } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import type { Snapshot } from "@/features/scenario/domain";
import { loadSnapshot, removeSnapshot, saveSnapshot } from "./snapshots";

const idGen = (prefix: string) => `${prefix}-t1`;
const base = (): PlanInput => structuredClone(defaultPlanInput);

/** ゲーム由来（game- で始まる id）と本体のイベントが混ざった入力。 */
const gameInput = (): PlanInput => ({
  ...base(),
  events: [
    { id: "event-1", year: 2031, label: "住宅購入（頭金）", amount: -5_000_000 },
    { id: "game-ev-1", year: 2035, label: "臨時収入", amount: 300_000 },
    { id: "game-ev-2", year: 2040, label: "（ゲーム）医療費", amount: -200_000 },
  ],
});

const GAME_LABELS = ["住宅購入（頭金）", "（ゲーム）臨時収入", "（ゲーム）医療費"];

describe("saveSnapshot", () => {
  it("入力を複製したスナップショットを末尾に追加する", () => {
    const input = base();
    const existing: Snapshot[] = [
      { id: "snap-0", name: "既存", input: base(), origin: "manual" },
    ];
    const next = saveSnapshot(existing, "案A", input, "game", idGen);
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ id: "snap-t1", name: "案A", input, origin: "game" });
    // 保存後に元の入力を編集しても、保存済みのスナップショットに波及しない
    expect(next[1].input).not.toBe(input);
  });

  it("元の一覧を書き換えない", () => {
    const existing: Snapshot[] = [];
    saveSnapshot(existing, "案A", base(), "manual", idGen);
    expect(existing).toEqual([]);
  });
});

describe("removeSnapshot", () => {
  it("指定した id のスナップショットだけを取り除き、元の一覧は書き換えない", () => {
    const snaps: Snapshot[] = [
      { id: "snap-1", name: "A", input: base(), origin: "manual" },
      { id: "snap-2", name: "B", input: base(), origin: "manual" },
    ];
    expect(removeSnapshot(snaps, "snap-1").map((s) => s.id)).toEqual(["snap-2"]);
    expect(snaps).toHaveLength(2);
  });
});

describe("loadSnapshot", () => {
  it("手動保存のスナップショットは入力をそのまま複製して返す（ラベルを変えない）", () => {
    const snap: Snapshot = { id: "snap-1", name: "A", input: gameInput(), origin: "manual" };
    const loaded = loadSnapshot([snap], "snap-1");
    expect(loaded).toEqual(snap.input);
    expect(loaded).not.toBe(snap.input);
  });

  it("ゲーム由来は game- で始まる id のイベントにだけ「（ゲーム）」を前置する", () => {
    const snap: Snapshot = { id: "snap-1", name: "G", input: gameInput(), origin: "game" };
    expect(loadSnapshot([snap], "snap-1")?.events.map((e) => e.label)).toEqual(GAME_LABELS);
    // 保存済みのスナップショット自体は書き換えない
    expect(snap.input.events[1].label).toBe("臨時収入");
  });

  it("前置は冪等（読み込んだ入力を保存し直して再度読み込んでも二重にならない）", () => {
    const first = loadSnapshot(
      [{ id: "snap-1", name: "G", input: gameInput(), origin: "game" }],
      "snap-1",
    );
    expect(first).not.toBeNull();
    const again = loadSnapshot(
      [{ id: "snap-2", name: "G2", input: first as PlanInput, origin: "game" }],
      "snap-2",
    );
    expect(again?.events.map((e) => e.label)).toEqual(GAME_LABELS);
  });

  it("該当する id が無ければ null を返す", () => {
    expect(loadSnapshot([], "snap-x")).toBeNull();
  });
});
