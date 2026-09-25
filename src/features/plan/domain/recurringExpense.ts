/**
 * 期間指定の継続支出（例: 住宅購入までの賃貸家賃）。
 * 開始年から終了年まで（両端を含む）、毎年 annualAmount を支出計上する。
 * ローン返済と同じく名目固定で扱い、物価上昇率による調整はしない。
 */
export type RecurringExpense = {
  id: string;
  label: string;
  /** 計上開始年（西暦） */
  startYear: number;
  /** 計上終了年（西暦、この年も計上する） */
  endYear: number;
  /** 年額（円、正の値が支出） */
  annualAmount: number;
};
