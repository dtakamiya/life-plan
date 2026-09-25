/**
 * 期間付きの収入調整（育休・時短勤務など。子育て共働きペルソナレビュー #3）。
 * 開始年から終了年まで（両端を含む）、対象者の給与に ratio を掛ける。
 */
export type IncomeAdjustment = {
  id: string;
  /** 対象者 */
  person: "self" | "spouse";
  label: string;
  /** 開始年（西暦） */
  startYear: number;
  /** 終了年（西暦、この年も調整する） */
  endYear: number;
  /** 給与に掛ける割合（小数。例: 時短 0.8） */
  ratio: number;
  /**
   * 調整後の収入を非課税の給付として扱うか（育休給付金など）。
   * true の年は、その人の給与に所得税・住民税・社会保険料を掛けない。
   */
  nonTaxable: boolean;
};
