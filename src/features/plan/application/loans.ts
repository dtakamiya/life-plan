import {
  HOME_PROPERTY_LABEL,
  HOUSING_PURCHASE_EVENT_LABEL,
  type Loan,
  type PlanInput,
} from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";
import { newLoan } from "./newLoan";

// 新規行は 0 円始まり（借入額・金利 0）。ユーザーが値を入れるまで
// 返済額に寄与しない。既定値の定義は newLoan を参照。
export function addLoan(input: PlanInput, idGen: IdGenerator): PlanInput {
  return { ...input, loans: [...input.loans, newLoan(idGen("loan"), input.startYear)] };
}

export function updateLoan(input: PlanInput, id: string, patch: Partial<Loan>): PlanInput {
  const previous = input.loans.find((l) => l.id === id);
  const nextStartYear = patch.startYear;
  // 子育て共働きペルソナレビュー #8: 返済開始年と同じ年の住宅購入（頭金）
  // イベントと自宅（不動産）は、返済開始年の変更に追従させる（購入年のずれを防ぐ）。
  const moved =
    previous !== undefined &&
    nextStartYear !== undefined &&
    nextStartYear !== previous.startYear;
  const events = moved
    ? input.events.map((e) =>
        e.label === HOUSING_PURCHASE_EVENT_LABEL && e.year === previous.startYear
          ? { ...e, year: nextStartYear }
          : e,
      )
    : input.events;
  const properties = moved
    ? input.properties?.map((p) =>
        p.label === HOME_PROPERTY_LABEL && p.purchaseYear === previous.startYear
          ? { ...p, purchaseYear: nextStartYear }
          : p,
      )
    : input.properties;
  return {
    ...input,
    events,
    properties,
    loans: input.loans.map((l) => (l.id === id ? { ...l, ...patch } : l)),
  };
}

export function removeLoan(input: PlanInput, id: string): PlanInput {
  return { ...input, loans: input.loans.filter((l) => l.id !== id) };
}
