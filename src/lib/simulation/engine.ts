/**
 * ライフプラン・シミュレーションのコアエンジン。
 *
 * runSimulation は純関数であり、入力を破壊せず副作用も持たない。
 * 開始年から終了年まで1年刻みでループし、各年の収支と純資産を計算する。
 */

import type { Person, PlanInput, YearlyResult } from "./types";
import {
  estimateIncomeTax,
  estimateResidenceTax,
  estimateRetirementIncomeTax,
  CAPITAL_GAINS_RATE,
} from "./tax";
import { estimateSocialInsurance } from "./socialInsurance";
import { loanPaymentForYear } from "./loan";
import { childAnnualCost } from "./education";

/** 退職所得控除の勤続年数を見積もるための、就労開始年齢の前提。 */
const WORK_START_AGE = 22;

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
 * 指定年における子の養育・教育費の合計（円）。
 * 各子について基礎養育費＋進路別の教育費（childAnnualCost）を合算する。
 */
function computeChildCost(input: PlanInput, year: number): number {
  return input.children.reduce(
    (sum, child) => sum + childAnnualCost(child, year - child.birthYear),
    0,
  );
}

/**
 * 指定年に受け取る退職一時金の手取り合計（円）。
 * 退職年齢に到達した年に額面を受け取り、退職所得課税の概算を差し引く。
 */
function computeRetirementBenefit(people: Person[], year: number): number {
  return people.reduce((sum, person) => {
    const age = year - person.birthYear;
    if (age !== person.retirementAge || person.retirementBenefit <= 0) {
      return sum;
    }
    const serviceYears = person.retirementAge - WORK_START_AGE;
    const tax = estimateRetirementIncomeTax(person.retirementBenefit, serviceYears);
    return sum + person.retirementBenefit - tax;
  }, 0);
}

/**
 * ライフプランをシミュレーションし、年次結果の配列を返す。
 * @param input 計画入力（破壊しない）
 */
export function runSimulation(input: PlanInput): YearlyResult[] {
  const results: YearlyResult[] = [];
  const { startYear, endYear, self, spouse, expenses, assets, events, loans } =
    input;

  const { annualReturnRate: returnRate, annualTaxFreeContribution: contribution } =
    assets;
  let prevTaxable = assets.taxableAssets;
  let prevTaxFree = assets.taxFreeAssets;

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

    const loanPayment = Math.round(loanPaymentForYear(loans, year));

    const retirementBenefit = Math.round(
      computeRetirementBenefit(people, year),
    );

    const cashFlow =
      netIncome - livingExpense + eventNet - loanPayment + retirementBenefit;

    // 資産運用: まず非課税口座へ年間積立を移し、課税口座の運用益にのみ課税する。
    // 年間収支は課税口座に入る（その年は複利を効かせない、従来どおりの簡易扱い）。
    const taxableBase = prevTaxable - contribution;
    const taxFreeBase = prevTaxFree + contribution;
    const taxableGain = taxableBase * returnRate;
    const investmentTax =
      taxableGain > 0 ? Math.round(taxableGain * CAPITAL_GAINS_RATE) : 0;

    const taxFreeEnd = Math.round(taxFreeBase * (1 + returnRate));
    const taxableEnd = Math.round(
      taxableBase + taxableGain - investmentTax + cashFlow,
    );
    const yearEndAssets = taxableEnd + taxFreeEnd;

    results.push({
      year,
      selfAge: year - self.birthYear,
      spouseAge: spouse ? year - spouse.birthYear : null,
      grossIncome,
      tax,
      socialInsurance,
      investmentTax,
      pension,
      netIncome,
      livingExpense,
      eventNet,
      loanPayment,
      retirementBenefit,
      cashFlow,
      assets: yearEndAssets,
      taxableAssets: taxableEnd,
      taxFreeAssets: taxFreeEnd,
    });

    prevTaxable = taxableEnd;
    prevTaxFree = taxFreeEnd;
  }

  return results;
}
