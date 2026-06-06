/**
 * zod スキーマ。永続化された localStorage の状態を検証し、
 * 壊れたデータでクラッシュしないようにするために用いる。
 */

import { z } from "zod";

export const personSchema = z.object({
  name: z.string(),
  birthYear: z.number().int(),
  grossAnnualIncome: z.number(),
  incomeGrowthRate: z.number(),
  retirementAge: z.number().int(),
  pensionStartAge: z.number().int(),
  annualPension: z.number(),
});

export const childSchema = z.object({
  id: z.string(),
  name: z.string(),
  birthYear: z.number().int(),
});

export const lifeEventSchema = z.object({
  id: z.string(),
  year: z.number().int(),
  label: z.string(),
  amount: z.number(),
});

export const expenseSchema = z.object({
  baseAnnualLivingExpense: z.number(),
  inflationRate: z.number(),
});

export const assetSchema = z.object({
  initialAssets: z.number(),
  annualReturnRate: z.number(),
});

export const planInputSchema = z.object({
  startYear: z.number().int(),
  endYear: z.number().int(),
  self: personSchema,
  spouse: personSchema.nullable(),
  children: z.array(childSchema),
  expenses: expenseSchema,
  assets: assetSchema,
  events: z.array(lifeEventSchema),
});
