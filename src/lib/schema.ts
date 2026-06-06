/**
 * zod スキーマ。永続化された localStorage の状態を検証し、
 * 壊れたデータでクラッシュしないようにするために用いる。
 */

import { z } from "zod";
import { DEFAULT_EDUCATION } from "@/lib/simulation/education";

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

export const loanSchema = z.object({
  id: z.string(),
  label: z.string(),
  startYear: z.number().int(),
  principal: z.number(),
  annualRate: z.number(),
  termYears: z.number().int(),
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
    annualTaxFreeContribution: z.number().default(0),
  })
  .transform((a) => ({
    taxableAssets: a.taxableAssets ?? a.initialAssets ?? 0,
    taxFreeAssets: a.taxFreeAssets,
    annualReturnRate: a.annualReturnRate,
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
  // 既存の保存データ（loans を持たない v1）でも検証を通すため既定で空配列。
  loans: z.array(loanSchema).default([]),
});
