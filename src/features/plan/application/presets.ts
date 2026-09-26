import {
  defaultPlanInput,
  singleRenterPlanInput,
  type PlanInput,
} from "@/features/plan/domain";

/**
 * 既定の入力を返す。defaultPlanInput は共有参照のため structuredClone して、
 * 以降の編集が既定値オブジェクトを汚染しないようにする。
 */
export function resetInput(): PlanInput {
  return structuredClone(defaultPlanInput);
}

/** 低収入ペルソナレビュー #8: 「単身・賃貸」のプリセットの入力を返す。 */
export function resetSingleInput(): PlanInput {
  return structuredClone(singleRenterPlanInput);
}

/**
 * lp-030: 「まっさらから入力」。基礎生活費・ローン・イベントを 0/空にする。
 * self / spouse / children / assets（保有資産・運用条件）には触れない
 * ——世帯構成や年収・資産条件は決まっているが、支出面はこれから
 * 自分で組み立てたいユーザー向けの開始地点。
 * 以後、生活費は 0 のためどの世帯構成の既定値とも一致せず、
 * applyHouseholdDefaults による自動追従の対象から外れる
 * （ローン・イベントも空のため同様）。
 */
export function startBlank(input: PlanInput): PlanInput {
  return {
    ...input,
    expenses: { ...input.expenses, baseAnnualLivingExpense: 0 },
    loans: [],
    events: [],
  };
}
