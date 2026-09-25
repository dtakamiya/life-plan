"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import type { IncomeAdjustment } from "@/lib/simulation/types";
import { CheckboxField, NumberField, PercentField, Section, SelectField, TextField } from "./fields";
import { usePlanErrors } from "./usePlanErrors";

const PERSON_LABELS = { self: "本人", spouse: "配偶者" } as const;
type PersonLabel = (typeof PERSON_LABELS)[keyof typeof PERSON_LABELS];
const PERSON_OPTIONS: readonly PersonLabel[] = ["本人", "配偶者"];

/** よくある収入調整のひな形。 */
const PRESETS: readonly { label: string; patch: Partial<IncomeAdjustment> }[] = [
  // 育児休業給付金は休業前賃金の67%（181日目以降は50%）で、非課税・社会保険料も免除される。
  { label: "育休（給付金 約67%）", patch: { label: "育休", ratio: 0.67, nonTaxable: true } },
  { label: "時短（80%）", patch: { label: "時短勤務", ratio: 0.8, nonTaxable: false } },
];

const PILL_CLASS =
  "rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:border-brand hover:bg-brand-50 hover:text-brand-700";

/**
 * 子育て共働きペルソナレビュー #3: 育休・時短など、一定期間だけ給与が下がる状況を入力する。
 * 期間の整合（終了年 >= 開始年）は検証エラーとして該当フィールドに表示する。
 */
export function IncomeAdjustmentForm() {
  const items = usePlanStore((s) => s.input.incomeAdjustments ?? []);
  const hasSpouse = usePlanStore((s) => s.input.spouse !== null);
  const addIncomeAdjustment = usePlanStore((s) => s.addIncomeAdjustment);
  const updateIncomeAdjustment = usePlanStore((s) => s.updateIncomeAdjustment);
  const removeIncomeAdjustment = usePlanStore((s) => s.removeIncomeAdjustment);
  const errors = usePlanErrors();

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  return (
    <Section
      title="収入の調整（育休・時短）"
      action={
        <Button variant="primary" size="sm" onClick={addIncomeAdjustment}>
          ＋追加
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className="text-xs text-ink-mute">収入の調整なし（例: 育休中の給付金、時短勤務）</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const path = `incomeAdjustments.${index}`;
            return (
              <div key={item.id} className="rounded-xl border border-line bg-paper/40 p-3">
                <div className="mb-2 flex items-end justify-between gap-2">
                  <div className="flex-1">
                    <TextField
                      label="名称"
                      value={item.label}
                      onChange={(label) => updateIncomeAdjustment(item.id, { label })}
                    />
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setPendingDeleteId(item.id);
                      confirmRef.current?.open();
                    }}
                    className="mb-px"
                  >
                    削除
                  </Button>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateIncomeAdjustment(item.id, preset.patch)}
                      className={PILL_CLASS}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {hasSpouse && (
                    <SelectField
                      label="対象者"
                      value={PERSON_LABELS[item.person]}
                      options={PERSON_OPTIONS}
                      onChange={(v) =>
                        updateIncomeAdjustment(item.id, { person: v === "本人" ? "self" : "spouse" })
                      }
                    />
                  )}
                  <PercentField
                    label="給与の割合"
                    hint="通常の給与に対する割合（100%で調整なし）"
                    error={errors[`${path}.ratio`]}
                    value={item.ratio}
                    onChange={(ratio) => updateIncomeAdjustment(item.id, { ratio })}
                  />
                  <NumberField
                    label="開始年"
                    error={errors[`${path}.startYear`]}
                    value={item.startYear}
                    onChange={(startYear) => updateIncomeAdjustment(item.id, { startYear })}
                  />
                  <NumberField
                    label="終了年"
                    hint="この年まで調整します"
                    error={errors[`${path}.endYear`]}
                    value={item.endYear}
                    onChange={(endYear) => updateIncomeAdjustment(item.id, { endYear })}
                  />
                </div>
                <div className="mt-2">
                  <CheckboxField
                    label="非課税の給付として扱う"
                    hint="育休給付金など。この期間は税・社会保険料を掛けません"
                    checked={item.nonTaxable}
                    onChange={(nonTaxable) => updateIncomeAdjustment(item.id, { nonTaxable })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        ref={confirmRef}
        title="この収入の調整を削除しますか？"
        description="削除すると元に戻せません。"
        onConfirm={() => {
          if (pendingDeleteId) removeIncomeAdjustment(pendingDeleteId);
        }}
      />
    </Section>
  );
}
