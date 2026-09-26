import { describe, it, expect, beforeEach } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { parsePlanFile, serializePlan } from "@/features/plan/infrastructure";
import { usePlanStore } from "@/features/plan/ui";
import { useScenarioStore } from "./useScenarioStore";

beforeEach(() => {
  useScenarioStore.getState().reset();
});

describe("useScenarioStore.saveSnapshot", () => {
  it("input を省略すると plan の現在の入力を複製して manual で保存する", () => {
    usePlanStore.getState().updateSelf({ name: "保存時点" });
    useScenarioStore.getState().saveSnapshot("案A");

    const [snap] = useScenarioStore.getState().snapshots;
    expect(snap).toMatchObject({ name: "案A", origin: "manual" });
    expect(snap.id).toMatch(/^snap-/);
    expect(snap.input).toEqual(usePlanStore.getState().input);

    usePlanStore.getState().updateSelf({ name: "保存後に変更" });
    expect(useScenarioStore.getState().snapshots[0].input.self.name).toBe("保存時点");
  });

  it("input と origin を渡すと、その内容で保存する（ゲームモードの保存）", () => {
    const projected: PlanInput = { ...structuredClone(defaultPlanInput), startYear: 2030 };
    useScenarioStore.getState().saveSnapshot("ゲームの結果", projected, "game");
    const [snap] = useScenarioStore.getState().snapshots;
    expect(snap).toMatchObject({ name: "ゲームの結果", origin: "game", input: projected });
    expect(usePlanStore.getState().input.startYear).not.toBe(2030);
  });
});

describe("useScenarioStore.removeSnapshot", () => {
  it("指定した id のスナップショットだけを削除する", () => {
    const store = useScenarioStore.getState();
    store.saveSnapshot("a");
    store.saveSnapshot("b");
    const [a, b] = useScenarioStore.getState().snapshots;
    useScenarioStore.getState().removeSnapshot(a.id);
    expect(useScenarioStore.getState().snapshots).toEqual([b]);
  });
});

describe("useScenarioStore.loadSnapshot", () => {
  it("スナップショットの入力を plan の replaceInput で読み込み、期間補正の表示を戻す", () => {
    usePlanStore.getState().updateSelf({ name: "保存したプラン" });
    useScenarioStore.getState().saveSnapshot("案A");
    usePlanStore.getState().updateSelf({ name: "編集中" });
    // 開始年 > 終了年で自動補正させ、補正の注意が出ている状態にする
    usePlanStore.getState().setRange(2050, 2040);
    expect(usePlanStore.getState().rangeAutoCorrected).toBe(true);

    const [snap] = useScenarioStore.getState().snapshots;
    useScenarioStore.getState().loadSnapshot(snap.id);

    expect(usePlanStore.getState().input).toEqual(snap.input);
    expect(usePlanStore.getState().input.self.name).toBe("保存したプラン");
    expect(usePlanStore.getState().rangeAutoCorrected).toBe(false);
  });

  it("存在しない id では plan の入力を変えない", () => {
    const before = usePlanStore.getState().input;
    useScenarioStore.getState().loadSnapshot("snap-missing");
    expect(usePlanStore.getState().input).toBe(before);
  });
});

describe("useScenarioStore.reset（全消去）", () => {
  it("plan の入力を既定値へ戻し、保存済み比較プランも空にする", () => {
    usePlanStore.getState().addLoan();
    usePlanStore.getState().addEvent();
    useScenarioStore.getState().saveSnapshot("プランA");
    useScenarioStore.getState().saveSnapshot("プランB");
    expect(useScenarioStore.getState().snapshots).toHaveLength(2);

    useScenarioStore.getState().reset();

    expect(usePlanStore.getState().input).toEqual(defaultPlanInput);
    expect(useScenarioStore.getState().snapshots).toEqual([]);
  });

  it("保存済み比較プランが0件でもエラーなくリセットできる", () => {
    expect(useScenarioStore.getState().snapshots).toEqual([]);
    expect(() => useScenarioStore.getState().reset()).not.toThrow();
    expect(useScenarioStore.getState().snapshots).toEqual([]);
  });

  it("保存済み比較プランが複数件でもエラーなく全消去できる", () => {
    const store = useScenarioStore.getState();
    store.saveSnapshot("a");
    store.saveSnapshot("b");
    store.saveSnapshot("c");
    expect(useScenarioStore.getState().snapshots.length).toBe(3);

    expect(() => useScenarioStore.getState().reset()).not.toThrow();
    expect(useScenarioStore.getState().snapshots).toEqual([]);
  });
});

describe("plan の入力だけを置き換える操作はスナップショットを保持する", () => {
  it("成功時は replaceInput で置換され、snapshots は保持される", () => {
    useScenarioStore.getState().saveSnapshot("keep");
    const src: PlanInput = { ...structuredClone(defaultPlanInput), startYear: 2030 };
    const r = parsePlanFile(serializePlan(src));
    if (r.ok) usePlanStore.getState().replaceInput(r.input);
    expect(usePlanStore.getState().input).toEqual(src);
    expect(useScenarioStore.getState().snapshots).toHaveLength(1);
  });

  it("単身・賃貸で始める（resetSingle）・まっさらから入力（startBlank）では消えない", () => {
    useScenarioStore.getState().saveSnapshot("keep");
    usePlanStore.getState().resetSingle();
    usePlanStore.getState().startBlank();
    expect(useScenarioStore.getState().snapshots).toHaveLength(1);
  });
});
