/**
 * 新しい要素（子・ローン・イベント等）の id を採番する関数の型。
 * 戻り値は `${prefix}-…` の形にする（ゲームモードは `game-` で始まる id で
 * ゲーム由来のイベントを見分けるため）。実装は plan/infrastructure の makeId。
 * テストでは決定的な実装を渡す。
 */
export type IdGenerator = (prefix: string) => string;
