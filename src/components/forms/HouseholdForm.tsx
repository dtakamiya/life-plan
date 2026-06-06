"use client";

import type {
  Child,
  Person,
  SchoolType,
  UniversityType,
} from "@/lib/simulation/types";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { EDUCATION_PRESETS } from "@/lib/simulation/education";
import { NumberField, Section, SelectField, TextField } from "./fields";

const SCHOOL_OPTIONS: readonly SchoolType[] = ["公立", "私立"];
const UNIVERSITY_OPTIONS: readonly UniversityType[] = [
  "なし",
  "国公立",
  "私立文系",
  "私立理系",
];

/** 本人・配偶者で共通の個人入力欄。 */
function PersonFields({
  person,
  onChange,
}: {
  person: Person;
  onChange: (patch: Partial<Person>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField
        label="名前"
        value={person.name}
        onChange={(name) => onChange({ name })}
      />
      <NumberField
        label="生年（西暦）"
        value={person.birthYear}
        onChange={(birthYear) => onChange({ birthYear })}
      />
      <NumberField
        label="年収（税込）"
        suffix="円"
        step={100_000}
        value={person.grossAnnualIncome}
        onChange={(grossAnnualIncome) => onChange({ grossAnnualIncome })}
      />
      <NumberField
        label="退職年齢"
        suffix="歳"
        value={person.retirementAge}
        onChange={(retirementAge) => onChange({ retirementAge })}
      />
      <NumberField
        label="年金開始年齢"
        suffix="歳"
        value={person.pensionStartAge}
        onChange={(pensionStartAge) => onChange({ pensionStartAge })}
      />
      <NumberField
        label="年金（年額）"
        suffix="円"
        step={100_000}
        value={person.annualPension}
        onChange={(annualPension) => onChange({ annualPension })}
      />
      <NumberField
        label="退職一時金"
        hint="退職年齢で受取"
        suffix="円"
        step={1_000_000}
        value={person.retirementBenefit}
        onChange={(retirementBenefit) => onChange({ retirementBenefit })}
      />
    </div>
  );
}

/** 子1人分の入力（基本情報＋進路プラン）。 */
function ChildCard({
  child,
  onChange,
  onRemove,
}: {
  child: Child;
  onChange: (patch: Partial<Child>) => void;
  onRemove: () => void;
}) {
  const { education } = child;
  return (
    <div className="rounded-lg border border-slate-200 p-2">
      <div className="flex items-end gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <TextField
            label="名前"
            value={child.name}
            onChange={(name) => onChange({ name })}
          />
          <NumberField
            label="生年（西暦）"
            value={child.birthYear}
            onChange={(birthYear) => onChange({ birthYear })}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mb-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
        >
          削除
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {EDUCATION_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onChange({ education: preset.value })}
            className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <SelectField
          label="幼稚園"
          value={education.kindergarten}
          options={SCHOOL_OPTIONS}
          onChange={(v) => onChange({ education: { ...education, kindergarten: v } })}
        />
        <SelectField
          label="小学校"
          value={education.elementary}
          options={SCHOOL_OPTIONS}
          onChange={(v) => onChange({ education: { ...education, elementary: v } })}
        />
        <SelectField
          label="中学校"
          value={education.juniorHigh}
          options={SCHOOL_OPTIONS}
          onChange={(v) => onChange({ education: { ...education, juniorHigh: v } })}
        />
        <SelectField
          label="高校"
          value={education.highSchool}
          options={SCHOOL_OPTIONS}
          onChange={(v) => onChange({ education: { ...education, highSchool: v } })}
        />
        <SelectField
          label="大学"
          value={education.university}
          options={UNIVERSITY_OPTIONS}
          onChange={(v) => onChange({ education: { ...education, university: v } })}
        />
      </div>
    </div>
  );
}

export function HouseholdForm() {
  const input = usePlanStore((s) => s.input);
  const updateSelf = usePlanStore((s) => s.updateSelf);
  const updateSpouse = usePlanStore((s) => s.updateSpouse);
  const toggleSpouse = usePlanStore((s) => s.toggleSpouse);
  const { children } = input;
  const addChild = usePlanStore((s) => s.addChild);
  const updateChild = usePlanStore((s) => s.updateChild);
  const removeChild = usePlanStore((s) => s.removeChild);
  const setRange = usePlanStore((s) => s.setRange);

  return (
    <div className="space-y-4">
      <Section title="シミュレーション期間">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="開始年"
            value={input.startYear}
            onChange={(startYear) => setRange(startYear, input.endYear)}
          />
          <NumberField
            label="終了年"
            value={input.endYear}
            onChange={(endYear) => setRange(input.startYear, endYear)}
          />
        </div>
      </Section>

      <Section title="本人">
        <PersonFields person={input.self} onChange={updateSelf} />
      </Section>

      <Section
        title="配偶者"
        action={
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={input.spouse !== null}
              onChange={(e) => toggleSpouse(e.target.checked)}
            />
            あり
          </label>
        }
      >
        {input.spouse ? (
          <PersonFields person={input.spouse} onChange={updateSpouse} />
        ) : (
          <p className="text-xs text-slate-400">配偶者なし</p>
        )}
      </Section>

      <Section
        title="子"
        action={
          <button
            type="button"
            onClick={addChild}
            className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            ＋追加
          </button>
        }
      >
        {children.length === 0 ? (
          <p className="text-xs text-slate-400">子なし</p>
        ) : (
          <div className="space-y-2">
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onChange={(patch) => updateChild(child.id, patch)}
                onRemove={() => removeChild(child.id)}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
