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
  /** 退職時（退職年齢到達年）に受け取る退職一時金（円） */
  retirementBenefit: number;
};

/** 学校の種別（幼稚園〜高校）。 */
export type SchoolType = "公立" | "私立";

/** 大学の進路（年額が異なる）。 */
export type UniversityType = "なし" | "国公立" | "私立文系" | "私立理系";

/** 子の進路プラン。学齢ステージごとに進路を選ぶ。 */
export type Education = {
  /** 幼稚園（3〜5歳） */
  kindergarten: SchoolType;
  /** 小学校（6〜11歳） */
  elementary: SchoolType;
  /** 中学校（12〜14歳） */
  juniorHigh: SchoolType;
  /** 高校（15〜17歳） */
  highSchool: SchoolType;
  /** 大学（18〜21歳） */
  university: UniversityType;
};

/** 子。基礎養育費と進路別の教育費の対象として扱う。 */
export type Child = {
  id: string;
  name: string;
  /** 生年（西暦） */
  birthYear: number;
  /** 進路プラン（学齢ステージ別の教育費を決める） */
  education: Education;
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

/**
 * ローン・借入。元利均等返済を前提に、返済期間中だけ年間返済額を支出計上する。
 * 借入元本の受取（物件費・頭金など）は LifeEvent 側で表現し、ここでは
 * 毎年の返済負担のみを扱う（金融純資産モデルでの二重計上を避けるため）。
 */
export type Loan = {
  id: string;
  label: string;
  /** 返済開始年（西暦） */
  startYear: number;
  /** 借入元本（円） */
  principal: number;
  /** 年利（小数） */
  annualRate: number;
  /** 返済期間（年） */
  termYears: number;
};

export type ExpenseSettings = {
  /** 世帯の基礎生活費の年額（開始年時点、円） */
  baseAnnualLivingExpense: number;
  /** 物価上昇率（小数） */
  inflationRate: number;
};

export type AssetSettings = {
  /** 課税口座の初期資産（円） */
  taxableAssets: number;
  /** 非課税口座（NISA/iDeCo 等）の初期資産（円） */
  taxFreeAssets: number;
  /** 資産運用の年間利回り（小数。両口座共通） */
  annualReturnRate: number;
  /** 非課税口座への年間積立額（円。課税口座から移す） */
  annualTaxFreeContribution: number;
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
  recurringExpenses: RecurringExpense[];
  loans: Loan[];
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
  /** 課税口座の運用益にかかる税の概算（円） */
  investmentTax: number;
  /** 年金収入（円、grossIncome の内数） */
  pension: number;
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
  /** 年間収支（円） */
  cashFlow: number;
  /** 年末純資産（円、課税口座＋非課税口座の合計） */
  assets: number;
  /** 年末の課税口座残高（円） */
  taxableAssets: number;
  /** 年末の非課税口座残高（円） */
  taxFreeAssets: number;
};
