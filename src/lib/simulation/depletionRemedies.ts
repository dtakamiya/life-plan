/**
 * 資産が尽きる計画に対し、「何をどれだけ変えれば尽きなくなるか」を逆算する
 * （低収入ペルソナレビュー #12）。
 *
 * エンジン（runSimulation）を入力だけ変えて繰り返し実行し、二分探索で
 * 最小の変更量を求める。計算式そのものは持たない。
 */

import { runSimulation } from "./engine";
import { findDepletion } from "./summary";
import type { PlanInput } from "@/features/plan/domain";

/** 逆算した改善案（該当する手段がない項目は null）。 */
export type DepletionRemedies = {
  /** 生活費をこの月額（円、1,000円単位に切り上げ）減らせば尽きない */
  monthlyExpenseCut: number | null;
  /** 本人がこの年齢まで働けば尽きない（現在の退職年齢より後） */
  retirementAge: number | null;
  /** ローンの借入額（全ローン合計、10万円単位に切り上げ）をこれだけ減らせば尽きない */
  loanPrincipalCut: number | null;
  /** 初めて資産が尽きる年の本人年齢（案内文の出し分けに使う） */
  depletedSelfAge: number;
};

/** 退職年齢の探索上限。 */
const MAX_RETIREMENT_AGE = 75;

/** 借入額の探索単位（円）。 */
const LOAN_CUT_STEP = 100_000;

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
 * 全ローンの借入元本を合計で cut 円減らした入力。
 * 複数ローンは元本の比率で按分して縮める（0円未満にはしない）。
 */
function withLoanCut(input: PlanInput, cut: number): PlanInput {
  const total = input.loans.reduce((sum, l) => sum + l.principal, 0);
  const ratio = total > 0 ? Math.max(0, 1 - cut / total) : 1;
  return {
    ...input,
    loans: input.loans.map((l) => ({ ...l, principal: l.principal * ratio })),
  };
}

function findLoanPrincipalCut(input: PlanInput): number | null {
  const total = input.loans.reduce((sum, l) => sum + l.principal, 0);
  if (total <= 0 || !isSustainable(withLoanCut(input, total))) return null;
  // 10万円単位で二分探索する。
  let lo = 0;
  let hi = Math.ceil(total / LOAN_CUT_STEP);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (isSustainable(withLoanCut(input, mid * LOAN_CUT_STEP))) hi = mid;
    else lo = mid + 1;
  }
  return lo * LOAN_CUT_STEP;
}

/**
 * 資産が尽きる計画なら改善案を返し、尽きない計画なら null を返す。
 */
export function findDepletionRemedies(input: PlanInput): DepletionRemedies | null {
  const depleted = findDepletion(runSimulation(input));
  if (!depleted) return null;
  return {
    monthlyExpenseCut: findMonthlyExpenseCut(input),
    retirementAge: findRetirementAge(input),
    loanPrincipalCut: findLoanPrincipalCut(input),
    depletedSelfAge: depleted.selfAge,
  };
}
