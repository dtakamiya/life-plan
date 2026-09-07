import { describe, it, expect } from "vitest";
import { runSimulation } from "@/lib/simulation/engine";
import type { PlanInput } from "@/lib/simulation/types";
import { normalizeNumberInput } from "./number-input";

/**
 * lp-012 / QA#1 検証観点（AC#11）。
 * 入力ハンドリングのみの変更なので、
 *  (1) 正しく入力された数値は正規化で完全に保存される（= runSimulation の系列は不変）
 *  (2) board #1 手順で作った入力は「負値 = 支出」として反映される
 * を固定する。計算エンジン・zod スキーマ本体には触れない（参照のみ）。
 */

function makeInput(eventAmount: number): PlanInput {
  return {
    startYear: 2030,
    endYear: 2033,
    self: {
      name: "本人",
      birthYear: 2000,
      grossAnnualIncome: 5_000_000,
      incomeGrowthRate: 0,
      retirementAge: 65,
      pensionStartAge: 65,
      annualPension: 1_000_000,
      retirementBenefit: 0,
    },
    spouse: null,
    children: [],
    expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0 },
    assets: {
      taxableAssets: 10_000_000,
      taxFreeAssets: 0,
      annualReturnRate: 0,
      annualTaxFreeContribution: 0,
    },
    events: [
      { id: "e1", year: 2031, label: "大型出費", amount: eventAmount },
    ],
    loans: [],
  };
}

describe("正規化は妥当な数値を完全に保存する（AC#11-1）", () => {
  it.each([0, 1, -1, 3_000_000, -3_000_000, -9_999_999, 1e12, -1e12, 1.5])(
    "String(%d) を正規化すると元の値に戻る",
    (n) => {
      expect(normalizeNumberInput(String(n), { signed: true }).value).toBe(n);
    },
  );

  it("同一 PlanInput に対する runSimulation の年次系列は決定的", () => {
    const a = runSimulation(makeInput(-3_000_000));
    const b = runSimulation(makeInput(-3_000_000));
    expect(a).toEqual(b);
  });
});

describe("board #1 手順の入力が『負値 = 支出』として反映される（AC#11-2 / AC#6）", () => {
  it("金額欄クリア → '-3000000' 入力で得た値は支出方向に効く", () => {
    // NumberField（signed）が生む値
    const amount = normalizeNumberInput("-3000000", { signed: true }).value;
    expect(amount).toBe(-3_000_000);

    const withNegative = runSimulation(makeInput(amount!));
    const withPositive = runSimulation(makeInput(3_000_000));
    const row2031Neg = withNegative.find((r) => r.year === 2031)!;
    const row2031Pos = withPositive.find((r) => r.year === 2031)!;

    // 負値イベントはその年の収支・純資産を押し下げる（収入ではなく支出）
    expect(row2031Neg.eventNet).toBe(-3_000_000);
    expect(row2031Neg.cashFlow).toBeLessThan(row2031Pos.cashFlow);
    expect(row2031Neg.assets).toBeLessThan(row2031Pos.assets);

    // 符号が食われて +3,000,000 になっていた旧バグとの差（600 万円）
    expect(row2031Pos.eventNet - row2031Neg.eventNet).toBe(6_000_000);
  });
});
