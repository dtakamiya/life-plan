/**
 * ライフプラン・シミュレーションのコアエンジン。
 *
 * runSimulation は純関数であり、入力を破壊せず副作用も持たない。
 * 開始年から終了年まで1年刻みでループし、各年の収支と純資産を計算する。
 */

import type { Person, PlanInput, YearlyResult } from "./types";
import { estimateIncomeTax, estimateResidenceTax } from "./tax";
import { estimateSocialInsurance } from "./socialInsurance";
import { CHILD_DEPENDENT_MAX_AGE, CHILD_ANNUAL_COST } from "./defaults";

/** ある年における個人の収入内訳。 */
type PersonYearIncome = {
  /** 給与の税込年収（円） */
  salary: number;
  /** 年金収入（円） */
  pension: number;
  /** 所得税＋住民税の概算（円） */
  tax: number;
  /** 社会保険料の概算（円） */
  socialInsurance: number;
};

/**
 * ある年における個人の収入・税・社保を計算する。
 * 給与は退職年齢まで、年金は受給開始年齢から発生し、両者は重複しない前提。
 */
function computePersonYearIncome(
  person: Person,
  year: number,
  startYear: number,
): PersonYearIncome {
  const age = year - person.birthYear;
  const yearsElapsed = year - startYear;

  const isWorking = age < person.retirementAge;
  const salary = isWorking
    ? person.grossAnnualIncome *
      Math.pow(1 + person.incomeGrowthRate, yearsElapsed)
    : 0;

  const isReceivingPension = age >= person.pensionStartAge;
  const pension = isReceivingPension ? person.annualPension : 0;

  // 税・社保は給与に対してのみ概算する（年金収入は簡略化のため非課税扱い）。
  const tax = estimateIncomeTax(salary) + estimateResidenceTax(salary);
  const socialInsurance = estimateSocialInsurance(salary);

  return { salary, pension, tax, socialInsurance };
}

/**
 * 指定年における子の教育・養育費の合計（円）。
 * 扶養対象年齢（0〜CHILD_DEPENDENT_MAX_AGE）の子の人数 × 年額。
 */
function computeChildCost(input: PlanInput, year: number): number {
  const dependents = input.children.filter((child) => {
    const age = year - child.birthYear;
    return age >= 0 && age <= CHILD_DEPENDENT_MAX_AGE;
  });
  return dependents.length * CHILD_ANNUAL_COST;
}

/**
 * ライフプランをシミュレーションし、年次結果の配列を返す。
 * @param input 計画入力（破壊しない）
 */
export function runSimulation(input: PlanInput): YearlyResult[] {
  const results: YearlyResult[] = [];
  const { startYear, endYear, self, spouse, expenses, assets, events } = input;

  let prevAssets = assets.initialAssets;

  for (let year = startYear; year <= endYear; year++) {
    const yearsElapsed = year - startYear;
    const people: Person[] = spouse ? [self, spouse] : [self];

    let grossIncome = 0;
    let pension = 0;
    let tax = 0;
    let socialInsurance = 0;

    for (const person of people) {
      const income = computePersonYearIncome(person, year, startYear);
      grossIncome += income.salary + income.pension;
      pension += income.pension;
      tax += income.tax;
      socialInsurance += income.socialInsurance;
    }

    grossIncome = Math.round(grossIncome);
    pension = Math.round(pension);
    const netIncome = grossIncome - tax - socialInsurance;

    const livingExpense = Math.round(
      expenses.baseAnnualLivingExpense *
        Math.pow(1 + expenses.inflationRate, yearsElapsed) +
        computeChildCost(input, year),
    );

    const eventNet = events
      .filter((event) => event.year === year)
      .reduce((sum, event) => sum + event.amount, 0);

    const cashFlow = netIncome - livingExpense + eventNet;
    const yearEndAssets = Math.round(
      prevAssets * (1 + assets.annualReturnRate) + cashFlow,
    );

    results.push({
      year,
      selfAge: year - self.birthYear,
      spouseAge: spouse ? year - spouse.birthYear : null,
      grossIncome,
      tax,
      socialInsurance,
      pension,
      netIncome,
      livingExpense,
      eventNet,
      cashFlow,
      assets: yearEndAssets,
    });

    prevAssets = yearEndAssets;
  }

  return results;
}
