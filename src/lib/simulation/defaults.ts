/**
 * 初期表示用のサンプル世帯と、シミュレーションで使う共通定数。
 */

import type { PlanInput } from "./types";
import { estimateAnnualPension } from "./pension";

/** 子を扶養（教育費の対象）とみなす上限年齢 */
export const CHILD_DEPENDENT_MAX_AGE = 22;

/** 扶養対象の子1人あたりの年間費用の概算（円） */
export const CHILD_ANNUAL_COST = 1_200_000;

/** 現在の西暦年（クライアント・サーバーで安定させるため初期化時に固定）。 */
const CURRENT_YEAR = new Date().getFullYear();

/** シミュレーションの既定期間（年） */
const DEFAULT_SPAN_YEARS = 50;

/**
 * 初期表示に使うサンプル世帯。
 * 30代の共働き夫婦＋子1人を想定した、もっともらしい初期値。
 */
export const defaultPlanInput: PlanInput = {
  startYear: CURRENT_YEAR,
  endYear: CURRENT_YEAR + DEFAULT_SPAN_YEARS,
  self: {
    name: "本人",
    birthYear: CURRENT_YEAR - 35,
    grossAnnualIncome: 5_000_000,
    incomeGrowthRate: 0.01,
    retirementAge: 65,
    pensionStartAge: 65,
    annualPension: estimateAnnualPension(5_000_000),
  },
  spouse: {
    name: "配偶者",
    birthYear: CURRENT_YEAR - 33,
    grossAnnualIncome: 3_000_000,
    incomeGrowthRate: 0.01,
    retirementAge: 65,
    pensionStartAge: 65,
    annualPension: estimateAnnualPension(3_000_000),
  },
  children: [
    {
      id: "child-1",
      name: "子",
      birthYear: CURRENT_YEAR - 3,
    },
  ],
  expenses: {
    baseAnnualLivingExpense: 3_600_000,
    inflationRate: 0.01,
  },
  assets: {
    initialAssets: 5_000_000,
    annualReturnRate: 0.03,
  },
  events: [
    {
      id: "event-1",
      year: CURRENT_YEAR + 5,
      label: "住宅購入（頭金）",
      amount: -5_000_000,
    },
  ],
};
