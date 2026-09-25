/**
 * 初期表示用のサンプル世帯と、シミュレーションで使う共通定数。
 */

import type { PlanInput } from "./types";
import { estimateAnnualPension } from "./pension";
import { DEFAULT_EDUCATION } from "./education";
import { DEFAULT_END_AGE, endAgeToEndYear } from "./endAge";

/** 現在の西暦年（クライアント・サーバーで安定させるため初期化時に固定）。 */
const CURRENT_YEAR = new Date().getFullYear();

/** 初期表示に使うサンプル世帯の本人の生年（30代を想定）。 */
const DEFAULT_SELF_BIRTH_YEAR = CURRENT_YEAR - 35;

/**
 * 初期表示に使うサンプル世帯。
 * 30代の共働き夫婦＋子1人を想定した、もっともらしい初期値。
 *
 * lp-031: 終了年は「年齢一律で+50年」のような期間固定ではなく、本人が
 * DEFAULT_END_AGE 歳になる年で決める（年齢によって試算範囲が不自然に
 * 短く/長くなるのを避けるため）。
 */
export const defaultPlanInput: PlanInput = {
  startYear: CURRENT_YEAR,
  endYear: endAgeToEndYear(DEFAULT_SELF_BIRTH_YEAR, DEFAULT_END_AGE),
  self: {
    name: "本人",
    birthYear: DEFAULT_SELF_BIRTH_YEAR,
    grossAnnualIncome: 5_000_000,
    incomeGrowthRate: 0.01,
    retirementAge: 65,
    pensionStartAge: 65,
    annualPension: estimateAnnualPension(5_000_000),
    retirementBenefit: 20_000_000,
  },
  spouse: {
    name: "配偶者",
    birthYear: CURRENT_YEAR - 33,
    grossAnnualIncome: 3_000_000,
    incomeGrowthRate: 0.01,
    retirementAge: 65,
    pensionStartAge: 65,
    annualPension: estimateAnnualPension(3_000_000),
    retirementBenefit: 10_000_000,
  },
  children: [
    {
      id: "child-1",
      // lp-021: 追加される子が「子2」から始まるよう、既定の子も連番に揃える。
      name: "子1",
      birthYear: CURRENT_YEAR - 3,
      education: DEFAULT_EDUCATION,
    },
  ],
  expenses: {
    baseAnnualLivingExpense: 3_600_000,
    inflationRate: 0.01,
  },
  assets: {
    taxableAssets: 5_000_000,
    taxFreeAssets: 0,
    annualReturnRate: 0.03,
    annualDividendYield: 0,
    annualTaxFreeContribution: 480_000,
  },
  events: [
    {
      id: "event-1",
      year: CURRENT_YEAR + 5,
      label: "住宅購入（頭金）",
      amount: -5_000_000,
    },
  ],
  recurringExpenses: [],
  loans: [
    {
      id: "loan-1",
      label: "住宅ローン",
      startYear: CURRENT_YEAR + 5,
      principal: 30_000_000,
      annualRate: 0.01,
      termYears: 35,
    },
  ],
};

/**
 * 低収入ペルソナレビュー #8: 「単身・賃貸」のプリセット。
 * 既定のサンプル世帯（夫婦＋子＋住宅購入）から配偶者・子・住宅ローン・
 * 住宅購入イベントを外した開始地点。年収・生活費は単身世帯の目安に下げる。
 */
export const singleRenterPlanInput: PlanInput = {
  ...defaultPlanInput,
  self: {
    ...defaultPlanInput.self,
    grossAnnualIncome: 3_500_000,
    annualPension: estimateAnnualPension(3_500_000),
    retirementBenefit: 5_000_000,
  },
  spouse: null,
  children: [],
  expenses: { ...defaultPlanInput.expenses, baseAnnualLivingExpense: 2_000_000 },
  assets: { ...defaultPlanInput.assets, taxableAssets: 1_000_000, annualTaxFreeContribution: 0 },
  events: [],
  loans: [],
};
