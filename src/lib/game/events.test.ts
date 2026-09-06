import { describe, it, expect } from "vitest";
import { GAME_EVENTS, eligibleEvents, pickEvent } from "./events";
import { deriveStages } from "./stages";
import { stageRng } from "./rng";
import { defaultPlanInput } from "@/lib/simulation/defaults";
import type { PlanInput } from "@/lib/simulation/types";

const base: PlanInput = defaultPlanInput;
const stages = deriveStages(base);

function ctx(stageIndex: number, used: string[] = [], input: PlanInput = base) {
  return {
    input,
    stage: deriveStages(input)[stageIndex],
    usedEventIds: new Set(used),
  };
}

describe("GAME_EVENTS の静的整合", () => {
  it("6 件以上ある", () => {
    expect(GAME_EVENTS.length).toBeGreaterThanOrEqual(6);
  });

  it("id が重複していない", () => {
    const ids = GAME_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("weight は正の数", () => {
    for (const e of GAME_EVENTS) expect(e.weight).toBeGreaterThan(0);
  });

  it("選択肢を 1 件以上持ち、選択肢 id はイベント内で一意", () => {
    for (const e of GAME_EVENTS) {
      expect(e.choices.length).toBeGreaterThanOrEqual(1);
      const ids = e.choices.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("すべての選択肢が金銭と満足度の両方を持つ", () => {
    for (const e of GAME_EVENTS) {
      for (const c of e.choices) {
        expect(c.effect.cash).not.toBe(0);
        expect(c.effect.satisfaction).not.toBe(0);
        expect(c.resultText.length).toBeGreaterThan(0);
      }
    }
  });

  it("同一イベント内の選択肢に支配関係がない", () => {
    for (const e of GAME_EVENTS) {
      const sorted = [...e.choices].sort((a, b) => b.effect.cash - a.effect.cash);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].effect.cash).toBeLessThan(sorted[i - 1].effect.cash);
        expect(sorted[i].effect.satisfaction).toBeGreaterThan(
          sorted[i - 1].effect.satisfaction,
        );
      }
    }
  });

  it("金額は仕様の最低レンジを満たす", () => {
    const byId = new Map(GAME_EVENTS.map((e) => [e.id, e]));
    const worst = (id: string) =>
      Math.min(...byId.get(id)!.choices.map((c) => c.effect.cash));
    const best = (id: string) =>
      Math.max(...byId.get(id)!.choices.map((c) => c.effect.cash));
    expect(best("appliance-breakdown")).toBeLessThanOrEqual(-50_000);
    expect(worst("appliance-breakdown")).toBeGreaterThanOrEqual(-200_000);
    expect(best("medical")).toBeLessThanOrEqual(-100_000);
    expect(worst("medical")).toBeGreaterThanOrEqual(-300_000);
    expect(best("car-replace")).toBeLessThanOrEqual(-1_500_000);
    expect(worst("car-replace")).toBeGreaterThanOrEqual(-3_500_000);
    expect(best("home-repair")).toBeLessThanOrEqual(-1_000_000);
    expect(worst("home-repair")).toBeGreaterThanOrEqual(-2_000_000);
  });
});

describe("eligibleEvents", () => {
  it("条件のないイベントは常に候補に入る", () => {
    const ids = eligibleEvents(ctx(0)).map((e) => e.id);
    expect(ids).toContain("appliance-breakdown");
  });

  it("once 済みのイベントは候補から外れる", () => {
    const before = eligibleEvents(ctx(3)).map((e) => e.id);
    expect(before).toContain("parent-care");
    const after = eligibleEvents(ctx(3, ["parent-care"])).map((e) => e.id);
    expect(after).not.toContain("parent-care");
  });

  it("minSelfAge / maxSelfAge がステージ中央年の年齢で判定される", () => {
    // parent-care は minSelfAge 50。35〜39歳のステージでは候補外。
    expect(eligibleEvents(ctx(0)).map((e) => e.id)).not.toContain("parent-care");
    expect(eligibleEvents(ctx(3)).map((e) => e.id)).toContain("parent-care");
  });

  it("requiresSpouse は配偶者がいないと候補外", () => {
    const noSpouse = { ...base, spouse: null };
    expect(eligibleEvents(ctx(1, [], noSpouse)).map((e) => e.id)).not.toContain(
      "family-trip",
    );
    expect(eligibleEvents(ctx(1)).map((e) => e.id)).toContain("family-trip");
  });

  it("requiresActiveLoan は返済中のローンがないと候補外", () => {
    const noLoan = { ...base, loans: [] };
    expect(eligibleEvents(ctx(1, [], noLoan)).map((e) => e.id)).not.toContain(
      "home-repair",
    );
    expect(eligibleEvents(ctx(1)).map((e) => e.id)).toContain("home-repair");
  });

  it("requiresChildAged は該当年齢の子がいないと候補外", () => {
    const noChild = { ...base, children: [] };
    expect(eligibleEvents(ctx(1, [], noChild)).map((e) => e.id)).not.toContain(
      "child-lesson",
    );
  });
});

describe("pickEvent", () => {
  it("eventRate が 0 なら常に null", () => {
    for (let i = 0; i < stages.length; i++) {
      expect(pickEvent(ctx(i), stageRng(7, i), 0)).toBeNull();
    }
  });

  it("eventRate が 1 なら候補があるかぎり必ず 1 件返す", () => {
    for (let i = 0; i < stages.length; i++) {
      const picked = pickEvent(ctx(i), stageRng(7, i), 1);
      expect(picked).not.toBeNull();
      expect(eligibleEvents(ctx(i)).map((e) => e.id)).toContain(picked!.id);
    }
  });

  it("同じ seed・同じ文脈なら同じイベントを返す（決定論）", () => {
    const a = pickEvent(ctx(2), stageRng(99, 2), 0.6);
    const b = pickEvent(ctx(2), stageRng(99, 2), 0.6);
    expect(a?.id ?? null).toBe(b?.id ?? null);
  });

  it("固定 seed での抽選列がゴールデンから変わらない", () => {
    const ids = stages.map((_, i) => pickEvent(ctx(i), stageRng(2026, i), 0.6)?.id ?? null);
    expect(ids).toMatchInlineSnapshot(`
      [
        null,
        "appliance-breakdown",
        "medical",
        "family-trip",
        "car-replace",
        "family-trip",
      ]
    `);
  });
});
