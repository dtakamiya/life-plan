/**
 * zod スキーマ。永続化された localStorage の状態を検証し、
 * 壊れたデータでクラッシュしないようにするために用いる。
 */

import { z } from "zod";
import { DEFAULT_EDUCATION } from "@/features/plan/domain";

const schoolTypeSchema = z.enum(["公立", "私立"]);
const universityTypeSchema = z.enum(["なし", "国公立", "私立文系", "私立理系"]);

export const educationSchema = z.object({
  kindergarten: schoolTypeSchema,
  elementary: schoolTypeSchema,
  juniorHigh: schoolTypeSchema,
  highSchool: schoolTypeSchema,
  university: universityTypeSchema,
});

export const personSchema = z.object({
  name: z.string(),
  birthYear: z.number().int(),
  grossAnnualIncome: z.number(),
  incomeGrowthRate: z.number(),
  retirementAge: z.number().int(),
  pensionStartAge: z.number().int(),
  annualPension: z.number(),
  // 既存の保存データ（retirementBenefit を持たない person）でも検証を通す。
  retirementBenefit: z.number().default(0),
});

export const childSchema = z.object({
  id: z.string(),
  name: z.string(),
  birthYear: z.number().int(),
  // 既存の保存データ（education を持たない子）でも検証を通すため既定値を補う。
  education: educationSchema.default(DEFAULT_EDUCATION),
});

export const lifeEventSchema = z.object({
  id: z.string(),
  year: z.number().int(),
  label: z.string(),
  amount: z.number(),
});

export const recurringExpenseSchema = z.object({
  id: z.string(),
  label: z.string(),
  startYear: z.number().int(),
  endYear: z.number().int(),
  annualAmount: z.number(),
});

export const loanSchema = z.object({
  id: z.string(),
  label: z.string(),
  startYear: z.number().int(),
  principal: z.number(),
  annualRate: z.number(),
  termYears: z.number().int(),
  // 住宅ローン控除の対象か。既存の保存データ（当フィールドを持たない）は対象外として通す。
  taxCredit: z.boolean().optional(),
});

export const incomeAdjustmentSchema = z.object({
  id: z.string(),
  person: z.enum(["self", "spouse"]),
  label: z.string(),
  startYear: z.number().int(),
  endYear: z.number().int(),
  ratio: z.number(),
  nonTaxable: z.boolean(),
});

export const propertySchema = z.object({
  id: z.string(),
  label: z.string(),
  purchaseYear: z.number().int(),
  price: z.number(),
  annualDepreciationRate: z.number(),
});

export const expenseSchema = z.object({
  baseAnnualLivingExpense: z.number(),
  inflationRate: z.number(),
});

// 旧フィールド initialAssets を taxableAssets へ移行しつつ、新フィールドは
// 既定値で補う（既存の v1 保存データを壊さないため）。
export const assetSchema = z
  .object({
    taxableAssets: z.number().optional(),
    initialAssets: z.number().optional(),
    taxFreeAssets: z.number().default(0),
    annualReturnRate: z.number(),
    // 配当・分配金の年間利回り。既存の保存データ（当フィールドを持たない）
    // でも検証を通すため既定値 0 で補う。
    annualDividendYield: z.number().default(0),
    annualTaxFreeContribution: z.number().default(0),
  })
  .transform((a) => ({
    taxableAssets: a.taxableAssets ?? a.initialAssets ?? 0,
    taxFreeAssets: a.taxFreeAssets,
    annualReturnRate: a.annualReturnRate,
    annualDividendYield: a.annualDividendYield,
    annualTaxFreeContribution: a.annualTaxFreeContribution,
  }));

export const planInputSchema = z.object({
  startYear: z.number().int(),
  endYear: z.number().int(),
  self: personSchema,
  spouse: personSchema.nullable(),
  children: z.array(childSchema),
  expenses: expenseSchema,
  assets: assetSchema,
  events: z.array(lifeEventSchema),
  // 既存の保存データ（recurringExpenses を持たない v1）でも検証を通すため既定で空配列。
  recurringExpenses: z.array(recurringExpenseSchema).default([]),
  // 既存の保存データ（loans を持たない v1）でも検証を通すため既定で空配列。
  loans: z.array(loanSchema).default([]),
  // 子育て共働きペルソナレビュー #2・#3 で追加。既存の保存データでも通すため既定で空配列。
  incomeAdjustments: z.array(incomeAdjustmentSchema).default([]),
  properties: z.array(propertySchema).default([]),
});

/**
 * スナップショットの由来。ゲームモードで作られたものは乱数由来の数値を含むため、
 * 恒久的に標識して本体のシナリオと区別できるようにする。
 * 既存の保存データ（origin を持たない）は "manual" として通す。
 */
export const snapshotOriginSchema = z.enum(["manual", "game"]).default("manual");

export const snapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: planInputSchema,
  origin: snapshotOriginSchema,
});

/* -------------------------------------------------------------------------
 * 入力バリデーション（lp-005）
 *
 * 上の永続化スキーマは「壊れた保存データでクラッシュしない」ための緩い検証で、
 * 範囲は見ない（保存済みデータを不用意に捨てないため）。ここから下は
 * フォーム入力を `runSimulation` に渡す前に通す厳格な検証で、範囲・型・有限性を
 * 見る。両者は別物であり、v1 保存データの移行（initialAssets → taxableAssets 等）は
 * 上の永続化スキーマの責務のまま変えない。
 * ---------------------------------------------------------------------- */

/** 入力値の許容範囲。各上下限の根拠は下記コメントを参照。 */
export const INPUT_LIMITS = {
  /**
   * 西暦年。1900 は存命の最高齢層の生年を、2100 は本ツールの想定する
   * シミュレーション終端・将来の出生を十分に含む上限。年としてありえない値
   * （0 年・5 桁など）と桁ミスを弾く。
   */
  year: { min: 1900, max: 2100 },
  /** 年齢。0 歳〜120 歳（人の寿命の実質的な上限）。 */
  age: { min: 0, max: 120 },
  /**
   * 年金の受給開始年齢。公的年金の繰上げは 60 歳、繰下げは 75 歳までが制度上の
   * 範囲のため、一般の年齢範囲（0〜120）の特例として 60〜75 に限る。
   */
  pensionStartAge: { min: 60, max: 75 },
  /**
   * 率（小数）。-100%〜+100%。-100% は全損・全額下落、+100% は 1 年で倍増で、
   * 現実の利回り・物価・金利・昇給率はこの範囲に収まる。%と小数の取り違え
   * （例: 3 を 3% のつもりで小数入力 = 300%）による暴走を弾く。
   */
  rate: { min: -1, max: 1 },
  /**
   * 金額（円）。0〜1 兆円。個人・世帯の資産・収入・支出として十分大きく、
   * かつ倍精度浮動小数で年次計算を積み上げても桁落ち・オーバーフローしない上限。
   */
  amount: { min: 0, max: 1e12 },
  /**
   * 収支が符号を持つ金額（ライフイベント）。絶対値の上限は金額と同じ 1 兆円。
   */
  signedAmount: { min: -1e12, max: 1e12 },
  /** ローン返済期間（年）。1 年〜50 年（住宅ローンの最長は 35〜50 年）。 */
  termYears: { min: 1, max: 50 },
} as const;

type Range = { readonly min: number; readonly max: number };

const yenFormat = (n: number) => `${n.toLocaleString("en-US")}円`;
const percentFormat = (n: number) => `${Math.round(n * 1000) / 10}%`;

function boundedNumber(
  label: string,
  range: Range,
  opts: { int?: boolean; format?: (n: number) => string } = {},
) {
  const format = opts.format ?? String;
  const rangeMessage = `${label}は${format(range.min)}〜${format(range.max)}の範囲で入力してください`;
  const typeMessage = `${label}は数値で入力してください`;
  let schema = z
    .number({ required_error: `${label}を入力してください`, invalid_type_error: typeMessage })
    .finite(typeMessage);
  if (opts.int) schema = schema.int(`${label}は整数で入力してください`);
  return schema.min(range.min, rangeMessage).max(range.max, rangeMessage);
}

const yearField = (label: string) => boundedNumber(label, INPUT_LIMITS.year, { int: true });
// lp-031: 終了年齢の入力検証（HouseholdForm）でも同じ範囲を使うため export する。
export const ageField = (label: string) => boundedNumber(label, INPUT_LIMITS.age, { int: true });
const rateField = (label: string) =>
  boundedNumber(label, INPUT_LIMITS.rate, { format: percentFormat });
const amountField = (label: string) =>
  boundedNumber(label, INPUT_LIMITS.amount, { format: yenFormat });

const personValidationSchema = z.object({
  name: z.string(),
  birthYear: yearField("生年"),
  grossAnnualIncome: amountField("年収"),
  incomeGrowthRate: rateField("年収上昇率"),
  retirementAge: ageField("退職年齢"),
  pensionStartAge: boundedNumber("年金開始年齢", INPUT_LIMITS.pensionStartAge, {
    int: true,
    format: (n) => `${n}歳`,
  }),
  annualPension: amountField("年金（年額）"),
  retirementBenefit: amountField("退職一時金"),
});

const RANGE_ORDER_MESSAGE = "終了年は開始年以降にしてください";

/** 入力値（PlanInput 形）の厳格な検証スキーマ。 */
export const planInputValidationSchema = z
  .object({
    startYear: yearField("開始年"),
    endYear: yearField("終了年"),
    self: personValidationSchema,
    spouse: personValidationSchema.nullable(),
    children: z.array(z.object({ id: z.string(), name: z.string(), birthYear: yearField("生年"), education: educationSchema })),
    expenses: z.object({
      baseAnnualLivingExpense: amountField("基礎生活費（年額）"),
      inflationRate: rateField("物価上昇率"),
    }),
    assets: z.object({
      taxableAssets: amountField("課税口座 初期資産"),
      taxFreeAssets: amountField("非課税口座 初期資産"),
      annualReturnRate: rateField("運用利回り"),
      annualDividendYield: boundedNumber("配当利回り", { min: 0, max: INPUT_LIMITS.rate.max }, { format: percentFormat }),
      annualTaxFreeContribution: amountField("非課税口座へ年間積立"),
    }),
    events: z.array(
      z.object({
        id: z.string(),
        year: yearField("年"),
        label: z.string(),
        // 収入(+)・支出(−)の両方を取るため符号あり。
        amount: boundedNumber("金額", INPUT_LIMITS.signedAmount, { format: yenFormat }),
      }),
    ),
    recurringExpenses: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          startYear: yearField("開始年"),
          endYear: yearField("終了年"),
          annualAmount: amountField("年額"),
        })
        .superRefine((r, ctx) => {
          if (r.endYear < r.startYear) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endYear"], message: RANGE_ORDER_MESSAGE });
          }
        }),
    ),
    loans: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        startYear: yearField("返済開始年"),
        principal: amountField("借入額"),
        annualRate: rateField("金利"),
        termYears: boundedNumber("返済期間", INPUT_LIMITS.termYears, { int: true, format: (n) => `${n}年` }),
        taxCredit: z.boolean().optional(),
      }),
    ),
    incomeAdjustments: z
      .array(
        z
          .object({
            id: z.string(),
            person: z.enum(["self", "spouse"]),
            label: z.string(),
            startYear: yearField("開始年"),
            endYear: yearField("終了年"),
            ratio: boundedNumber("給与の割合", { min: 0, max: 1 }, { format: percentFormat }),
            nonTaxable: z.boolean(),
          })
          .superRefine((r, ctx) => {
            if (r.endYear < r.startYear) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endYear"], message: RANGE_ORDER_MESSAGE });
            }
          }),
      )
      .optional(),
    properties: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          purchaseYear: yearField("購入年"),
          price: amountField("購入価格"),
          annualDepreciationRate: boundedNumber("年間の減価率", { min: 0, max: 0.1 }, { format: percentFormat }),
        }),
      )
      .optional(),
  })
  .superRefine((p, ctx) => {
    if (p.endYear < p.startYear) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endYear"], message: RANGE_ORDER_MESSAGE });
    }
  });

/** フィールドのパス（例: `self.retirementAge` / `loans.0.termYears`）→ 日本語エラー。 */
export type PlanInputErrors = Record<string, string>;

export type PlanInputValidation =
  | { ok: true }
  | { ok: false; errors: PlanInputErrors };

/** 例外を投げず、戻り値で検証結果を返す。同一パスは先頭のメッセージを採用する。 */
export function validatePlanInput(input: unknown): PlanInputValidation {
  const parsed = planInputValidationSchema.safeParse(input);
  if (parsed.success) return { ok: true };
  const errors: PlanInputErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
