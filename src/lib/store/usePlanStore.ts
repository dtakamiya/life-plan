/**
 * 計画入力のグローバルストア。Zustand + persist で localStorage に保存する。
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Child,
  LifeEvent,
  Loan,
  Person,
  PlanInput,
} from "@/lib/simulation/types";
import { defaultPlanInput } from "@/lib/simulation/defaults";
import { DEFAULT_EDUCATION } from "@/lib/simulation/education";
import { newLoan } from "./newLoan";
import { planInputSchema, snapshotSchema } from "@/lib/schema";

/** スナップショットの由来（"game" はゲームモードの進行から保存されたもの）。 */
export type SnapshotOrigin = "manual" | "game";

/** 名前付きで保存した計画のスナップショット（比較用）。 */
export type Snapshot = {
  id: string;
  name: string;
  input: PlanInput;
  origin: SnapshotOrigin;
};

type PlanState = {
  input: PlanInput;
  /** 比較用に保存した計画のスナップショット一覧。 */
  snapshots: Snapshot[];
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
  addLoan: () => void;
  updateLoan: (id: string, patch: Partial<Loan>) => void;
  removeLoan: (id: string) => void;
  /**
   * 計画を名前付きスナップショットとして保存する。
   * input を省略すると現在の入力を複製する。ゲームモードは
   * 射影済みの PlanInput と origin: "game" を渡す。
   */
  saveSnapshot: (
    name: string,
    input?: PlanInput,
    origin?: SnapshotOrigin,
  ) => void;
  /** スナップショットを削除する。 */
  removeSnapshot: (id: string) => void;
  /** スナップショットの内容を現在の入力に読み込む。 */
  loadSnapshot: (id: string) => void;
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
      snapshots: [],

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
            education: DEFAULT_EDUCATION,
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

      addLoan: () =>
        set((s) => {
          // 新規行は 0 円始まり（借入額・金利・期間すべて 0）。ユーザーが値を
          // 入れるまで返済額に寄与しない。既定値の定義は newLoan を参照。
          const loan: Loan = newLoan(makeId("loan"), s.input.startYear);
          return { input: { ...s.input, loans: [...s.input.loans, loan] } };
        }),

      updateLoan: (id, patch) =>
        set((s) => ({
          input: {
            ...s.input,
            loans: s.input.loans.map((l) =>
              l.id === id ? { ...l, ...patch } : l,
            ),
          },
        })),

      removeLoan: (id) =>
        set((s) => ({
          input: {
            ...s.input,
            loans: s.input.loans.filter((l) => l.id !== id),
          },
        })),

      saveSnapshot: (name, input, origin = "manual") =>
        set((s) => {
          const snapshot: Snapshot = {
            id: makeId("snap"),
            name,
            input: structuredClone(input ?? s.input),
            origin,
          };
          return { snapshots: [...s.snapshots, snapshot] };
        }),

      removeSnapshot: (id) =>
        set((s) => ({
          snapshots: s.snapshots.filter((snap) => snap.id !== id),
        })),

      loadSnapshot: (id) =>
        set((s) => {
          const snapshot = s.snapshots.find((snap) => snap.id === id);
          if (!snapshot) return s;
          const input = structuredClone(snapshot.input);
          // ゲーム由来の乱数イベントが本体入力に無標識で混ざるのを防ぐ
          // （免責節の要件）。game- で始まる id のイベント label に「（ゲーム）」
          // を前置する。既に前置済みなら二重付与しない（冪等）。
          if (snapshot.origin === "game") {
            const PREFIX = "（ゲーム）";
            input.events = input.events.map((e) =>
              e.id.startsWith("game-") && !e.label.startsWith(PREFIX)
                ? { ...e, label: `${PREFIX}${e.label}` }
                : e,
            );
          }
          return { input };
        }),

      reset: () => set({ input: defaultPlanInput }),
    }),
    {
      name: "life-plan/v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // 永続化された入力・スナップショットを zod で検証し、壊れた部分は
      // 既定値（入力）／除外（スナップショット）でフォールバックする。
      merge: (persisted, current) => {
        const p = persisted as
          | { input?: unknown; snapshots?: unknown }
          | undefined;

        const parsedInput = planInputSchema.safeParse(p?.input);
        const input = parsedInput.success ? parsedInput.data : defaultPlanInput;

        const snapshots: Snapshot[] = Array.isArray(p?.snapshots)
          ? p.snapshots.flatMap((raw) => {
              const parsed = snapshotSchema.safeParse(raw);
              return parsed.success ? [parsed.data] : [];
            })
          : [];

        return { ...current, input, snapshots };
      },
    },
  ),
);
