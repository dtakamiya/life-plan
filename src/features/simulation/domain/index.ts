/** simulation/domain の公開 API。他機能・app・旧ディレクトリ・同一機能の他層からはこの index 経由で import する。 */
export { buildAssumptionRows } from "./assumptions";
export { findDepletionRemedies } from "./depletionRemedies";
export { runSimulation } from "./engine";
export { describeAssetLongevity } from "./longevitySummary";
export { findDepletion, summarizeResults } from "./summary";
export type { YearlyResult } from "./yearlyResult";
