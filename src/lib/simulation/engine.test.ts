import { describe, it, expect } from "vitest";
import { runSimulation } from "./engine";
import type { Child, PlanInput, Person, RecurringExpense } from "./types";
import {
  estimateIncomeTax,
  estimateResidenceTax,
  estimateRetirementIncomeTax,
  CAPITAL_GAINS_RATE,
} from "./tax";
import { estimateSocialInsurance } from "./socialInsurance";
import { childAnnualCost, DEFAULT_EDUCATION } from "./education";

const basePerson: Person = {
  name: "本人",
  birthYear: 2000,
  grossAnnualIncome: 5_000_000,
  incomeGrowthRate: 0,
  retirementAge: 65,
  pensionStartAge: 65,
  annualPension: 1_000_000,
  retirementBenefit: 0,
};

/** 課税なし・積立なしの資産設定（テスト用ヘルパー）。 */
function assets(taxableAssets: number, annualReturnRate: number) {
  return {
    taxableAssets,
    taxFreeAssets: 0,
    annualReturnRate,
    annualTaxFreeContribution: 0,
  };
}

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: 2030,
    endYear: 2032,
    self: basePerson,
    spouse: null,
    children: [],
    expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0 },
    assets: assets(1_000_000, 0),
    events: [],
    recurringExpenses: [],
    loans: [],
    ...overrides,
  };
}

describe("runSimulation", () => {
  it("produces one result per year in the inclusive range", () => {
    const results = runSimulation(makeInput());
    expect(results.map((r) => r.year)).toEqual([2030, 2031, 2032]);
    expect(results[0].selfAge).toBe(30);
  });

  it("computes cashFlow and taxes investment gains in the taxable bucket", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2030,
      assets: assets(1_000_000, 0.05),
    });
    const [year] = runSimulation(input);

    const expectedTax =
      estimateIncomeTax(5_000_000) + estimateResidenceTax(5_000_000);
    const expectedSocial = estimateSocialInsurance(5_000_000);
    const expectedNet = 5_000_000 - expectedTax - expectedSocial;
    const expectedCashFlow = expectedNet - 3_000_000;

    const gain = 1_000_000 * 0.05;
    const investmentTax = Math.round(gain * CAPITAL_GAINS_RATE);

    expect(year.grossIncome).toBe(5_000_000);
    expect(year.tax).toBe(expectedTax);
    expect(year.socialInsurance).toBe(expectedSocial);
    expect(year.netIncome).toBe(expectedNet);
    expect(year.cashFlow).toBe(expectedCashFlow);
    expect(year.investmentTax).toBe(investmentTax);
    expect(year.assets).toBe(
      Math.round(1_000_000 + gain - investmentTax + expectedCashFlow),
    );
  });

  it("chains assets across years", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2032,
      assets: assets(1_000_000, 0.1),
    });
    const results = runSimulation(input);
    for (let i = 1; i < results.length; i++) {
      // 非課税口座0なので純資産＝課税口座残高。運用益には約20%課税。
      const prev = results[i - 1].assets;
      const gain = prev * 0.1;
      const investmentTax = gain > 0 ? Math.round(gain * CAPITAL_GAINS_RATE) : 0;
      expect(results[i].assets).toBe(
        Math.round(prev + gain - investmentTax + results[i].cashFlow),
      );
    }
  });

  it("does not tax growth in the tax-free (NISA) bucket", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2030,
      self: { ...basePerson, grossAnnualIncome: 0 },
      expenses: { baseAnnualLivingExpense: 0, inflationRate: 0 },
      assets: {
        taxableAssets: 0,
        taxFreeAssets: 1_000_000,
        annualReturnRate: 0.05,
        annualTaxFreeContribution: 0,
      },
    });
    const [year] = runSimulation(input);
    expect(year.investmentTax).toBe(0);
    expect(year.taxFreeAssets).toBe(1_050_000);
    expect(year.assets).toBe(1_050_000);
  });

  it("moves the annual contribution from the taxable to the tax-free bucket", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2030,
      self: { ...basePerson, grossAnnualIncome: 0 },
      expenses: { baseAnnualLivingExpense: 0, inflationRate: 0 },
      assets: {
        taxableAssets: 1_000_000,
        taxFreeAssets: 0,
        annualReturnRate: 0,
        annualTaxFreeContribution: 300_000,
      },
    });
    const [year] = runSimulation(input);
    expect(year.taxableAssets).toBe(700_000);
    expect(year.taxFreeAssets).toBe(300_000);
    expect(year.assets).toBe(1_000_000);
  });

  it("pays a net retirement benefit in the retirement year only", () => {
    const person: Person = {
      ...basePerson,
      birthYear: 1965, // 2030年に65歳（退職年齢）
      grossAnnualIncome: 0,
      pensionStartAge: 100, // 年金の影響を除外
      annualPension: 0,
      retirementBenefit: 40_000_000,
    };
    const input = makeInput({
      startYear: 2030,
      endYear: 2031,
      self: person,
      expenses: { baseAnnualLivingExpense: 0, inflationRate: 0 },
      assets: assets(0, 0),
    });
    const [atRetirement, after] = runSimulation(input);
    const expectedNet =
      40_000_000 - estimateRetirementIncomeTax(40_000_000, 65 - 22);

    expect(expectedNet).toBeLessThan(40_000_000); // 課税されている
    expect(atRetirement.retirementBenefit).toBe(expectedNet);
    expect(atRetirement.assets).toBe(expectedNet);
    expect(after.retirementBenefit).toBe(0);
  });

  it("stops salary at retirement age and adds pension after pension start", () => {
    // 退職年齢 = 年金開始年齢 = 65。64歳までは給与、65歳から年金。
    const person: Person = {
      ...basePerson,
      birthYear: 1966, // 2030年に64歳
    };
    const input = makeInput({
      startYear: 2030,
      endYear: 2031,
      self: person,
    });
    const [working, retired] = runSimulation(input);

    expect(working.selfAge).toBe(64);
    expect(working.grossIncome).toBe(5_000_000);
    expect(working.pension).toBe(0);

    expect(retired.selfAge).toBe(65);
    expect(retired.grossIncome).toBe(1_000_000);
    expect(retired.pension).toBe(1_000_000);
    expect(retired.tax).toBe(0); // 給与0なので給与課税は0
    expect(retired.socialInsurance).toBe(0);
  });

  it("charges zero tax and social insurance when there is no income", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2030,
      self: { ...basePerson, grossAnnualIncome: 0 },
    });
    const [year] = runSimulation(input);
    expect(year.grossIncome).toBe(0);
    expect(year.tax).toBe(0);
    expect(year.socialInsurance).toBe(0);
  });

  it("applies inflation to living expenses and adds child costs", () => {
    const child: Child = {
      id: "c1",
      name: "子",
      birthYear: 2025,
      education: DEFAULT_EDUCATION,
    };
    const input = makeInput({
      startYear: 2030,
      endYear: 2031,
      expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0.02 },
      children: [child],
    });
    const [first, second] = runSimulation(input);
    // 子 (5歳/6歳): 基礎養育費＋進路別の教育費を childAnnualCost で算出
    expect(first.livingExpense).toBe(3_000_000 + childAnnualCost(child, 5));
    expect(second.livingExpense).toBe(
      Math.round(3_000_000 * 1.02) + childAnnualCost(child, 6),
    );
  });

  it("charges more for a private education path than public", () => {
    // 2030年に15歳（高校）。全公立 vs 全私立で生活費に差が出る。
    const publicChild: Child = {
      id: "c1",
      name: "子",
      birthYear: 2015,
      education: DEFAULT_EDUCATION,
    };
    const privateChild: Child = {
      ...publicChild,
      education: {
        kindergarten: "私立",
        elementary: "私立",
        juniorHigh: "私立",
        highSchool: "私立",
        university: "私立理系",
      },
    };
    const base = { startYear: 2030, endYear: 2030, expenses: { baseAnnualLivingExpense: 0, inflationRate: 0 } };
    const [pub] = runSimulation(makeInput({ ...base, children: [publicChild] }));
    const [priv] = runSimulation(makeInput({ ...base, children: [privateChild] }));
    expect(priv.livingExpense).toBeGreaterThan(pub.livingExpense);
  });

  it("stops base child cost after the dependent age", () => {
    // 2030年に23歳の子は養育費・教育費とも0。
    const child: Child = {
      id: "c1",
      name: "子",
      birthYear: 2007,
      education: DEFAULT_EDUCATION,
    };
    const input = makeInput({
      startYear: 2030,
      endYear: 2030,
      expenses: { baseAnnualLivingExpense: 1_000_000, inflationRate: 0 },
      children: [child],
    });
    const [year] = runSimulation(input);
    expect(year.livingExpense).toBe(1_000_000);
  });

  it("applies one-time life events in their year only", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2032,
      events: [{ id: "e1", year: 2031, label: "臨時支出", amount: -1_000_000 }],
    });
    const results = runSimulation(input);
    expect(results[0].eventNet).toBe(0);
    expect(results[1].eventNet).toBe(-1_000_000);
    expect(results[2].eventNet).toBe(0);
  });

  it("subtracts loan payments only during the repayment term", () => {
    // 利率0・元本300万・3年返済 → 年100万を3年間だけ返済。
    const input = makeInput({
      startYear: 2030,
      endYear: 2033,
      loans: [
        {
          id: "l1",
          label: "ローン",
          startYear: 2031,
          principal: 3_000_000,
          annualRate: 0,
          termYears: 3,
        },
      ],
    });
    const results = runSimulation(input);
    expect(results.map((r) => r.loanPayment)).toEqual([
      0, 1_000_000, 1_000_000, 1_000_000,
    ]);
  });

  it("includes interest in the level annual loan payment", () => {
    // 元利均等: 返済額 = P*r / (1 - (1+r)^-n)。総返済額は元本を上回る。
    const input = makeInput({
      startYear: 2030,
      endYear: 2030,
      loans: [
        {
          id: "l1",
          label: "ローン",
          startYear: 2030,
          principal: 10_000_000,
          annualRate: 0.02,
          termYears: 10,
        },
      ],
    });
    const [year] = runSimulation(input);
    const expected = Math.round(
      (10_000_000 * 0.02) / (1 - Math.pow(1.02, -10)),
    );
    expect(year.loanPayment).toBe(expected);
    expect(year.loanPayment).toBeGreaterThan(1_000_000); // 元本/期間 を上回る
  });

  it("includes spouse income when present", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2030,
      spouse: { ...basePerson, name: "配偶者", grossAnnualIncome: 3_000_000 },
    });
    const [year] = runSimulation(input);
    expect(year.grossIncome).toBe(8_000_000);
    expect(year.spouseAge).toBe(30);
  });

  it("does not mutate the input", () => {
    const input = makeInput();
    const snapshot = JSON.parse(JSON.stringify(input));
    runSimulation(input);
    expect(input).toEqual(snapshot);
  });

  it("継続支出は期間中の年だけ収支から引かれ、recurringExpense に出る", () => {
    const rent: RecurringExpense = {
      id: "rec-1",
      label: "賃貸家賃",
      startYear: 2031,
      endYear: 2032,
      annualAmount: 1_200_000,
    };
    const withRent = runSimulation(
      makeInput({ startYear: 2030, endYear: 2033, recurringExpenses: [rent] }),
    );
    const withoutRent = runSimulation(
      makeInput({ startYear: 2030, endYear: 2033, recurringExpenses: [] }),
    );

    expect(withRent.map((r) => r.recurringExpense)).toEqual([
      0, 1_200_000, 1_200_000, 0,
    ]);
    // 期間中の年だけ収支が年額分だけ小さくなる
    expect(withRent[0].cashFlow).toBe(withoutRent[0].cashFlow);
    expect(withRent[1].cashFlow).toBe(withoutRent[1].cashFlow - 1_200_000);
    expect(withRent[2].cashFlow).toBe(withoutRent[2].cashFlow - 1_200_000);
    expect(withRent[3].cashFlow).toBe(withoutRent[3].cashFlow);
  });

  it("継続支出は生活費と別枠で計上する（livingExpense を変えない）", () => {
    const rent: RecurringExpense = {
      id: "rec-1",
      label: "賃貸家賃",
      startYear: 2030,
      endYear: 2030,
      annualAmount: 1_200_000,
    };
    const withRent = runSimulation(
      makeInput({ startYear: 2030, endYear: 2030, recurringExpenses: [rent] }),
    );
    const withoutRent = runSimulation(
      makeInput({ startYear: 2030, endYear: 2030, recurringExpenses: [] }),
    );
    expect(withRent[0].livingExpense).toBe(withoutRent[0].livingExpense);
    expect(withRent[0].recurringExpense).toBe(1_200_000);
  });

  it("継続支出は物価上昇率の影響を受けない（名目固定）", () => {
    const rent: RecurringExpense = {
      id: "rec-1",
      label: "賃貸家賃",
      startYear: 2030,
      endYear: 2032,
      annualAmount: 1_000_000,
    };
    const results = runSimulation(
      makeInput({
        startYear: 2030,
        endYear: 2032,
        expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0.1 },
        recurringExpenses: [rent],
      }),
    );
    expect(results.map((r) => r.recurringExpense)).toEqual([
      1_000_000, 1_000_000, 1_000_000,
    ]);
  });
});
