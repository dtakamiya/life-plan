import type { LifeEvent, PlanInput } from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";

export function addEvent(input: PlanInput, idGen: IdGenerator): PlanInput {
  const event: LifeEvent = {
    id: idGen("event"),
    year: input.startYear,
    label: "イベント",
    amount: 0,
  };
  return { ...input, events: [...input.events, event] };
}

export function updateEvent(input: PlanInput, id: string, patch: Partial<LifeEvent>): PlanInput {
  return {
    ...input,
    events: input.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  };
}

export function removeEvent(input: PlanInput, id: string): PlanInput {
  return { ...input, events: input.events.filter((e) => e.id !== id) };
}
