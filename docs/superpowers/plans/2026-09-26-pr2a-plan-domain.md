# PR 2a: plan の domain・application・infrastructure への移動 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `lib/simulation/types.ts` の入力側の型をエンティティ単位に分割し、plan 機能のドメインロジック・ユースケース部品・入力検証・プランファイル入出力を `src/features/plan/{domain,application,infrastructure}` へ移す。ストア（`lib/store/usePlanStore.ts`）とフォーム（`components/forms/*`）は旧位置のまま import だけ更新する。挙動・見た目は一切変えない。

**Architecture:** 各層の `index.ts` を公開 API とし、plan の外からは `@/features/plan/<layer>` の形（層の index）でのみ import する。層内のファイル同士は相対パスで個別ファイルを import する（自層の index は import しない）。同一機能の他の層は `@/features/plan/<layer>` の index で import する。`YearlyResult` は PR 4（simulation の移動）まで `lib/simulation/types.ts` に残す。

**Tech Stack:** TypeScript 5.7, Next.js 15, vitest 3（`environment: "node"`）, zod 3, Node 22（`fs.readdirSync` の `recursive` を使用）

**Spec:** `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md`（本計画は 5 章の移行手順 #2a を実装する。2.1・2.2 節の層と import ルール、4 章の plan のファイル対応表が根拠）

## Global Constraints

- 各 PR は挙動を変えず、既存テストがすべて通ることを条件とする。
- ファイル移動は `git mv` で行う。識別子の改名は移動と同じ PR で行わない。
- 例外を投げない。`try`/`catch` を使わない。
- 新規の npm 依存を追加しない。
- テストは対象ファイルと同一ディレクトリに `<対象名>.test.ts(x)` として置く（コロケーション）。既定 `environment: "node"`。
- コミットメッセージ・コード内コメントは日本語、識別子は英語。
- ブランチは `refactor/plan-domain`。PR はスカッシュマージ。
- 各 PR の確認は `npm run test` と `npm run build`。
- 空の層はフォルダを作らない（本 PR では `src/features/plan/ui` を作らない）。
- 他機能・`src/app`・旧ディレクトリからは `@/features/plan/<layer>`（層の index）でのみ import し、層内の個別ファイルを直接 import しない。

## 仕様からの補足・判断

仕様が明示していない点・仕様から外れる点を次のとおり決める。

1. **型の置き場所**: 振る舞いのファイルが既にあるエンティティは、型をそのファイルに置く（`Loan` → `loan.ts`、`Property` → `property.ts`、`SchoolType`・`UniversityType`・`Education`・`Child` → `education.ts`）。それ以外は新規ファイルにする（`Person` → `person.ts`、`LifeEvent` → `lifeEvent.ts`、`RecurringExpense` → `recurringExpense.ts`、`IncomeAdjustment` → `incomeAdjustment.ts`、`ExpenseSettings`・`AssetSettings` → `settings.ts`、`PlanInput` → `planInput.ts`）。`Person` の振る舞いは仕様 1 章どおり `pension.ts` のままとし、`person.ts` とは統合しない。
2. **`lib/simulation/types.ts` の扱い**: `YearlyResult` だけを残す。入力側の型の再エクスポート（互換用の中継）は置かず、import 元をすべて `@/features/plan/domain` に書き換える。
3. **同一機能の他の層の import**: 相対パス（`../domain`）ではなく `@/features/plan/domain` のように index を使う。アーキテクチャテストのルール上どちらも許可されており、Task 1・2 の一括書き換えの結果をそのまま使えるため。
4. **`input-validation.test.ts`（と `__snapshots__`）は `src/lib/` に残す**: 仕様 4 章では `plan/application` へ移すとしているが、このテストは `runValidatedSimulation`（simulation/application になる）の呼び出しガードとシミュレーション結果のスナップショットを含み、`./simulation/engine` を `vi.mock` している。plan へ移すと PR 4 で「下流機能の import」違反になるため、PR 4 で `validatedSimulation.ts` と一緒に `src/features/simulation/application/` へ移す。本 PR では import 先だけ書き換える。
5. **`schema.ts` の `snapshotSchema`・`snapshotOriginSchema`**: ファイルを分割せず `schema.ts` ごと `plan/application` へ移す。仕様 3.2 節どおり PR 6 で `scenario/application` へ移す。
6. **下流・ui への依存を持つテスト**: 次のテストは移動先の層ルールでは将来違反になるが、現時点の import 先は旧ディレクトリ（検査対象外）なので本 PR では内容を変えずに移動する。後続 PR で対応する（下の「後続 PR への申し送り」）。

### 後続 PR への申し送り

| テスト | 将来違反になる import | 対応する PR |
|------|------|------|
| `features/plan/infrastructure/planFile.test.ts` の「読み込み失敗時に現在のプランが不変」 | `usePlanStore`（plan/ui になる。infrastructure → ui） | PR 2b: この describe を `plan/ui` のストアのテストへ移す |
| `features/plan/infrastructure/planFile.test.ts` の「プランJSON往復」の `runSimulation` 比較 | `runSimulation`（simulation。下流機能） | PR 4 |
| `features/plan/application/{newLoan,newRecurringExpense}.test.ts` の `runSimulation` を使うケース | `runSimulation`（simulation。下流機能） | PR 4: `simulation/application` の統合テストへ分離する |
| `src/lib/input-validation.test.ts` | — | PR 4: `simulation/application` へ移動（判断 4） |
| `src/components/forms/number-input.integration.test.ts` | `runSimulation`（simulation。下流機能）。仕様 4 章の移動先 `shared/ui` では「shared → features」違反、PR 2b の `plan/ui` では「下流機能の import」違反になる | PR 2b では `src/components/forms/` に残し、PR 4 で `src/features/simulation/ui/` へ移す |

## File Structure

| 操作 | パス | 責務 |
|------|------|------|
| Move | `src/lib/simulation/{pension,loan,property,education,defaults,householdDefaults,dateRange,endAge}.ts` → `src/features/plan/domain/` | 年金見込み・ローン返済・不動産評価・教育費・既定プラン・世帯既定値・期間補正・終了年齢 |
| Move | `src/lib/simulation/{loan,property,dateRange,endAge,householdDefaults}.test.ts` → `src/features/plan/domain/` | 上記のテスト |
| Create | `src/features/plan/domain/{person,lifeEvent,recurringExpense,incomeAdjustment,settings,planInput}.ts` | 入力側の型（判断 1） |
| Modify | `src/features/plan/domain/{loan,property,education}.ts` | 型をファイル内に定義 |
| Modify | `src/lib/simulation/types.ts` | `YearlyResult` のみ残す |
| Create | `src/features/plan/domain/index.ts` | plan/domain の公開 API |
| Move | `src/lib/store/{newLoan,newRecurringExpense,nextChildName,householdDefaultsSync}.ts`（+ `.test.ts`） → `src/features/plan/application/` | 新規行ファクトリ・子の名前採番・世帯既定値の追従 |
| Move | `src/lib/{schema,schema.test}.ts` → `src/features/plan/application/` | zod スキーマ・入力検証 |
| Create | `src/features/plan/application/index.ts` | plan/application の公開 API |
| Move | `src/lib/{planFile,planFile.test}.ts` → `src/features/plan/infrastructure/` | プランファイルの書き出し・読み込み |
| Create | `src/features/plan/infrastructure/index.ts` | plan/infrastructure の公開 API |
| Modify | `src/architecture.test.ts` | plan の各層 index が走査対象に入ることを確認 |
| Modify | 上記を import している全ファイル（各 Task に一覧） | import 先を `@/features/plan/<layer>` に変更 |

---

### Task 0: ブランチ作成とベースライン記録

**Files:** なし

- [x] **Step 1: ブランチを作成する**

設計改訂のブランチ（`refactor/spec-revision`）が `main` にマージ済みなら `main` から、未マージなら `refactor/spec-revision` の先端から切る。

```bash
git switch main && git pull   # 設計改訂がマージ済みの場合
git switch -c refactor/plan-domain
```

- [x] **Step 2: テスト件数のベースラインを記録する**

Run: `npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。`Test Files  N passed` と `Tests  M passed` の N・M を控える。本 PR はファイル移動のみで、テストの追加は Task 1・3・4 のアーキテクチャテストの `expect` 追加（件数は増えない）だけなので、各 Task 後も N・M は変わらない。

---

### Task 1: plan/domain へのドメインロジックの移動

型の分割は Task 2 で行う。この Task では移動したファイルが旧 `lib/simulation/types.ts` を import したままにする（旧ディレクトリへの import はアーキテクチャテストの判定対象外）。

**Files:**
- Move: `src/lib/simulation/{pension,loan,property,education,defaults,householdDefaults,dateRange,endAge}.ts` → `src/features/plan/domain/`
- Move: `src/lib/simulation/{loan,property,dateRange,endAge,householdDefaults}.test.ts` → `src/features/plan/domain/`
- Create: `src/features/plan/domain/index.ts`
- Modify: `src/architecture.test.ts`
- Modify: 移動したモジュールを import している全ファイル（Step 5 の一覧）

**Interfaces:**
- Produces: `@/features/plan/domain` から `correctDateRange`, `DateRangeCorrection`（型）, `defaultPlanInput`, `singleRenterPlanInput`, `BASE_CHILD_ANNUAL_COST`, `CHILD_DEPENDENT_MAX_AGE`, `DEFAULT_EDUCATION`, `EDUCATION_PRESETS`, `childAnnualCost`, `educationCostAtAge`, `DEFAULT_END_AGE`, `endAgeToEndYear`, `endYearToEndAge`, `HOME_PROPERTY_LABEL`, `HOUSEHOLD_DEFAULT_CONSTANTS`, `HOUSING_PURCHASE_EVENT_LABEL`, `computeHouseholdDefaults`, `HouseholdComposition`・`HouseholdDefaultEvent`・`HouseholdDefaultLoan`・`HouseholdDefaultProperty`・`HouseholdDefaults`（型）, `annualLoanPayment`, `loanBalanceForYear`, `loanPaymentForYear`, `BASIC_PENSION_ANNUAL`, `EARNINGS_RELATED_CAP`, `EARNINGS_RELATED_FACTOR`, `estimateAnnualPension`, `DEFAULT_PROPERTY_DEPRECIATION_RATE`, `PROPERTY_VALUE_FLOOR_RATIO`, `propertyValueForYear`

- [x] **Step 1: アーキテクチャテストに走査対象の確認を追加する（失敗するテスト）**

`src/architecture.test.ts` の「検査対象のファイルを走査できている」に1行追加する:

```ts
  it("検査対象のファイルを走査できている", () => {
    const files = listSourceFiles();
    expect(files).toContain("app/page.tsx");
    expect(files).toContain("shared/lib/index.ts");
    expect(files).toContain("shared/ui/index.ts");
    expect(files).toContain("features/plan/domain/index.ts");
  });
```

- [x] **Step 2: 失敗を確認する**

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL（`features/plan/domain/index.ts` が見つからない）

- [x] **Step 3: ファイルを移動する**

```bash
mkdir -p src/features/plan/domain
git mv src/lib/simulation/{pension,loan,property,education,defaults,householdDefaults,dateRange,endAge}.ts src/features/plan/domain/
git mv src/lib/simulation/{loan,property,dateRange,endAge,householdDefaults}.test.ts src/features/plan/domain/
```

移動したファイル同士の import（`./pension`・`./education`・`./endAge`・`./property`・`./loan` 等）は同一ディレクトリのままなので変更不要。旧 `./types` だけを書き換える:

```bash
perl -pi -e 's#"\./types"#"\@/lib/simulation/types"#g' src/features/plan/domain/*.ts
```

- [x] **Step 4: 公開 API を作る**

`src/features/plan/domain/index.ts`:

```ts
/** plan/domain の公開 API。他機能・app・旧ディレクトリからはこの index 経由で import する。 */
export { correctDateRange, type DateRangeCorrection } from "./dateRange";
export { defaultPlanInput, singleRenterPlanInput } from "./defaults";
export {
  BASE_CHILD_ANNUAL_COST,
  CHILD_DEPENDENT_MAX_AGE,
  DEFAULT_EDUCATION,
  EDUCATION_PRESETS,
  childAnnualCost,
  educationCostAtAge,
} from "./education";
export { DEFAULT_END_AGE, endAgeToEndYear, endYearToEndAge } from "./endAge";
export {
  HOME_PROPERTY_LABEL,
  HOUSEHOLD_DEFAULT_CONSTANTS,
  HOUSING_PURCHASE_EVENT_LABEL,
  computeHouseholdDefaults,
  type HouseholdComposition,
  type HouseholdDefaultEvent,
  type HouseholdDefaultLoan,
  type HouseholdDefaultProperty,
  type HouseholdDefaults,
} from "./householdDefaults";
export { annualLoanPayment, loanBalanceForYear, loanPaymentForYear } from "./loan";
export {
  BASIC_PENSION_ANNUAL,
  EARNINGS_RELATED_CAP,
  EARNINGS_RELATED_FACTOR,
  estimateAnnualPension,
} from "./pension";
export {
  DEFAULT_PROPERTY_DEPRECIATION_RATE,
  PROPERTY_VALUE_FLOOR_RATIO,
  propertyValueForYear,
} from "./property";
```

- [x] **Step 5: import 先を書き換える**

```bash
MODS='pension|loan|property|education|defaults|householdDefaults|dateRange|endAge'
# エイリアス形式（@/lib/simulation/<mod>）
perl -pi -e "s#\"\@/lib/simulation/($MODS)\"#\"\@/features/plan/domain\"#g" $(grep -rlE "\"@/lib/simulation/($MODS)\"" src)
# src/lib/simulation 内の相対形式（./<mod>）
perl -pi -e "s#\"\./($MODS)\"#\"\@/features/plan/domain\"#g" $(grep -lE "\"\./($MODS)\"" src/lib/simulation/*.ts)
# src/lib 直下の相対形式（./simulation/<mod>）
perl -pi -e "s#\"\./simulation/($MODS)\"#\"\@/features/plan/domain\"#g" $(grep -lE "\"\./simulation/($MODS)\"" src/lib/*.ts)
```

書き換え対象になるファイル（書き換え後に `git diff --stat` で確認する）:
- `src/components/forms/{HouseholdForm,LoanForm,PropertyForm}.tsx`, `src/components/forms/{education-preset,low-income-inputs}.test.tsx`, `src/components/DepletionAdvice.test.tsx`, `src/components/charts/NetWorthChart.test.tsx`
- `src/lib/assumptions.ts`, `src/lib/assumptions.test.ts`, `src/lib/schema.ts`, `src/lib/schema.test.ts`, `src/lib/input-validation.test.ts`, `src/lib/planFile.test.ts`
- `src/lib/simulation/{engine,housingLoanCredit}.ts`, `src/lib/simulation/{childAllowance,housingLoanCredit,calc-coverage,engine,summary,depletionRemedies}.test.ts`
- `src/lib/game/{events,flow,project,advance,satisfaction}.test.ts`
- `src/lib/store/usePlanStore.ts`, `src/lib/store/usePlanStore.test.ts`, `src/lib/store/householdDefaultsSync.ts`

注意: `src/lib/simulation/` に残る `recurringExpense.ts`・`incomeAdjustment.ts` 等は対象外（`MODS` に含めない）。`src/features/plan/domain/` 内のファイルは書き換えない（自層の index を import すると違反になる）。

- [x] **Step 6: 同一モジュールからの重複 import を1文にまとめる**

1ファイルに `from "@/features/plan/domain"` が複数ある場合は1文にまとめる。値と型が混ざる場合は `import { a, type B } from "..."` の形にする。例（`src/components/forms/HouseholdForm.tsx`）:

```ts
import { EDUCATION_PRESETS } from "@/features/plan/domain";
import { DEFAULT_END_AGE, endAgeToEndYear, endYearToEndAge } from "@/features/plan/domain";
import { BASIC_PENSION_ANNUAL, estimateAnnualPension } from "@/features/plan/domain";
```

を次の1文にし、元の最初の import の位置に置く:

```ts
import {
  BASIC_PENSION_ANNUAL,
  DEFAULT_END_AGE,
  EDUCATION_PRESETS,
  endAgeToEndYear,
  endYearToEndAge,
  estimateAnnualPension,
} from "@/features/plan/domain";
```

確認: `grep -rc 'from "@/features/plan/domain"' src | grep -vE ':(0|1)$'`
Expected: 出力なし

- [x] **Step 7: 旧パスの参照が残っていないことを確認する**

Run: `grep -rnE "(@/lib/simulation/|\"\./|\"\./simulation/)(pension|loan|property|education|defaults|householdDefaults|dateRange|endAge)\"" src | grep -v '^src/features/plan/domain/'`
Expected: 出力なし

- [x] **Step 8: テスト・型チェック**

Run: `npx tsc --noEmit -p . && npx vitest run 2>&1 | tail -6`
Expected: 型エラーなし。全テスト PASS。`Test Files` と `Tests` の件数が Task 0 の N・M と一致する。

- [x] **Step 9: コミット**

```bash
git add -A src
git commit -m "refactor: plan のドメインロジックを features/plan/domain へ移動"
```

---

### Task 2: 入力側の型をエンティティ単位に分割する

**Files:**
- Create: `src/features/plan/domain/{person,lifeEvent,recurringExpense,incomeAdjustment,settings,planInput}.ts`
- Modify: `src/features/plan/domain/{loan,property,education,defaults,householdDefaults,index}.ts`, `src/features/plan/domain/{loan,property}.test.ts`
- Modify: `src/lib/simulation/types.ts`
- Modify: 入力側の型を import している全ファイル（Step 5・6）

**Interfaces:**
- Consumes: Task 1 の `src/features/plan/domain/index.ts`
- Produces: `@/features/plan/domain` から型 `Person`, `SchoolType`, `UniversityType`, `Education`, `Child`, `LifeEvent`, `RecurringExpense`, `Loan`, `IncomeAdjustment`, `Property`, `ExpenseSettings`, `AssetSettings`, `PlanInput`。`@/lib/simulation/types` からは `YearlyResult` のみ。

型の定義本体（JSDoc コメントを含む）は `src/lib/simulation/types.ts` の該当部分を**一字一句そのまま**移す。以下のコード例ではコメントも含めて全文を示す（`person.ts` の型コメント末尾の「公的年金見込み額の推計は `pension.ts`。」と `settings.ts` の2つの型コメントだけは新規に加える）。

- [x] **Step 1: 振る舞いを持たないエンティティの型ファイルを作る**

`src/features/plan/domain/person.ts`:

```ts
/** 世帯の収入のある個人（本人・配偶者）。公的年金見込み額の推計は `pension.ts`。 */
export type Person = {
  name: string;
  /** 生年（西暦） */
  birthYear: number;
  /** 開始年時点の税込年収（円） */
  grossAnnualIncome: number;
  /** 給与の年間上昇率（小数） */
  incomeGrowthRate: number;
  /** この年齢で給与収入が止まる */
  retirementAge: number;
  /** 公的年金の受給開始年齢（既定 65） */
  pensionStartAge: number;
  /** 受給開始後の公的年金の年額（円） */
  annualPension: number;
  /** 退職時（退職年齢到達年）に受け取る退職一時金（円） */
  retirementBenefit: number;
};
```

`src/features/plan/domain/lifeEvent.ts`:

```ts
/** 単発のライフイベント。amount は +収入 / -支出。 */
export type LifeEvent = {
  id: string;
  /** 発生年（西暦） */
  year: number;
  label: string;
  /** 金額（円）。プラスは臨時収入、マイナスは臨時支出 */
  amount: number;
};
```

`src/features/plan/domain/recurringExpense.ts`:

```ts
/**
 * 期間指定の継続支出（例: 住宅購入までの賃貸家賃）。
 * 開始年から終了年まで（両端を含む）、毎年 annualAmount を支出計上する。
 * ローン返済と同じく名目固定で扱い、物価上昇率による調整はしない。
 */
export type RecurringExpense = {
  id: string;
  label: string;
  /** 計上開始年（西暦） */
  startYear: number;
  /** 計上終了年（西暦、この年も計上する） */
  endYear: number;
  /** 年額（円、正の値が支出） */
  annualAmount: number;
};
```

`src/features/plan/domain/incomeAdjustment.ts`:

```ts
/**
 * 期間付きの収入調整（育休・時短勤務など。子育て共働きペルソナレビュー #3）。
 * 開始年から終了年まで（両端を含む）、対象者の給与に ratio を掛ける。
 */
export type IncomeAdjustment = {
  id: string;
  /** 対象者 */
  person: "self" | "spouse";
  label: string;
  /** 開始年（西暦） */
  startYear: number;
  /** 終了年（西暦、この年も調整する） */
  endYear: number;
  /** 給与に掛ける割合（小数。例: 時短 0.8） */
  ratio: number;
  /**
   * 調整後の収入を非課税の給付として扱うか（育休給付金など）。
   * true の年は、その人の給与に所得税・住民税・社会保険料を掛けない。
   */
  nonTaxable: boolean;
};
```

`src/features/plan/domain/settings.ts`:

```ts
/** 生活費の設定。 */
export type ExpenseSettings = {
  /** 世帯の基礎生活費の年額（開始年時点、円） */
  baseAnnualLivingExpense: number;
  /** 物価上昇率（小数） */
  inflationRate: number;
};

/** 金融資産の設定。 */
export type AssetSettings = {
  /** 課税口座の初期資産（円） */
  taxableAssets: number;
  /** 非課税口座（NISA/iDeCo 等）の初期資産（円） */
  taxFreeAssets: number;
  /** 資産運用の年間利回り（小数。両口座共通） */
  annualReturnRate: number;
  /** 配当・分配金の年間利回り（小数。両口座共通、運用利回りとは別枠で毎年現金受取） */
  annualDividendYield: number;
  /** 非課税口座への年間積立額（円。課税口座から移す） */
  annualTaxFreeContribution: number;
};
```

- [x] **Step 2: 振る舞いを持つエンティティのファイルに型を移す**

`src/features/plan/domain/loan.ts`: `import type { Loan } from "@/lib/simulation/types";` の行を削除し、その位置に `Loan` 型を置く:

```ts
/**
 * ローン・借入。元利均等返済を前提に、返済期間中だけ年間返済額を支出計上する。
 * 借入元本の受取（物件費・頭金など）はモデル化せず、頭金などの自己資金は
 * LifeEvent 側で表現する。ここでは毎年の返済負担と年末残高を扱い、年末残高は
 * 純資産（金融資産 − ローン残高）から差し引く。
 */
export type Loan = {
  id: string;
  label: string;
  /** 返済開始年（西暦） */
  startYear: number;
  /** 借入元本（円） */
  principal: number;
  /** 年利（小数） */
  annualRate: number;
  /** 返済期間（年） */
  termYears: number;
  /**
   * 住宅ローン控除の対象か（子育て共働きペルソナレビュー #4）。
   * 未指定は対象外（既存の保存データとの互換のため任意項目）。
   */
  taxCredit?: boolean;
};
```

`src/features/plan/domain/property.ts`: `import type { Property } from "@/lib/simulation/types";` の行を削除し、その位置に `Property` 型を置く:

```ts
/**
 * 住宅などの不動産（子育て共働きペルソナレビュー #2）。
 * 購入年以降、評価額を純資産に加える。評価額は毎年一定率で減価し、
 * 土地分を考えて購入価格の一定割合を下限とする。
 */
export type Property = {
  id: string;
  label: string;
  /** 購入年（西暦） */
  purchaseYear: number;
  /** 購入価格（円） */
  price: number;
  /** 年間の減価率（小数） */
  annualDepreciationRate: number;
};
```

`src/features/plan/domain/education.ts`: `import type { Child, Education, SchoolType, UniversityType } from "@/lib/simulation/types";` の行を削除し、その位置に次を置く:

```ts
/** 学校の種別（幼稚園〜高校）。 */
export type SchoolType = "公立" | "私立";

/** 大学の進路（年額が異なる）。 */
export type UniversityType = "なし" | "国公立" | "私立文系" | "私立理系";

/** 子の進路プラン。学齢ステージごとに進路を選ぶ。 */
export type Education = {
  /** 幼稚園（3〜5歳） */
  kindergarten: SchoolType;
  /** 小学校（6〜11歳） */
  elementary: SchoolType;
  /** 中学校（12〜14歳） */
  juniorHigh: SchoolType;
  /** 高校（15〜17歳） */
  highSchool: SchoolType;
  /** 大学（18〜21歳） */
  university: UniversityType;
};

/** 子。基礎養育費と進路別の教育費の対象として扱う。 */
export type Child = {
  id: string;
  name: string;
  /** 生年（西暦） */
  birthYear: number;
  /** 進路プラン（学齢ステージ別の教育費を決める） */
  education: Education;
};
```

- [x] **Step 3: 集約ルートの型ファイルを作る**

`src/features/plan/domain/planInput.ts`:

```ts
/**
 * ライフプランの入力（集約ルート）。
 * 金額はすべて「円」、率は小数（例: 1% = 0.01）で表す。
 */

import type { Child } from "./education";
import type { IncomeAdjustment } from "./incomeAdjustment";
import type { LifeEvent } from "./lifeEvent";
import type { Loan } from "./loan";
import type { Person } from "./person";
import type { Property } from "./property";
import type { RecurringExpense } from "./recurringExpense";
import type { AssetSettings, ExpenseSettings } from "./settings";

export type PlanInput = {
  startYear: number;
  endYear: number;
  self: Person;
  spouse: Person | null;
  children: Child[];
  expenses: ExpenseSettings;
  assets: AssetSettings;
  events: LifeEvent[];
  recurringExpenses: RecurringExpense[];
  loans: Loan[];
  /** 期間付きの収入調整（育休・時短など）。未指定は調整なし */
  incomeAdjustments?: IncomeAdjustment[];
  /** 不動産。未指定は保有なし */
  properties?: Property[];
};
```

- [x] **Step 4: plan/domain 内の旧 types 参照を書き換え、index に型を追加する**

- `defaults.ts`: `import type { PlanInput } from "@/lib/simulation/types";` → `import type { PlanInput } from "./planInput";`
- `householdDefaults.ts`: `import type { LifeEvent, Loan, Property } from "@/lib/simulation/types";` を次の3行に置き換える:

  ```ts
  import type { LifeEvent } from "./lifeEvent";
  import type { Loan } from "./loan";
  import type { Property } from "./property";
  ```

- `loan.test.ts`: `import type { Loan } from "@/lib/simulation/types";` → `import type { Loan } from "./loan";`（直前の `import { annualLoanPayment, loanBalanceForYear } from "./loan";` と1文にまとめ、`import { annualLoanPayment, loanBalanceForYear, type Loan } from "./loan";` にする）
- `property.test.ts`: 同様に `import { propertyValueForYear, PROPERTY_VALUE_FLOOR_RATIO, type Property } from "./property";` にまとめる

`src/features/plan/domain/index.ts` の末尾に追加する:

```ts
export type { Child, Education, SchoolType, UniversityType } from "./education";
export type { IncomeAdjustment } from "./incomeAdjustment";
export type { LifeEvent } from "./lifeEvent";
export type { Loan } from "./loan";
export type { Person } from "./person";
export type { PlanInput } from "./planInput";
export type { Property } from "./property";
export type { RecurringExpense } from "./recurringExpense";
export type { AssetSettings, ExpenseSettings } from "./settings";
```

確認: `grep -rn "lib/simulation/types" src/features`
Expected: 出力なし

- [x] **Step 5: `lib/simulation/types.ts` を `YearlyResult` のみにする**

`Person` から `PlanInput` までの型定義（ファイル先頭のコメントの直後から `/** 1年分のシミュレーション結果。 */` の直前まで）を削除し、ファイル先頭のコメントを次に置き換える。`YearlyResult` の定義は変更しない。

```ts
/**
 * シミュレーション結果の型。
 * 金額はすべて「円」で表す。入力側の型は `@/features/plan/domain`。
 */
```

- [x] **Step 6: 入力側の型の import 元を一括で書き換える**

`src/features` の外で `lib/simulation/types` から入力側の型だけを import している文の指定子を `@/features/plan/domain` に置き換える。`YearlyResult` だけの文は変更せず、両方を含む文は一覧に出す。

```bash
node --input-type=module <<'EOF'
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const TYPES = "src/lib/simulation/types";
const files = readdirSync("src", { recursive: true, encoding: "utf8" })
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => path.posix.join("src", f.split(path.sep).join("/")))
  .filter((f) => !f.startsWith("src/features/"));
const pattern = /import\s+type\s+\{([^}]*)\}\s*from\s*"([^"]+)";/g;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const output = source.replace(pattern, (whole, names, spec) => {
    const target = spec.startsWith("@/")
      ? path.posix.join("src", spec.slice(2))
      : path.posix.join(path.posix.dirname(file), spec);
    if (target !== TYPES) return whole;
    const list = names.split(",").map((n) => n.trim()).filter(Boolean);
    if (!list.includes("YearlyResult")) return whole.replace(`"${spec}"`, '"@/features/plan/domain"');
    if (list.length > 1) console.log(`手動で分割: ${file}`);
    return whole;
  });
  if (output !== source) writeFileSync(file, output);
}
EOF
```

Expected: 次の2行が出力される。

```
手動で分割: src/lib/simulation/engine.ts
手動で分割: src/lib/validatedSimulation.ts
```

- [x] **Step 7: 型が混在する2ファイルを手で分割する**

`src/lib/simulation/engine.ts`:

```ts
import type { Person, PlanInput, YearlyResult } from "./types";
```

を次の2文にする（`@/features/plan/domain` の既存の import 文があればそちらに `type Person, type PlanInput` を加えて1文にまとめる）:

```ts
import type { Person, PlanInput } from "@/features/plan/domain";
import type { YearlyResult } from "./types";
```

`src/lib/validatedSimulation.ts`:

```ts
import type { PlanInput, YearlyResult } from "@/lib/simulation/types";
```

を次の2文にする:

```ts
import type { PlanInput } from "@/features/plan/domain";
import type { YearlyResult } from "@/lib/simulation/types";
```

- [x] **Step 8: 重複 import をまとめ、旧参照が残っていないことを確認する**

Task 1 Step 6 と同じ要領で、1ファイルに `from "@/features/plan/domain"` が複数あれば1文にまとめる（`import type { A }` と `import { b }` は `import { b, type A }` にする）。

Run: `grep -rc 'from "@/features/plan/domain"' src | grep -vE ':(0|1)$'`
Expected: 出力なし

Run: `grep -rnE "import type \{[^}]*\b(Person|Child|Education|SchoolType|UniversityType|LifeEvent|RecurringExpense|Loan|IncomeAdjustment|Property|ExpenseSettings|AssetSettings|PlanInput)\b" src | grep -E "simulation/types|\"\./types\"" | grep -v '^src/lib/game/'`
Expected: 出力なし（`src/lib/game/` の `./types` は game 独自の型ファイルなので除外している）

- [x] **Step 9: テスト・型チェック**

Run: `npx tsc --noEmit -p . && npx vitest run 2>&1 | tail -6`
Expected: 型エラーなし。全テスト PASS。件数は Task 0 の N・M と一致する。

- [x] **Step 10: コミット**

```bash
git add -A src
git commit -m "refactor: 入力側の型をエンティティ単位に分割し plan/domain へ移動"
```

---

### Task 3: plan/application への移動（新規行ファクトリ・世帯既定値の追従・zod スキーマ）

**Files:**
- Move: `src/lib/store/{newLoan,newRecurringExpense,nextChildName,householdDefaultsSync}.ts`（+ 各 `.test.ts`） → `src/features/plan/application/`
- Move: `src/lib/schema.ts`, `src/lib/schema.test.ts` → `src/features/plan/application/`
- Create: `src/features/plan/application/index.ts`
- Modify: `src/architecture.test.ts`
- Modify: `src/lib/store/usePlanStore.ts`, `src/components/forms/{HouseholdForm.tsx,usePlanErrors.ts}`, `src/lib/{planFile,validatedSimulation}.ts`, `src/lib/input-validation.test.ts`

**Interfaces:**
- Consumes: `@/features/plan/domain`（Task 1・2）
- Produces: `@/features/plan/application` から `applyHouseholdDefaults`, `newLoan`, `newRecurringExpense`, `nextChildName`, `INPUT_LIMITS`, `ageField`, `assetSchema`, `childSchema`, `educationSchema`, `expenseSchema`, `incomeAdjustmentSchema`, `lifeEventSchema`, `loanSchema`, `personSchema`, `planInputSchema`, `planInputValidationSchema`, `propertySchema`, `recurringExpenseSchema`, `snapshotOriginSchema`, `snapshotSchema`, `validatePlanInput`, `PlanInputErrors`・`PlanInputValidation`（型）

- [x] **Step 1: アーキテクチャテストに走査対象の確認を追加する（失敗するテスト）**

`src/architecture.test.ts` の「検査対象のファイルを走査できている」に追加する:

```ts
    expect(files).toContain("features/plan/application/index.ts");
```

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL（`features/plan/application/index.ts` が見つからない）

- [x] **Step 2: ファイルを移動する**

```bash
mkdir -p src/features/plan/application
git mv src/lib/store/{newLoan,newRecurringExpense,nextChildName,householdDefaultsSync}.ts src/features/plan/application/
git mv src/lib/store/{newLoan,newRecurringExpense,nextChildName,householdDefaultsSync}.test.ts src/features/plan/application/
git mv src/lib/schema.ts src/lib/schema.test.ts src/features/plan/application/
```

移動したファイルの import は `./<同名>`・`@/features/plan/domain`・`@/lib/simulation/engine`（テストのみ。判断 6）・`zod`・`vitest` だけなので変更不要。

- [x] **Step 3: 公開 API を作る**

`src/features/plan/application/index.ts`:

```ts
/** plan/application の公開 API。他機能・app・旧ディレクトリからはこの index 経由で import する。 */
export { applyHouseholdDefaults } from "./householdDefaultsSync";
export { newLoan } from "./newLoan";
export { newRecurringExpense } from "./newRecurringExpense";
export { nextChildName } from "./nextChildName";
export {
  INPUT_LIMITS,
  ageField,
  assetSchema,
  childSchema,
  educationSchema,
  expenseSchema,
  incomeAdjustmentSchema,
  lifeEventSchema,
  loanSchema,
  personSchema,
  planInputSchema,
  planInputValidationSchema,
  propertySchema,
  recurringExpenseSchema,
  snapshotOriginSchema,
  snapshotSchema,
  validatePlanInput,
  type PlanInputErrors,
  type PlanInputValidation,
} from "./schema";
```

- [x] **Step 4: import 先を書き換える**

```bash
perl -pi -e 's#"\@/lib/schema"#"\@/features/plan/application"#g' $(grep -rl '"@/lib/schema"' src)
perl -pi -e 's#"\./schema"#"\@/features/plan/application"#g' src/lib/input-validation.test.ts
perl -pi -e 's#"\./(newLoan|newRecurringExpense|nextChildName|householdDefaultsSync)"#"\@/features/plan/application"#g' src/lib/store/usePlanStore.ts
```

書き換え対象になるファイル: `src/components/forms/{HouseholdForm.tsx,usePlanErrors.ts}`, `src/lib/{planFile,validatedSimulation}.ts`, `src/lib/input-validation.test.ts`, `src/lib/store/usePlanStore.ts`

`src/lib/store/usePlanStore.ts` は5つの import 文が `@/features/plan/application` になるので1文にまとめる:

```ts
import {
  applyHouseholdDefaults,
  newLoan,
  newRecurringExpense,
  nextChildName,
  planInputSchema,
  snapshotSchema,
} from "@/features/plan/application";
```

- [x] **Step 5: 重複 import と旧パスの参照がないことを確認する**

Run: `grep -rc 'from "@/features/plan/application"' src | grep -vE ':(0|1)$'`
Expected: 出力なし

Run: `grep -rnE '"@/lib/schema"|"\./schema"|"\./(newLoan|newRecurringExpense|nextChildName|householdDefaultsSync)"' src | grep -v '^src/features/plan/application/'`
Expected: 出力なし

- [x] **Step 6: テスト・型チェック**

Run: `npx tsc --noEmit -p . && npx vitest run 2>&1 | tail -6`
Expected: 型エラーなし。全テスト PASS。件数は Task 0 の N・M と一致する。

- [x] **Step 7: コミット**

```bash
git add -A src
git commit -m "refactor: 新規行ファクトリ・世帯既定値の追従・zod スキーマを plan/application へ移動"
```

---

### Task 4: plan/infrastructure への移動（プランファイル入出力）

**Files:**
- Move: `src/lib/planFile.ts`, `src/lib/planFile.test.ts` → `src/features/plan/infrastructure/`
- Create: `src/features/plan/infrastructure/index.ts`
- Modify: `src/architecture.test.ts`
- Modify: `src/components/ScenarioBar.tsx`

**Interfaces:**
- Consumes: `@/features/plan/domain`（`PlanInput`）, `@/features/plan/application`（`planInputSchema`, `validatePlanInput`）
- Produces: `@/features/plan/infrastructure` から `PLAN_FILE_FORMAT`, `PLAN_FILE_MAX_BYTES`, `PLAN_FILE_VERSION`, `parsePlanFile`, `planFileName`, `serializePlan`, `PlanFile`・`ParsePlanFileResult`（型）

- [x] **Step 1: アーキテクチャテストに走査対象の確認を追加する（失敗するテスト）**

`src/architecture.test.ts` の「検査対象のファイルを走査できている」に追加する:

```ts
    expect(files).toContain("features/plan/infrastructure/index.ts");
```

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL（`features/plan/infrastructure/index.ts` が見つからない）

- [x] **Step 2: ファイルを移動する**

```bash
mkdir -p src/features/plan/infrastructure
git mv src/lib/planFile.ts src/lib/planFile.test.ts src/features/plan/infrastructure/
```

`planFile.ts` の import は `@/features/plan/application`・`@/features/plan/domain`、`planFile.test.ts` は `./planFile`・`@/features/plan/domain`・`@/lib/simulation/engine`・`@/lib/store/usePlanStore`（判断 6）なので変更不要。

- [x] **Step 3: 公開 API を作る**

`src/features/plan/infrastructure/index.ts`:

```ts
/** plan/infrastructure の公開 API。他機能・app・旧ディレクトリからはこの index 経由で import する。 */
export {
  PLAN_FILE_FORMAT,
  PLAN_FILE_MAX_BYTES,
  PLAN_FILE_VERSION,
  parsePlanFile,
  planFileName,
  serializePlan,
  type ParsePlanFileResult,
  type PlanFile,
} from "./planFile";
```

- [x] **Step 4: import 先を書き換える**

```bash
perl -pi -e 's#"\@/lib/planFile"#"\@/features/plan/infrastructure"#g' src/components/ScenarioBar.tsx
```

Run: `grep -rn 'lib/planFile' src`
Expected: 出力なし

- [x] **Step 5: テスト・型チェック**

Run: `npx tsc --noEmit -p . && npx vitest run 2>&1 | tail -6`
Expected: 型エラーなし。全テスト PASS。件数は Task 0 の N・M と一致する。

- [x] **Step 6: コミット**

```bash
git add -A src
git commit -m "refactor: プランファイル入出力を plan/infrastructure へ移動"
```

---

### Task 5: 最終確認と PR 作成

**Files:** なし

- [x] **Step 1: plan の構成を確認する**

Run: `find src/features -type f | sort`
Expected: 次の34ファイルだけが並ぶ（application 11・domain 20・infrastructure 3。`ui` フォルダは無い）。

```
src/features/plan/application/householdDefaultsSync.test.ts
src/features/plan/application/householdDefaultsSync.ts
src/features/plan/application/index.ts
src/features/plan/application/newLoan.test.ts
src/features/plan/application/newLoan.ts
src/features/plan/application/newRecurringExpense.test.ts
src/features/plan/application/newRecurringExpense.ts
src/features/plan/application/nextChildName.test.ts
src/features/plan/application/nextChildName.ts
src/features/plan/application/schema.test.ts
src/features/plan/application/schema.ts
src/features/plan/domain/dateRange.test.ts
src/features/plan/domain/dateRange.ts
src/features/plan/domain/defaults.ts
src/features/plan/domain/education.ts
src/features/plan/domain/endAge.test.ts
src/features/plan/domain/endAge.ts
src/features/plan/domain/householdDefaults.test.ts
src/features/plan/domain/householdDefaults.ts
src/features/plan/domain/incomeAdjustment.ts
src/features/plan/domain/index.ts
src/features/plan/domain/lifeEvent.ts
src/features/plan/domain/loan.test.ts
src/features/plan/domain/loan.ts
src/features/plan/domain/pension.ts
src/features/plan/domain/person.ts
src/features/plan/domain/planInput.ts
src/features/plan/domain/property.test.ts
src/features/plan/domain/property.ts
src/features/plan/domain/recurringExpense.ts
src/features/plan/domain/settings.ts
src/features/plan/infrastructure/index.ts
src/features/plan/infrastructure/planFile.test.ts
src/features/plan/infrastructure/planFile.ts
```

- [x] **Step 2: テスト・lint・ビルド**

Run: `npm run test 2>&1 | tail -6 && npm run lint && npm run build`
Expected: 全テスト PASS（件数は Task 0 の N・M と一致）、lint エラーなし、ビルド成功。

- [x] **Step 3: 画面で挙動が変わっていないことを確認する**

Run: `npm run dev` で起動し、`http://localhost:3000/` で次を確認する。
- 既存の入力（localStorage の `life-plan/v1`）がそのまま表示される
- 配偶者の追加・子の追加・ローンの追加で結果が更新される
- 「プランを書き出す」→「読み込む」でプランが元に戻る
- `http://localhost:3000/game` が開ける

- [x] **Step 4: プッシュと PR 作成**

```bash
git push -u origin refactor/plan-domain
gh pr create --title "refactor: plan の domain・application・infrastructure への移動（PR 2a）" --body "$(cat <<'EOF'
## 概要

設計書 `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md` の移行手順 #2a。挙動・見た目の変更はありません。

- `lib/simulation/types.ts` の入力側の型をエンティティ単位に分割し `features/plan/domain` へ移動（`YearlyResult` は PR 4 まで残す）
- 年金見込み・ローン・不動産・教育費・既定プラン・世帯既定値・期間補正・終了年齢を `features/plan/domain` へ移動
- 新規行ファクトリ・子の名前採番・世帯既定値の追従・zod スキーマを `features/plan/application` へ移動
- プランファイル入出力を `features/plan/infrastructure` へ移動
- ストア（`lib/store/usePlanStore.ts`）とフォームは旧位置のまま import のみ更新（PR 2b で移動）

## 設計からの補足

- `input-validation.test.ts` は `runValidatedSimulation` のテストを含むため `src/lib` に残し、PR 4 で simulation/application へ移す
- 下流（simulation）・ui への依存を持つテストケースの扱いは、計画書 `docs/superpowers/plans/2026-09-26-pr2a-plan-domain.md` の「後続 PR への申し送り」に記載

## 確認

- [x] `npm run test`（件数はベースラインと一致）
- [x] `npm run lint`
- [x] `npm run build`
- [x] 画面操作（入力の復元・追加操作・プランの書き出し/読み込み・ゲーム画面）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
