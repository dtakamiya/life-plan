/** plan/domain の公開 API。他機能・app・旧ディレクトリ・同一機能の他層からはこの index 経由で import する。 */
export { correctDateRange, type DateRangeCorrection } from "./dateRange";
export { defaultPlanInput, singleRenterPlanInput } from "./defaults";
export {
  BASE_CHILD_ANNUAL_COST,
  CHILD_DEPENDENT_MAX_AGE,
  DEFAULT_EDUCATION,
  EDUCATION_PRESETS,
  childAnnualCost,
  educationCostAtAge,
} from "./education";
export { DEFAULT_END_AGE, endAgeToEndYear, endYearToEndAge } from "./endAge";
export {
  HOME_PROPERTY_LABEL,
  HOUSEHOLD_DEFAULT_CONSTANTS,
  HOUSING_PURCHASE_EVENT_LABEL,
  computeHouseholdDefaults,
  type HouseholdComposition,
  type HouseholdDefaultEvent,
  type HouseholdDefaultLoan,
  type HouseholdDefaultProperty,
  type HouseholdDefaults,
} from "./householdDefaults";
export { annualLoanPayment, loanBalanceForYear, loanPaymentForYear } from "./loan";
export {
  BASIC_PENSION_ANNUAL,
  EARNINGS_RELATED_CAP,
  EARNINGS_RELATED_FACTOR,
  estimateAnnualPension,
} from "./pension";
export {
  DEFAULT_PROPERTY_DEPRECIATION_RATE,
  PROPERTY_VALUE_FLOOR_RATIO,
  propertyValueForYear,
} from "./property";
export type { Child, Education, SchoolType, UniversityType } from "./education";
export type { IncomeAdjustment } from "./incomeAdjustment";
export type { LifeEvent } from "./lifeEvent";
export type { Loan } from "./loan";
export type { Person } from "./person";
export type { PlanInput } from "./planInput";
export type { Property } from "./property";
export type { RecurringExpense } from "./recurringExpense";
export type { AssetSettings, ExpenseSettings } from "./settings";
