import { describe, it, expect } from "vitest";
import { deriveStages, stageOptionsFor } from "./stages";
import type { PlanInput } from "@/lib/simulation/types";

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: 2030,
    endYear: 2080,
    self: {
      name: "本人",
      birthYear: 1995, // 2030 年に 35 歳
      grossAnnualIncome: 5_000_000,
      incomeGrowthRate: 0,
      retirementAge: 65,
      pensionStartAge: 65,
      annualPension: 1_000_000,
      retirementBenefit: 0,
    },
    spouse: null,
    children: [],
    expenses: { baseAnnualLivingExpense: 3_600_000, inflationRate: 0 },
    assets: {
      taxableAssets: 5_000_000,
      taxFreeAssets: 0,
      annualReturnRate: 0,
      annualTaxFreeContribution: 0,
    },
    events: [],
    loans: [],
    ...overrides,
  };
}

describe("deriveStages", () => {
  it("既定プラン（35歳開始・50年）で 6 ステージになる", () => {
    const stages = deriveStages(makeInput());
    expect(stages).toHaveLength(6);
    expect(stages.map((s) => s.label)).toEqual([
      "35〜39歳",
      "40代",
      "50代",
      "60代",
      "70代",
      "80〜85歳",
    ]);
  });

  it("ステージは連続し、プラン期間を過不足なく覆う", () => {
    const stages = deriveStages(makeInput());
    expect(stages[0].startYear).toBe(2030);
    expect(stages[stages.length - 1].endYear).toBe(2080);
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].startYear).toBe(stages[i - 1].endYear + 1);
    }
    expect(stages.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("midYear はステージの中央年で、期間内に収まる", () => {
    for (const stage of deriveStages(makeInput())) {
      expect(stage.midYear).toBeGreaterThanOrEqual(stage.startYear);
      expect(stage.midYear).toBeLessThanOrEqual(stage.endYear);
    }
    // 2030〜2034（5年）の中央は 2032
    expect(deriveStages(makeInput())[0].midYear).toBe(2032);
  });

  it("開始年齢がちょうど 10 の倍数なら先頭が丸ごと 1 ディケード", () => {
    const stages = deriveStages(
      makeInput({ self: { ...makeInput().self, birthYear: 1990 } }), // 40 歳開始
    );
    expect(stages[0].label).toBe("40代");
    expect(stages[0].startAge).toBe(40);
    expect(stages[0].endAge).toBe(49);
  });

  it("期間が 10 年未満なら 1 ステージ", () => {
    const stages = deriveStages(makeInput({ endYear: 2033 }));
    expect(stages).toHaveLength(1);
    expect(stages[0].label).toBe("35〜38歳");
    expect(stages[0].startYear).toBe(2030);
    expect(stages[0].endYear).toBe(2033);
  });

  it("開始年と終了年が同じでも 1 ステージを返す", () => {
    const stages = deriveStages(makeInput({ endYear: 2030 }));
    expect(stages).toHaveLength(1);
    expect(stages[0].startYear).toBe(2030);
    expect(stages[0].endYear).toBe(2030);
    expect(stages[0].midYear).toBe(2030);
  });
});

describe("stageOptionsFor", () => {
  it("常に 3 択を frugal/standard/rich の順で返す", () => {
    const stage = deriveStages(makeInput())[1];
    const options = stageOptionsFor(stage);
    expect(options.map((o) => o.id)).toEqual(["frugal", "standard", "rich"]);
  });

  it("40代（10年）の cash は 0 / -60万 / -180万", () => {
    const stage = deriveStages(makeInput())[1];
    expect(stageOptionsFor(stage).map((o) => o.effect.cash)).toEqual([
      0, -600_000, -1_800_000,
    ]);
  });

  it("cash はステージの年数に比例する", () => {
    const first = deriveStages(makeInput())[0]; // 5 年
    expect(stageOptionsFor(first)[1].effect.cash).toBe(-300_000);
  });

  it("選択肢に支配関係がない（cash が高いほど満足度が低い）", () => {
    for (const stage of deriveStages(makeInput())) {
      const sorted = [...stageOptionsFor(stage)].sort(
        (a, b) => b.effect.cash - a.effect.cash,
      );
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].effect.cash).toBeLessThan(sorted[i - 1].effect.cash);
        expect(sorted[i].effect.satisfaction).toBeGreaterThan(
          sorted[i - 1].effect.satisfaction,
        );
      }
    }
  });

  it("説明文にステージ名が入る", () => {
    const stage = deriveStages(makeInput())[1];
    expect(stageOptionsFor(stage)[0].description).toContain("40代");
  });
});
