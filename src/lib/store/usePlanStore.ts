/**
 * 計画入力のグローバルストア。Zustand + persist で localStorage に保存する。
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Child,
  LifeEvent,
  Person,
  PlanInput,
} from "@/lib/simulation/types";
import { defaultPlanInput } from "@/lib/simulation/defaults";
import { planInputSchema } from "@/lib/schema";

type PlanState = {
  input: PlanInput;
  setRange: (startYear: number, endYear: number) => void;
  updateSelf: (patch: Partial<Person>) => void;
  /** 配偶者の有無を切り替える。enabled=true で未設定なら本人を雛形に作成。 */
  toggleSpouse: (enabled: boolean) => void;
  updateSpouse: (patch: Partial<Person>) => void;
  updateExpenses: (patch: Partial<PlanInput["expenses"]>) => void;
  updateAssets: (patch: Partial<PlanInput["assets"]>) => void;
  addChild: () => void;
  updateChild: (id: string, patch: Partial<Child>) => void;
  removeChild: (id: string) => void;
  addEvent: () => void;
  updateEvent: (id: string, patch: Partial<LifeEvent>) => void;
  removeEvent: (id: string) => void;
  reset: () => void;
};

/** ランダムな id を生成する（crypto があれば利用）。 */
function makeId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      input: defaultPlanInput,

      setRange: (startYear, endYear) =>
        set((s) => ({ input: { ...s.input, startYear, endYear } })),

      updateSelf: (patch) =>
        set((s) => ({ input: { ...s.input, self: { ...s.input.self, ...patch } } })),

      toggleSpouse: (enabled) =>
        set((s) => {
          if (enabled && !s.input.spouse) {
            const spouse: Person = { ...s.input.self, name: "配偶者" };
            return { input: { ...s.input, spouse } };
          }
          if (!enabled) {
            return { input: { ...s.input, spouse: null } };
          }
          return s;
        }),

      updateSpouse: (patch) =>
        set((s) => {
          if (!s.input.spouse) return s;
          return {
            input: { ...s.input, spouse: { ...s.input.spouse, ...patch } },
          };
        }),

      updateExpenses: (patch) =>
        set((s) => ({
          input: { ...s.input, expenses: { ...s.input.expenses, ...patch } },
        })),

      updateAssets: (patch) =>
        set((s) => ({
          input: { ...s.input, assets: { ...s.input.assets, ...patch } },
        })),

      addChild: () =>
        set((s) => {
          const child: Child = {
            id: makeId("child"),
            name: "子",
            birthYear: s.input.startYear,
          };
          return { input: { ...s.input, children: [...s.input.children, child] } };
        }),

      updateChild: (id, patch) =>
        set((s) => ({
          input: {
            ...s.input,
            children: s.input.children.map((c) =>
              c.id === id ? { ...c, ...patch } : c,
            ),
          },
        })),

      removeChild: (id) =>
        set((s) => ({
          input: {
            ...s.input,
            children: s.input.children.filter((c) => c.id !== id),
          },
        })),

      addEvent: () =>
        set((s) => {
          const event: LifeEvent = {
            id: makeId("event"),
            year: s.input.startYear,
            label: "イベント",
            amount: 0,
          };
          return { input: { ...s.input, events: [...s.input.events, event] } };
        }),

      updateEvent: (id, patch) =>
        set((s) => ({
          input: {
            ...s.input,
            events: s.input.events.map((e) =>
              e.id === id ? { ...e, ...patch } : e,
            ),
          },
        })),

      removeEvent: (id) =>
        set((s) => ({
          input: {
            ...s.input,
            events: s.input.events.filter((e) => e.id !== id),
          },
        })),

      reset: () => set({ input: defaultPlanInput }),
    }),
    {
      name: "life-plan/v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // 永続化された入力を zod で検証し、壊れていれば既定値へフォールバックする。
      merge: (persisted, current) => {
        const parsed = planInputSchema.safeParse(
          (persisted as { input?: unknown } | undefined)?.input,
        );
        return { ...current, input: parsed.success ? parsed.data : defaultPlanInput };
      },
    },
  ),
);
