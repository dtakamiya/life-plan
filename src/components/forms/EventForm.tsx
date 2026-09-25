"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { Button, ConfirmDialog, NumberField, Section, TextField, type ConfirmDialogHandle } from "@/shared/ui";
import { usePlanErrors } from "./usePlanErrors";

export function EventForm() {
  const events = usePlanStore((s) => s.input.events);
  const addEvent = usePlanStore((s) => s.addEvent);
  const updateEvent = usePlanStore((s) => s.updateEvent);
  const removeEvent = usePlanStore((s) => s.removeEvent);
  const errors = usePlanErrors();

  // lp-ui-ux-audit-fix / FR4.1: 削除は確認ダイアログを経由する
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  return (
    <Section
      title="ライフイベント"
      action={
        <Button variant="primary" size="sm" onClick={addEvent}>
          ＋追加
        </Button>
      }
    >
      {events.length === 0 ? (
        <p className="text-xs text-ink-mute">イベントなし</p>
      ) : (
        <div className="space-y-2.5">
          {events.map((event, index) => (
            <div key={event.id} className="flex items-end gap-2">
              {/*
                フォーム列は PC でも幅 380px 程度のため、3 列だと内容・金額が切れる。
                1 行目に年・内容、2 行目に金額を全幅で置く。
              */}
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[5.5rem_1fr]">
                <NumberField
                  label="年"
                  error={errors[`events.${index}.year`]}
                  value={event.year}
                  onChange={(year) => updateEvent(event.id, { year })}
                />
                <TextField
                  label="内容"
                  value={event.label}
                  onChange={(label) => updateEvent(event.id, { label })}
                />
                <div className="sm:col-span-2">
                  <NumberField
                    label="金額(+収/−支)"
                    suffix="円"
                    grouped
                    step={100_000}
                    signed
                    error={errors[`events.${index}.amount`]}
                    value={event.amount}
                    onChange={(amount) => updateEvent(event.id, { amount })}
                  />
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setPendingDeleteId(event.id);
                  confirmRef.current?.open();
                }}
                className="mb-px"
              >
                削除
              </Button>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        ref={confirmRef}
        title="このライフイベントを削除しますか？"
        description="削除すると元に戻せません。"
        onConfirm={() => {
          if (pendingDeleteId) removeEvent(pendingDeleteId);
        }}
      />
    </Section>
  );
}
