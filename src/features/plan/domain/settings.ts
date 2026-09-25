/** 生活費の設定。 */
export type ExpenseSettings = {
  /** 世帯の基礎生活費の年額（開始年時点、円） */
  baseAnnualLivingExpense: number;
  /** 物価上昇率（小数） */
  inflationRate: number;
};

/** 金融資産の設定。 */
export type AssetSettings = {
  /** 課税口座の初期資産（円） */
  taxableAssets: number;
  /** 非課税口座（NISA/iDeCo 等）の初期資産（円） */
  taxFreeAssets: number;
  /** 資産運用の年間利回り（小数。両口座共通） */
  annualReturnRate: number;
  /** 配当・分配金の年間利回り（小数。両口座共通、運用利回りとは別枠で毎年現金受取） */
  annualDividendYield: number;
  /** 非課税口座への年間積立額（円。課税口座から移す） */
  annualTaxFreeContribution: number;
};
