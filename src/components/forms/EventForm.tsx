"use client";

import { usePlanStore } from "@/lib/store/usePlanStore";
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
        <button
          type="button"
          onClick={addEvent}
          className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          ＋追加
        </button>
      }
    >
      {events.length === 0 ? (
        <p className="text-xs text-slate-400">イベントなし</p>
      ) : (
        <div className="space-y-2">
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
              <button
                type="button"
                onClick={() => removeEvent(event.id)}
                className="mb-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
