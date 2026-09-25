/**
 * ライフプランの入力（集約ルート）。
 * 金額はすべて「円」、率は小数（例: 1% = 0.01）で表す。
 */

import type { Child } from "./education";
import type { IncomeAdjustment } from "./incomeAdjustment";
import type { LifeEvent } from "./lifeEvent";
import type { Loan } from "./loan";
import type { Person } from "./person";
import type { Property } from "./property";
import type { RecurringExpense } from "./recurringExpense";
import type { AssetSettings, ExpenseSettings } from "./settings";

export type PlanInput = {
  startYear: number;
  endYear: number;
  self: Person;
  spouse: Person | null;
  children: Child[];
  expenses: ExpenseSettings;
  assets: AssetSettings;
  events: LifeEvent[];
  recurringExpenses: RecurringExpense[];
  loans: Loan[];
  /** 期間付きの収入調整（育休・時短など）。未指定は調整なし */
  incomeAdjustments?: IncomeAdjustment[];
  /** 不動産。未指定は保有なし */
  properties?: Property[];
};
