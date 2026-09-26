import { snapshotSchema } from "@/features/scenario/application";
import type { Snapshot } from "@/features/scenario/domain";

/**
 * scenario ストアの persist の `merge` オプション本体。
 * zustand の persist ミドルウェアは、実行環境に `localStorage` が無い場合
 * （本プロジェクトのテストの既定 `environment: "node"` を含む）は `merge` を
 * 一切呼び出さない実装のため、単体テストで直接呼び出せるよう純粋関数として
 * 切り出す（例外は投げない）。
 *
 * 永続化されたスナップショットを zod で 1 件ずつ検証し、壊れた要素は除外する。
 * 保存データが無い・snapshots が配列でない場合は空配列にする。
 */
export function mergePersistedScenarioState<T extends { snapshots: Snapshot[] }>(
  persisted: unknown,
  current: T,
): T {
  const p = persisted as { snapshots?: unknown } | undefined;

  const snapshots: Snapshot[] = Array.isArray(p?.snapshots)
    ? p.snapshots.flatMap((raw) => {
        const parsed = snapshotSchema.safeParse(raw);
        return parsed.success ? [parsed.data] : [];
      })
    : [];

  return { ...current, snapshots };
}
