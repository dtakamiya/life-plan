import { describe, it, expect } from "vitest";
import {
  PLAN_FILE_FORMAT,
  PLAN_FILE_VERSION,
  parsePlanFile,
  planFileName,
  serializePlan,
} from "./planFile";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";

const rich = (): PlanInput => ({
  ...structuredClone(defaultPlanInput),
  children: [
    {
      id: "c1",
      name: "長男",
      birthYear: 2024,
      education: {
        kindergarten: "私立",
        elementary: "公立",
        juniorHigh: "私立",
        highSchool: "公立",
        university: "私立理系",
      },
    },
  ],
  events: [{ id: "e1", year: 2030, label: "車", amount: -3_000_000 }],
  loans: [{ id: "l1", label: "住宅", startYear: 2027, principal: 40_000_000, annualRate: 0.015, termYears: 35 }],
  recurringExpenses: [{ id: "r1", label: "習い事", startYear: 2028, endYear: 2035, annualAmount: 240_000 }],
});

describe("プランJSON往復", () => {
  it.each([["既定", () => structuredClone(defaultPlanInput)], ["子・ローン・イベント入り", rich]])(
    "%s: export→import で完全一致する",
    (_n, make) => {
      const input = make();
      const r = parsePlanFile(serializePlan(input));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.input).toEqual(input);
    },
  );

  it("配偶者なし（null）も往復できる", () => {
    const input = { ...structuredClone(defaultPlanInput), spouse: null };
    const r = parsePlanFile(serializePlan(input));
    expect(r.ok && r.input).toEqual(input);
  });

  it("ファイルにフォーマット名とバージョン番号を持つ", () => {
    const f = JSON.parse(serializePlan(defaultPlanInput));
    expect(f.format).toBe(PLAN_FILE_FORMAT);
    expect(f.version).toBe(PLAN_FILE_VERSION);
    expect(f.input).toEqual(defaultPlanInput);
  });

  it("ファイル名は日付入り", () => {
    expect(planFileName(new Date(2026, 8, 5))).toBe("life-plan-2026-09-05.json");
  });
});

describe("旧版（v1）の読み込み", () => {
  it("封筒なし・initialAssets/欠損フィールドの旧 PlanInput を既存移行で通す", () => {
    const legacy = JSON.parse(JSON.stringify(defaultPlanInput));
    legacy.assets = { initialAssets: 12_345_678, annualReturnRate: 0.03 };
    delete legacy.loans;
    delete legacy.recurringExpenses;
    delete legacy.self.retirementBenefit;
    const r = parsePlanFile(JSON.stringify(legacy));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.assets.taxableAssets).toBe(12_345_678);
    expect(r.input.assets.taxFreeAssets).toBe(0);
    expect(r.input.loans).toEqual([]);
    expect(r.input.self.retirementBenefit).toBe(0);
  });

  it("封筒付き v1 でも旧フィールドを移行する", () => {
    const legacy = JSON.parse(JSON.stringify(defaultPlanInput));
    legacy.assets = { initialAssets: 1000, annualReturnRate: 0.02 };
    const r = parsePlanFile(JSON.stringify({ format: PLAN_FILE_FORMAT, version: 1, input: legacy }));
    expect(r.ok && r.input.assets.taxableAssets).toBe(1000);
  });
});

describe("不正ファイル（日本語エラー・失敗として返す）", () => {
  const expectError = (text: string, re: RegExp) => {
    const r = parsePlanFile(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(re);
  };

  it("空ファイル・空白のみ", () => {
    expectError("", /空/);
    expectError("  \n ", /空/);
  });
  it("不正 JSON", () => expectError("{not json", /JSON として読み取れません/));
  it("配列・プリミティブ", () => {
    expectError("[]", /形式ではありません/);
    expectError("42", /形式ではありません/);
    expectError("null", /形式ではありません/);
  });
  it("別アプリの封筒", () => expectError(JSON.stringify({ format: "other", version: 1, input: {} }), /書き出したプランのファイルではありません/));
  it("バージョン不正・未来版", () => {
    expectError(JSON.stringify({ format: PLAN_FILE_FORMAT, version: "1", input: defaultPlanInput }), /バージョン番号が不正/);
    expectError(JSON.stringify({ format: PLAN_FILE_FORMAT, version: 0, input: defaultPlanInput }), /バージョン番号が不正/);
    expectError(JSON.stringify({ format: PLAN_FILE_FORMAT, version: 999, input: defaultPlanInput }), /新しいバージョン/);
  });
  it("input 欠損・欠損キー", () => {
    expectError(JSON.stringify({ format: PLAN_FILE_FORMAT, version: 1 }), /正しくありません/);
    const bad = JSON.parse(JSON.stringify(defaultPlanInput));
    delete bad.self;
    expectError(JSON.stringify({ format: PLAN_FILE_FORMAT, version: 1, input: bad }), /self/);
  });
  it("型違反", () => {
    const bad = JSON.parse(JSON.stringify(defaultPlanInput));
    bad.self.grossAnnualIncome = "たくさん";
    expectError(serializeRaw(bad), /正しくありません/);
  });
  it("巨大数値・非有限は範囲エラー", () => {
    const big = JSON.parse(JSON.stringify(defaultPlanInput));
    big.assets.taxableAssets = 1e300;
    expectError(serializeRaw(big), /課税口座 初期資産.*範囲/);
    // 1e999 は JSON.parse で Infinity になる
    const text = serializeRaw(defaultPlanInput).replace(
      `"grossAnnualIncome":${defaultPlanInput.self.grossAnnualIncome}`,
      `"grossAnnualIncome":1e999`,
    );
    expect(text).toContain("1e999");
    expectError(text, /年収/);
  });
  it("終了年 < 開始年", () => {
    const bad = { ...structuredClone(defaultPlanInput), startYear: 2050, endYear: 2040 };
    expectError(serializePlan(bad), /終了年は開始年以降/);
  });
});

function serializeRaw(input: unknown) {
  return JSON.stringify({ format: PLAN_FILE_FORMAT, version: 1, input });
}
