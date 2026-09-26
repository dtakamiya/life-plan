/**
 * lp-005: 入力バリデーションを通過したときだけ `runSimulation` を呼ぶ呼び出しガード。
 * 不正入力（負値・NaN・Infinity・範囲外・開始年>終了年）はエンジンへ到達させず null を返す。
 */

import { runSimulation, type YearlyResult } from "@/features/simulation/domain";
import type { PlanInput } from "@/features/plan/domain";
import { validatePlanInput } from "@/features/plan/application";

export function runValidatedSimulation(input: PlanInput): YearlyResult[] | null {
  return validatePlanInput(input).ok ? runSimulation(input) : null;
}
