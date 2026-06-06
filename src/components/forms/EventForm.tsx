"use client";

import { usePlanStore } from "@/lib/store/usePlanStore";
import { Button } from "@/components/ui/Button";
import { NumberField, Section, TextField } from "./fields";

export function EventForm() {
  const events = usePlanStore((s) => s.input.events);
  const addEvent = usePlanStore((s) => s.addEvent);
  const updateEvent = usePlanStore((s) => s.updateEvent);
  const removeEvent = usePlanStore((s) => s.removeEvent);

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
              <div className="grid flex-1 grid-cols-3 gap-2">
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
                  step={100_000}
                  value={event.amount}
                  onChange={(amount) => updateEvent(event.id, { amount })}
                />
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeEvent(event.id)}
                className="mb-px"
              >
                削除
              </Button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
