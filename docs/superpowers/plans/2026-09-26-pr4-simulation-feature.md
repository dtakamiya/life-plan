# PR 4: simulation 一式の features/simulation への移動 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/lib/simulation/*`・`src/lib/assumptions.ts`・`src/lib/validatedSimulation.ts` と結果表示 UI（`SummaryBar`・`DepletionAdvice`・`ResultTable`・`AssumptionsPanel`・`NetWorthChart`・`CashFlowChart` と付随ファイル）を `src/features/simulation/{domain,application,ui}` へ移し、外部からは層の index 経由で使うようにする。計算結果・見た目・保存データは一切変えない。

**Architecture:** simulation は plan の下流機能（`shared ← plan ← simulation`）。domain は計算の純粋関数と `YearlyResult`、application は入力検証つきの呼び出しガード `runValidatedSimulation`、ui は結果表示コンポーネント。infrastructure は作らない（空の層はフォルダを作らない）。移動の前に、plan 側のテストに残っている `runSimulation` 依存のケースを simulation 側の統合テストへ移す（移動後に plan → simulation の「下流機能の import」違反になるため）。

**Tech Stack:** TypeScript 5.7, Next.js 15（App Router、`"use client"`）, React 19, Zustand（persist）, recharts, vitest 3（既定 `environment: "node"`、コンポーネントテストは `// @vitest-environment jsdom`）

**Spec:** `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md`（本計画は 5 章の移行手順 #4 を実装する。根拠は 2.1・2.2 節の層と import ルール、4 章の simulation のファイル対応表）。前段の計画 `docs/superpowers/plans/2026-09-26-pr3-plan-usecases.md` の「後続 PR への申し送り」のうち PR 4 分も本計画で扱う。

## Global Constraints

- 各 PR は挙動を変えず、既存テストがすべて通ることを条件とする。
- ファイル移動は `git mv` で行う。識別子の改名は移動と同じ PR で行わない（関数名・型名・定数名は変えない）。
- 例外を投げない。`try`/`catch` を使わない。
- 新規の npm 依存を追加しない。
- テストは対象ファイルと同一ディレクトリに置く（コロケーション）。既定 `environment: "node"`。`__snapshots__` は対応するテストと同じディレクトリへ移す。
- 他機能・`src/app`・旧ディレクトリ・同一機能の他の層からは `@/features/simulation/<layer>`（層の index）で import する。同じ層の中のファイル同士は相対パス（`./engine` 等）で import し、自層の index は import しない。
- 例外として、テストの `vi.mock`・`vi.importActual` はモック対象のファイルを直接指してよい（2.2 節上、同一機能の内側の層への相対 import は許可されている）。
- コミットメッセージ・コード内コメントは日本語、識別子は英語。
- ブランチは `refactor/simulation-feature`。PR はスカッシュマージ。
- 各 PR の確認は `npm run test` と `npm run build`。

## 仕様からの補足・判断

1. **`types.ts` は `yearlyResult.ts` へ改名して移す**: PR 2a で入力側を切り出した後、`types.ts` には `YearlyResult` しか残っていない。plan/domain がエンティティ単位のファイル名（`planInput.ts` 等）にしたのに合わせる。型名 `YearlyResult` は変えない。
2. **simulation の各層の index が公開するもの**: 層外（app・旧ディレクトリ・他の層）から実際に使われているものだけにする。
   - domain: `runSimulation`, `summarizeResults`, `findDepletion`, `describeAssetLongevity`, `findDepletionRemedies`, `buildAssumptionRows`, 型 `YearlyResult`。税・社会保険等の定数は `assumptions.ts` が同じ層から相対 import するので出さない。`ResultSummary`・`DepletionRemedies`・`AssumptionRow`・`IncomeAdjustmentEffect` も層外で使われていないので出さない。
   - application: `runValidatedSimulation`。
   - ui: `SummaryBar`, `DepletionAdvice`, `ResultTable`, `AssumptionsPanel`, `NetWorthChart`, `CashFlowChart`。`result-table-cards.ts`・`netWorthChartData.ts` は層内でしか使われないので出さない。
3. **plan 側テストの `runSimulation` ケースの移動先**（PR 2a・2b・3 の申し送り）:
   - `plan/ui/usePlanStore.test.ts` の 4 ケース（`BASELINE_SERIES`・`assertFiniteSeries` を含む）→ `simulation/ui/planStore.integration.test.ts`。ストア（`@/features/plan/ui`）を使うため ui 層に置く。
   - `plan/application/newLoan.test.ts` の 4 ケース → `simulation/application/newLoan.integration.test.ts`。
   - `plan/application/newRecurringExpense.test.ts` の 1 ケース → `simulation/application/newRecurringExpense.integration.test.ts`。
   - 移したケースのテスト名・本文・補助関数は変えない。移動元に残るテストで使われなくなった補助関数・import は削除する。
4. **`planFile.test.ts` の「年次系列も一致」は移さずに削る**: このケースは直前で `expect(r.input).toEqual(input)` を確認しており、`runSimulation` は同じ入力に同じ結果を返す純粋関数なので、系列の一致は入力の一致から従う。simulation 側に同じケースを作ると plan/infrastructure を import するため ui 層に置くことになり、目的に比べて重い。`runSimulation` の行を削り、テスト名を「export→import で完全一致する」に直す（ケース数は変わらない）。
5. **`chart-aria.test.tsx` の `ComparisonChart` のケースは分けて残す**: `ComparisonChart` は scenario の UI（PR 6 で `scenario/ui` へ移る）。simulation/ui のテストが import すると PR 6 で「下流機能の import」違反になるため、そのケースだけを `src/components/charts/comparison-chart-aria.test.tsx` に分けて旧ディレクトリに残す（PR 6 で `scenario/ui` へ移す）。
6. **旧ディレクトリの import も index 経由に書き換える**: `src/lib/game/*`・`src/lib/comparisonDiff.ts`・`src/components/charts/ComparisonChart.tsx` は判定対象外だが、移動元のパスが消えるので `@/features/simulation/<layer>` に書き換える。
7. **`src/architecture/importRules.test.ts` の `classify("lib/simulation/engine")`** は旧ディレクトリの分類例（文字列）で、実ファイルを参照しないので変えない。

### 後続 PR への申し送り（本 PR で更新）

| 対象 | 内容 | 対応する PR |
|------|------|------|
| `features/plan/ui/usePlanStore.ts` の `mergePersistedPlanState` | `plan/infrastructure` へ移す（snapshots の検証は scenario の `merge` へ） | PR 6（PR 3 から継続） |
| `features/plan/ui/usePlanStore.ts` の `saveSnapshot`・`removeSnapshot`・`loadSnapshot` | scenario ストア・ユースケースへ移す | PR 6（PR 3 から継続） |
| `src/components/charts/comparison-chart-aria.test.tsx` | `ComparisonChart` と一緒に `scenario/ui` へ移す | PR 6 |
| `src/lib/game/*` の `@/features/simulation/domain` の import | game を `features/game` へ移したあとも index 経由のまま（game → simulation は上流なので許可） | PR 5（作業不要の確認のみ） |

## Review Focus

1. **スナップショットの黙った再生成**: `input-validation.test.ts` を移したあと `__snapshots__` が見つからないと、vitest は CI 以外では新しいスナップショットを書き出して PASS してしまい、計算結果の不変が保証されなくなる。Task 3 では `CI=true` でテストを実行し（CI モードではスナップショットを書かず、欠落は FAIL になる）、`git status` に新しい `.snap` が現れないことを確認する。
2. **`vi.mock` のすり抜け**: `runValidatedSimulation` が index（`@/features/simulation/domain`）経由で `runSimulation` を呼ぶようになるため、テストのモック対象（`../domain/engine`）と実際に呼ばれるモジュールが一致していないと、ガードの検証が意味を失う。既存の「妥当な入力では 1 回呼ぶ」（`toHaveBeenCalledTimes(1)`）が通ることで、モックが効いていることを確認する（通らなければ対象パスを疑う）。
3. **テストの消失・二重化**: ケースの移動・分割でテストが消えたり二重になったりしないこと。Task 0 のテスト数 M は全 Task を通じて不変、テストファイル数は Task 1 後に N+3、Task 4 後に N+4 になる。
4. **画面の見た目・操作の不変**: チャートの描画、枯渇対策、計算の前提パネル、結果表、比較チャート（スナップショット保存後）、`/game` の進行が移動前と同じであること。コンポーネントの中身は変えないが、`"use client"` の付いたファイルを index 経由で import するので、Task 5 の画面確認で必ず見る。
5. **`/game` のバンドル**: `src/app/game/page.tsx` は `@/features/simulation/domain` の index から `runSimulation` を import する。index には React 非依存の関数しかないので増えないはずだが、Task 0 と Task 5 で `npm run build` のルート別サイズ（`/` と `/game` の First Load JS）を比べ、増えていれば PR 本文に数値を書く（仕様上 index 経由は必須なので、増加は許容して記録に留める）。

---

### Task 0: ブランチ作成とベースライン記録

**Files:** なし

- [x] **Step 1: ブランチを作成する**

```bash
git switch main && git pull
git switch -c refactor/simulation-feature
```

- [x] **Step 2: テスト件数のベースラインを記録する**

Run: `npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。`Test Files  N passed` と `Tests  M passed` の N・M を控える。

- [x] **Step 3: ルート別のバンドルサイズを記録する**

Run: `npm run build 2>&1 | grep -E "^(┌|├|└)"`
Expected: ビルド成功。`/` と `/game` の Size・First Load JS を控える（Review Focus 5）。

---

### Task 1: plan 側テストの `runSimulation` ケースを simulation の統合テストへ移す

移動前の段階なので、新しい統合テストは一時的に旧パス `@/lib/simulation/*` を import する（旧ディレクトリへの import は判定対象外）。Task 2 で index に書き換える。

**Files:**
- Create: `src/features/simulation/ui/planStore.integration.test.ts`
- Create: `src/features/simulation/application/newLoan.integration.test.ts`
- Create: `src/features/simulation/application/newRecurringExpense.integration.test.ts`
- Modify: `src/features/plan/ui/usePlanStore.test.ts`
- Modify: `src/features/plan/application/newLoan.test.ts`
- Modify: `src/features/plan/application/newRecurringExpense.test.ts`
- Modify: `src/features/plan/infrastructure/planFile.test.ts`

**Interfaces:**
- Consumes: `@/features/plan/ui` の `usePlanStore`、`@/features/plan/application` の `newLoan`, `newRecurringExpense`、`@/features/plan/domain` の `defaultPlanInput`, `PlanInput`, `Person`、旧パスの `runSimulation`（`@/lib/simulation/engine`）と `YearlyResult`（`@/lib/simulation/types`）
- Produces: なし（テストのみ）

- [x] **Step 1: ストアの統合テストを作る**

`src/features/simulation/ui/planStore.integration.test.ts`（本文は `usePlanStore.test.ts` の該当ケースそのまま。describe 名は移動元と同じにし、各 describe の `beforeEach` も移動元と同じにする）:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { usePlanStore } from "@/features/plan/ui";
import { defaultPlanInput } from "@/features/plan/domain";
import { runSimulation } from "@/lib/simulation/engine";
import type { YearlyResult } from "@/lib/simulation/types";

/**
 * plan ストアの操作結果をシミュレーションに通したときの回帰テスト。
 * plan は simulation を import できない（下流機能）ため、plan/ui/usePlanStore.test.ts から移した。
 */

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

describe("usePlanStore — 世帯構成連動の既定値（lp-030）", () => {
  beforeEach(() => {
    usePlanStore.getState().reset();
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

  it("まっさら後に runSimulation しても NaN/例外なく、枯渇しない", () => {
    usePlanStore.getState().startBlank();
    const results = runSimulation(usePlanStore.getState().input);
    assertFiniteSeries(results);
    expect(results.find((r) => r.assets < 0)).toBeUndefined();
  });
});
```

- [x] **Step 2: 移動元のストアテストから 4 ケースと補助を削る**

`src/features/plan/ui/usePlanStore.test.ts` から次を削除する:
- import 行 `import { runSimulation } from "@/lib/simulation/engine";` と `import type { YearlyResult } from "@/lib/simulation/types";`
- `BASELINE_SERIES` の定義（コメント行を含む）と `assertFiniteSeries` 関数（コメント行を含む）
- `describe("usePlanStore.reset")` 内の `it("リセット直後に runSimulation を呼んでも NaN/例外なく正常系列を返す")` と `it("既定入力に対する runSimulation の年次系列が reset 前後で完全一致する")`
- `describe("usePlanStore — 世帯構成連動の既定値（lp-030）")` 内の `it("単身・子なしで runSimulation しても、以前の30年ローン残債で枯渇しない（lp-030 検証観点a）")`
- `describe("usePlanStore.startBlank — まっさらから入力（lp-030）")` 内の `it("まっさら後に runSimulation しても NaN/例外なく、枯渇しない")`

`defaultPlanInput` は残るケースが使うので import は残す。

Run: `grep -n "runSimulation\|YearlyResult\|BASELINE_SERIES\|assertFiniteSeries" src/features/plan/ui/usePlanStore.test.ts`
Expected: 出力なし

- [x] **Step 3: ローン新規行の統合テストを作る**

`src/features/simulation/application/newLoan.integration.test.ts`（`basePerson`・`makeInput` と 4 ケースは `newLoan.test.ts` からそのまま移す）:

```ts
import { describe, it, expect } from "vitest";
import { newLoan } from "@/features/plan/application";
import { runSimulation } from "@/lib/simulation/engine";
import type { PlanInput, Person } from "@/features/plan/domain";

/**
 * ローン新規行（newLoan）をシミュレーションに通したときの回帰テスト。
 * plan は simulation を import できない（下流機能）ため、plan/application/newLoan.test.ts から移した。
 */

const basePerson: Person = {
  name: "本人",
  birthYear: 2000,
  grossAnnualIncome: 5_000_000,
  incomeGrowthRate: 0,
  retirementAge: 65,
  pensionStartAge: 65,
  annualPension: 1_000_000,
  retirementBenefit: 0,
};

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: 2030,
    endYear: 2035,
    self: basePerson,
    spouse: null,
    children: [],
    expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0 },
    assets: {
      taxableAssets: 1_000_000,
      taxFreeAssets: 0,
      annualReturnRate: 0,
      annualDividendYield: 0,
      annualTaxFreeContribution: 0,
    },
    events: [],
    recurringExpenses: [],
    loans: [],
    ...overrides,
  };
}

describe("newLoan — ローン新規行ファクトリ（lp-013）", () => {
  it("AC4: 空ローン行を含む PlanInput でも runSimulation が例外を出さず返済額0", () => {
    const input = makeInput({ loans: [newLoan("loan-1", 2030)] });
    expect(() => runSimulation(input)).not.toThrow();
    const results = runSimulation(input);
    expect(results.every((r) => r.loanPayment === 0)).toBe(true);
  });

  it("AC5/AC10: 空ローン行の追加前後で年次系列が完全一致（負債が混入しない）", () => {
    const before = runSimulation(makeInput({ loans: [] }));
    const after = runSimulation(makeInput({ loans: [newLoan("loan-1", 2030)] }));
    expect(after).toEqual(before);
  });

  it("AC6: ローン0行→1行→複数行の追加/削除でインデックスずれが無い", () => {
    const loans = [
      newLoan("loan-1", 2030),
      newLoan("loan-2", 2030),
      newLoan("loan-3", 2030),
    ];
    // 全行が空なので、行数に関わらず系列は空配列時と一致する。
    const base = runSimulation(makeInput({ loans: [] }));
    for (let n = 1; n <= loans.length; n++) {
      const series = runSimulation(makeInput({ loans: loans.slice(0, n) }));
      expect(series).toEqual(base);
    }
    // 中間行を削除しても残りの空行は無影響。
    const removedMiddle = runSimulation(
      makeInput({ loans: [loans[0], loans[2]] }),
    );
    expect(removedMiddle).toEqual(base);
  });

  it("AC1: ユーザーが値を入れた行のみ返済に寄与する（空行は据え置きでも無影響）", () => {
    const filled = { ...newLoan("loan-1", 2030), principal: 3_000_000, termYears: 3 };
    const empty = newLoan("loan-2", 2030);
    const withEmpty = runSimulation(makeInput({ loans: [filled, empty] }));
    const withoutEmpty = runSimulation(makeInput({ loans: [filled] }));
    expect(withEmpty).toEqual(withoutEmpty);
    // 入力済み行はちゃんと返済計上される（r=0 なので P/n=1,000,000）。
    expect(withEmpty.filter((r) => r.loanPayment === 1_000_000)).toHaveLength(3);
  });
});
```

- [x] **Step 4: 移動元の newLoan.test.ts を 1 ケースだけにする**

`src/features/plan/application/newLoan.test.ts` の全体を次にする（残るのは runSimulation を使わない最初のケースのみ）:

```ts
import { describe, it, expect } from "vitest";
import { newLoan } from "./newLoan";

describe("newLoan — ローン新規行ファクトリ（lp-013）", () => {
  it("AC1/AC4: 新規行は借入額0・金利0・期間35年、開始年は当年", () => {
    expect(newLoan("loan-1", 2030)).toEqual({
      id: "loan-1",
      label: "ローン",
      startYear: 2030,
      principal: 0,
      annualRate: 0,
      termYears: 35,
    });
  });
});
```

- [x] **Step 5: 継続支出新規行の統合テストを作る**

`src/features/simulation/application/newRecurringExpense.integration.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { newRecurringExpense } from "@/features/plan/application";
import { runSimulation } from "@/lib/simulation/engine";
import type { PlanInput, Person } from "@/features/plan/domain";

/**
 * 継続支出の新規行（newRecurringExpense）をシミュレーションに通したときの回帰テスト。
 * plan は simulation を import できない（下流機能）ため、plan/application/newRecurringExpense.test.ts から移した。
 */

const basePerson: Person = {
  name: "本人",
  birthYear: 2000,
  grossAnnualIncome: 5_000_000,
  incomeGrowthRate: 0,
  retirementAge: 65,
  pensionStartAge: 65,
  annualPension: 1_000_000,
  retirementBenefit: 0,
};

function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startYear: 2030,
    endYear: 2033,
    self: basePerson,
    spouse: null,
    children: [],
    expenses: { baseAnnualLivingExpense: 3_000_000, inflationRate: 0 },
    assets: {
      taxableAssets: 1_000_000,
      taxFreeAssets: 0,
      annualReturnRate: 0,
      annualDividendYield: 0,
      annualTaxFreeContribution: 0,
    },
    events: [],
    recurringExpenses: [],
    loans: [],
    ...overrides,
  };
}

describe("newRecurringExpense", () => {
  it("追加直後の行は年次系列を一切変えない", () => {
    const before = runSimulation(makeInput({ recurringExpenses: [] }));
    const after = runSimulation(
      makeInput({ recurringExpenses: [newRecurringExpense("rec-1", 2030)] }),
    );
    expect(after).toEqual(before);
  });
});
```

- [x] **Step 6: 移動元の newRecurringExpense.test.ts を 1 ケースだけにする**

`src/features/plan/application/newRecurringExpense.test.ts` の全体を次にする:

```ts
import { describe, it, expect } from "vitest";
import { newRecurringExpense } from "./newRecurringExpense";

describe("newRecurringExpense", () => {
  it("開始年・終了年は当年、年額は 0 で始まる", () => {
    const item = newRecurringExpense("rec-1", 2030);
    expect(item.id).toBe("rec-1");
    expect(item.startYear).toBe(2030);
    expect(item.endYear).toBe(2030);
    expect(item.annualAmount).toBe(0);
  });
});
```

- [x] **Step 7: planFile.test.ts の系列比較を削る**

`src/features/plan/infrastructure/planFile.test.ts` から import 行 `import { runSimulation } from "@/lib/simulation/engine";` を削除し、「プランJSON往復」の最初のケースを次にする（補足・判断 4）:

```ts
describe("プランJSON往復", () => {
  it.each([["既定", () => structuredClone(defaultPlanInput)], ["子・ローン・イベント入り", rich]])(
    "%s: export→import で完全一致する",
    (_n, make) => {
      const input = make();
      const r = parsePlanFile(serializePlan(input));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.input).toEqual(input);
    },
  );
```

- [x] **Step 8: plan から simulation への依存が無くなったことを確認する**

Run: `grep -rn "simulation" src/features/plan`
Expected: 出力なし

- [x] **Step 9: テストを実行する**

Run: `npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。テストファイル数 N+3、テスト数 M（移動のみなので不変）。

- [x] **Step 10: コミットする**

```bash
git add src/features/simulation src/features/plan
git commit -m "test: plan 側の runSimulation を使うケースを simulation の統合テストへ移動"
```

---

### Task 2: simulation/domain への移動

**Files:**
- Move: `src/lib/simulation/*` → `src/features/simulation/domain/`（`types.ts` は `yearlyResult.ts` に改名）
- Move: `src/lib/assumptions.ts`, `src/lib/assumptions.test.ts` → `src/features/simulation/domain/`
- Create: `src/features/simulation/domain/index.ts`
- Modify: `src/architecture.test.ts`
- Modify（移動したファイル内の相対 import）: `engine.ts`, `summary.ts`, `summary.test.ts`, `longevitySummary.ts`, `longevitySummary.test.ts`, `assumptions.ts`, `assumptions.test.ts`
- Modify（import 先の書き換え）: `src/app/page.tsx`, `src/app/game/page.tsx`, `src/lib/validatedSimulation.ts`, `src/lib/input-validation.test.ts`, `src/lib/comparisonDiff.ts`, `src/lib/game/{advance,stats}.ts`, `src/lib/game/{satisfaction,depletionText,stats,flow,project}.test.ts`, `src/components/{SummaryBar,DepletionAdvice,ResultTable,AssumptionsPanel}.tsx`, `src/components/{SummaryBar,ResultTable}.test.tsx`, `src/components/result-table-cards.ts`, `src/components/charts/{NetWorthChart,CashFlowChart,ComparisonChart}.tsx`, `src/components/charts/{netWorthChartData.ts,netWorthChartData.test.ts,NetWorthChart.test.tsx,chart-aria.test.tsx}`, `src/components/forms/number-input.integration.test.ts`, Task 1 で作った 3 つの統合テスト

**Interfaces:**
- Consumes: `@/features/plan/domain`（既存）、`@/shared/lib`（既存）
- Produces: `@/features/simulation/domain` から `runSimulation(input: PlanInput): YearlyResult[]`, `summarizeResults(results: YearlyResult[]): ResultSummary | null`, `findDepletion(results: YearlyResult[]): YearlyResult | null`, `describeAssetLongevity(results: YearlyResult[]): string | null`, `findDepletionRemedies(input: PlanInput): DepletionRemedies | null`, `buildAssumptionRows(input: PlanInput): AssumptionRow[]`, 型 `YearlyResult`

- [x] **Step 1: アーキテクチャテストに走査対象の確認を追加する（失敗するテスト）**

`src/architecture.test.ts` の「検査対象のファイルを走査できている」の末尾に 1 行追加する:

```ts
    expect(files).toContain("features/plan/ui/index.ts");
    expect(files).toContain("features/simulation/domain/index.ts");
  });
```

- [x] **Step 2: 失敗を確認する**

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL（`features/simulation/domain/index.ts` が見つからない）

- [x] **Step 3: ファイルを移動する**

```bash
mkdir -p src/features/simulation/domain
git mv src/lib/simulation/types.ts src/features/simulation/domain/yearlyResult.ts
git mv src/lib/simulation/* src/features/simulation/domain/
git mv src/lib/assumptions.ts src/lib/assumptions.test.ts src/features/simulation/domain/
```

Run: `ls src/lib/simulation 2>&1; ls src/features/simulation/domain`
Expected: 1 行目は `No such file or directory`。2 行目に `calc-coverage.test.ts`, `childAllowance(.test).ts`, `depletionRemedies(.test).ts`, `engine(.test).ts`, `housingLoanCredit(.test).ts`, `incomeAdjustment(.test).ts`, `longevitySummary(.test).ts`, `recurringExpense(.test).ts`, `socialInsurance.ts`, `summary(.test).ts`, `tax.ts`, `yearlyResult.ts`, `assumptions(.test).ts` が並ぶ。

- [x] **Step 4: 移動したファイル内の相対 import を直す**

```bash
cd src/features/simulation/domain
sed -i '' 's#from "\./types"#from "./yearlyResult"#' engine.ts summary.ts summary.test.ts longevitySummary.ts longevitySummary.test.ts
sed -i '' 's#from "@/lib/simulation/\([A-Za-z]*\)"#from "./\1"#' assumptions.ts
sed -i '' 's#from "\./simulation/\([A-Za-z]*\)"#from "./\1"#' assumptions.test.ts
cd -
```

Run: `grep -rn "types\"\|lib/simulation\|\./simulation/" src/features/simulation/domain`
Expected: 出力なし

- [x] **Step 5: 公開 API を作る**

`src/features/simulation/domain/index.ts`:

```ts
/** simulation/domain の公開 API。他機能・app・旧ディレクトリ・同一機能の他層からはこの index 経由で import する。 */
export { buildAssumptionRows } from "./assumptions";
export { findDepletionRemedies } from "./depletionRemedies";
export { runSimulation } from "./engine";
export { describeAssetLongevity } from "./longevitySummary";
export { findDepletion, summarizeResults } from "./summary";
export type { YearlyResult } from "./yearlyResult";
```

- [x] **Step 6: 1 モジュールから 1 行だけ import しているファイルを機械的に書き換える**

```bash
grep -rlE '"@/lib/(simulation/[A-Za-z]+|assumptions)"' src | xargs sed -i '' -E 's#"@/lib/(simulation/[A-Za-z]+|assumptions)"#"@/features/simulation/domain"#'
```

`src/lib/input-validation.test.ts` の `vi.mock` 等は相対パス（`./simulation/engine`）なので次で直す（engine を直接モックし続ける。Review Focus 2）:

```bash
sed -i '' 's#"\./simulation/engine"#"@/features/simulation/domain/engine"#g' src/lib/input-validation.test.ts
```

Run: `grep -rnE "lib/simulation|lib/assumptions|\./simulation/" src --include='*.ts' --include='*.tsx' | grep -v importRules.test.ts`
Expected: 出力なし

- [x] **Step 7: 同じ index からの重複 import を 1 行にまとめる**

Step 6 の結果、次のファイルでは `@/features/simulation/domain` からの import が 2 行以上になっている。それぞれ下の 1 行にまとめる（他の行は変えない）。

`src/app/page.tsx`（`summarizeResults`・`describeAssetLongevity`・`YearlyResult` の 3 行。`YearlyResult` の行は末尾の方にあるので削除して先頭側へまとめる）:

```ts
import { describeAssetLongevity, summarizeResults, type YearlyResult } from "@/features/simulation/domain";
```

`src/components/SummaryBar.tsx`・`src/lib/comparisonDiff.ts`:

```ts
import { summarizeResults, type YearlyResult } from "@/features/simulation/domain";
```

`src/components/charts/NetWorthChart.tsx`・`src/components/charts/netWorthChartData.ts`・`src/lib/game/stats.ts`:

```ts
import { findDepletion, type YearlyResult } from "@/features/simulation/domain";
```

`src/lib/validatedSimulation.ts`（Task 3 で移すが、ここでもまとめておく）:

```ts
import { runSimulation, type YearlyResult } from "@/features/simulation/domain";
```

Run: `grep -rc '"@/features/simulation/domain"' src --include='*.ts' --include='*.tsx' | grep -v ":0$" | grep -v ":1$"`
Expected: 出力なし（どのファイルも 1 行だけ）

- [x] **Step 8: 統合テストの import を index 経由にしたことを確認する**

Task 1 の 3 ファイルは Step 6 の sed で `@/features/simulation/domain` に書き換わっている。`planStore.integration.test.ts` は `runSimulation` と `YearlyResult` の 2 行になるので 1 行にまとめる:

```ts
import { runSimulation, type YearlyResult } from "@/features/simulation/domain";
```

- [x] **Step 9: テストと型検査を実行する**

Run: `npx vitest run 2>&1 | tail -6 && npx tsc --noEmit`
Expected: すべて PASS（アーキテクチャテストを含む）。テストファイル数 N+3、テスト数 M。`tsc` はエラーなし。

- [x] **Step 10: コミットする**

```bash
git add -A src
git commit -m "refactor: simulation の計算ロジックを simulation/domain へ移動"
```

---

### Task 3: simulation/application への移動（呼び出しガードとスナップショット）

**Files:**
- Move: `src/lib/validatedSimulation.ts` → `src/features/simulation/application/validatedSimulation.ts`
- Move: `src/lib/input-validation.test.ts` → `src/features/simulation/application/input-validation.test.ts`
- Move: `src/lib/__snapshots__/input-validation.test.ts.snap` → `src/features/simulation/application/__snapshots__/input-validation.test.ts.snap`
- Create: `src/features/simulation/application/index.ts`
- Modify: `src/architecture.test.ts`
- Modify: `src/app/page.tsx`, `src/components/charts/ComparisonChart.tsx`

**Interfaces:**
- Consumes: `@/features/simulation/domain` の `runSimulation`, `YearlyResult`（Task 2）、`@/features/plan/application` の `validatePlanInput`
- Produces: `@/features/simulation/application` から `runValidatedSimulation(input: PlanInput): YearlyResult[] | null`

- [x] **Step 1: アーキテクチャテストに走査対象の確認を追加する（失敗するテスト）**

`src/architecture.test.ts` に追加する:

```ts
    expect(files).toContain("features/simulation/domain/index.ts");
    expect(files).toContain("features/simulation/application/index.ts");
  });
```

- [x] **Step 2: 失敗を確認する**

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL（`features/simulation/application/index.ts` が見つからない）

- [x] **Step 3: ファイルを移動する**

```bash
mkdir -p src/features/simulation/application/__snapshots__
git mv src/lib/validatedSimulation.ts src/lib/input-validation.test.ts src/features/simulation/application/
git mv src/lib/__snapshots__/input-validation.test.ts.snap src/features/simulation/application/__snapshots__/
```

`src/lib/__snapshots__/` は空になり、git 上から消える。`validatedSimulation.ts` の import（`@/features/simulation/domain`・`@/features/plan/domain`・`@/features/plan/application`）は位置に依存しないので変更不要。

- [x] **Step 4: テストのモック対象を同一機能の相対パスにする**

`src/features/simulation/application/input-validation.test.ts` の `@/features/simulation/domain/engine`（Task 2 で書き換えた 5 か所: `vi.mock`・`importOriginal` の型・`import { runSimulation }`・`vi.importActual` の型と引数）を `../domain/engine` にする:

```bash
sed -i '' 's#"@/features/simulation/domain/engine"#"../domain/engine"#g' src/features/simulation/application/input-validation.test.ts
```

`./validatedSimulation` の import は同じディレクトリのままなので変更不要。

Run: `grep -n "engine\|validatedSimulation\"" src/features/simulation/application/input-validation.test.ts`
Expected: `vi.mock("../domain/engine", ...)`、`import("../domain/engine")`（2 か所）、`import { runSimulation } from "../domain/engine";`、`vi.importActual<...>("../domain/engine")`、`import { runValidatedSimulation } from "./validatedSimulation";` が表示される

- [x] **Step 5: 公開 API を作る**

`src/features/simulation/application/index.ts`:

```ts
/** simulation/application の公開 API。他機能・app・旧ディレクトリ・同一機能の他層からはこの index 経由で import する。 */
export { runValidatedSimulation } from "./validatedSimulation";
```

- [x] **Step 6: 利用側の import を書き換える**

```bash
sed -i '' 's#"@/lib/validatedSimulation"#"@/features/simulation/application"#' src/app/page.tsx src/components/charts/ComparisonChart.tsx
```

Run: `grep -rn "lib/validatedSimulation\|lib/__snapshots__" src`
Expected: 出力なし

- [x] **Step 7: スナップショットを書き出さずに検証する（Review Focus 1・2）**

Run: `CI=true npx vitest run src/features/simulation/application/input-validation.test.ts 2>&1 | tail -8 && git status --short -- '*.snap'`
Expected: すべて PASS。`Snapshots  1 passed`（`written` や `obsolete` が出ないこと）。`git status` には移動した `.snap` の rename 以外の行（`??` の新規ファイル）が出ない。`toHaveBeenCalledTimes(1)` のケースが PASS していること（モックが効いている）。

- [x] **Step 8: 全テストを実行する**

Run: `npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。テストファイル数 N+3、テスト数 M。

- [x] **Step 9: コミットする**

```bash
git add -A src
git commit -m "refactor: 入力検証つきシミュレーションを simulation/application へ移動"
```

---

### Task 4: simulation/ui への移動（結果表示 UI）

**Files:**
- Create: `src/components/charts/comparison-chart-aria.test.tsx`
- Modify: `src/components/charts/chart-aria.test.tsx`（ComparisonChart のケースを削除）
- Move → `src/features/simulation/ui/`: `src/components/{SummaryBar,DepletionAdvice,ResultTable}.tsx` とそれぞれの `.test.tsx`、`src/components/AssumptionsPanel.tsx`、`src/components/result-table-cards.ts`・`.test.ts`、`src/components/charts/{NetWorthChart.tsx,NetWorthChart.test.tsx,CashFlowChart.tsx,netWorthChartData.ts,netWorthChartData.test.ts,chart-aria.test.tsx}`、`src/components/forms/number-input.integration.test.ts`
- Create: `src/features/simulation/ui/index.ts`
- Modify: `src/architecture.test.ts`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `@/features/simulation/domain`（Task 2）、`@/features/plan/domain`、`@/shared/lib`、`@/shared/ui`
- Produces: `@/features/simulation/ui` から `SummaryBar`, `DepletionAdvice`, `ResultTable`, `AssumptionsPanel`, `NetWorthChart`, `CashFlowChart`（props は現状のまま）

- [x] **Step 1: ComparisonChart のテキスト代替テストを分ける**

`src/components/charts/comparison-chart-aria.test.tsx`（ハーネスと `results` は `chart-aria.test.tsx` と同じ内容。ケース本文は移動元から変えない）:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { YearlyResult } from "@/features/simulation/domain";
import { ComparisonChart } from "./ComparisonChart";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom は ResizeObserver 未実装。recharts の ResponsiveContainer が要求するため
// 最小限のダミー実装を積む（実際のリサイズ監視は検証対象ではない）。
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;
});

/**
 * lp-ui-ux-audit-fix / FR6.1 の回帰テスト（ComparisonChart 分）。
 * ComparisonChart は scenario の UI のため、simulation/ui へ移した chart-aria.test.tsx から分けた。
 */

const results: YearlyResult[] = [
  {
    year: 2026,
    selfAge: 40,
    spouseAge: null,
    grossIncome: 6_000_000,
    tax: 800_000,
    socialInsurance: 900_000,
    investmentTax: 0,
    pension: 0,
    childAllowance: 0,
    housingLoanCredit: 0,
    netIncome: 4_300_000,
    livingExpense: 3_600_000,
    loanPayment: 0,
    eventNet: 0,
    recurringExpense: 0,
    retirementBenefit: 0,
    dividendIncome: 0,
    dividendTax: 0,
    cashFlow: 700_000,
    assets: 5_700_000,
    propertyValue: 0,
    financialAssets: 5_700_000,
    loanBalance: 0,
    taxableAssets: 5_700_000,
    taxFreeAssets: 0,
  },
];

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function mount(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return container;
}

describe("チャートのテキスト代替（FR6.1）", () => {
  it("ComparisonChart は result-table を aria-describedby で参照する", () => {
    const el = mount(<ComparisonChart current={results} snapshots={[]} />);
    expect(
      el.querySelector('[aria-describedby="result-table"]'),
    ).not.toBeNull();
  });
});
```

`src/components/charts/chart-aria.test.tsx` から `import { ComparisonChart } from "./ComparisonChart";` と `it("ComparisonChart は result-table を aria-describedby で参照する", ...)` を削除する。

Run: `grep -n "ComparisonChart" src/components/charts/chart-aria.test.tsx; npx vitest run src/components/charts 2>&1 | tail -6`
Expected: grep は出力なし。テストはすべて PASS。

- [x] **Step 2: アーキテクチャテストに走査対象の確認を追加する（失敗するテスト）**

`src/architecture.test.ts` に追加する:

```ts
    expect(files).toContain("features/simulation/application/index.ts");
    expect(files).toContain("features/simulation/ui/index.ts");
  });
```

- [x] **Step 3: 失敗を確認する**

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL（`features/simulation/ui/index.ts` が見つからない）

- [x] **Step 4: ファイルを移動する**

```bash
mkdir -p src/features/simulation/ui
git mv src/components/SummaryBar.tsx src/components/SummaryBar.test.tsx \
  src/components/DepletionAdvice.tsx src/components/DepletionAdvice.test.tsx \
  src/components/ResultTable.tsx src/components/ResultTable.test.tsx \
  src/components/AssumptionsPanel.tsx \
  src/components/result-table-cards.ts src/components/result-table-cards.test.ts \
  src/components/charts/NetWorthChart.tsx src/components/charts/NetWorthChart.test.tsx \
  src/components/charts/CashFlowChart.tsx \
  src/components/charts/netWorthChartData.ts src/components/charts/netWorthChartData.test.ts \
  src/components/charts/chart-aria.test.tsx \
  src/components/forms/number-input.integration.test.ts \
  src/features/simulation/ui/
```

移動したファイル同士の相対 import（`./result-table-cards`・`./netWorthChartData`・`./CashFlowChart`・`./NetWorthChart`・`./SummaryBar` 等）は同じディレクトリに揃うので変更不要。`src/components/forms/` は空になり、git 上から消える。

Run: `ls src/components src/components/charts`
Expected: `src/components` に `ScenarioBar.tsx`, `ScenarioBar.test.tsx`, `charts`, `game` のみ。`src/components/charts` に `ComparisonChart.tsx`, `ComparisonDiffTable.tsx`, `comparison-chart-aria.test.tsx` のみ。

- [x] **Step 5: 公開 API を作る**

`src/features/simulation/ui/index.ts`（`"use client"` は付けない。各コンポーネントファイルの `"use client"` はそのまま残す）:

```ts
/** simulation/ui の公開 API。他機能・app・旧ディレクトリからはこの index 経由で import する。simulation/ui 内のファイルはこの index を import しない。 */
export { AssumptionsPanel } from "./AssumptionsPanel";
export { CashFlowChart } from "./CashFlowChart";
export { DepletionAdvice } from "./DepletionAdvice";
export { NetWorthChart } from "./NetWorthChart";
export { ResultTable } from "./ResultTable";
export { SummaryBar } from "./SummaryBar";
```

- [x] **Step 6: app/page.tsx の import を書き換える**

`src/app/page.tsx` の次の 6 行を削除する:

```ts
import { SummaryBar } from "@/components/SummaryBar";
import { DepletionAdvice } from "@/components/DepletionAdvice";
import { NetWorthChart } from "@/components/charts/NetWorthChart";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { ResultTable } from "@/components/ResultTable";
import { AssumptionsPanel } from "@/components/AssumptionsPanel";
```

削除した位置（`ComparisonChart`・`ScenarioBar` の import の直前）に次の 1 行を入れる:

```ts
import {
  AssumptionsPanel,
  CashFlowChart,
  DepletionAdvice,
  NetWorthChart,
  ResultTable,
  SummaryBar,
} from "@/features/simulation/ui";
```

Run: `grep -rnE "components/(SummaryBar|DepletionAdvice|ResultTable|AssumptionsPanel|result-table-cards|charts/(NetWorthChart|CashFlowChart|netWorthChartData)|forms/)" src`
Expected: 出力なし

- [x] **Step 7: テストと型検査を実行する**

Run: `npx vitest run 2>&1 | tail -6 && npx tsc --noEmit`
Expected: すべて PASS（アーキテクチャテストを含む）。テストファイル数 N+4（Step 1 の分割で +1）、テスト数 M。`tsc` はエラーなし。

- [x] **Step 8: コミットする**

```bash
git add -A src
git commit -m "refactor: 結果表示 UI を simulation/ui へ移動"
```

---

### Task 5: 全体確認と PR

**Files:**
- Modify: `docs/superpowers/plans/2026-09-26-pr4-simulation-feature.md`（申し送りの実績があれば追記）

- [x] **Step 1: テスト・lint・ビルドを実行する**

Run: `npm run test 2>&1 | tail -6 && npm run lint && npm run build 2>&1 | grep -E "^(┌|├|└)"`
Expected: テストはすべて PASS（ファイル数 N+4、テスト数 M）。lint はエラーなし。ビルド成功。`/` と `/game` の First Load JS を Task 0 の値と比べる（Review Focus 5）。

- [x] **Step 2: 旧パスの残りが無いことを確認する**

Run: `grep -rnE "@/lib/(simulation|assumptions|validatedSimulation)|@/components/(SummaryBar|DepletionAdvice|ResultTable|AssumptionsPanel)" src docs/superpowers/specs; ls src/lib`
Expected: grep は出力なし。`src/lib` には `comparisonDiff.ts`, `comparisonDiff.test.ts`, `game` のみ。

- [x] **Step 3: 画面で確認する（Review Focus 4）**

`npm run dev` で起動し、ブラウザで次を確認する（既存の localStorage `life-plan/v1` がある状態で開く）:
- `/`: 保存済みの入力が復元される。サマリー・純資産チャート・キャッシュフローチャート・結果表（カード表示と表の切り替えを含む）・計算の前提パネルが表示される。
- 生活費を大きくして資産が枯渇する状態にすると、枯渇対策（DepletionAdvice）が表示され、チャートに枯渇年が出る。
- 入力を不正（開始年 > 終了年など）にすると結果が出ず、エラー表示になる（`runValidatedSimulation` のガード）。
- スナップショットを 1 件保存し、比較チャートと差分表が表示される。
- `/game`: ゲームを開始し、数ステージ進めて結果画面まで到達できる。

- [x] **Step 4: プッシュして PR を作る**

```bash
git push -u origin refactor/simulation-feature
gh pr create --title "refactor: simulation 一式の features/simulation への移動（PR 4）" --body "$(cat <<'EOF'
## 概要

設計 `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md` の移行手順 #4。simulation の計算ロジック・呼び出しガード・結果表示 UI を `src/features/simulation/{domain,application,ui}` へ移した。挙動・見た目・保存データは変えていない。

- `src/lib/simulation/*`・`src/lib/assumptions.ts` → `simulation/domain`（`types.ts` は `yearlyResult.ts` に改名）
- `src/lib/validatedSimulation.ts`・`input-validation.test.ts` と `__snapshots__` → `simulation/application`
- `SummaryBar`・`DepletionAdvice`・`ResultTable`・`AssumptionsPanel`・`NetWorthChart`・`CashFlowChart` と付随ファイル、`number-input.integration.test.ts` → `simulation/ui`
- plan 側テストの `runSimulation` を使うケースを simulation の統合テストへ移した（plan → simulation の下流 import を無くすため）
- `chart-aria.test.tsx` の `ComparisonChart` のケースは `src/components/charts/comparison-chart-aria.test.tsx` に分けて残した（PR 6 で scenario へ移す）
- 詳細と後続 PR への申し送りは `docs/superpowers/plans/2026-09-26-pr4-simulation-feature.md`

## 確認

- [x] `npm run test`（テスト数は移動前と同じ）
- [x] `CI=true` でのスナップショット検証（再生成なし）
- [x] `npm run lint`
- [x] `npm run build`
- [x] 画面操作（入力の復元・チャート・結果表・枯渇対策・計算の前提・不正入力時のガード・比較チャート・ゲーム画面）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

バンドルサイズが増えていた場合は、PR 本文の「確認」の下に Task 0 と Task 5 の `/`・`/game` の First Load JS を追記する。
