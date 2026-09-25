/**
 * 資産が尽きる計画に対し、「何をどれだけ変えれば尽きなくなるか」を逆算する
 * （低収入ペルソナレビュー #12）。
 *
 * エンジン（runSimulation）を入力だけ変えて繰り返し実行し、二分探索で
 * 最小の変更量を求める。計算式そのものは持たない。
 */

import { runSimulation } from "./engine";
import { findDepletion } from "./summary";
import type { PlanInput } from "./types";

/** 逆算した改善案（該当する手段がない項目は null）。 */
export type DepletionRemedies = {
  /** 生活費をこの月額（円、1,000円単位に切り上げ）減らせば尽きない */
  monthlyExpenseCut: number | null;
  /** 本人がこの年齢まで働けば尽きない（現在の退職年齢より後） */
  retirementAge: number | null;
};

/** 退職年齢の探索上限。 */
const MAX_RETIREMENT_AGE = 75;

function isSustainable(input: PlanInput): boolean {
  return findDepletion(runSimulation(input)) === null;
}

/** 生活費の年額を delta 減らした入力（0円未満にはしない）。 */
function withExpenseCut(input: PlanInput, annualCut: number): PlanInput {
  return {
    ...input,
    expenses: {
      ...input.expenses,
      baseAnnualLivingExpense: Math.max(
        0,
        input.expenses.baseAnnualLivingExpense - annualCut,
      ),
    },
  };
}

function findMonthlyExpenseCut(input: PlanInput): number | null {
  const base = input.expenses.baseAnnualLivingExpense;
  if (base <= 0 || !isSustainable(withExpenseCut(input, base))) return null;
  // 1,000円/月単位で二分探索する。
  let lo = 0;
  let hi = Math.ceil(base / 12 / 1000);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (isSustainable(withExpenseCut(input, mid * 1000 * 12))) hi = mid;
    else lo = mid + 1;
  }
  return lo * 1000;
}

function findRetirementAge(input: PlanInput): number | null {
  const current = input.self.retirementAge;
  for (let age = current + 1; age <= MAX_RETIREMENT_AGE; age++) {
    const next = { ...input, self: { ...input.self, retirementAge: age } };
    if (isSustainable(next)) return age;
  }
  return null;
}

/**
 * 資産が尽きる計画なら改善案を返し、尽きない計画なら null を返す。
 */
export function findDepletionRemedies(input: PlanInput): DepletionRemedies | null {
  if (isSustainable(input)) return null;
  return {
    monthlyExpenseCut: findMonthlyExpenseCut(input),
    retirementAge: findRetirementAge(input),
  };
}
