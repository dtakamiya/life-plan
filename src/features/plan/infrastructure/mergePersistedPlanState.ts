import { correctDateRange, defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { planInputSchema } from "@/features/plan/application";

/**
 * 永続化復元（persist の merge）で使う、復元後の input の断片型。
 * `rangeAutoCorrected` を含む点が PlanInput と異なる。
 */
type RestoredPersistFragment = {
  input: PlanInput;
  rangeAutoCorrected: boolean;
};

/**
 * lp-019 / QA#1: plan ストアの persist の `merge` オプション本体。
 * zustand の persist ミドルウェアは、実行環境に `localStorage` が
 * 無い場合（本プロジェクトのテストの既定 `environment: "node"` を含む）は
 * `merge` を一切呼び出さない実装のため、単体テストで直接呼び出せるよう
 * 純粋関数として切り出す（例外は投げない）。
 *
 * 永続化された入力を zod で検証し、壊れていれば既定値でフォールバックする。
 * さらに、復元した期間（startYear/endYear）が無効
 * （開始年>終了年、または期間1年未満）なら `correctDateRange` で
 * setRange と同じ補正を行い、`rangeAutoCorrected` に反映する。
 * スナップショットは scenario ストアが持つため、ここでは扱わない
 * （旧データの snapshots は migratePersistedPlanState が移す）。
 */
export function mergePersistedPlanState<T extends RestoredPersistFragment>(
  persisted: unknown,
  current: T,
): T {
  const p = persisted as { input?: unknown } | undefined;

  const parsedInput = planInputSchema.safeParse(p?.input);
  const restoredInput = parsedInput.success ? parsedInput.data : defaultPlanInput;

  const rangeCorrection = correctDateRange(
    restoredInput.startYear,
    restoredInput.endYear,
  );
  const input = rangeCorrection.corrected
    ? { ...restoredInput, endYear: rangeCorrection.endYear }
    : restoredInput;

  return {
    ...current,
    input,
    rangeAutoCorrected: rangeCorrection.corrected,
  };
}
