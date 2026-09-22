/**
 * lp-005: 入力バリデーションを通過したときだけ `runSimulation` を呼ぶ呼び出しガード。
 * 不正入力（負値・NaN・Infinity・範囲外・開始年>終了年）はエンジンへ到達させず null を返す。
 */

import { runSimulation } from "@/lib/simulation/engine";
import type { PlanInput, YearlyResult } from "@/lib/simulation/types";
import { validatePlanInput } from "@/lib/schema";

export function runValidatedSimulation(input: PlanInput): YearlyResult[] | null {
  return validatePlanInput(input).ok ? runSimulation(input) : null;
}
