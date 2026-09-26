/** game/domain の公開 API。他機能・app・同一機能の他層からはこの index 経由で import する。game/domain 内のファイルはこの index を import しない。 */
export {
  chooseStageOption,
  createGame,
  currentStage,
  pendingGameEvent,
  resolveEventChoice,
} from "./advance";
export { DEPLETION_DEFINITION, describeDepletion, describeDepletionDiff } from "./depletionText";
export { formatMemberAge } from "./householdAge";
export { projectInput } from "./project";
export { satisfactionMark, summarizeSatisfaction, type SatisfactionSummary } from "./satisfaction";
export { STAGE_OPTION_TABLE, stageOptionCashLabel, stageOptionsFor } from "./stages";
export { computeStats, type GameStats } from "./stats";
export type { GameState, LogEntry, Stage } from "./types";
