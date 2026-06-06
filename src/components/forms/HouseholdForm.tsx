"use client";

import type { Person } from "@/lib/simulation/types";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { NumberField, Section, TextField } from "./fields";

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
              <div key={child.id} className="flex items-end gap-2">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <TextField
                    label="名前"
                    value={child.name}
                    onChange={(name) => updateChild(child.id, { name })}
                  />
                  <NumberField
                    label="生年（西暦）"
                    value={child.birthYear}
                    onChange={(birthYear) => updateChild(child.id, { birthYear })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeChild(child.id)}
                  className="mb-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
