import type { PlanInput } from "@/features/plan/domain";

export function updateExpenses(
  input: PlanInput,
  patch: Partial<PlanInput["expenses"]>,
): PlanInput {
  return { ...input, expenses: { ...input.expenses, ...patch } };
}

export function updateAssets(input: PlanInput, patch: Partial<PlanInput["assets"]>): PlanInput {
  return { ...input, assets: { ...input.assets, ...patch } };
}
