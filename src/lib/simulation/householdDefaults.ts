/**
 * 世帯構成（配偶者の有無・子の人数）に連動する既定値（基礎生活費・
 * 住宅ローン・住宅購入イベント）を導く純関数（lp-030）。
 *
 * ここでは runSimulation が使う計算式・定数は一切参照・変更しない。
 * 入力フォームの「初期値」を世帯構成から機械的に決めるためだけに使う。
 *
 * 既定値表（根拠）:
 *
 * | 世帯構成               | 基礎生活費（年額） | 住宅ローン・購入イベント |
 * |------------------------|--------------------|--------------------------|
 * | 単身・子なし            | 240万円             | なし                     |
 * | 夫婦・子なし            | 300万円             | なし                     |
 * | 子1人につき（加算）      | +60万円             | -                        |
 * | 子が1人以上いる世帯      | 上記の合計          | あり（頭金500万円・借入3,000万円・金利1%・35年、開始5年後に購入） |
 *
 * 例: 夫婦＋子1人 = 300万円 + 60万円 = 360万円
 *   （従来の defaultPlanInput.expenses.baseAnnualLivingExpense と同値）。
 *
 * 住宅ローン・購入イベントは「子が生まれるタイミングで住宅を取得する」という
 * 簡易な前提に基づき、子が1人もいない世帯（単身・夫婦を問わず）には既定で
 * 付与しない（lp-030 AC3: 単身・子なしでローン/イベントの既定値を残さない）。
 * 子の人数そのものはローン・イベントの金額に影響しない（「いるかどうか」だけを見る）。
 */

import type { LifeEvent, Loan, Property } from "./types";
import { DEFAULT_PROPERTY_DEPRECIATION_RATE } from "./property";

/** 既定の住宅購入イベントのラベル。ローンの返済開始年との連動判定にも使う。 */
export const HOUSING_PURCHASE_EVENT_LABEL = "住宅購入（頭金）";

/** 既定の自宅（不動産）のラベル。ローンの返済開始年との連動判定にも使う。 */
export const HOME_PROPERTY_LABEL = "自宅";

/** 既定値の算出に使う定数一式。 */
export const HOUSEHOLD_DEFAULT_CONSTANTS = {
  /** 単身・子なし世帯の基礎生活費（年額、円） */
  singleBaseLivingExpense: 2_400_000,
  /** 夫婦・子なし世帯の基礎生活費（年額、円） */
  coupleBaseLivingExpense: 3_000_000,
  /** 住宅購入イベントの頭金（円、支出のためマイナスで計上） */
  housingDownPayment: 5_000_000,
  /** 住宅ローンの借入元本（円） */
  housingLoanPrincipal: 30_000_000,
  /** 住宅ローンの年利（小数） */
  housingLoanAnnualRate: 0.01,
  /** 住宅ローンの返済期間（年） */
  housingLoanTermYears: 35,
  /** シミュレーション開始年から住宅購入までの年数 */
  housingPurchaseYearsAfterStart: 5,
} as const;

/** 既定値の分岐に使う世帯構成（配偶者の有無・子の人数）。 */
export type HouseholdComposition = {
  hasSpouse: boolean;
  childCount: number;
};

/** id を持たない既定ローンの中身（id はストア側で採番する）。 */
export type HouseholdDefaultLoan = Omit<Loan, "id">;
/** id を持たない既定イベントの中身（id はストア側で採番する）。 */
export type HouseholdDefaultEvent = Omit<LifeEvent, "id">;
/** id を持たない既定の不動産の中身（id はストア側で採番する）。 */
export type HouseholdDefaultProperty = Omit<Property, "id">;

export type HouseholdDefaults = {
  baseAnnualLivingExpense: number;
  /** 子が1人もいない世帯では null（既定で住宅ローンを付与しない）。 */
  loan: HouseholdDefaultLoan | null;
  /** 子が1人もいない世帯では null（既定で住宅購入イベントを付与しない）。 */
  event: HouseholdDefaultEvent | null;
  /** 子が1人もいない世帯では null（既定で自宅を付与しない）。 */
  property: HouseholdDefaultProperty | null;
};

/**
 * 世帯構成から既定の基礎生活費・住宅ローン・住宅購入イベントを導く。
 * @param composition 配偶者の有無・子の人数
 * @param startYear シミュレーション開始年（住宅購入年の算定に使用）
 */
export function computeHouseholdDefaults(
  composition: HouseholdComposition,
  startYear: number,
): HouseholdDefaults {
  const { hasSpouse, childCount } = composition;
  const c = HOUSEHOLD_DEFAULT_CONSTANTS;

  // 子の基礎養育費・教育費は education.ts（childAnnualCost）が子の年齢に応じて
  // 計上するため、基礎生活費には子の人数を加算しない（二重計上の防止）。
  const baseAnnualLivingExpense = hasSpouse
    ? c.coupleBaseLivingExpense
    : c.singleBaseLivingExpense;

  if (childCount <= 0) {
    return { baseAnnualLivingExpense, loan: null, event: null, property: null };
  }

  const purchaseYear = startYear + c.housingPurchaseYearsAfterStart;

  return {
    baseAnnualLivingExpense,
    loan: {
      label: "住宅ローン",
      startYear: purchaseYear,
      principal: c.housingLoanPrincipal,
      annualRate: c.housingLoanAnnualRate,
      termYears: c.housingLoanTermYears,
      // 子育て共働きペルソナレビュー #4: 既定の住宅ローンは住宅ローン控除の対象とする
      taxCredit: true,
    },
    event: {
      year: purchaseYear,
      label: HOUSING_PURCHASE_EVENT_LABEL,
      amount: -c.housingDownPayment,
    },
    // 子育て共働きペルソナレビュー #2: 購入価格は頭金＋借入額とし、純資産に計上する
    property: {
      label: HOME_PROPERTY_LABEL,
      purchaseYear,
      price: c.housingDownPayment + c.housingLoanPrincipal,
      annualDepreciationRate: DEFAULT_PROPERTY_DEPRECIATION_RATE,
    },
  };
}
