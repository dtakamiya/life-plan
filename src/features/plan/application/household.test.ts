import { describe, expect, it } from "vitest";
import {
  computeHouseholdDefaults,
  DEFAULT_EDUCATION,
  defaultPlanInput,
  type PlanInput,
} from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";
import {
  addChild,
  removeChild,
  toggleSpouse,
  updateChild,
  updateSelf,
  updateSpouse,
} from "./household";

const base = (): PlanInput => structuredClone(defaultPlanInput);

/** 呼ばれた順に prefix-t1, prefix-t2 … を返す決定的な採番と、呼び出し回数。 */
function sequentialIds(): { idGen: IdGenerator; calls: () => number } {
  let n = 0;
  return { idGen: (prefix) => `${prefix}-t${++n}`, calls: () => n };
}

describe("updateSelf", () => {
  it("生年を変えると、差分だけ終了年をずらす（終了年齢を保つ）", () => {
    const input = base();
    const before = structuredClone(input);
    const next = updateSelf(input, { birthYear: input.self.birthYear - 5 });
    expect(next.self.birthYear).toBe(before.self.birthYear - 5);
    expect(next.endYear).toBe(before.endYear - 5);
    expect(input).toEqual(before);
  });

  it("生年以外の更新では終了年を動かさない", () => {
    const input = base();
    const next = updateSelf(input, { grossAnnualIncome: 6_000_000 });
    expect(next.self.grossAnnualIncome).toBe(6_000_000);
    expect(next.endYear).toBe(input.endYear);
  });
});

describe("toggleSpouse", () => {
  it("配偶者を外すと spouse が null になる", () => {
    const input = base();
    const before = structuredClone(input);
    const { idGen } = sequentialIds();
    expect(toggleSpouse(input, false, idGen).spouse).toBeNull();
    expect(input).toEqual(before);
  });

  it("配偶者がいないときに有効にすると、本人を雛形に名前「配偶者」で作る", () => {
    const { idGen } = sequentialIds();
    const single = toggleSpouse(base(), false, idGen);
    const next = toggleSpouse(single, true, idGen);
    expect(next.spouse).toEqual({ ...single.self, name: "配偶者" });
  });

  it("既に配偶者がいるときに有効にしても、同じ参照を返し id を採番しない", () => {
    const input = base();
    const { idGen, calls } = sequentialIds();
    expect(toggleSpouse(input, true, idGen)).toBe(input);
    expect(calls()).toBe(0);
  });

  it("配偶者を外すと、世帯構成の既定値（基礎生活費）に追従し id を3件（loan/event/property分）採番する", () => {
    const input = base();
    const { idGen, calls } = sequentialIds();
    const next = toggleSpouse(input, false, idGen);
    const expectedExpense = computeHouseholdDefaults(
      { hasSpouse: false, childCount: input.children.length },
      input.startYear,
    ).baseAnnualLivingExpense;
    expect(next.expenses.baseAnnualLivingExpense).toBe(expectedExpense);
    expect(calls()).toBe(3);
  });
});

describe("updateSpouse", () => {
  it("配偶者がいれば patch を反映する", () => {
    const input = base();
    const before = structuredClone(input);
    expect(updateSpouse(input, { grossAnnualIncome: 4_000_000 }).spouse?.grossAnnualIncome).toBe(4_000_000);
    expect(input).toEqual(before);
  });

  it("配偶者がいなければ同じ参照を返す", () => {
    const input: PlanInput = { ...base(), spouse: null };
    expect(updateSpouse(input, { grossAnnualIncome: 4_000_000 })).toBe(input);
  });
});

describe("addChild", () => {
  it("連番の名前・開始年生まれ・既定の進路で子を追加し、id を採番する", () => {
    const input = base();
    const before = structuredClone(input);
    const { idGen } = sequentialIds();
    const next = addChild(input, idGen);
    expect(next.children).toHaveLength(2);
    expect(next.children[1]).toEqual({
      id: "child-t1",
      name: "子2",
      birthYear: input.startYear,
      education: DEFAULT_EDUCATION,
    });
    expect(input).toEqual(before);
  });
});

describe("updateChild / removeChild", () => {
  it("指定した id の子だけを更新する", () => {
    const input = base();
    const next = updateChild(input, "child-1", { name: "太郎" });
    expect(next.children[0].name).toBe("太郎");
    expect(input.children[0].name).toBe("子1");
  });

  it("指定した id の子を削除し、引数の入力は変わらない", () => {
    const input = base();
    const before = structuredClone(input);
    const { idGen } = sequentialIds();
    const next = removeChild(input, "child-1", idGen);
    expect(next.children).toEqual([]);
    expect(input).toEqual(before);
  });
});
