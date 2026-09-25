import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  INPUT_LIMITS,
  planInputSchema,
  validatePlanInput,
} from "./schema";
import type { PlanInput } from "./simulation/types";
import { defaultPlanInput } from "./simulation/defaults";
import { DEFAULT_EDUCATION } from "./simulation/education";

vi.mock("./simulation/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./simulation/engine")>();
  return { ...actual, runSimulation: vi.fn(actual.runSimulation) };
});

import { runSimulation } from "./simulation/engine";
import { runValidatedSimulation } from "./validatedSimulation";

/** 現在年に依存しない、退職あり＋ローンあり＋子あり＋配偶者ありの入力。 */
const fixedInput: PlanInput = {
  startYear: 2026,
  endYear: 2076,
  self: {
    name: "本人",
    birthYear: 1991,
    grossAnnualIncome: 5_000_000,
    incomeGrowthRate: 0.01,
    retirementAge: 65,
    pensionStartAge: 65,
    annualPension: 1_100_000,
    retirementBenefit: 20_000_000,
  },
  spouse: {
    name: "配偶者",
    birthYear: 1993,
    grossAnnualIncome: 3_000_000,
    incomeGrowthRate: 0.01,
    retirementAge: 65,
    pensionStartAge: 65,
    annualPension: 700_000,
    retirementBenefit: 10_000_000,
  },
  children: [{ id: "c1", name: "子1", birthYear: 2023, education: DEFAULT_EDUCATION }],
  expenses: { baseAnnualLivingExpense: 3_600_000, inflationRate: 0.01 },
  assets: {
    taxableAssets: 5_000_000,
    taxFreeAssets: 0,
    annualReturnRate: 0.03,
    annualDividendYield: 0,
    annualTaxFreeContribution: 480_000,
  },
  events: [{ id: "e1", year: 2031, label: "住宅購入（頭金）", amount: -5_000_000 }],
  recurringExpenses: [],
  loans: [
    { id: "l1", label: "住宅ローン", startYear: 2031, principal: 30_000_000, annualRate: 0.01, termYears: 35 },
  ],
};

/** パス指定で一部だけ書き換えた入力を作る。 */
function withPatch(mutate: (draft: PlanInput) => void): PlanInput {
  const draft = structuredClone(fixedInput);
  mutate(draft);
  return draft;
}

function errorsOf(input: unknown): Record<string, string> {
  const v = validatePlanInput(input);
  return v.ok ? {} : v.errors;
}

beforeEach(() => {
  vi.mocked(runSimulation).mockClear();
});

describe("validatePlanInput — 正常系", () => {
  it("既定入力・固定入力は通る", () => {
    expect(validatePlanInput(defaultPlanInput).ok).toBe(true);
    expect(validatePlanInput(fixedInput).ok).toBe(true);
  });

  it("spouse: null・空配列でも通る", () => {
    expect(
      validatePlanInput(
        withPatch((d) => {
          d.spouse = null;
          d.children = [];
          d.events = [];
          d.loans = [];
        }),
      ).ok,
    ).toBe(true);
  });
});

describe("validatePlanInput — 境界値（ちょうどは通過、境界外はエラー）", () => {
  type Case = { name: string; path: string; set: (d: PlanInput, v: number) => void; min: number; max: number };
  const cases: Case[] = [
    { name: "生年", path: "self.birthYear", set: (d, v) => (d.self.birthYear = v), min: 1900, max: 2100 },
    { name: "子の生年", path: "children.0.birthYear", set: (d, v) => (d.children[0].birthYear = v), min: 1900, max: 2100 },
    { name: "イベント年", path: "events.0.year", set: (d, v) => (d.events[0].year = v), min: 1900, max: 2100 },
    { name: "退職年齢", path: "self.retirementAge", set: (d, v) => (d.self.retirementAge = v), min: 0, max: 120 },
    { name: "年金開始年齢", path: "self.pensionStartAge", set: (d, v) => (d.self.pensionStartAge = v), min: 60, max: 75 },
    { name: "配偶者の年金開始年齢", path: "spouse.pensionStartAge", set: (d, v) => (d.spouse!.pensionStartAge = v), min: 60, max: 75 },
    { name: "昇給率", path: "self.incomeGrowthRate", set: (d, v) => (d.self.incomeGrowthRate = v), min: -1, max: 1 },
    { name: "物価上昇率", path: "expenses.inflationRate", set: (d, v) => (d.expenses.inflationRate = v), min: -1, max: 1 },
    { name: "運用利回り", path: "assets.annualReturnRate", set: (d, v) => (d.assets.annualReturnRate = v), min: -1, max: 1 },
    { name: "ローン金利", path: "loans.0.annualRate", set: (d, v) => (d.loans[0].annualRate = v), min: -1, max: 1 },
    { name: "年収", path: "self.grossAnnualIncome", set: (d, v) => (d.self.grossAnnualIncome = v), min: 0, max: 1e12 },
    { name: "年金額", path: "self.annualPension", set: (d, v) => (d.self.annualPension = v), min: 0, max: 1e12 },
    { name: "退職一時金", path: "self.retirementBenefit", set: (d, v) => (d.self.retirementBenefit = v), min: 0, max: 1e12 },
    { name: "基礎生活費", path: "expenses.baseAnnualLivingExpense", set: (d, v) => (d.expenses.baseAnnualLivingExpense = v), min: 0, max: 1e12 },
    { name: "課税口座", path: "assets.taxableAssets", set: (d, v) => (d.assets.taxableAssets = v), min: 0, max: 1e12 },
    { name: "非課税口座", path: "assets.taxFreeAssets", set: (d, v) => (d.assets.taxFreeAssets = v), min: 0, max: 1e12 },
    { name: "年間積立", path: "assets.annualTaxFreeContribution", set: (d, v) => (d.assets.annualTaxFreeContribution = v), min: 0, max: 1e12 },
    { name: "借入額", path: "loans.0.principal", set: (d, v) => (d.loans[0].principal = v), min: 0, max: 1e12 },
    { name: "返済期間", path: "loans.0.termYears", set: (d, v) => (d.loans[0].termYears = v), min: 1, max: 50 },
    { name: "返済開始年", path: "loans.0.startYear", set: (d, v) => (d.loans[0].startYear = v), min: 1900, max: 2100 },
  ];

  for (const c of cases) {
    it(`${c.name}: 下限 ${c.min}・上限 ${c.max} ちょうどは通り、外側はエラー`, () => {
      expect(errorsOf(withPatch((d) => c.set(d, c.min)))[c.path]).toBeUndefined();
      expect(errorsOf(withPatch((d) => c.set(d, c.max)))[c.path]).toBeUndefined();
      const step = c.max - c.min <= 2 ? 0.001 : 1;
      expect(errorsOf(withPatch((d) => c.set(d, c.min - step)))[c.path]).toBeTruthy();
      expect(errorsOf(withPatch((d) => c.set(d, c.max + step)))[c.path]).toBeTruthy();
    });
  }

  it("金額系の上限超えは日本語メッセージ", () => {
    expect(errorsOf(withPatch((d) => (d.self.grossAnnualIncome = 1e12 + 1)))["self.grossAnnualIncome"]).toBe(
      "年収は0円〜1,000,000,000,000円の範囲で入力してください",
    );
  });

  it("イベント金額は符号あり（±1e12）", () => {
    expect(errorsOf(withPatch((d) => (d.events[0].amount = -1e12)))["events.0.amount"]).toBeUndefined();
    expect(errorsOf(withPatch((d) => (d.events[0].amount = 1e12)))["events.0.amount"]).toBeUndefined();
    expect(errorsOf(withPatch((d) => (d.events[0].amount = -1e12 - 1)))["events.0.amount"]).toBeTruthy();
    expect(errorsOf(withPatch((d) => (d.events[0].amount = 1e12 + 1)))["events.0.amount"]).toBeTruthy();
  });

  it("pensionStartAge は年齢一般範囲（0〜120）ではなく 60〜75 で判定する", () => {
    expect(INPUT_LIMITS.pensionStartAge).toEqual({ min: 60, max: 75 });
    expect(errorsOf(withPatch((d) => (d.self.pensionStartAge = 59)))["self.pensionStartAge"]).toBeTruthy();
    expect(errorsOf(withPatch((d) => (d.self.pensionStartAge = 76)))["self.pensionStartAge"]).toBeTruthy();
    // 年齢としては 0〜120 に入る 30 でも年金開始年齢としては不可
    expect(errorsOf(withPatch((d) => (d.self.pensionStartAge = 30)))["self.pensionStartAge"]).toBeTruthy();
  });
});

describe("validatePlanInput — 負値・0・NaN・Infinity・非数値", () => {
  it("金額系の負値はエラー", () => {
    expect(errorsOf(withPatch((d) => (d.assets.taxableAssets = -1)))["assets.taxableAssets"]).toBeTruthy();
    expect(errorsOf(withPatch((d) => (d.expenses.baseAnnualLivingExpense = -1)))["expenses.baseAnnualLivingExpense"]).toBeTruthy();
  });

  it("金額 0 は通る（下限ちょうど）", () => {
    expect(validatePlanInput(withPatch((d) => { d.assets.taxableAssets = 0; d.self.grossAnnualIncome = 0; })).ok).toBe(true);
  });

  it("返済期間 0・負値はエラー", () => {
    expect(errorsOf(withPatch((d) => (d.loans[0].termYears = 0)))["loans.0.termYears"]).toBeTruthy();
    expect(errorsOf(withPatch((d) => (d.loans[0].termYears = -3)))["loans.0.termYears"]).toBeTruthy();
  });

  it("NaN / Infinity / -Infinity はエラー", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(errorsOf(withPatch((d) => (d.self.grossAnnualIncome = bad)))["self.grossAnnualIncome"]).toBeTruthy();
      expect(errorsOf(withPatch((d) => (d.expenses.inflationRate = bad)))["expenses.inflationRate"]).toBeTruthy();
      expect(errorsOf(withPatch((d) => (d.loans[0].termYears = bad)))["loans.0.termYears"]).toBeTruthy();
      expect(errorsOf(withPatch((d) => (d.startYear = bad)))["startYear"]).toBeTruthy();
    }
  });

  it("非数値（文字列・null・undefined）はエラー", () => {
    const bad = withPatch(() => {}) as unknown as Record<string, unknown>;
    (bad.self as Record<string, unknown>).grossAnnualIncome = "5000000";
    (bad.assets as Record<string, unknown>).taxableAssets = null;
    delete (bad.expenses as Record<string, unknown>).inflationRate;
    const errors = errorsOf(bad);
    expect(errors["self.grossAnnualIncome"]).toBe("年収は数値で入力してください");
    expect(errors["assets.taxableAssets"]).toBeTruthy();
    expect(errors["expenses.inflationRate"]).toBeTruthy();
  });

  it("年・年齢・返済期間は整数のみ", () => {
    expect(errorsOf(withPatch((d) => (d.self.birthYear = 1990.5)))["self.birthYear"]).toBeTruthy();
    expect(errorsOf(withPatch((d) => (d.self.retirementAge = 64.5)))["self.retirementAge"]).toBeTruthy();
    expect(errorsOf(withPatch((d) => (d.loans[0].termYears = 10.5)))["loans.0.termYears"]).toBeTruthy();
  });
});

describe("validatePlanInput — 期間の前後関係", () => {
  it("startYear > endYear は endYear にエラー", () => {
    expect(errorsOf(withPatch((d) => { d.startYear = 2050; d.endYear = 2040; }))["endYear"]).toBe(
      "終了年は開始年以降にしてください",
    );
  });

  it("startYear === endYear は通る", () => {
    expect(validatePlanInput(withPatch((d) => { d.startYear = 2050; d.endYear = 2050; })).ok).toBe(true);
  });

  it("継続支出の startYear > endYear はその行の endYear にエラー", () => {
    const input = withPatch((d) => {
      d.recurringExpenses = [
        { id: "r1", label: "家賃", startYear: 2030, endYear: 2030, annualAmount: 1_000_000 },
        { id: "r2", label: "家賃2", startYear: 2035, endYear: 2034, annualAmount: 1_000_000 },
      ];
    });
    const errors = errorsOf(input);
    expect(errors["recurringExpenses.0.endYear"]).toBeUndefined();
    expect(errors["recurringExpenses.1.endYear"]).toBe("終了年は開始年以降にしてください");
  });
});

describe("runValidatedSimulation — 呼び出しガード", () => {
  const abnormal: [string, PlanInput][] = [
    ["負の年収", withPatch((d) => (d.self.grossAnnualIncome = -1))],
    ["NaN の運用利回り", withPatch((d) => (d.assets.annualReturnRate = NaN))],
    ["Infinity の借入額", withPatch((d) => (d.loans[0].principal = Infinity))],
    ["過大な生活費", withPatch((d) => (d.expenses.baseAnnualLivingExpense = 1e12 + 1))],
    ["年金開始年齢 50", withPatch((d) => (d.self.pensionStartAge = 50))],
    ["返済期間 0", withPatch((d) => (d.loans[0].termYears = 0))],
    ["startYear > endYear", withPatch((d) => { d.startYear = 2060; d.endYear = 2050; })],
  ];

  for (const [name, input] of abnormal) {
    it(`${name} は runSimulation に到達せず null`, () => {
      expect(runValidatedSimulation(input)).toBeNull();
      expect(runSimulation).not.toHaveBeenCalled();
    });
  }

  it("正常入力は runSimulation を 1 回呼んで結果を返す", () => {
    const results = runValidatedSimulation(fixedInput);
    expect(results).not.toBeNull();
    expect(results!.length).toBe(51);
    expect(runSimulation).toHaveBeenCalledTimes(1);
  });
});

describe("シミュレーション結果不変（退職あり＋ローンあり＋子あり）", () => {
  it("ガード経由の年次系列が直接呼び出しと完全一致し、固定される", async () => {
    const actual = await vi.importActual<typeof import("./simulation/engine")>("./simulation/engine");
    const direct = actual.runSimulation(fixedInput);
    expect(runValidatedSimulation(fixedInput)).toEqual(direct);
    // 退職・ローン・子の教育費が系列に効いていること（空回りの検証で終わらせない）
    expect(direct.some((r) => r.retirementBenefit > 0)).toBe(true);
    expect(direct.some((r) => r.loanPayment > 0)).toBe(true);
    expect(direct).toMatchSnapshot();
  });
});

describe("v1 保存データ移行の回帰（永続化スキーマ）", () => {
  const v1Base = {
    startYear: 2026,
    endYear: 2076,
    self: { name: "本人", birthYear: 1991, grossAnnualIncome: 5_000_000, incomeGrowthRate: 0.01, retirementAge: 65, pensionStartAge: 65, annualPension: 1_100_000 },
    spouse: null,
    children: [{ id: "c1", name: "子", birthYear: 2023 }],
    expenses: { baseAnnualLivingExpense: 3_600_000, inflationRate: 0.01 },
    assets: { initialAssets: 7_000_000, annualReturnRate: 0.03 },
    events: [],
  };

  it("initialAssets → taxableAssets に移行し、新フィールドは既定値で補う", () => {
    const parsed = planInputSchema.safeParse(v1Base);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.assets).toEqual({
      taxableAssets: 7_000_000,
      taxFreeAssets: 0,
      annualReturnRate: 0.03,
      annualDividendYield: 0,
      annualTaxFreeContribution: 0,
    });
    expect(parsed.data.self.retirementBenefit).toBe(0);
    expect(parsed.data.children[0].education).toEqual(DEFAULT_EDUCATION);
    expect(parsed.data.recurringExpenses).toEqual([]);
    expect(parsed.data.loans).toEqual([]);
  });

  it("taxableAssets と initialAssets が併存する場合は taxableAssets を優先", () => {
    const parsed = planInputSchema.safeParse({
      ...v1Base,
      assets: { taxableAssets: 1, initialAssets: 2, annualReturnRate: 0.03 },
    });
    expect(parsed.success && parsed.data.assets.taxableAssets).toBe(1);
  });

  it("移行後の v1 データは厳格バリデーションも通り、シミュレーションを実行できる", () => {
    const parsed = planInputSchema.parse(v1Base);
    expect(validatePlanInput(parsed).ok).toBe(true);
    expect(runValidatedSimulation(parsed as PlanInput)).not.toBeNull();
  });

  it("永続化スキーマは範囲を見ない（保存データを不用意に捨てない）", () => {
    const parsed = planInputSchema.safeParse({
      ...v1Base,
      assets: { initialAssets: -5, annualReturnRate: 5 },
    });
    expect(parsed.success).toBe(true);
  });
});

/** 子育て共働きペルソナレビュー #2・#3: 追加した入力の検証。 */
describe("validatePlanInput — 家族向けの拡張", () => {
  const adjustment = {
    id: "a",
    person: "spouse" as const,
    label: "育休",
    startYear: 2028,
    endYear: 2028,
    ratio: 0.67,
    nonTaxable: true,
  };
  const property = { id: "p", label: "自宅", purchaseYear: 2031, price: 35_000_000, annualDepreciationRate: 0.015 };

  it("正しい収入調整・不動産は通る", () => {
    expect(validatePlanInput({ ...fixedInput, incomeAdjustments: [adjustment], properties: [property] })).toEqual({ ok: true });
  });

  it("収入調整の割合は0〜100%、終了年は開始年以降", () => {
    const r = validatePlanInput({
      ...fixedInput,
      incomeAdjustments: [{ ...adjustment, ratio: 1.2 }, { ...adjustment, startYear: 2030, endYear: 2029 }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors["incomeAdjustments.0.ratio"]).toBe("給与の割合は0%〜100%の範囲で入力してください");
    expect(r.errors["incomeAdjustments.1.endYear"]).toBe("終了年は開始年以降にしてください");
  });

  it("不動産の購入価格・減価率を検証する", () => {
    const r = validatePlanInput({
      ...fixedInput,
      properties: [{ ...property, price: -1, annualDepreciationRate: 0.5 }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors["properties.0.price"]).toContain("購入価格");
    expect(r.errors["properties.0.annualDepreciationRate"]).toBe("年間の減価率は0%〜10%の範囲で入力してください");
  });
});
