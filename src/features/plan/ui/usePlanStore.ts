/**
 * 計画入力のグローバルストア。Zustand + persist で localStorage に保存する。
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  correctDateRange,
  DEFAULT_PROPERTY_DEPRECIATION_RATE,
  defaultPlanInput,
  singleRenterPlanInput,
  type Child,
  type IncomeAdjustment,
  type LifeEvent,
  type Loan,
  type Person,
  type PlanInput,
  type Property,
  type RecurringExpense,
} from "@/features/plan/domain";
import {
  addChild,
  addEvent,
  addLoan,
  newRecurringExpense,
  planInputSchema,
  removeChild,
  removeEvent,
  removeLoan,
  setRange,
  snapshotSchema,
  toggleSpouse,
  updateChild,
  updateEvent,
  updateLoan,
  updateSelf,
  updateSpouse,
} from "@/features/plan/application";
import { makeId } from "@/features/plan/infrastructure";

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
  /** 収入調整（育休・時短）を追加する。配偶者がいれば配偶者向け、いなければ本人向け。 */
  addIncomeAdjustment: () => void;
  updateIncomeAdjustment: (id: string, patch: Partial<IncomeAdjustment>) => void;
  removeIncomeAdjustment: (id: string) => void;
  addProperty: () => void;
  updateProperty: (id: string, patch: Partial<Property>) => void;
  removeProperty: (id: string) => void;
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
  /**
   * lp-033: 検証済みの PlanInput（ファイル読み込み）で現在の入力を置き換える。
   * snapshots には触れない。
   */
  replaceInput: (input: PlanInput) => void;
  reset: () => void;
  /** 低収入ペルソナレビュー #8: 「単身・賃貸」のプリセットで入力を置き換える。 */
  resetSingle: () => void;
  /**
   * lp-030: 「まっさらから入力」。基礎生活費・ローン・イベントを 0/空にする。
   * self / spouse / children / assets には触れない。
   */
  startBlank: () => void;
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

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      input: defaultPlanInput,
      snapshots: [],
      rangeAutoCorrected: false,

      /**
       * lp-019 / QA#1: 開始年・終了年を更新する。無効な組み合わせは endYear を
       * 自動補正し、`rangeAutoCorrected` に補正の有無を反映する（本体は plan/application）。
       */
      setRange: (startYear, endYear) =>
        set((s) => setRange(s.input, startYear, endYear)),

      updateSelf: (patch) => set((s) => ({ input: updateSelf(s.input, patch) })),

      // 変更が無いときは state を更新しない（persist にも書き込まない）。
      toggleSpouse: (enabled) =>
        set((s) => {
          const input = toggleSpouse(s.input, enabled, makeId);
          return input === s.input ? s : { input };
        }),

      updateSpouse: (patch) =>
        set((s) => {
          const input = updateSpouse(s.input, patch);
          return input === s.input ? s : { input };
        }),

      updateExpenses: (patch) =>
        set((s) => ({
          input: { ...s.input, expenses: { ...s.input.expenses, ...patch } },
        })),

      updateAssets: (patch) =>
        set((s) => ({
          input: { ...s.input, assets: { ...s.input.assets, ...patch } },
        })),

      addChild: () => set((s) => ({ input: addChild(s.input, makeId) })),

      updateChild: (id, patch) =>
        set((s) => ({ input: updateChild(s.input, id, patch) })),

      removeChild: (id) => set((s) => ({ input: removeChild(s.input, id, makeId) })),

      addEvent: () => set((s) => ({ input: addEvent(s.input, makeId) })),

      updateEvent: (id, patch) =>
        set((s) => ({ input: updateEvent(s.input, id, patch) })),

      removeEvent: (id) => set((s) => ({ input: removeEvent(s.input, id) })),

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

      addLoan: () => set((s) => ({ input: addLoan(s.input, makeId) })),

      updateLoan: (id, patch) =>
        set((s) => ({ input: updateLoan(s.input, id, patch) })),

      removeLoan: (id) => set((s) => ({ input: removeLoan(s.input, id) })),

      // 新規行は開始年の1年間・割合100%（＝調整なし）。値を入れるまで収支は変わらない。
      addIncomeAdjustment: () =>
        set((s) => {
          const item: IncomeAdjustment = {
            id: makeId("adj"),
            person: s.input.spouse ? "spouse" : "self",
            label: "収入の調整",
            startYear: s.input.startYear,
            endYear: s.input.startYear,
            ratio: 1,
            nonTaxable: false,
          };
          return {
            input: {
              ...s.input,
              incomeAdjustments: [...(s.input.incomeAdjustments ?? []), item],
            },
          };
        }),

      updateIncomeAdjustment: (id, patch) =>
        set((s) => ({
          input: {
            ...s.input,
            incomeAdjustments: (s.input.incomeAdjustments ?? []).map((a) =>
              a.id === id ? { ...a, ...patch } : a,
            ),
          },
        })),

      removeIncomeAdjustment: (id) =>
        set((s) => ({
          input: {
            ...s.input,
            incomeAdjustments: (s.input.incomeAdjustments ?? []).filter((a) => a.id !== id),
          },
        })),

      // 新規行は購入価格 0 円。値を入れるまで純資産は変わらない。
      addProperty: () =>
        set((s) => {
          const item: Property = {
            id: makeId("property"),
            label: "不動産",
            purchaseYear: s.input.startYear,
            price: 0,
            annualDepreciationRate: DEFAULT_PROPERTY_DEPRECIATION_RATE,
          };
          return {
            input: { ...s.input, properties: [...(s.input.properties ?? []), item] },
          };
        }),

      updateProperty: (id, patch) =>
        set((s) => ({
          input: {
            ...s.input,
            properties: (s.input.properties ?? []).map((p) =>
              p.id === id ? { ...p, ...patch } : p,
            ),
          },
        })),

      removeProperty: (id) =>
        set((s) => ({
          input: {
            ...s.input,
            properties: (s.input.properties ?? []).filter((p) => p.id !== id),
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

      replaceInput: (input) =>
        set({ input: structuredClone(input), rangeAutoCorrected: false }),

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

      resetSingle: () =>
        set({
          input: structuredClone(singleRenterPlanInput),
          rangeAutoCorrected: false,
        }),

      /**
       * lp-030: 「まっさらから入力」。基礎生活費・ローン・イベントを 0/空にする。
       * self / spouse / children / assets（保有資産・運用条件）には触れない
       * ——世帯構成や年収・資産条件は決まっているが、支出面はこれから
       * 自分で組み立てたいユーザー向けの開始地点。
       * 以後、生活費は 0 のためどの世帯構成の既定値とも一致せず、
       * applyHouseholdDefaults による自動追従の対象から外れる
       * （ローン・イベントも空のため同様）。
       */
      startBlank: () =>
        set((s) => ({
          input: {
            ...s.input,
            expenses: { ...s.input.expenses, baseAnnualLivingExpense: 0 },
            loans: [],
            events: [],
          },
        })),
    }),
    {
      name: "life-plan/v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: mergePersistedPlanState,
    },
  ),
);
