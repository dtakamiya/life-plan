/**
 * scenario ストアの persist キーとバージョン。plan は scenario のコードを import せず、
 * 旧データの移行先としてこの 2 つだけを知る。scenario ストアもこの定数を使い、
 * 移行先と読込先の食い違いを防ぐ。
 */
export const SCENARIOS_STORAGE_KEY = "life-plan/scenarios/v1";
export const SCENARIOS_STORAGE_VERSION = 1;

/** migrate が移行先キーの読み書きに使うストレージ（localStorage の必要部分）。 */
type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * plan ストアの persist の `migrate` オプション本体（version 1 → 2）。
 * version 1 では比較用スナップショットを plan のキー（life-plan/v1）に同居させていた。
 *
 * snapshots 配列があり、かつ移行先キーがまだ無いときに限り、生の配列を
 * scenario ストアの persist 形式で移行先キーへ書き出す（要素の検証は scenario
 * ストアの merge が行う）。移行先キーが既にあれば上書きしない（冪等）。
 * いずれの場合も snapshots を取り除いた状態を返し、input の検証は
 * mergePersistedPlanState に任せる。壊れた旧データはそのまま返す。例外は投げない。
 * テストではインメモリのストレージを渡して直接呼び出す。
 */
export function migratePersistedPlanState(persisted: unknown, storage: KeyValueStorage): unknown {
  if (typeof persisted !== "object" || persisted === null) return persisted;
  const { snapshots, ...rest } = persisted as Record<string, unknown>;
  if (Array.isArray(snapshots) && storage.getItem(SCENARIOS_STORAGE_KEY) === null) {
    storage.setItem(
      SCENARIOS_STORAGE_KEY,
      JSON.stringify({ state: { snapshots }, version: SCENARIOS_STORAGE_VERSION }),
    );
  }
  return rest;
}
