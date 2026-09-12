"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { NumberField, Section, TextField } from "./fields";

export function EventForm() {
  const events = usePlanStore((s) => s.input.events);
  const addEvent = usePlanStore((s) => s.addEvent);
  const updateEvent = usePlanStore((s) => s.updateEvent);
  const removeEvent = usePlanStore((s) => s.removeEvent);

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
          {events.map((event) => (
            <div key={event.id} className="flex items-end gap-2">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                <NumberField
                  label="年"
                  value={event.year}
                  onChange={(year) => updateEvent(event.id, { year })}
                />
                <TextField
                  label="内容"
                  value={event.label}
                  onChange={(label) => updateEvent(event.id, { label })}
                />
                <NumberField
                  label="金額(+収/−支)"
                  suffix="円"
                  grouped
                  step={100_000}
                  signed
                  value={event.amount}
                  onChange={(amount) => updateEvent(event.id, { amount })}
                />
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
