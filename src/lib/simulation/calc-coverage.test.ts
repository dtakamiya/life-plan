/**
 * 計算エンジンのテスト網羅強化（lp-001）。
 *
 * 目的:
 *  - 保存則（期首資産 + 収入 − 支出 + 運用損益 = 期末資産）の検証
 *  - loan / education / pension の既知ケースを手計算値で固定
 *  - シミュレーション開始年・終了年・退職年・ローン完済年の境界値でオフバイワンがないこと
 *
 * 方針: 既存の計算式・定数は一切変更しない。テスト追加のみ。
 * 手計算値はコメントに式と代入値を残す。
 */

import { describe, it, expect } from "vitest";
import { runSimulation } from "./engine";
import type { Child, Loan, PlanInput, Person } from "./types";
import {
  estimateIncomeTax,
  estimateResidenceTax,
  estimateRetirementIncomeTax,
  CAPITAL_GAINS_RATE,
} from "./tax";
import { estimateSocialInsurance } from "./socialInsurance";
import { annualLoanPayment, loanPaymentForYear } from "./loan";
import {
  childAnnualCost,
  educationCostAtAge,
  BASE_CHILD_ANNUAL_COST,
  DEFAULT_EDUCATION,
} from "./education";
import { estimateAnnualPension, BASIC_PENSION_ANNUAL } from "./pension";

// ---------------------------------------------------------------------------
// 共通ヘルパー（engine.test.ts と同じ前提の縮小版）
// ---------------------------------------------------------------------------

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

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: 2030,
    endYear: 2032,
    self: basePerson,
    spouse: null,
    children: [],
    expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0 },
    assets: {
      taxableAssets: 1_000_000,
      taxFreeAssets: 0,
      annualReturnRate: 0,
      annualTaxFreeContribution: 0,
    },
    events: [],
    loans: [],
    ...overrides,
  };
}

/**
 * 保存則の検証: 各年について
 *   期首資産(前年末) + cashFlow + 運用損益(税引後) = 期末資産
 * が円未満の丸め分（±1円）を除いて成り立つことを確認する。
 *
 * engine.ts の資産更新をそのまま辿った期待値:
 *   taxableBase  = prevTaxable - contribution
 *   taxFreeBase  = prevTaxFree + contribution
 *   taxableGain  = taxableBase * returnRate
 *   investmentTax = taxableGain > 0 ? round(taxableGain * RATE) : 0
 *   taxFreeGain  = taxFreeBase * returnRate
 *   期末 = round(taxFreeBase*(1+returnRate)) + round(taxableBase + taxableGain - investmentTax + cashFlow)
 *
 * ここでの「運用損益(税引後)」= taxableGain + taxFreeGain - investmentTax。
 * contribution は課税→非課税の内部移動なので純資産合計には効かない。
 */
function assertConservation(input: PlanInput) {
  const results = runSimulation(input);
  const { annualReturnRate: returnRate, annualTaxFreeContribution: contribution } =
    input.assets;

  let prevTaxable = input.assets.taxableAssets;
  let prevTaxFree = input.assets.taxFreeAssets;

  for (const r of results) {
    const openingAssets = prevTaxable + prevTaxFree;

    const taxableBase = prevTaxable - contribution;
    const taxFreeBase = prevTaxFree + contribution;
    const taxableGain = taxableBase * returnRate;
    const taxFreeGain = taxFreeBase * returnRate;
    const investmentTax =
      taxableGain > 0 ? Math.round(taxableGain * CAPITAL_GAINS_RATE) : 0;

    const netInvestmentReturn = taxableGain + taxFreeGain - investmentTax;

    // 期首 + 収支 + 運用損益(税引後) = 期末 （丸め分だけズレる）
    const reconstructed = openingAssets + r.cashFlow + netInvestmentReturn;
    expect(Math.abs(r.assets - reconstructed)).toBeLessThanOrEqual(1);

    // 純資産系列が発散・NaN しないこと
    expect(Number.isFinite(r.assets)).toBe(true);
    expect(Number.isNaN(r.assets)).toBe(false);
    expect(Number.isFinite(r.taxableAssets)).toBe(true);
    expect(Number.isFinite(r.taxFreeAssets)).toBe(true);
    // 口座内訳の合計が年末純資産に一致
    expect(r.taxableAssets + r.taxFreeAssets).toBe(r.assets);

    prevTaxable = r.taxableAssets;
    prevTaxFree = r.taxFreeAssets;
  }

  return results;
}

// ===========================================================================
// AC1 / AC8: 保存則を全シナリオで検証
// ===========================================================================

describe("AC1/AC8: 資産保存則（期首 + 収入 − 支出 + 運用損益 = 期末）", () => {
  it("AC1: デフォルト入力相当（給与・生活費・運用益・非課税積立あり）で保存則が成り立つ", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2050,
      expenses: { baseAnnualLivingExpense: 3_600_000, inflationRate: 0.01 },
      assets: {
        taxableAssets: 5_000_000,
        taxFreeAssets: 0,
        annualReturnRate: 0.03,
        annualTaxFreeContribution: 480_000,
      },
    });
    const results = assertConservation(input);
    expect(results).toHaveLength(21); // 2030..2050 inclusive
  });

  it("AC8: 退職あり（退職一時金 + 年金 + 給与停止）で保存則が成り立ち発散しない", () => {
    const self: Person = {
      ...basePerson,
      birthYear: 1970, // 2030年に60歳、2035年に退職年齢65
      retirementAge: 65,
      pensionStartAge: 65,
      annualPension: 1_500_000,
      retirementBenefit: 20_000_000,
    };
    const input = makeInput({
      startYear: 2030,
      endYear: 2045,
      self,
      expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0.01 },
      assets: {
        taxableAssets: 8_000_000,
        taxFreeAssets: 2_000_000,
        annualReturnRate: 0.03,
        annualTaxFreeContribution: 200_000,
      },
    });
    const results = assertConservation(input);
    // 退職一時金は退職年（2035, age 65）だけに計上される（AC5と重複確認）
    const retYear = results.find((r) => r.year === 2035)!;
    expect(retYear.retirementBenefit).toBeGreaterThan(0);
    for (const r of results.filter((x) => x.year !== 2035)) {
      expect(r.retirementBenefit).toBe(0);
    }
  });

  it("AC8: ローンあり（返済期間中の支出）で保存則が成り立つ", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2045,
      assets: {
        taxableAssets: 10_000_000,
        taxFreeAssets: 0,
        annualReturnRate: 0.02,
        annualTaxFreeContribution: 0,
      },
      loans: [
        {
          id: "l1",
          label: "住宅ローン",
          startYear: 2032,
          principal: 30_000_000,
          annualRate: 0.01,
          termYears: 10,
        },
      ],
    });
    assertConservation(input);
  });

  it("AC8: 子あり（教育費が生活費に加算）で保存則が成り立つ", () => {
    const child: Child = {
      id: "c1",
      name: "子",
      birthYear: 2026,
      education: DEFAULT_EDUCATION,
    };
    const input = makeInput({
      startYear: 2030,
      endYear: 2050,
      expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0.01 },
      assets: {
        taxableAssets: 6_000_000,
        taxFreeAssets: 0,
        annualReturnRate: 0.03,
        annualTaxFreeContribution: 300_000,
      },
      children: [child],
    });
    assertConservation(input);
  });

  it("AC8: 退職 + ローン + 子 + 配偶者の複合シナリオで保存則が成り立ち発散・NaN しない", () => {
    const self: Person = {
      ...basePerson,
      birthYear: 1985, // 2030年に45歳
      grossAnnualIncome: 6_000_000,
      incomeGrowthRate: 0.01,
      retirementAge: 65, // 2050年
      pensionStartAge: 65,
      annualPension: estimateAnnualPension(6_000_000),
      retirementBenefit: 15_000_000,
    };
    const spouse: Person = {
      ...basePerson,
      name: "配偶者",
      birthYear: 1987,
      grossAnnualIncome: 3_500_000,
      incomeGrowthRate: 0.01,
      retirementAge: 65,
      pensionStartAge: 65,
      annualPension: estimateAnnualPension(3_500_000),
      retirementBenefit: 8_000_000,
    };
    const children: Child[] = [
      { id: "c1", name: "第一子", birthYear: 2022, education: DEFAULT_EDUCATION },
      {
        id: "c2",
        name: "第二子",
        birthYear: 2025,
        education: {
          kindergarten: "公立",
          elementary: "公立",
          juniorHigh: "私立",
          highSchool: "私立",
          university: "私立文系",
        },
      },
    ];
    const input = makeInput({
      startYear: 2030,
      endYear: 2070,
      self,
      spouse,
      children,
      expenses: { baseAnnualLivingExpense: 4_200_000, inflationRate: 0.015 },
      assets: {
        taxableAssets: 9_000_000,
        taxFreeAssets: 1_000_000,
        annualReturnRate: 0.035,
        annualTaxFreeContribution: 480_000,
      },
      events: [
        { id: "e1", year: 2035, label: "住宅頭金", amount: -5_000_000 },
        { id: "e2", year: 2040, label: "車購入", amount: -3_000_000 },
      ],
      loans: [
        {
          id: "l1",
          label: "住宅ローン",
          startYear: 2035,
          principal: 35_000_000,
          annualRate: 0.012,
          termYears: 35,
        },
      ],
    });
    const results = assertConservation(input);
    expect(results).toHaveLength(41); // 2030..2070
    for (const r of results) {
      expect(Number.isNaN(r.cashFlow)).toBe(false);
      expect(Number.isFinite(r.cashFlow)).toBe(true);
    }
  });
});

// ===========================================================================
// AC2: loan.ts — 元利均等返済（返済総額・完済年・途中年残高）
// ===========================================================================

describe("AC2: loanPaymentForYear / annualLoanPayment（元利均等返済）", () => {
  it("AC2: 利率0は元本を期間で割った定額で、返済総額が元本と一致する", () => {
    // P=3,000,000 / n=3 / r=0 → A = P/n = 1,000,000。総額 = A*3 = 3,000,000 = P。
    const loan: Loan = {
      id: "l0",
      label: "無利息",
      startYear: 2030,
      principal: 3_000_000,
      annualRate: 0,
      termYears: 3,
    };
    expect(annualLoanPayment(loan)).toBe(1_000_000);
    const total = [2030, 2031, 2032].reduce(
      (s, y) => s + loanPaymentForYear([loan], y),
      0,
    );
    expect(total).toBe(3_000_000);
  });

  it("AC2: 元利均等（P=10,000,000 / r=0.02 / n=10）の年間返済額が手計算値と一致する", () => {
    // A = P*r / (1 - (1+r)^-n)
    //   = 10,000,000 * 0.02 / (1 - 1.02^-10)
    //   = 200,000 / (1 - 0.8203483...) = 200,000 / 0.1796517... = 1,113,265.2786...
    const loan: Loan = {
      id: "l1",
      label: "住宅ローン",
      startYear: 2030,
      principal: 10_000_000,
      annualRate: 0.02,
      termYears: 10,
    };
    const A = annualLoanPayment(loan);
    expect(A).toBeCloseTo(1_113_265.2786531635, 6);
    // engine 側は Math.round される値
    expect(Math.round(A)).toBe(1_113_265);
  });

  it("AC2: 元利均等の返済総額が元本を上回り、手計算値（≒11,132,653円）と一致する", () => {
    // 返済総額 = A * n = 1,113,265.2786... * 10 = 11,132,652.7865...
    const loan: Loan = {
      id: "l1",
      label: "住宅ローン",
      startYear: 2030,
      principal: 10_000_000,
      annualRate: 0.02,
      termYears: 10,
    };
    const years = Array.from({ length: 10 }, (_, i) => 2030 + i);
    const total = years.reduce((s, y) => s + loanPaymentForYear([loan], y), 0);
    expect(total).toBeCloseTo(11_132_652.786531635, 4);
    expect(total).toBeGreaterThan(loan.principal);
  });

  it("AC2: 途中年の元本残高（アモチゼーション）が手計算値と一致する", () => {
    // 残高漸化式 B_k = B_{k-1}*(1+r) - A （B_0 = P）
    // P=10,000,000 / r=0.02 / n=10 / A=1,113,265.2786531635
    const P = 10_000_000;
    const r = 0.02;
    const n = 10;
    const loan: Loan = {
      id: "l1",
      label: "住宅ローン",
      startYear: 2030,
      principal: P,
      annualRate: r,
      termYears: n,
    };
    const A = annualLoanPayment(loan);

    // 手計算した各年末残高（node で B_k を算出）
    const expectedBalances = [
      9_086_734.721346837, // 1年後
      8_155_204.13712061, // 2年後
      7_205_042.941209859, // 3年後
      6_235_878.521380893, // 4年後
      5_247_330.8131553475, // 5年後
      4_239_012.150765291, // 6年後
      3_210_527.115127434, // 7年後
      2_161_472.3787768194, // 8年後
      1_091_436.5476991925, // 9年後
      0, // 10年後（完済）
    ];

    let B = P;
    for (let k = 1; k <= n; k++) {
      B = B * (1 + r) - A;
      if (k < n) {
        expect(B).toBeCloseTo(expectedBalances[k - 1], 4);
      } else {
        // 完済年: 残高はほぼ0（浮動小数誤差のみ）
        expect(Math.abs(B)).toBeLessThan(1e-6);
      }
    }
  });

  it("AC2: 完済年（startYear + termYears - 1）まで返済、その翌年以降は0", () => {
    // startYear=2031 / termYears=3 → 返済年は 2031,2032,2033。完済年=2033。
    const loan: Loan = {
      id: "l1",
      label: "ローン",
      startYear: 2031,
      principal: 3_000_000,
      annualRate: 0,
      termYears: 3,
    };
    expect(loanPaymentForYear([loan], 2030)).toBe(0); // 開始前
    expect(loanPaymentForYear([loan], 2031)).toBe(1_000_000);
    expect(loanPaymentForYear([loan], 2032)).toBe(1_000_000);
    expect(loanPaymentForYear([loan], 2033)).toBe(1_000_000); // 完済年も返済あり
    expect(loanPaymentForYear([loan], 2034)).toBe(0); // 完済翌年
  });

  it("AC2: 元本0・期間0のローンは返済額0", () => {
    expect(
      annualLoanPayment({
        id: "z1",
        label: "空",
        startYear: 2030,
        principal: 0,
        annualRate: 0.02,
        termYears: 10,
      }),
    ).toBe(0);
    expect(
      annualLoanPayment({
        id: "z2",
        label: "空",
        startYear: 2030,
        principal: 1_000_000,
        annualRate: 0.02,
        termYears: 0,
      }),
    ).toBe(0);
  });
});

// ===========================================================================
// AC3: education.ts — 全プリセットで学齢年ごとの教育費が定義表と一致
// ===========================================================================

describe("AC3: childAnnualCost / educationCostAtAge（全公立・全私立プリセット）", () => {
  // education.ts の定義表（SCHOOL_ANNUAL_COST / UNIVERSITY_ANNUAL_COST）に対応する期待値。
  const PUBLIC = {
    kindergarten: 165_000,
    elementary: 353_000,
    juniorHigh: 539_000,
    highSchool: 513_000,
    university: 670_000, // 国公立
  };
  const PRIVATE = {
    kindergarten: 308_000,
    elementary: 1_667_000,
    juniorHigh: 1_436_000,
    highSchool: 1_054_000,
    university: 1_540_000, // 私立理系（「すべて私立」プリセット）
  };

  const allPublic = DEFAULT_EDUCATION; // 幼小中高すべて公立・大学は国公立
  const allPrivate = {
    kindergarten: "私立" as const,
    elementary: "私立" as const,
    juniorHigh: "私立" as const,
    highSchool: "私立" as const,
    university: "私立理系" as const,
  };

  it("AC3: 全公立プリセット — 各学齢年の educationCostAtAge が定義表と一致", () => {
    // 幼稚園 3〜5歳
    for (const age of [3, 4, 5]) {
      expect(educationCostAtAge(allPublic, age)).toBe(PUBLIC.kindergarten);
    }
    // 小学校 6〜11歳
    for (const age of [6, 7, 8, 9, 10, 11]) {
      expect(educationCostAtAge(allPublic, age)).toBe(PUBLIC.elementary);
    }
    // 中学校 12〜14歳
    for (const age of [12, 13, 14]) {
      expect(educationCostAtAge(allPublic, age)).toBe(PUBLIC.juniorHigh);
    }
    // 高校 15〜17歳
    for (const age of [15, 16, 17]) {
      expect(educationCostAtAge(allPublic, age)).toBe(PUBLIC.highSchool);
    }
    // 大学 18〜21歳
    for (const age of [18, 19, 20, 21]) {
      expect(educationCostAtAge(allPublic, age)).toBe(PUBLIC.university);
    }
    // 学齢外
    for (const age of [0, 1, 2, 22, 25]) {
      expect(educationCostAtAge(allPublic, age)).toBe(0);
    }
  });

  it("AC3: 全私立プリセット — 各学齢年の educationCostAtAge が定義表と一致", () => {
    for (const age of [3, 4, 5]) {
      expect(educationCostAtAge(allPrivate, age)).toBe(PRIVATE.kindergarten);
    }
    for (const age of [6, 7, 8, 9, 10, 11]) {
      expect(educationCostAtAge(allPrivate, age)).toBe(PRIVATE.elementary);
    }
    for (const age of [12, 13, 14]) {
      expect(educationCostAtAge(allPrivate, age)).toBe(PRIVATE.juniorHigh);
    }
    for (const age of [15, 16, 17]) {
      expect(educationCostAtAge(allPrivate, age)).toBe(PRIVATE.highSchool);
    }
    for (const age of [18, 19, 20, 21]) {
      expect(educationCostAtAge(allPrivate, age)).toBe(PRIVATE.university);
    }
    for (const age of [0, 1, 2, 22, 25]) {
      expect(educationCostAtAge(allPrivate, age)).toBe(0);
    }
  });

  it("AC3: childAnnualCost = 基礎養育費（0〜22歳）+ 進路別教育費（全公立）", () => {
    const child: Child = {
      id: "c1",
      name: "子",
      birthYear: 2000,
      education: allPublic,
    };
    // 2歳: 教育費なし・養育費のみ
    expect(childAnnualCost(child, 2)).toBe(BASE_CHILD_ANNUAL_COST);
    // 10歳: 養育費 + 小学校（公立）
    expect(childAnnualCost(child, 10)).toBe(
      BASE_CHILD_ANNUAL_COST + PUBLIC.elementary,
    );
    // 20歳: 養育費（22歳以下）+ 大学（国公立）
    expect(childAnnualCost(child, 20)).toBe(
      BASE_CHILD_ANNUAL_COST + PUBLIC.university,
    );
    // 22歳: 養育費のみ（CHILD_DEPENDENT_MAX_AGE = 22、教育費は学齢外）
    expect(childAnnualCost(child, 22)).toBe(BASE_CHILD_ANNUAL_COST);
    // 23歳: 養育費も教育費も0
    expect(childAnnualCost(child, 23)).toBe(0);
    // 負の年齢: 0
    expect(childAnnualCost(child, -1)).toBe(0);
  });

  it("AC3: childAnnualCost = 基礎養育費 + 進路別教育費（全私立）", () => {
    const child: Child = {
      id: "c1",
      name: "子",
      birthYear: 2000,
      education: allPrivate,
    };
    expect(childAnnualCost(child, 4)).toBe(
      BASE_CHILD_ANNUAL_COST + PRIVATE.kindergarten,
    );
    expect(childAnnualCost(child, 13)).toBe(
      BASE_CHILD_ANNUAL_COST + PRIVATE.juniorHigh,
    );
    expect(childAnnualCost(child, 16)).toBe(
      BASE_CHILD_ANNUAL_COST + PRIVATE.highSchool,
    );
    expect(childAnnualCost(child, 19)).toBe(
      BASE_CHILD_ANNUAL_COST + PRIVATE.university,
    );
  });

  it("AC3: 大学『なし』プリセットは18〜21歳の教育費が0（養育費のみ）", () => {
    const child: Child = {
      id: "c1",
      name: "子",
      birthYear: 2000,
      education: { ...DEFAULT_EDUCATION, university: "なし" },
    };
    for (const age of [18, 19, 20, 21]) {
      expect(educationCostAtAge(child.education, age)).toBe(0);
      expect(childAnnualCost(child, age)).toBe(BASE_CHILD_ANNUAL_COST);
    }
  });
});

// ===========================================================================
// AC4: pension.ts — estimateAnnualPension の3ケースを固定
// ===========================================================================

describe("AC4: estimateAnnualPension（年収0 / 中間値 / 係数上限超え）", () => {
  it("AC4: 年収0 → 基礎年金のみ（earningsRelated = 0）", () => {
    // min(max(0,0)*0.12, 1_500_000) = 0 → round(780,000 + 0) = 780,000
    expect(estimateAnnualPension(0)).toBe(780_000);
    expect(estimateAnnualPension(0)).toBe(BASIC_PENSION_ANNUAL);
    // 負の年収も0にクランプされる
    expect(estimateAnnualPension(-1_000_000)).toBe(780_000);
  });

  it("AC4: 中間値（年収5,000,000）→ 780,000 + 5,000,000*0.12 = 1,380,000", () => {
    // earningsRelated = min(5,000,000 * 0.12, 1,500,000) = min(600,000, 1,500,000) = 600,000
    // round(780,000 + 600,000) = 1,380,000
    expect(estimateAnnualPension(5_000_000)).toBe(1_380_000);
  });

  it("AC4: 係数上限超え（年収20,000,000）→ 厚生年金相当は 1,500,000 で頭打ち", () => {
    // earningsRelated = min(20,000,000 * 0.12, 1,500,000) = min(2,400,000, 1,500,000) = 1,500,000
    // round(780,000 + 1,500,000) = 2,280,000
    expect(estimateAnnualPension(20_000_000)).toBe(2_280_000);
    // ちょうど上限に達する年収（1,500,000 / 0.12 = 12,500,000）以上は同額
    expect(estimateAnnualPension(12_500_000)).toBe(2_280_000);
    expect(estimateAnnualPension(50_000_000)).toBe(2_280_000);
  });
});

// ===========================================================================
// AC5: 境界値 — 開始年・終了年・退職年・ローン完済年でオフバイワンなし
// ===========================================================================

describe("AC5: 境界値（開始年 / 終了年 / 退職年 / ローン完済年）", () => {
  it("AC5: 開始年・終了年 — 期待行数と両端の year/selfAge が inclusive", () => {
    // startYear=2030, endYear=2035 → 6行（2030,2031,2032,2033,2034,2035）
    const results = runSimulation(
      makeInput({ startYear: 2030, endYear: 2035 }),
    );
    expect(results).toHaveLength(6);
    expect(results[0].year).toBe(2030); // 開始年を含む
    expect(results[results.length - 1].year).toBe(2035); // 終了年を含む
    expect(results.map((r) => r.year)).toEqual([
      2030, 2031, 2032, 2033, 2034, 2035,
    ]);
    // selfAge: birthYear=2000 → 開始年30歳、終了年35歳
    expect(results[0].selfAge).toBe(30);
    expect(results[results.length - 1].selfAge).toBe(35);
  });

  it("AC5: startYear === endYear なら1行だけ返る", () => {
    const results = runSimulation(
      makeInput({ startYear: 2030, endYear: 2030 }),
    );
    expect(results).toHaveLength(1);
    expect(results[0].year).toBe(2030);
  });

  it("AC5: 退職年 — age === retirementAge の年で給与が0になり、その前年はまだ給与あり", () => {
    // birthYear=1966, retirementAge=65 → 退職年齢到達は 1966+65 = 2031年。
    // 2030年（64歳, age < 65）: 給与あり / 2031年（65歳, age === 65 → isWorking=false）: 給与0
    const self: Person = {
      ...basePerson,
      birthYear: 1966,
      grossAnnualIncome: 5_000_000,
      incomeGrowthRate: 0,
      pensionStartAge: 100, // 年金の影響を除外
      annualPension: 0,
    };
    const results = runSimulation(
      makeInput({ startYear: 2029, endYear: 2033, self }),
    );
    const byYear = Object.fromEntries(results.map((r) => [r.year, r]));

    expect(byYear[2029].selfAge).toBe(63);
    expect(byYear[2029].grossIncome).toBe(5_000_000);
    expect(byYear[2030].selfAge).toBe(64);
    expect(byYear[2030].grossIncome).toBe(5_000_000); // 退職年の前年はまだ給与
    expect(byYear[2031].selfAge).toBe(65);
    expect(byYear[2031].grossIncome).toBe(0); // 退職年ちょうどで給与0（オフバイワンなし）
    expect(byYear[2032].grossIncome).toBe(0);
  });

  it("AC5: 退職一時金は age === retirementAge の年のみ（前後の年は0）", () => {
    // birthYear=1966, retirementAge=65 → 2031年に一時金。
    const self: Person = {
      ...basePerson,
      birthYear: 1966,
      grossAnnualIncome: 0,
      pensionStartAge: 100,
      annualPension: 0,
      retirementBenefit: 20_000_000,
    };
    const results = runSimulation(
      makeInput({
        startYear: 2029,
        endYear: 2033,
        self,
        expenses: { baseAnnualLivingExpense: 0, inflationRate: 0 },
        assets: {
          taxableAssets: 0,
          taxFreeAssets: 0,
          annualReturnRate: 0,
          annualTaxFreeContribution: 0,
        },
      }),
    );
    const byYear = Object.fromEntries(results.map((r) => [r.year, r]));

    // 手計算: 勤続年数 = retirementAge - WORK_START_AGE = 65 - 22 = 43年
    // 退職所得控除 = 8,000,000 + 700,000 * (43 - 20) = 8,000,000 + 16,100,000 = 24,100,000
    // benefit(20,000,000) < 控除(24,100,000) → 課税退職所得 = max(0, (20,000,000 - 24,100,000)/2) = 0
    // → 税0、手取り = 20,000,000
    const expectedNet =
      20_000_000 - estimateRetirementIncomeTax(20_000_000, 65 - 22);
    expect(expectedNet).toBe(20_000_000); // 控除内なので非課税

    expect(byYear[2030].retirementBenefit).toBe(0); // 前年
    expect(byYear[2031].retirementBenefit).toBe(expectedNet); // 退職年ちょうど
    expect(byYear[2032].retirementBenefit).toBe(0); // 翌年
  });

  it("AC5: 年金開始年 — age === pensionStartAge の年から年金が発生（前年は0）", () => {
    // birthYear=1966, pensionStartAge=65 → 2031年から年金。退職年齢も65で給与は0。
    const self: Person = {
      ...basePerson,
      birthYear: 1966,
      grossAnnualIncome: 5_000_000,
      incomeGrowthRate: 0,
      retirementAge: 65,
      pensionStartAge: 65,
      annualPension: 1_000_000,
    };
    const results = runSimulation(
      makeInput({ startYear: 2030, endYear: 2032, self }),
    );
    const byYear = Object.fromEntries(results.map((r) => [r.year, r]));

    expect(byYear[2030].selfAge).toBe(64);
    expect(byYear[2030].pension).toBe(0); // 受給開始前年
    expect(byYear[2031].selfAge).toBe(65);
    expect(byYear[2031].pension).toBe(1_000_000); // 受給開始年ちょうど
    expect(byYear[2031].grossIncome).toBe(1_000_000); // 給与0 + 年金100万
    expect(byYear[2032].pension).toBe(1_000_000);
  });

  it("AC5: ローン完済年 — startYear+termYears-1 まで返済、翌年から0（オフバイワンなし）", () => {
    // startYear=2032, termYears=5 → 返済年は 2032〜2036。完済年 = 2036。2037から0。
    const loan: Loan = {
      id: "l1",
      label: "ローン",
      startYear: 2032,
      principal: 5_000_000,
      annualRate: 0,
      termYears: 5,
    };
    const results = runSimulation(
      makeInput({ startYear: 2030, endYear: 2038, loans: [loan] }),
    );
    const payments = Object.fromEntries(
      results.map((r) => [r.year, r.loanPayment]),
    );
    // r=0 なので年 P/n = 1,000,000
    expect(payments[2030]).toBe(0); // 開始前
    expect(payments[2031]).toBe(0); // 開始前年
    expect(payments[2032]).toBe(1_000_000); // 返済初年
    expect(payments[2033]).toBe(1_000_000);
    expect(payments[2034]).toBe(1_000_000);
    expect(payments[2035]).toBe(1_000_000);
    expect(payments[2036]).toBe(1_000_000); // 完済年（5年目）も返済あり
    expect(payments[2037]).toBe(0); // 完済翌年は0
    expect(payments[2038]).toBe(0);

    // 返済回数 = ちょうど termYears 回
    const payCount = results.filter((r) => r.loanPayment > 0).length;
    expect(payCount).toBe(5);
  });

  it("AC5: ローン開始年ちょうどの年から返済が計上される", () => {
    const loan: Loan = {
      id: "l1",
      label: "ローン",
      startYear: 2030, // シミュレーション開始年と同一
      principal: 3_000_000,
      annualRate: 0,
      termYears: 3,
    };
    const results = runSimulation(
      makeInput({ startYear: 2030, endYear: 2033, loans: [loan] }),
    );
    expect(results.map((r) => r.loanPayment)).toEqual([
      1_000_000, 1_000_000, 1_000_000, 0,
    ]);
  });
});

// ===========================================================================
// AC6 の補足: 既存式どおりであることの回帰固定（税・社保）
// ===========================================================================

describe("AC6補足: 税・社会保険の回帰固定（既存式のスナップショット）", () => {
  it("estimateSocialInsurance: 上限未満は 15%、上限超えは頭打ち", () => {
    // 5,000,000 * 0.15 = 750,000
    expect(estimateSocialInsurance(5_000_000)).toBe(750_000);
    // 上限 12,000,000 * 0.15 = 1,800,000。それ以上は同額
    expect(estimateSocialInsurance(12_000_000)).toBe(1_800_000);
    expect(estimateSocialInsurance(20_000_000)).toBe(1_800_000);
    expect(estimateSocialInsurance(0)).toBe(0);
  });

  it("estimateIncomeTax / estimateResidenceTax: 年収5,000,000 の既存式どおりの値", () => {
    // 給与所得控除 = min(5,000,000*0.2 + 440,000, 1,950,000) = min(1,440,000, 1,950,000) = 1,440,000
    // 社保 = 5,000,000 * 0.15 = 750,000
    // 課税所得 = 5,000,000 - 1,440,000 - 750,000 - 480,000 = 2,330,000
    // 所得税: 0〜1,950,000 は 5% → 97,500 ; 1,950,000〜2,330,000 は 10% → 38,000 ; 計 135,500
    // 住民税: 2,330,000 * 0.1 = 233,000
    expect(estimateIncomeTax(5_000_000)).toBe(135_500);
    expect(estimateResidenceTax(5_000_000)).toBe(233_000);
    // 収入0は両方0
    expect(estimateIncomeTax(0)).toBe(0);
    expect(estimateResidenceTax(0)).toBe(0);
  });

  it("CAPITAL_GAINS_RATE は 0.20315（所得税15.315% + 住民税5%）", () => {
    expect(CAPITAL_GAINS_RATE).toBe(0.20315);
  });
});
