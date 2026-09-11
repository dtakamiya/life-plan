"use client";

import type {
  Child,
  Person,
  SchoolType,
  UniversityType,
} from "@/lib/simulation/types";
import { useRef, useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { EDUCATION_PRESETS } from "@/lib/simulation/education";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
    <div className="rounded-xl border border-line bg-paper/40 p-3">
      <div className="flex items-end gap-2">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
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
        <Button variant="danger" size="sm" onClick={onRemove} className="mb-px">
          削除
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {EDUCATION_PRESETS.map((preset) => {
          // lp-ui-ux-audit-fix / FR5.1: 現在の進路と一致するプリセットを
          // 選択中として aria-pressed + 視覚的ハイライトで示す。
          const isSelected =
            JSON.stringify(education) === JSON.stringify(preset.value);
          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange({ education: preset.value })}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                isSelected
                  ? "border-brand bg-brand-50 font-medium text-brand-700"
                  : "border-line bg-surface text-ink-soft hover:border-brand hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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

  // lp-ui-ux-audit-fix / FR4.1: 子カードの削除は確認ダイアログを経由する
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  return (
    <div className="space-y-4">
      <Section title="シミュレーション期間">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          // lp-ui-ux-audit-fix / FR7.1: StageCard のカード選択・教育プリセットの
          // ピル型ボタンと視覚的に揃える（native checkbox は sr-only で維持）。
          <label
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              input.spouse !== null
                ? "border-brand bg-brand-50 text-brand-700"
                : "border-line bg-surface text-ink-soft hover:border-brand hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            <input
              type="checkbox"
              checked={input.spouse !== null}
              onChange={(e) => toggleSpouse(e.target.checked)}
              className="sr-only"
            />
            配偶者あり
          </label>
        }
      >
        {input.spouse ? (
          <PersonFields person={input.spouse} onChange={updateSpouse} />
        ) : (
          <p className="text-xs text-ink-mute">配偶者なし</p>
        )}
      </Section>

      <Section
        title="子"
        action={
          <Button variant="primary" size="sm" onClick={addChild}>
            ＋追加
          </Button>
        }
      >
        {children.length === 0 ? (
          <p className="text-xs text-ink-mute">子なし</p>
        ) : (
          <div className="space-y-2">
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onChange={(patch) => updateChild(child.id, patch)}
                onRemove={() => {
                  setPendingDeleteId(child.id);
                  confirmRef.current?.open();
                }}
              />
            ))}
          </div>
        )}
      </Section>

      <ConfirmDialog
        ref={confirmRef}
        title="この子の情報を削除しますか？"
        description="削除すると元に戻せません。"
        onConfirm={() => {
          if (pendingDeleteId) removeChild(pendingDeleteId);
        }}
      />
    </div>
  );
}
