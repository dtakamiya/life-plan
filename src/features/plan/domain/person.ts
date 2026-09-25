/** 世帯の収入のある個人（本人・配偶者）。公的年金見込み額の推計は `pension.ts`。 */
export type Person = {
  name: string;
  /** 生年（西暦） */
  birthYear: number;
  /** 開始年時点の税込年収（円） */
  grossAnnualIncome: number;
  /** 給与の年間上昇率（小数） */
  incomeGrowthRate: number;
  /** この年齢で給与収入が止まる */
  retirementAge: number;
  /** 公的年金の受給開始年齢（既定 65） */
  pensionStartAge: number;
  /** 受給開始後の公的年金の年額（円） */
  annualPension: number;
  /** 退職時（退職年齢到達年）に受け取る退職一時金（円） */
  retirementBenefit: number;
};
