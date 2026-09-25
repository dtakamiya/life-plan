import { describe, it, expect, beforeEach } from "vitest";
import { usePlanStore, mergePersistedPlanState } from "./usePlanStore";
import { defaultPlanInput } from "@/lib/simulation/defaults";
import { runSimulation } from "@/lib/simulation/engine";
import type { YearlyResult } from "@/lib/simulation/types";

/** 既定入力に対する年次系列（reset の前後で不変であるべき基準値）。 */
const BASELINE_SERIES: YearlyResult[] = runSimulation(defaultPlanInput);

/** 系列内に NaN / 非有限値が無いことを確認する。 */
function assertFiniteSeries(series: YearlyResult[]) {
  expect(series.length).toBeGreaterThan(0);
  for (const row of series) {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "number") {
        expect(Number.isFinite(value), `${key} が有限値でない: ${value}`).toBe(
          true,
        );
      }
    }
  }
}

describe("usePlanStore.reset", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  it("リセット後の input が既定値と deep-equal（新規セッションと完全一致）", () => {
    const { input } = usePlanStore.getState();
    expect(input).toEqual(defaultPlanInput);
    // 共有参照のまま返していないこと（以降の編集で既定値を汚染しない）
    expect(input).not.toBe(defaultPlanInput);
    expect(input.children).not.toBe(defaultPlanInput.children);
  });

  it("30歳ペルソナ（配偶者・子・ローン・イベント・保存プラン）を全消去する", () => {
    const store = usePlanStore.getState();

    store.setRange(2026, 2091);
    store.updateSelf({ birthYear: 1996, grossAnnualIncome: 6_000_000 });
    store.toggleSpouse(true);
    store.updateSpouse({ birthYear: 1997 });
    store.addChild();
    store.addChild();
    store.addLoan();
    store.addEvent();
    store.saveSnapshot("プランA");
    store.saveSnapshot("プランB");

    const dirty = usePlanStore.getState();
    expect(dirty.input.loans.length).toBeGreaterThan(0);
    expect(dirty.input.events.length).toBeGreaterThan(0);
    expect(dirty.snapshots.length).toBe(2);

    usePlanStore.getState().reset();

    const after = usePlanStore.getState();
    // self / spouse / children / loans / events / assets すべて既定へ
    expect(after.input).toEqual(defaultPlanInput);
    // 保存済み比較プラン（シナリオ）も全消去
    expect(after.snapshots).toEqual([]);
  });

  it("リセット後に別ペルソナ（20歳）を入力しても前ペルソナのローン・イベントが混入しない", () => {
    const first = usePlanStore.getState();
    first.updateSelf({ birthYear: 1996 });
    first.addLoan();
    first.addLoan();
    first.addEvent();
    first.saveSnapshot("前ペルソナ");

    usePlanStore.getState().reset();

    // 20歳ペルソナを新規入力
    const second = usePlanStore.getState();
    second.updateSelf({ birthYear: 2006, grossAnnualIncome: 2_500_000 });

    const state = usePlanStore.getState();
    // 前ペルソナで追加したローン・イベントは既定の1件ずつのまま
    expect(state.input.loans).toEqual(defaultPlanInput.loans);
    expect(state.input.events).toEqual(defaultPlanInput.events);
    expect(state.snapshots).toEqual([]);
    expect(state.input.self.birthYear).toBe(2006);
  });

  it("保存済み比較プランが0件でもエラーなくリセットできる", () => {
    expect(usePlanStore.getState().snapshots).toEqual([]);
    expect(() => usePlanStore.getState().reset()).not.toThrow();
    expect(usePlanStore.getState().snapshots).toEqual([]);
  });

  it("保存済み比較プランが複数件でもエラーなく全消去できる", () => {
    const store = usePlanStore.getState();
    store.saveSnapshot("a");
    store.saveSnapshot("b");
    store.saveSnapshot("c");
    expect(usePlanStore.getState().snapshots.length).toBe(3);

    expect(() => usePlanStore.getState().reset()).not.toThrow();
    expect(usePlanStore.getState().snapshots).toEqual([]);
  });

  it("リセット直後に runSimulation を呼んでも NaN/例外なく正常系列を返す", () => {
    usePlanStore.getState().reset();
    const series = runSimulation(usePlanStore.getState().input);
    assertFiniteSeries(series);
  });

  it("既定入力に対する runSimulation の年次系列が reset 前後で完全一致する", () => {
    // 入力をひとしきり汚してから reset
    const store = usePlanStore.getState();
    store.updateSelf({ grossAnnualIncome: 9_999_999 });
    store.addLoan();
    store.addEvent();
    store.saveSnapshot("noise");

    usePlanStore.getState().reset();

    const afterReset = runSimulation(usePlanStore.getState().input);
    expect(afterReset).toEqual(BASELINE_SERIES);
  });
});

/**
 * lp-019 / QA#1: setRange の自動補正と rangeAutoCorrected フラグの回帰テスト。
 */
describe("usePlanStore.setRange — 期間の自動補正", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  it("正常な期間を指定した場合は補正されず、rangeAutoCorrected は false", () => {
    usePlanStore.getState().setRange(2026, 2091);
    const state = usePlanStore.getState();
    expect(state.input.startYear).toBe(2026);
    expect(state.input.endYear).toBe(2091);
    expect(state.rangeAutoCorrected).toBe(false);
  });

  it("開始年 > 終了年を指定すると endYear = startYear + 1 に補正され、rangeAutoCorrected が true になる", () => {
    usePlanStore.getState().setRange(2040, 2020);
    const state = usePlanStore.getState();
    expect(state.input.startYear).toBe(2040);
    expect(state.input.endYear).toBe(2041);
    expect(state.rangeAutoCorrected).toBe(true);
  });

  it("補正後に正常な期間を指定し直すと rangeAutoCorrected は false に戻る", () => {
    usePlanStore.getState().setRange(2040, 2020);
    expect(usePlanStore.getState().rangeAutoCorrected).toBe(true);

    usePlanStore.getState().setRange(2026, 2091);
    expect(usePlanStore.getState().rangeAutoCorrected).toBe(false);
  });
});

/**
 * lp-019 / QA#1: 永続化復元時（persist の merge）の自動補正の回帰テスト。
 * zustand persist は `localStorage` の無い実行環境（本プロジェクトのテストの
 * 既定 `environment: "node"` を含む）では merge を呼び出さない実装のため、
 * merge ロジックを切り出した純粋関数 `mergePersistedPlanState` を直接検証する。
 */
describe("usePlanStore — 永続化復元時の期間自動補正", () => {
  const currentFragment = {
    input: defaultPlanInput,
    snapshots: [],
    rangeAutoCorrected: false,
  };

  it("復元データの期間が無効（開始年>終了年）なら merge 時に補正され、rangeAutoCorrected が true になる", () => {
    const persistedInput = {
      ...defaultPlanInput,
      startYear: 2040,
      endYear: 2020,
    };
    const merged = mergePersistedPlanState(
      { input: persistedInput, snapshots: [] },
      currentFragment,
    );

    expect(merged.input.startYear).toBe(2040);
    expect(merged.input.endYear).toBe(2041);
    expect(merged.rangeAutoCorrected).toBe(true);
  });

  it("復元データの期間が有効なら merge 時に補正されず、rangeAutoCorrected が false になる", () => {
    const persistedInput = {
      ...defaultPlanInput,
      startYear: 2026,
      endYear: 2091,
    };
    const merged = mergePersistedPlanState(
      { input: persistedInput, snapshots: [] },
      currentFragment,
    );

    expect(merged.input.startYear).toBe(2026);
    expect(merged.input.endYear).toBe(2091);
    expect(merged.rangeAutoCorrected).toBe(false);
  });

  it("永続化データが存在しない場合は既定入力にフォールバックし、rangeAutoCorrected は false になる", () => {
    const merged = mergePersistedPlanState(undefined, currentFragment);

    expect(merged.input).toEqual(defaultPlanInput);
    expect(merged.rangeAutoCorrected).toBe(false);
  });
});

describe("usePlanStore.addChild — 既定名の連番化（lp-021 / issue #21）", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  it("既定状態の子は「子1」で、追加した子は「子2」「子3」になる", () => {
    const store = usePlanStore.getState();
    expect(store.input.children.map((c) => c.name)).toEqual(["子1"]);

    store.addChild();
    store.addChild();

    expect(usePlanStore.getState().input.children.map((c) => c.name)).toEqual([
      "子1",
      "子2",
      "子3",
    ]);
  });

  it("途中の子を削除してから追加すると空いた番号を埋める", () => {
    const store = usePlanStore.getState();
    store.addChild();
    store.addChild();

    const [, second] = usePlanStore.getState().input.children;
    usePlanStore.getState().removeChild(second.id);
    usePlanStore.getState().addChild();

    // 「子2」が空いたので、番号が重複せずそこに入る
    expect(usePlanStore.getState().input.children.map((c) => c.name)).toEqual([
      "子1",
      "子3",
      "子2",
    ]);
  });

  it("ユーザーが付けた名前は番号の計算に影響しない", () => {
    const store = usePlanStore.getState();
    const [first] = store.input.children;
    store.updateChild(first.id, { name: "太郎" });

    usePlanStore.getState().addChild();

    expect(usePlanStore.getState().input.children.map((c) => c.name)).toEqual([
      "太郎",
      "子1",
    ]);
  });
});

/**
 * lp-030: 世帯構成（配偶者・子の有無）に連動する既定値のストア結合テスト。
 * 純粋関数側の詳細な分岐は householdDefaults.test.ts / householdDefaultsSync.test.ts
 * で検証済み。ここでは toggleSpouse / addChild / removeChild からの
 * 呼び出し経路と、reset・永続化と組み合わせたときの実挙動を確認する。
 */
describe("usePlanStore — 世帯構成連動の既定値（lp-030）", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  it("配偶者を外し、子を削除すると、生活費が単身・子なしの既定値へ連動し、住宅ローン・イベントが残らない", () => {
    const store = usePlanStore.getState();
    // 既定状態: 配偶者あり・子1人（360万円、住宅ローン・イベントあり）
    expect(store.input.expenses.baseAnnualLivingExpense).toBe(3_600_000);
    expect(store.input.loans.length).toBe(1);
    expect(store.input.events.length).toBe(1);

    store.toggleSpouse(false);
    const [firstChild] = usePlanStore.getState().input.children;
    usePlanStore.getState().removeChild(firstChild.id);

    const after = usePlanStore.getState();
    expect(after.input.expenses.baseAnnualLivingExpense).toBe(2_400_000);
    expect(after.input.loans).toEqual([]);
    expect(after.input.events).toEqual([]);
  });

  it("子0→1→0人の往復で、住宅ローン・イベントの既定値が残留しない", () => {
    usePlanStore.getState().toggleSpouse(false);
    const [firstChild] = usePlanStore.getState().input.children;
    usePlanStore.getState().removeChild(firstChild.id);
    expect(usePlanStore.getState().input.loans).toEqual([]);
    expect(usePlanStore.getState().input.events).toEqual([]);

    usePlanStore.getState().addChild();
    expect(usePlanStore.getState().input.loans.length).toBe(1);
    expect(usePlanStore.getState().input.events.length).toBe(1);

    const [child] = usePlanStore.getState().input.children;
    usePlanStore.getState().removeChild(child.id);

    const after = usePlanStore.getState();
    expect(after.input.loans).toEqual([]);
    expect(after.input.events).toEqual([]);
    expect(after.input.expenses.baseAnnualLivingExpense).toBe(2_400_000);
  });

  it("ユーザーが編集した生活費は、世帯構成を変えても上書きされない", () => {
    const store = usePlanStore.getState();
    store.updateExpenses({ baseAnnualLivingExpense: 5_000_000 });

    store.toggleSpouse(false);
    const [firstChild] = usePlanStore.getState().input.children;
    usePlanStore.getState().removeChild(firstChild.id);

    expect(usePlanStore.getState().input.expenses.baseAnnualLivingExpense).toBe(
      5_000_000,
    );
  });

  it("ユーザーが編集したローンは、子がいなくなっても削除されない", () => {
    const store = usePlanStore.getState();
    const [existingLoan] = store.input.loans;
    store.updateLoan(existingLoan.id, { principal: 50_000_000 });

    store.toggleSpouse(false);
    const [firstChild] = usePlanStore.getState().input.children;
    usePlanStore.getState().removeChild(firstChild.id);

    const after = usePlanStore.getState();
    expect(after.input.loans).toHaveLength(1);
    expect(after.input.loans[0].principal).toBe(50_000_000);
  });

  it("単身・子なしで runSimulation しても、以前の30年ローン残債で枯渇しない（lp-030 検証観点a）", () => {
    const store = usePlanStore.getState();
    store.toggleSpouse(false);
    const [firstChild] = usePlanStore.getState().input.children;
    usePlanStore.getState().removeChild(firstChild.id);

    const input = usePlanStore.getState().input;
    expect(input.loans).toEqual([]);
    expect(input.events).toEqual([]);

    const results = runSimulation(input);
    const depleted = results.find((r) => r.assets < 0);
    expect(depleted).toBeUndefined();
  });
});

describe("usePlanStore.startBlank — まっさらから入力（lp-030）", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  it("基礎生活費・ローン・イベントが 0/空になる", () => {
    usePlanStore.getState().startBlank();
    const { input } = usePlanStore.getState();
    expect(input.expenses.baseAnnualLivingExpense).toBe(0);
    expect(input.loans).toEqual([]);
    expect(input.events).toEqual([]);
  });

  it("self / spouse / children / assets には触れない", () => {
    const before = usePlanStore.getState().input;
    usePlanStore.getState().startBlank();
    const after = usePlanStore.getState().input;

    expect(after.self).toEqual(before.self);
    expect(after.spouse).toEqual(before.spouse);
    expect(after.children).toEqual(before.children);
    expect(after.assets).toEqual(before.assets);
  });

  it("まっさら後に runSimulation しても NaN/例外なく、枯渇しない", () => {
    usePlanStore.getState().startBlank();
    const results = runSimulation(usePlanStore.getState().input);
    assertFiniteSeries(results);
    expect(results.find((r) => r.assets < 0)).toBeUndefined();
  });

  it("まっさら後に世帯構成を変えても、生活費0のままローン・イベントの既定値だけが必要に応じて追加される", () => {
    usePlanStore.getState().startBlank();
    usePlanStore.getState().toggleSpouse(false);

    const afterToggle = usePlanStore.getState().input;
    // 生活費は0のままどの既定値とも一致しないため上書きされない
    expect(afterToggle.expenses.baseAnnualLivingExpense).toBe(0);
  });
});

describe("継続支出のアクション（#18）", () => {
  it("追加・更新・削除ができる", () => {
    usePlanStore.getState().reset();
    expect(usePlanStore.getState().input.recurringExpenses).toEqual([]);

    usePlanStore.getState().addRecurringExpense();
    const added = usePlanStore.getState().input.recurringExpenses;
    expect(added).toHaveLength(1);
    expect(added[0].annualAmount).toBe(0);
    expect(added[0].startYear).toBe(usePlanStore.getState().input.startYear);

    const id = added[0].id;
    usePlanStore
      .getState()
      .updateRecurringExpense(id, { label: "賃貸家賃", annualAmount: 1_200_000 });
    const updated = usePlanStore.getState().input.recurringExpenses[0];
    expect(updated.label).toBe("賃貸家賃");
    expect(updated.annualAmount).toBe(1_200_000);
    expect(updated.id).toBe(id);

    usePlanStore.getState().removeRecurringExpense(id);
    expect(usePlanStore.getState().input.recurringExpenses).toEqual([]);
  });

  it("reset で継続支出も初期値（空配列）に戻る", () => {
    usePlanStore.getState().addRecurringExpense();
    expect(usePlanStore.getState().input.recurringExpenses).toHaveLength(1);
    usePlanStore.getState().reset();
    expect(usePlanStore.getState().input.recurringExpenses).toEqual([]);
  });
});

describe("usePlanStore.updateSelf — 生年変更で終了年齢を保つ", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
  });

  const endAge = () => {
    const { input } = usePlanStore.getState();
    return input.endYear - input.self.birthYear;
  };

  it("生年を変えても終了年齢（本人が何歳になる年まで試算するか）は変わらない", () => {
    const store = usePlanStore.getState();
    store.updateSelf({ birthYear: 1991 });
    store.setRange(2026, 1991 + 85);
    expect(endAge()).toBe(85);

    usePlanStore.getState().updateSelf({ birthYear: 1994 });
    expect(endAge()).toBe(85);
    expect(usePlanStore.getState().input.endYear).toBe(1994 + 85);
  });

  it("1 桁ずつ入力して途中で不正な生年を経由しても、最終的な終了年齢は保たれる", () => {
    const store = usePlanStore.getState();
    store.updateSelf({ birthYear: 1991 });
    store.setRange(2026, 1991 + 95);
    for (const birthYear of [1, 19, 199, 1994]) {
      usePlanStore.getState().updateSelf({ birthYear });
    }
    expect(endAge()).toBe(95);
    expect(usePlanStore.getState().input.endYear).toBe(1994 + 95);
  });

  it("生年以外の更新では終了年を動かさない", () => {
    const before = usePlanStore.getState().input.endYear;
    usePlanStore.getState().updateSelf({ grossAnnualIncome: 4_200_000 });
    expect(usePlanStore.getState().input.endYear).toBe(before);
  });
});
