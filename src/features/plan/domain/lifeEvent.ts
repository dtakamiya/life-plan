/** 単発のライフイベント。amount は +収入 / -支出。 */
export type LifeEvent = {
  id: string;
  /** 発生年（西暦） */
  year: number;
  label: string;
  /** 金額（円）。プラスは臨時収入、マイナスは臨時支出 */
  amount: number;
};
