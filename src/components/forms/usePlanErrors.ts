import { useMemo } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { validatePlanInput, type PlanInputErrors } from "@/features/plan/application";

const NO_ERRORS: PlanInputErrors = {};

/** 現在の入力の検証エラー（フィールドパス → 日本語メッセージ）。問題なければ空。 */
export function usePlanErrors(): PlanInputErrors {
  const input = usePlanStore((s) => s.input);
  return useMemo(() => {
    const v = validatePlanInput(input);
    return v.ok ? NO_ERRORS : v.errors;
  }, [input]);
}
