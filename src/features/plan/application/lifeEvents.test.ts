import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { addEvent, removeEvent, updateEvent } from "./lifeEvents";

const base = (): PlanInput => structuredClone(defaultPlanInput);

describe("ライフイベントのユースケース", () => {
  it("addEvent は開始年・金額0・ラベル「イベント」の行を末尾に追加する", () => {
    const input = base();
    const before = structuredClone(input);
    const next = addEvent(input, (prefix) => `${prefix}-t1`);
    expect(next.events.at(-1)).toEqual({
      id: "event-t1",
      year: input.startYear,
      label: "イベント",
      amount: 0,
    });
    expect(input).toEqual(before);
  });

  it("updateEvent は指定した id の行だけを更新する", () => {
    const input = base();
    const next = updateEvent(input, "event-1", { amount: -1_000_000 });
    expect(next.events[0].amount).toBe(-1_000_000);
    expect(input.events[0].amount).toBe(-5_000_000);
  });

  it("removeEvent は指定した id の行を削除する", () => {
    const input = base();
    expect(removeEvent(input, "event-1").events).toEqual([]);
    expect(input.events).toHaveLength(1);
  });
});
