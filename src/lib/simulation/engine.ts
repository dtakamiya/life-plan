/**
 * ライフプラン・シミュレーションのコアエンジン。
 *
 * runSimulation は純関数であり、入力を破壊せず副作用も持たない。
 * 開始年から終了年まで1年刻みでループし、各年の収支と純資産
 * （金融資産＋不動産の評価額−ローン残高）を計算する。
 */

import type { Person, PlanInput, YearlyResult } from "./types";
import {
  estimateIncomeTax,
  estimateResidenceTax,
  estimateRetirementIncomeTax,
  CAPITAL_GAINS_RATE,
} from "./tax";
import {
  estimateSocialInsurance,
  estimatePensionSocialInsurance,
} from "./socialInsurance";
import { loanBalanceForYear, loanPaymentForYear } from "./loan";
import { childAnnualCost } from "./education";
import { recurringExpenseForYear } from "./recurringExpense";
import { incomeAdjustmentForYear, type IncomeAdjustmentEffect } from "./incomeAdjustment";
import { childAllowanceForYear } from "./childAllowance";
import { housingLoanCreditForYear } from "./housingLoanCredit";
import { propertyValueForYear } from "./property";

/** 退職所得控除の勤続年数を見積もるための、就労開始年齢の前提。 */
const WORK_START_AGE = 22;

/** ある年における個人の収入内訳。 */
type PersonYearIncome = {
  /** 給与の税込年収（円） */
  salary: number;
  /** 年金収入（円） */
  pension: number;
  /** 所得税の概算（円） */
  incomeTax: number;
  /** 住民税の概算（円） */
  residenceTax: number;
  /** 社会保険料の概算（円） */
  socialInsurance: number;
};

const NO_ADJUSTMENT: IncomeAdjustmentEffect = { ratio: 1, nonTaxable: false };

/**
 * ある年における個人の収入・税・社保を計算する。
 * 給与は退職年齢まで、年金は受給開始年齢から発生し、両者は重複しない前提。
 */
function computePersonYearIncome(
  person: Person,
  year: number,
  startYear: number,
  adjustment: IncomeAdjustmentEffect = NO_ADJUSTMENT,
): PersonYearIncome {
  const age = year - person.birthYear;
  const yearsElapsed = year - startYear;

  const isWorking = age < person.retirementAge;
  // 育休・時短などの収入調整（#3）は給与にだけ掛ける。
  const salary = isWorking
    ? person.grossAnnualIncome *
      Math.pow(1 + person.incomeGrowthRate, yearsElapsed) *
      adjustment.ratio
    : 0;
  // 非課税の給付（育休給付金など）として扱う年は、給与分に税・社保を掛けない。
  const taxableSalary = adjustment.nonTaxable ? 0 : salary;

  // 年額は受給開始年齢によらず一定（annualPension のまま）。繰上げ/繰下げ受給
  // による減額・増額は未対応（lp-008 で対応予定）。開始年齢は発生タイミングのみを動かす。
  const isReceivingPension = age >= person.pensionStartAge;
  const pension = isReceivingPension ? person.annualPension : 0;

  // 税は給与に対してのみ概算する（年金収入は簡略化のため非課税扱い）。
  // 社保は給与分に加え、年金収入には国民健康保険料・介護保険料を概算する。
  const incomeTax = estimateIncomeTax(taxableSalary);
  const residenceTax = estimateResidenceTax(taxableSalary);
  const socialInsurance =
    estimateSocialInsurance(taxableSalary) + estimatePensionSocialInsurance(pension);

  return { salary, pension, incomeTax, residenceTax, socialInsurance };
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
  const {
    startYear,
    endYear,
    self,
    spouse,
    expenses,
    assets,
    events,
    loans,
    recurringExpenses,
    incomeAdjustments = [],
    properties = [],
  } = input;

  const {
    annualReturnRate: returnRate,
    annualDividendYield: dividendYield,
    annualTaxFreeContribution: contribution,
  } = assets;
  let prevTaxable = assets.taxableAssets;
  let prevTaxFree = assets.taxFreeAssets;

  for (let year = startYear; year <= endYear; year++) {
    const yearsElapsed = year - startYear;
    const people: Person[] = spouse ? [self, spouse] : [self];

    let grossIncome = 0;
    let pension = 0;
    let tax = 0;
    let socialInsurance = 0;
    let selfIncome: PersonYearIncome | null = null;

    for (const person of people) {
      const role = person === self ? "self" : "spouse";
      const income = computePersonYearIncome(
        person,
        year,
        startYear,
        incomeAdjustmentForYear(incomeAdjustments, role, year),
      );
      if (role === "self") selfIncome = income;
      grossIncome += income.salary + income.pension;
      pension += income.pension;
      tax += income.incomeTax + income.residenceTax;
      socialInsurance += income.socialInsurance;
    }

    // 住宅ローン控除（#4）は借入者を本人とみなし、本人の所得税・住民税から差し引く。
    const housingLoanCredit = selfIncome
      ? housingLoanCreditForYear(loans, year, selfIncome)
      : 0;
    tax -= housingLoanCredit;

    // 児童手当（#4）は非課税の収入として手取りに加える。
    const childAllowance = childAllowanceForYear(input.children, year);

    grossIncome = Math.round(grossIncome);
    pension = Math.round(pension);
    const netIncome = grossIncome - tax - socialInsurance + childAllowance;

    const livingExpense = Math.round(
      expenses.baseAnnualLivingExpense *
        Math.pow(1 + expenses.inflationRate, yearsElapsed) +
        computeChildCost(input, year),
    );

    const eventNet = events
      .filter((event) => event.year === year)
      .reduce((sum, event) => sum + event.amount, 0);

    const loanPayment = Math.round(loanPaymentForYear(loans, year));

    // 期間指定の継続支出（家賃など）。ローン返済と同じく名目固定で計上する。
    const recurringExpense = Math.round(
      recurringExpenseForYear(recurringExpenses, year),
    );

    const retirementBenefit = Math.round(
      computeRetirementBenefit(people, year),
    );

    // 資産運用: まず非課税口座へ年間積立を移す。課税口座に無いお金は移せない
    // ため、積立額は前年末の課税口座残高（マイナスなら 0）までに抑える。
    const actualContribution = Math.min(contribution, Math.max(prevTaxable, 0));
    const taxableBase = prevTaxable - actualContribution;
    const taxFreeBase = prevTaxFree + actualContribution;

    // 配当・分配金: 運用利回りとは別枠で毎年現金で受け取る。課税口座分のみ課税し、
    // 残高がマイナスの口座は保有資産なしとみなして配当を 0 とする。
    const taxableDividend = Math.max(taxableBase, 0) * dividendYield;
    const dividendTax = Math.round(taxableDividend * CAPITAL_GAINS_RATE);
    const taxFreeDividend = Math.max(taxFreeBase, 0) * dividendYield;
    const dividendIncome = Math.round(
      taxableDividend - dividendTax + taxFreeDividend,
    );

    const cashFlow =
      netIncome -
      livingExpense +
      eventNet -
      loanPayment -
      recurringExpense +
      retirementBenefit +
      dividendIncome;

    // 課税口座の運用益にのみ課税する。年間収支（配当を含む）は課税口座に入る
    // （その年は複利を効かせない、従来どおりの簡易扱い）。
    // 残高がマイナス（資金不足）の期間は運用益が生じないものとし、
    // 不足額に利回りの複利を掛けて赤字を膨らませない。
    const taxableGain = Math.max(taxableBase, 0) * returnRate;
    const investmentTax =
      taxableGain > 0 ? Math.round(taxableGain * CAPITAL_GAINS_RATE) : 0;

    const taxFreeGrown = Math.round(
      taxFreeBase + Math.max(taxFreeBase, 0) * returnRate,
    );
    const taxableGrown = Math.round(
      taxableBase + taxableGain - investmentTax + cashFlow,
    );

    // 課税口座（生活資金）が不足したら、非課税口座から取り崩して補う。
    // 非課税口座の売却益は非課税なので税は掛からず、金融資産の合計は変わらない。
    const withdrawal =
      taxableGrown < 0 ? Math.min(-taxableGrown, Math.max(taxFreeGrown, 0)) : 0;
    const taxableEnd = taxableGrown + withdrawal;
    const taxFreeEnd = taxFreeGrown - withdrawal;

    const financialAssets = taxableEnd + taxFreeEnd;
    const loanBalance = Math.round(loanBalanceForYear(loans, year));
    // 不動産の評価額（#2）は純資産にだけ加え、枯渇判定に使う金融資産には含めない。
    const propertyValue = Math.round(propertyValueForYear(properties, year));

    results.push({
      year,
      selfAge: year - self.birthYear,
      spouseAge: spouse ? year - spouse.birthYear : null,
      grossIncome,
      tax,
      socialInsurance,
      investmentTax,
      pension,
      childAllowance,
      housingLoanCredit,
      netIncome,
      livingExpense,
      eventNet,
      recurringExpense,
      loanPayment,
      retirementBenefit,
      dividendIncome,
      dividendTax,
      cashFlow,
      assets: financialAssets + propertyValue - loanBalance,
      propertyValue,
      financialAssets,
      loanBalance,
      taxableAssets: taxableEnd,
      taxFreeAssets: taxFreeEnd,
    });

    prevTaxable = taxableEnd;
    prevTaxFree = taxFreeEnd;
  }

  return results;
}
