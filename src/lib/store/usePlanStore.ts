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
  RecurringExpense,
} from "@/lib/simulation/types";
import { defaultPlanInput } from "@/lib/simulation/defaults";
import { DEFAULT_EDUCATION } from "@/lib/simulation/education";
import { newLoan } from "./newLoan";
import { newRecurringExpense } from "./newRecurringExpense";
import { nextChildName } from "./nextChildName";
import { planInputSchema, snapshotSchema } from "@/lib/schema";
import { correctDateRange } from "@/lib/simulation/dateRange";

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
  /**
   * lp-019 / QA#1: `setRange` または永続化復元で開始年・終了年の組が
   * 無効（開始年>終了年、または期間1年未満）だったため自動補正した直後は
   * true。以降の正常な `setRange` 呼び出しで false に戻る。
   */
  rangeAutoCorrected: boolean;
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
  addRecurringExpense: () => void;
  updateRecurringExpense: (
    id: string,
    patch: Partial<RecurringExpense>,
  ) => void;
  removeRecurringExpense: (id: string) => void;
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

/**
 * 永続化復元（persist の merge）で使う、復元後の input / snapshots / の
 * 断片型。`rangeAutoCorrected` を含む点が PlanState 全体と異なる。
 */
type RestoredPersistFragment = {
  input: PlanInput;
  snapshots: Snapshot[];
  rangeAutoCorrected: boolean;
};

/**
 * lp-019 / QA#1: persist の `merge` オプション本体。
 * zustand の persist ミドルウェアは、実行環境に `localStorage` が
 * 無い場合（本プロジェクトのテストの既定 `environment: "node"` を含む）は
 * `merge` を一切呼び出さない実装のため、単体テストで直接呼び出せるよう
 * 純粋関数として切り出す（例外は投げない）。
 *
 * 永続化された入力・スナップショットを zod で検証し、壊れた部分は
 * 既定値（入力）／除外（スナップショット）でフォールバックする。
 * さらに、復元した期間（startYear/endYear）が無効
 * （開始年>終了年、または期間1年未満）なら `correctDateRange` で
 * setRange と同じ補正を行い、`rangeAutoCorrected` に反映する。
 */
export function mergePersistedPlanState<T extends RestoredPersistFragment>(
  persisted: unknown,
  current: T,
): T {
  const p = persisted as { input?: unknown; snapshots?: unknown } | undefined;

  const parsedInput = planInputSchema.safeParse(p?.input);
  const restoredInput = parsedInput.success ? parsedInput.data : defaultPlanInput;

  const rangeCorrection = correctDateRange(
    restoredInput.startYear,
    restoredInput.endYear,
  );
  const input = rangeCorrection.corrected
    ? { ...restoredInput, endYear: rangeCorrection.endYear }
    : restoredInput;

  const snapshots: Snapshot[] = Array.isArray(p?.snapshots)
    ? p.snapshots.flatMap((raw) => {
        const parsed = snapshotSchema.safeParse(raw);
        return parsed.success ? [parsed.data] : [];
      })
    : [];

  return {
    ...current,
    input,
    snapshots,
    rangeAutoCorrected: rangeCorrection.corrected,
  };
}

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
      rangeAutoCorrected: false,

      /**
       * lp-019 / QA#1: 開始年・終了年を更新する。`correctDateRange`
       * （純粋関数、例外を投げない）で相互検証し、無効な組み合わせ
       * （開始年>終了年、または期間1年未満）は endYear を自動補正する。
       * `rangeAutoCorrected` に補正の有無を反映し、UI 側（HouseholdForm）が
       * 注意文言の表示に利用する。
       */
      setRange: (startYear, endYear) =>
        set((s) => {
          const corrected = correctDateRange(startYear, endYear);
          return {
            input: {
              ...s.input,
              startYear: corrected.startYear,
              endYear: corrected.endYear,
            },
            rangeAutoCorrected: corrected.corrected,
          };
        }),

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
            // lp-021: 既定名を「子1」「子2」…の連番にして判別できるようにする。
            name: nextChildName(s.input.children),
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

      // 新規行は年額 0 円・当年開始/終了。ユーザーが値を入れるまで収支に寄与しない。
      addRecurringExpense: () =>
        set((s) => {
          const item: RecurringExpense = newRecurringExpense(
            makeId("rec"),
            s.input.startYear,
          );
          return {
            input: {
              ...s.input,
              recurringExpenses: [...s.input.recurringExpenses, item],
            },
          };
        }),

      updateRecurringExpense: (id, patch) =>
        set((s) => ({
          input: {
            ...s.input,
            recurringExpenses: s.input.recurringExpenses.map((r) =>
              r.id === id ? { ...r, ...patch } : r,
            ),
          },
        })),

      removeRecurringExpense: (id) =>
        set((s) => ({
          input: {
            ...s.input,
            recurringExpenses: s.input.recurringExpenses.filter(
              (r) => r.id !== id,
            ),
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

      /**
       * 全入力ステートを既定値へ戻す。
       * 対象は「入力」のみ: self / spouse / children / loans / events /
       * recurringExpenses / assets（taxable・taxFree）に加え、保存済み比較プラン（snapshots）も
       * 空に戻す。これにより前ペルソナのローン・イベント・保存プランが
       * 次のペルソナ入力へ混入しない。
       * 前提: これは入力の全消去であり、テーマ等の UI 設定や
       * localStorage 上の別キーには一切触れない（persist の "life-plan/v1"
       * キー内の input / snapshots のみを初期化する）。
       * defaultPlanInput は共有参照のため structuredClone して、
       * 以降の編集が既定値オブジェクトを汚染しないようにする。
       */
      reset: () =>
        set({
          input: structuredClone(defaultPlanInput),
          snapshots: [],
          rangeAutoCorrected: false,
        }),
    }),
    {
      name: "life-plan/v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: mergePersistedPlanState,
    },
  ),
);
