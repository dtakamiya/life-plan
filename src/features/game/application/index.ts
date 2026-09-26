/** game/application の公開 API。他機能・app・同一機能の他層からはこの index 経由で import する。game/application 内のファイルはこの index を import しない。 */
export { createFlow, gameFlowReducer, type GameFlow } from "./flow";
