/**
 * 計画入力のグローバルストア。Zustand + persist で localStorage に保存する。
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  defaultPlanInput,
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
  addIncomeAdjustment,
  addLoan,
  addProperty,
  addRecurringExpense,
  removeChild,
  removeEvent,
  removeIncomeAdjustment,
  removeLoan,
  removeProperty,
  removeRecurringExpense,
  resetInput,
  resetSingleInput,
  setRange,
  startBlank,
  toggleSpouse,
  updateAssets,
  updateChild,
  updateEvent,
  updateExpenses,
  updateIncomeAdjustment,
  updateLoan,
  updateProperty,
  updateRecurringExpense,
  updateSelf,
  updateSpouse,
} from "@/features/plan/application";
import {
  makeId,
  mergePersistedPlanState,
  migratePersistedPlanState,
} from "@/features/plan/infrastructure";

type PlanState = {
  input: PlanInput;
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
   * lp-033: 検証済みの PlanInput（ファイル読み込み・スナップショットの読込）で
   * 現在の入力を置き換える。
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

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      input: defaultPlanInput,
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
        set((s) => ({ input: updateExpenses(s.input, patch) })),

      updateAssets: (patch) => set((s) => ({ input: updateAssets(s.input, patch) })),

      addChild: () => set((s) => ({ input: addChild(s.input, makeId) })),

      updateChild: (id, patch) =>
        set((s) => ({ input: updateChild(s.input, id, patch) })),

      removeChild: (id) => set((s) => ({ input: removeChild(s.input, id, makeId) })),

      addEvent: () => set((s) => ({ input: addEvent(s.input, makeId) })),

      updateEvent: (id, patch) =>
        set((s) => ({ input: updateEvent(s.input, id, patch) })),

      removeEvent: (id) => set((s) => ({ input: removeEvent(s.input, id) })),

      addRecurringExpense: () =>
        set((s) => ({ input: addRecurringExpense(s.input, makeId) })),

      updateRecurringExpense: (id, patch) =>
        set((s) => ({ input: updateRecurringExpense(s.input, id, patch) })),

      removeRecurringExpense: (id) =>
        set((s) => ({ input: removeRecurringExpense(s.input, id) })),

      addLoan: () => set((s) => ({ input: addLoan(s.input, makeId) })),

      updateLoan: (id, patch) =>
        set((s) => ({ input: updateLoan(s.input, id, patch) })),

      removeLoan: (id) => set((s) => ({ input: removeLoan(s.input, id) })),

      addIncomeAdjustment: () =>
        set((s) => ({ input: addIncomeAdjustment(s.input, makeId) })),

      updateIncomeAdjustment: (id, patch) =>
        set((s) => ({ input: updateIncomeAdjustment(s.input, id, patch) })),

      removeIncomeAdjustment: (id) =>
        set((s) => ({ input: removeIncomeAdjustment(s.input, id) })),

      addProperty: () => set((s) => ({ input: addProperty(s.input, makeId) })),

      updateProperty: (id, patch) =>
        set((s) => ({ input: updateProperty(s.input, id, patch) })),

      removeProperty: (id) => set((s) => ({ input: removeProperty(s.input, id) })),

      replaceInput: (input) =>
        set({ input: structuredClone(input), rangeAutoCorrected: false }),

      /**
       * 入力を既定値へ戻す。
       * 対象は「入力」のみ: self / spouse / children / loans / events /
       * recurringExpenses / assets（taxable・taxFree）。これにより前ペルソナの
       * ローン・イベントが次のペルソナ入力へ混入しない。
       * 保存済み比較プラン（snapshots）は scenario ストアの reset が、この reset と
       * 合わせて空にする（全消去）。テーマ等の UI 設定や localStorage 上の
       * 別キーには触れない。
       */
      reset: () =>
        set({
          input: resetInput(),
          rangeAutoCorrected: false,
        }),

      resetSingle: () =>
        set({
          input: resetSingleInput(),
          rangeAutoCorrected: false,
        }),

      /** lp-030: 「まっさらから入力」（本体は plan/application の startBlank）。 */
      startBlank: () => set((s) => ({ input: startBlank(s.input) })),
    }),
    {
      name: "life-plan/v1",
      // version 2: 比較用スナップショットを scenario ストア（life-plan/scenarios/v1）へ分離した。
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted) => migratePersistedPlanState(persisted, localStorage),
      merge: mergePersistedPlanState,
    },
  ),
);
