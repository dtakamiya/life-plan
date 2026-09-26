/** scenario/domain の公開 API。他機能・app・同一機能の他層からはこの index 経由で import する。scenario/domain 内のファイルはこの index を import しない。 */
export { buildComparisonDiff, type ComparisonInput, type DiffDirection } from "./comparisonDiff";
export type { Snapshot, SnapshotOrigin } from "./snapshot";
