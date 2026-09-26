"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "./usePlanStore";
import {
  DEFAULT_END_AGE,
  endAgeToEndYear,
  endYearToEndAge,
} from "@/features/plan/domain";
import { ageField } from "@/features/plan/application";
import { Button, ConfirmDialog, NumberField, Section, type ConfirmDialogHandle } from "@/shared/ui";
import { usePlanErrors } from "./usePlanErrors";
import { PersonFields } from "./PersonFields";
import { ChildCard } from "./ChildCard";

const endAgeValidationSchema = ageField("終了年齢");

export function HouseholdForm() {
  const input = usePlanStore((s) => s.input);
  const updateSelf = usePlanStore((s) => s.updateSelf);
  const updateSpouse = usePlanStore((s) => s.updateSpouse);
  const toggleSpouse = usePlanStore((s) => s.toggleSpouse);
  const { children } = input;
  const errors = usePlanErrors();
  const addChild = usePlanStore((s) => s.addChild);
  const updateChild = usePlanStore((s) => s.updateChild);
  const removeChild = usePlanStore((s) => s.removeChild);
  const setRange = usePlanStore((s) => s.setRange);
  // lp-019 / QA#1: setRange・永続化復元での期間自動補正をユーザーへ知らせる
  const rangeAutoCorrected = usePlanStore((s) => s.rangeAutoCorrected);

  // lp-ui-ux-audit-fix / FR4.1: 子カードの削除は確認ダイアログを経由する
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  // lp-031: 終了年（西暦固定値）は保存データ互換のため PlanInput にそのまま残し、
  // 入力・表示だけを「本人が◯歳になる年」に変換する。
  const endAge = endYearToEndAge(input.self.birthYear, input.endYear);
  const endAgeCheck = endAgeValidationSchema.safeParse(endAge);

  return (
    <div className="space-y-4">
      <Section title="シミュレーション期間">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumberField
            label="開始年"
            error={errors.startYear}
            value={input.startYear}
            onChange={(startYear) => setRange(startYear, input.endYear)}
          />
          <NumberField
            label="終了年齢"
            suffix="歳"
            hint={`本人が指定年齢になる年まで試算します（既定${DEFAULT_END_AGE}歳）`}
            value={endAge}
            onChange={(nextEndAge) =>
              setRange(input.startYear, endAgeToEndYear(input.self.birthYear, nextEndAge))
            }
            // lp-019 / QA#1: 開始年>終了年、または期間1年未満の入力は
            // ストア側（correctDateRange）で自動補正される。ここでは
            // rangeAutoCorrected を購読し、既存の error 表示機構
            // （aria-invalid / aria-describedby）でその旨を知らせるだけで、
            // 独自の検証や例外処理は行わない。
            // lp-031: 終了年齢自体の範囲（INPUT_LIMITS.age, lp-005 と同じ）も
            // ここで検証する。
            error={
              rangeAutoCorrected
                ? "終了年齢を自動調整しました（開始年より後、かつ1年以上の期間が必要です）"
                : !endAgeCheck.success
                  ? endAgeCheck.error.issues[0]?.message
                  : errors.endYear
            }
          />
        </div>
      </Section>

      <Section title="本人">
        <PersonFields person={input.self} prefix="self" errors={errors} onChange={updateSelf} />
      </Section>

      <Section
        title="配偶者"
        action={
          // 「あり／なし」の2択を並べ、現在の状態をハイライトする
          // （ボタン1つだと操作と状態のどちらを表すか分かりにくいため）。
          <div role="radiogroup" aria-label="配偶者の有無" className="inline-flex gap-1">
            {[
              { label: "あり", value: true },
              { label: "なし", value: false },
            ].map((o) => {
              const selected = (input.spouse !== null) === o.value;
              return (
                <label
                  key={o.label}
                  className={`inline-flex cursor-pointer items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? "border-brand bg-brand-50 text-brand-700"
                      : "border-line bg-surface text-ink-soft hover:border-brand hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="spouse-presence"
                    checked={selected}
                    onChange={() => toggleSpouse(o.value)}
                    className="sr-only"
                  />
                  配偶者{o.label}
                </label>
              );
            })}
          </div>
        }
      >
        {input.spouse ? (
          <PersonFields person={input.spouse} prefix="spouse" errors={errors} onChange={updateSpouse} />
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
            {children.map((child, index) => (
              <ChildCard
                key={child.id}
                child={child}
                birthYearError={errors[`children.${index}.birthYear`]}
                startYear={input.startYear}
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
