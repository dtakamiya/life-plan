/**
 * ライフプラン・シミュレーションのドメイン型。
 * 金額はすべて「円」、率は小数（例: 1% = 0.01）で表す。
 */

/** 世帯の収入のある個人（本人・配偶者）。 */
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
};

/** 子。生活費（教育費）の対象としてのみ扱う。 */
export type Child = {
  id: string;
  name: string;
  /** 生年（西暦） */
  birthYear: number;
};

/** 単発のライフイベント。amount は +収入 / -支出。 */
export type LifeEvent = {
  id: string;
  /** 発生年（西暦） */
  year: number;
  label: string;
  /** 金額（円）。プラスは臨時収入、マイナスは臨時支出 */
  amount: number;
};

export type ExpenseSettings = {
  /** 世帯の基礎生活費の年額（開始年時点、円） */
  baseAnnualLivingExpense: number;
  /** 物価上昇率（小数） */
  inflationRate: number;
};

export type AssetSettings = {
  /** 初期資産（円） */
  initialAssets: number;
  /** 資産運用の年間利回り（小数） */
  annualReturnRate: number;
};

export type PlanInput = {
  startYear: number;
  endYear: number;
  self: Person;
  spouse: Person | null;
  children: Child[];
  expenses: ExpenseSettings;
  assets: AssetSettings;
  events: LifeEvent[];
};

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
  /** 年金収入（円、grossIncome の内数） */
  pension: number;
  /** 手取り収入（円） */
  netIncome: number;
  /** 生活費（インフレ調整後＋子の教育費、円） */
  livingExpense: number;
  /** その年のライフイベント合計（円） */
  eventNet: number;
  /** 年間収支（円） */
  cashFlow: number;
  /** 年末純資産（円） */
  assets: number;
};
