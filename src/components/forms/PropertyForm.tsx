"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { Button, ConfirmDialog, NumberField, PercentField, Section, TextField, type ConfirmDialogHandle } from "@/shared/ui";
import { PROPERTY_VALUE_FLOOR_RATIO } from "@/features/plan/domain";
import { usePlanErrors } from "./usePlanErrors";

/**
 * 子育て共働きペルソナレビュー #2: 住宅などの不動産を入力し、評価額を純資産に加える。
 * 評価額は購入年以降に毎年減価し、土地分として購入価格の一定割合を下限とする。
 */
export function PropertyForm() {
  const items = usePlanStore((s) => s.input.properties ?? []);
  const addProperty = usePlanStore((s) => s.addProperty);
  const updateProperty = usePlanStore((s) => s.updateProperty);
  const removeProperty = usePlanStore((s) => s.removeProperty);
  const errors = usePlanErrors();

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  return (
    <Section
      title="住宅（不動産）"
      action={
        <Button variant="primary" size="sm" onClick={addProperty}>
          ＋追加
        </Button>
      }
    >
      <p className="mb-2 text-[11px] text-ink-mute">
        評価額を純資産に加えます（資産が尽きる年の判定には含めません）。
        毎年の減価後も、土地分として購入価格の{Math.round(PROPERTY_VALUE_FLOOR_RATIO * 100)}%を下限とします。
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-ink-mute">不動産なし</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const path = `properties.${index}`;
            return (
              <div key={item.id} className="rounded-xl border border-line bg-paper/40 p-3">
                <div className="mb-2 flex items-end justify-between gap-2">
                  <div className="flex-1">
                    <TextField
                      label="名称"
                      value={item.label}
                      onChange={(label) => updateProperty(item.id, { label })}
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <NumberField
                    label="購入年"
                    error={errors[`${path}.purchaseYear`]}
                    value={item.purchaseYear}
                    onChange={(purchaseYear) => updateProperty(item.id, { purchaseYear })}
                  />
                  <PercentField
                    label="年間の減価率"
                    hint="建物の古さによる目減り（目安1〜2%）"
                    error={errors[`${path}.annualDepreciationRate`]}
                    value={item.annualDepreciationRate}
                    onChange={(annualDepreciationRate) =>
                      updateProperty(item.id, { annualDepreciationRate })
                    }
                  />
                </div>
                <div className="mt-2">
                  <NumberField
                    label="購入価格"
                    suffix="円"
                    grouped
                    step={1_000_000}
                    hint="頭金＋借入額が目安"
                    error={errors[`${path}.price`]}
                    value={item.price}
                    onChange={(price) => updateProperty(item.id, { price })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        ref={confirmRef}
        title="この不動産を削除しますか？"
        description="削除すると元に戻せません。"
        onConfirm={() => {
          if (pendingDeleteId) removeProperty(pendingDeleteId);
        }}
      />
    </Section>
  );
}
