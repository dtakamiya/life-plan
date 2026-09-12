import { describe, it, expect } from "vitest";
import { buildAssumptionRows } from "./assumptions";
import { runSimulation } from "./simulation/engine";
import { formatYen } from "./format";
import type { PlanInput } from "./simulation/types";
import {
  CAPITAL_GAINS_RATE,
  INCOME_TAX_BRACKETS,
  RESIDENCE_TAX_RATE,
  BASIC_DEDUCTION,
} from "./simulation/tax";
import {
  SOCIAL_INSURANCE_RATE,
  SOCIAL_INSURANCE_INCOME_CAP,
} from "./simulation/socialInsurance";
import {
  BASIC_PENSION_ANNUAL,
  EARNINGS_RELATED_FACTOR,
  EARNINGS_RELATED_CAP,
} from "./simulation/pension";

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: 2030,
    endYear: 2032,
    self: {
      name: "本人",
      birthYear: 2000,
      grossAnnualIncome: 5_000_000,
      incomeGrowthRate: 0,
      retirementAge: 65,
      pensionStartAge: 65,
      annualPension: 1_000_000,
      retirementBenefit: 0,
    },
    spouse: null,
    children: [],
    expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0.015 },
    assets: {
      taxableAssets: 1_000_000,
      taxFreeAssets: 0,
      annualReturnRate: 0.04,
      annualTaxFreeContribution: 0,
    },
    events: [],
    recurringExpenses: [],
    loans: [],
    ...overrides,
  };
}

describe("buildAssumptionRows", () => {
  it("returns one row per assumption with label/value/note fields", () => {
    const rows = buildAssumptionRows(makeInput());
    expect(rows).toHaveLength(8);
    for (const row of rows) {
      expect(typeof row.label).toBe("string");
      expect(row.label.length).toBeGreaterThan(0);
      expect(typeof row.value).toBe("string");
      expect(row.value.length).toBeGreaterThan(0);
      expect(typeof row.note).toBe("string");
      expect(row.note.length).toBeGreaterThan(0);
    }
    expect(rows.map((r) => r.label)).toEqual([
      "物価上昇率（インフレ）",
      "資産運用の年間リターン",
      "所得税の税率区分",
      "住民税率",
      "基礎控除",
      "運用益への課税率",
      "社会保険料率",
      "年金の概算方式",
    ]);
  });

  it("reflects the input inflation rate as a percent string", () => {
    const rows = buildAssumptionRows(makeInput({ expenses: { baseAnnualLivingExpense: 0, inflationRate: 0.025 } }));
    const row = rows.find((r) => r.label === "物価上昇率（インフレ）")!;
    expect(row.value).toBe("2.5%");
    expect(row.note).toContain("入力値");
  });

  it("reflects the input return rate as a percent string", () => {
    const rows = buildAssumptionRows(
      makeInput({
        assets: {
          taxableAssets: 0,
          taxFreeAssets: 0,
          annualReturnRate: 0.07,
          annualTaxFreeContribution: 0,
        },
      }),
    );
    const row = rows.find((r) => r.label === "資産運用の年間リターン")!;
    expect(row.value).toBe("7.0%");
  });

  it("summarizes the income tax brackets from the actual constant", () => {
    const rows = buildAssumptionRows(makeInput());
    const row = rows.find((r) => r.label === "所得税の税率区分")!;
    const first = `${(INCOME_TAX_BRACKETS[0].rate * 100).toFixed(1)}%`;
    const last = `${(INCOME_TAX_BRACKETS[INCOME_TAX_BRACKETS.length - 1].rate * 100).toFixed(1)}%`;
    expect(row.value).toBe(
      `${first}〜${last}（${INCOME_TAX_BRACKETS.length}区分の簡易累進）`,
    );
    expect(row.value).toBe("5.0%〜45.0%（7区分の簡易累進）");
    expect(row.note).toContain("INCOME_TAX_BRACKETS");
  });

  it("shows the residence tax rate from the actual constant", () => {
    const row = buildAssumptionRows(makeInput()).find((r) => r.label === "住民税率")!;
    expect(row.value).toBe(`${(RESIDENCE_TAX_RATE * 100).toFixed(1)}%`);
    expect(row.value).toBe("10.0%");
  });

  it("shows the basic deduction from the actual constant", () => {
    const row = buildAssumptionRows(makeInput()).find((r) => r.label === "基礎控除")!;
    expect(row.value).toBe(formatYen(BASIC_DEDUCTION));
    expect(row.value).toBe(formatYen(480_000));
  });

  it("shows the capital gains rate from the actual constant", () => {
    const row = buildAssumptionRows(makeInput()).find((r) => r.label === "運用益への課税率")!;
    expect(row.value).toBe(`${(CAPITAL_GAINS_RATE * 100).toFixed(1)}%`);
    expect(row.value).toBe("20.3%");
    expect(row.note).toContain("非課税口座");
  });

  it("shows the social insurance rate and income cap from the actual constants", () => {
    const row = buildAssumptionRows(makeInput()).find((r) => r.label === "社会保険料率")!;
    expect(row.value).toBe(`${(SOCIAL_INSURANCE_RATE * 100).toFixed(1)}%`);
    expect(row.value).toBe("15.0%");
    expect(row.note).toContain(formatYen(SOCIAL_INSURANCE_INCOME_CAP));
    expect(SOCIAL_INSURANCE_INCOME_CAP).toBe(12_000_000);
  });

  it("describes the pension formula from the actual constants and notes it is a pension.ts estimate", () => {
    const row = buildAssumptionRows(makeInput()).find((r) => r.label === "年金の概算方式")!;
    expect(row.value).toBe(
      `基礎年金 ${formatYen(BASIC_PENSION_ANNUAL)}（定額）＋ 現役年収 × ${(
        EARNINGS_RELATED_FACTOR * 100
      ).toFixed(1)}%（上限 ${formatYen(EARNINGS_RELATED_CAP)}）`,
    );
    expect(row.value).toContain(`基礎年金 ${formatYen(780_000)}（定額）`);
    expect(row.value).toContain("× 12.0%");
    expect(row.value).toContain(`上限 ${formatYen(1_500_000)}`);
    expect(row.note).toContain("pension.ts");
    expect(BASIC_PENSION_ANNUAL).toBe(780_000);
    expect(EARNINGS_RELATED_CAP).toBe(1_500_000);
  });

  it("is a pure function: does not mutate the input", () => {
    const input = makeInput({
      children: [
        {
          id: "c1",
          name: "子",
          birthYear: 2025,
          education: {
            kindergarten: "公立",
            elementary: "公立",
            juniorHigh: "公立",
            highSchool: "公立",
            university: "国公立",
          },
        },
      ],
    });
    const snapshot = JSON.parse(JSON.stringify(input));
    buildAssumptionRows(input);
    expect(input).toEqual(snapshot);
  });

  it("returns equal rows for equal inputs (referential transparency)", () => {
    const a = buildAssumptionRows(makeInput());
    const b = buildAssumptionRows(makeInput());
    expect(a).toEqual(b);
  });
});

describe("assumptions panel does not affect simulation output", () => {
  it("runSimulation yearly series is identical whether or not buildAssumptionRows is called", () => {
    const input = makeInput({ startYear: 2030, endYear: 2080 });

    const before = runSimulation(input);

    // パネル表示ロジックを走らせる（入力を共有）。
    const rows = buildAssumptionRows(input);
    expect(rows.length).toBeGreaterThan(0);

    const after = runSimulation(input);

    expect(after).toEqual(before);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
  });

  it("buildAssumptionRows shares the same input object with runSimulation without side effects", () => {
    const input = makeInput({
      startYear: 2030,
      endYear: 2060,
      spouse: {
        name: "配偶者",
        birthYear: 2002,
        grossAnnualIncome: 3_000_000,
        incomeGrowthRate: 0.01,
        retirementAge: 65,
        pensionStartAge: 65,
        annualPension: 900_000,
        retirementBenefit: 0,
      },
      loans: [
        {
          id: "l1",
          label: "住宅ローン",
          startYear: 2032,
          principal: 30_000_000,
          annualRate: 0.012,
          termYears: 35,
        },
      ],
      events: [{ id: "e1", year: 2035, label: "頭金", amount: -5_000_000 }],
    });

    const baseline = runSimulation(input);
    buildAssumptionRows(input);
    buildAssumptionRows(input);
    const rerun = runSimulation(input);

    expect(rerun).toEqual(baseline);
  });
});
