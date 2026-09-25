/**
 * シミュレーション結果の型。
 * 金額はすべて「円」で表す。入力側の型は `@/features/plan/domain`。
 */

/** 1年分のシミュレーション結果。 */
export type YearlyResult = {
  year: number;
  selfAge: number;
  spouseAge: number | null;
  /** 給与＋年金の税込総収入（円） */
  grossIncome: number;
  /** 所得税＋住民税の概算（円） */
  tax: number;
  /** 社会保険料の概算（円） */
  socialInsurance: number;
  /** 課税口座の運用益にかかる税の概算（円） */
  investmentTax: number;
  /** 年金収入（円、grossIncome の内数） */
  pension: number;
  /** 児童手当（円、非課税。netIncome の内数） */
  childAllowance: number;
  /** 住宅ローン控除による減税額（円、tax から差し引き済み） */
  housingLoanCredit: number;
  /** 手取り収入（円） */
  netIncome: number;
  /** 生活費（インフレ調整後＋子の教育費、円） */
  livingExpense: number;
  /** その年のライフイベント合計（円） */
  eventNet: number;
  /** その年の期間指定の継続支出の合計（円、支出） */
  recurringExpense: number;
  /** その年のローン返済額の合計（円、支出） */
  loanPayment: number;
  /** その年に受け取った退職一時金（手取り、円） */
  retirementBenefit: number;
  /** その年に受け取った配当・分配金の手取り（円、課税口座分は税引後） */
  dividendIncome: number;
  /** 課税口座の配当にかかる税の概算（円） */
  dividendTax: number;
  /** 年間収支（円） */
  cashFlow: number;
  /**
   * 年末純資産（円）＝ 金融資産 ＋ 不動産の評価額 − ローン残高。
   */
  assets: number;
  /** 年末の不動産の評価額の合計（円） */
  propertyValue: number;
  /** 年末の金融資産（円、課税口座＋非課税口座の合計）。枯渇判定に使う */
  financialAssets: number;
  /** 年末のローン残高の合計（円） */
  loanBalance: number;
  /** 年末の課税口座残高（円） */
  taxableAssets: number;
  /** 年末の非課税口座残高（円） */
  taxFreeAssets: number;
};
