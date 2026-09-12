/**
 * 初期表示用のサンプル世帯と、シミュレーションで使う共通定数。
 */

import type { PlanInput } from "./types";
import { estimateAnnualPension } from "./pension";
import { DEFAULT_EDUCATION } from "./education";

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
