"use client";

import {
  BASIC_PENSION_ANNUAL,
  estimateAnnualPension,
  type Person,
} from "@/features/plan/domain";
import { NumberField, PercentField, TextField } from "@/shared/ui";

/** これを超える年収は桁の入力ミスの可能性として注意を出す（円）。 */
const INCOME_DIGIT_WARNING = 100_000_000;

const PILL_CLASS =
  "rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-brand hover:bg-brand-50 hover:text-brand-700";

/** 本人・配偶者で共通の個人入力欄。 */
export function PersonFields({
  person,
  prefix,
  errors,
  onChange,
}: {
  person: Person;
  /** 検証エラーのパス接頭辞（"self" / "spouse"）。 */
  prefix: "self" | "spouse";
  errors: Record<string, string>;
  onChange: (patch: Partial<Person>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextField
        label="名前"
        value={person.name}
        onChange={(name) => onChange({ name })}
      />
      <NumberField
        label="生年（西暦）"
        error={errors[`${prefix}.birthYear`]}
        value={person.birthYear}
        onChange={(birthYear) => onChange({ birthYear })}
      />
      <NumberField
        label="年収（税込）"
        suffix="円"
        grouped
        step={100_000}
        error={errors[`${prefix}.grossAnnualIncome`]}
        hint={
          person.grossAnnualIncome > INCOME_DIGIT_WARNING
            ? "桁は合っていますか？（1億円超）"
            : undefined
        }
        value={person.grossAnnualIncome}
        onChange={(grossAnnualIncome) => onChange({ grossAnnualIncome })}
      />
      <PercentField
        label="年収上昇率"
        signed
        hint="昇給が見込めない場合は0%"
        error={errors[`${prefix}.incomeGrowthRate`]}
        value={person.incomeGrowthRate}
        onChange={(incomeGrowthRate) => onChange({ incomeGrowthRate })}
      />
      <NumberField
        label="退職年齢"
        suffix="歳"
        error={errors[`${prefix}.retirementAge`]}
        value={person.retirementAge}
        onChange={(retirementAge) => onChange({ retirementAge })}
      />
      <NumberField
        label="年金開始年齢"
        suffix="歳"
        error={errors[`${prefix}.pensionStartAge`]}
        value={person.pensionStartAge}
        onChange={(pensionStartAge) => onChange({ pensionStartAge })}
      />
      <NumberField
        label="年金（年額）"
        suffix="円"
        grouped
        step={100_000}
        error={errors[`${prefix}.annualPension`]}
        value={person.annualPension}
        onChange={(annualPension) => onChange({ annualPension })}
      />
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <span className="text-[11px] text-ink-mute">年金の目安:</span>
        <button
          type="button"
          className={PILL_CLASS}
          onClick={() =>
            onChange({ annualPension: estimateAnnualPension(person.grossAnnualIncome) })
          }
        >
          厚生年金あり（概算）
        </button>
        <button
          type="button"
          className={PILL_CLASS}
          onClick={() => onChange({ annualPension: BASIC_PENSION_ANNUAL })}
        >
          国民年金のみ
        </button>
      </div>
      <NumberField
        label="退職一時金"
        hint="退職年齢で受取"
        help="retirementIncomeTax"
        suffix="円"
        grouped
        step={1_000_000}
        error={errors[`${prefix}.retirementBenefit`]}
        value={person.retirementBenefit}
        onChange={(retirementBenefit) => onChange({ retirementBenefit })}
      />
    </div>
  );
}
