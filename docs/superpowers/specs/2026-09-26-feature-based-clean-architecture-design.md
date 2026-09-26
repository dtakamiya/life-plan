# 機能別フォルダ構成 × DDD・クリーンアーキテクチャへのリファクタリング 設計

## 目的

優先順に次の3点を達成する。挙動（計算結果・UI の見た目）は変えない。

1. **見通し・変更容易性**: 1つの機能を変更するとき、1つの機能フォルダ内で作業が完結するようにする。
2. **依存方向の強制**: ドメインロジックを React / Zustand / zod から独立させ、層と機能の境界をテストで機械的に守る。
3. **ドメインモデルの表現力**: 個々の入力項目が持つルールをエンティティの振る舞いとして `plan/domain` に集め、概念を明示する（値オブジェクトは今回のスコープ外。8章参照）。

## 決定事項

| 論点 | 決定 |
|------|------|
| フォルダ構成 | **機能ファースト + 機能内レイヤー**（`src/features/<feature>/{domain,application,infrastructure,ui}`） |
| 値オブジェクト | **今回は導入しない**（スコープ外。必要になったら別設計で検討する）。データはプレーンオブジェクトのまま |
| 境界の強制 | **vitest のアーキテクチャテスト**（新規依存なし、既存 CI の `npm run test` で強制） |
| Repository ポート | **導入しない**。永続化先は localStorage とファイルのみのため、Zustand persist の設定と zod 検証関数を infrastructure に置くだけとする |
| スナップショット | plan のストアから分離し、scenario の別ストア（別 persist キー）にする。旧キーからの移行は plan ストアの persist `migrate` で行う |
| 移行方法 | 機能単位の短命ブランチ・PR に分割した段階移行（各 PR は挙動不変） |

見送った案:

- レイヤーファースト（`src/domain/<feature>` 等）: 1機能の変更が4ディレクトリに散り、目的1と衝突する。
- 2層（domain / ui）の軽量版: 永続化が ui 層に混ざり、目的2の境界が曖昧になる。
- クラスによる値オブジェクト: Zustand 永続化・zod 検証・JSON 入出力にシリアライズ/復元の層が必要になる。
- ブランド型による値オブジェクト（改訂前の PR 7）: ブランド型同士の演算結果は `number` に戻るため engine・tax 等の全計算箇所で再ラップが必要になり、フォームの生数値と zod `.brand()` を通したストアの型も合わなくなる。差分の大きさに対して防げる不具合（円と率の取り違え程度）が小さい。
- scenario ストアの初期化時に旧キーから取り込む移行: 旧キーへ `snapshots` なしで書き込む plan ストアが先に書き込むと未移行のスナップショットが失われ、全ページが scenario ストアを読み込むという暗黙の前提に依存する。
- ESLint による境界強制: CI で lint を実行しておらず、CLAUDE.md の「ESLint は next 設定の継承のみ」方針の変更も必要になる。
- plan + scenario を束ねた単一ストアを `src/app` 側に置く案: 移行は不要だが、ストアが機能フォルダの外に出る。

## 1. 機能（境界づけられたコンテキスト）と依存グラフ

機能間の依存は非循環の一方向とする。

```
shared ← plan ← simulation ← scenario
                          ↖ game
```

| 機能 | 責務 |
|------|------|
| `shared` | 書式（金額差分の書式 `formatAssetDiff` を含む）、用語集、共通 UI 部品、テーマ |
| `plan` | `PlanInput` 集約とその構成要素（Person, Child, Education, Loan, Property, LifeEvent, RecurringExpense, IncomeAdjustment, ExpenseSettings, AssetSettings）、各要素が持つルール、プリセット、編集ユースケース、入力検証、永続化、プランファイル入出力、入力フォーム |
| `simulation` | 時間軸での年次集計と制度計算（税・社会保険・児童手当・住宅ローン控除）、`YearlyResult`、サマリー・枯渇対策・前提条件一覧、結果表示 UI |
| `scenario` | スナップショットの保存・読込・比較差分、比較 UI |
| `game` | ゲームモード一式 |

### エンティティの振る舞いは plan に置く

「個々の入力項目が持つルール」は plan/domain のエンティティの振る舞いとする。simulation はそれらを呼んで年次に積み上げる。これにより plan ⇄ simulation の循環（現状 `defaults.ts` → `pension.ts`、`householdDefaults.ts` → `property.ts`、入力フォーム → `loan.ts` 等）を解消する。

| エンティティ | plan/domain に置く振る舞い（現在の所在） |
|------|------|
| Person | 公的年金見込み額の推計 `estimateAnnualPension`、`BASIC_PENSION_ANNUAL` 等（`simulation/pension.ts` 全体） |
| Loan | 年間返済額・年次返済額・残高 `annualLoanPayment`, `loanPaymentForYear`, `loanBalanceForYear`（`simulation/loan.ts` 全体） |
| Property | 減価率・下限比率の定数、評価額 `propertyValueForYear`（`simulation/property.ts` 全体） |
| Education / Child | 進路プリセット、学齢別教育費、養育費 `childAnnualCost`（`simulation/education.ts` 全体） |

## 2. 機能内レイヤー

### 2.1 ディレクトリと層の責務

```
src/
  app/                          Next.js ルーティング（コンポジションルート）
  shared/
    domain/                     （予約。今回は作らない。アーキテクチャテストのルール上のみ存在）
    lib/                        フレームワーク非依存の汎用関数（format, glossary）
    ui/                         共通 UI 部品、fields、number-input、termHelpPosition、chartTheme
  features/<feature>/
    domain/       index.ts      型・不変条件・計算の純粋関数
    application/  index.ts      ユースケース（(plan, args) => plan の純粋関数）、zod による入力検証、IdGenerator 等の関数型
    infrastructure/ index.ts    persist の merge・キー移行、プランファイル入出力、ID 生成の実装
    ui/           index.ts      コンポーネント、Zustand ストア、hooks
```

- 各層の `index.ts` がその層の公開 API。**他機能・`src/app` からは `@/features/<f>/<layer>` の形（層の index）でのみ import** し、層内の個別ファイルを直接 import しない。機能全体の単一 index は作らない（domain から他機能の index を import したときに ui の React 依存が連鎖するのを防ぐため）。
- 空の層はフォルダを作らない。

### 2.2 import 許可ルール（アーキテクチャテストで検証）

層の内外順序を `domain < application < infrastructure < ui` とする。層 L のファイルが import してよいもの:

| import 先 | 条件 |
|------|------|
| 同一機能の層 M | M ≤ L（層内・内側方向のみ）。相対パスで可 |
| 上流機能（依存グラフで左側）の層 M | M ≤ L、かつ `@/features/<f>/<M>` の index 経由 |
| `shared/domain`, `shared/lib` | どの層からも可 |
| `shared/ui` | ui 層のみ |
| 外部パッケージ `react`, `react-dom`, `next`, `zustand`, `recharts` | ui 層のみ |
| 外部パッケージ `zod` | application・infrastructure 層のみ |
| 外部パッケージ `vitest` | テストファイルのみ（全層） |

- `shared` 内: `domain` と `lib` は外部パッケージも `shared/ui` も import しない。`shared/ui` は `shared/domain`・`shared/lib` と ui 系パッケージを import できる。`shared` から `features` は import しない。
- `src/app` は各機能の層 index と `shared` を import できる（層の個別ファイルは不可）。
- テストファイル（`*.test.ts(x)`）も対象ファイルと同じ層のルールに従う。コンポーネントテストの `react-dom/client` は ui 層なので許可される。
- 下流機能の import（例: plan → simulation）と機能間の循環は違反とする。
- `src/app`・`src/features/<feature>/<layer>`・`src/shared/{domain,lib,ui}` 以外への `.ts`/`.tsx` の配置は違反とする。ただしアーキテクチャテスト自身（`src/architecture.test.ts`・`src/architecture/`）は判定の対象外とし、他のファイルからそれらを import することは違反とする。

## 3. ストアの分解

### 3.1 plan ストア（`plan/ui/usePlanStore.ts`）

現状の `usePlanStore.ts`（594行）に同居している責務を分ける。

| 責務 | 移動先 |
|------|------|
| 各アクションの本体（`setRange` の期間補正、`updateSelf` の終了年追従、`toggleSpouse` の世帯既定値追従、子・ローン・物件等の追加/更新/削除、`startBlank`, `reset`, `resetSingle`） | `plan/application` の純粋関数。ストアは `set((s) => ({ input: toggleSpouse(s.input, enabled, idGen) }))` のように委譲するだけにする |
| `makeId` | `plan/application` に `IdGenerator` 関数型を定義し、実装（`crypto.randomUUID` 利用）は `plan/infrastructure`。テストでは決定的な実装を注入する |
| `mergePersistedPlanState` | `plan/infrastructure` |
| `newLoan`, `newRecurringExpense`, `nextChildName`, `householdDefaultsSync` | `plan/application` |
| スナップショット関連（`snapshots`, `saveSnapshot`, `removeSnapshot`, `loadSnapshot`） | scenario へ（3.2） |

plan ストアは引き続き persist キー `life-plan/v1` に `input` を保存する。

### 3.2 scenario ストア（`scenario/ui/useScenarioStore.ts`）

- `snapshots` と `saveSnapshot` / `removeSnapshot` を持ち、新しい persist キー `life-plan/scenarios/v1` に保存する。
- **旧データの移行**: plan ストアの persist を `version: 2` に上げ、`migrate`（`plan/infrastructure` の関数。新キーの読み書きに使う storage を引数で受け取り、テストではインメモリの storage を渡して直接呼べるようにする）で行う。
  - 旧データ（version 1）に `snapshots` 配列があり、かつ新キー `life-plan/scenarios/v1` が存在しないときに限り、生の配列をそのまま新キーへ `{ state: { snapshots }, version: 1 }` の persist 形式で書き出す。新キーが既にあれば上書きしない（冪等）。
  - `snapshots` が配列でない・旧データが壊れている場合は新キーへ何も書かない。いずれの場合も `snapshots` を取り除いた状態を返し、以降は `mergePersistedPlanState` が従来どおり `input` を検証する。
  - 移行は plan ストアのハイドレート時に必ず実行されるため、ページごとのストア読み込み順に依存しない。scenario は plan の下流で plan ストアを import するので、scenario ストアのハイドレートは常に plan の移行後になる。
  - plan は scenario のコードを import せず、新キーの文字列だけを知る（`plan/infrastructure` の定数）。スナップショット要素の zod 検証は scenario ストアの `merge`（`scenario/infrastructure` の純粋関数）で `snapshotSchema` により1件ずつ行い、失敗した要素は除外、キーが無い・壊れている場合は空配列とする。例外は投げない。
- 2ストアにまたがる操作は scenario のユースケースとして実装し、plan ストアの公開アクションを呼ぶ（scenario → plan の向き）。
  - `loadSnapshot`: スナップショットの入力を複製し、ゲーム由来イベントのラベルに「（ゲーム）」を冪等に前置したうえで plan の `replaceInput` を呼ぶ。ラベル付与は `scenario/application` の純粋関数。
  - 全消去（現 `reset`）: plan の入力を既定値へ戻し、スナップショットも空にする。
- `snapshotSchema` は `scenario/application` に置く（`planInputSchema` は plan/application から import）。

## 4. ファイル対応表

テストファイルは対象ファイルと一緒に移動する（コロケーション維持）。`__snapshots__` も対応するテストと同じディレクトリへ移動する。

### shared

| 現在 | 移動先 |
|------|------|
| `lib/format.ts` | `shared/lib/format.ts` |
| `lib/glossary.ts` | `shared/lib/glossary.ts` |
| `components/ui/*`（Button, ConfirmDialog, Eyebrow, Panel, TermHelp, termHelpPosition） | `shared/ui/` |
| `components/forms/fields.tsx`, `number-input.ts`, `NumberField.test.tsx`, `number-input.test.ts` | `shared/ui/` |
| `components/charts/chartTheme.ts` | `shared/ui/chartTheme.ts` |
| `lib/theme-contrast.test.ts` | `shared/ui/` |
| `lib/game/assetDiff.ts` | `shared/lib/assetDiff.ts`（scenario の `comparisonDiff` と game の双方が使うため。scenario → game の依存を避ける） |

### plan

| 現在 | 移動先 |
|------|------|
| `lib/simulation/types.ts` の入力側（Person 〜 PlanInput） | `plan/domain/`（エンティティ単位にファイル分割） |
| `lib/simulation/{pension,loan,property,education}.ts` | `plan/domain/`（1章の表のとおり） |
| `lib/simulation/{defaults,householdDefaults,dateRange,endAge}.ts` | `plan/domain/` |
| `lib/store/{newLoan,newRecurringExpense,nextChildName,householdDefaultsSync}.ts` | `plan/application/` |
| `lib/schema.ts`（`planInputSchema`, `validatePlanInput` 等） | `plan/application/` |
| `lib/planFile.ts` | `plan/infrastructure/` |
| `lib/store/usePlanStore.ts` | 3.1 のとおり分解し、ストア本体は `plan/ui/` |
| `components/forms/*`（上記 shared 以外。`usePlanErrors.ts` を含む） | `plan/ui/` |

### simulation

| 現在 | 移動先 |
|------|------|
| `lib/simulation/types.ts` の `YearlyResult` | `simulation/domain/` |
| `lib/simulation/{engine,tax,socialInsurance,childAllowance,housingLoanCredit,incomeAdjustment,recurringExpense,summary,longevitySummary,depletionRemedies}.ts` | `simulation/domain/` |
| `lib/simulation/calc-coverage.test.ts` | `simulation/domain/` |
| `lib/assumptions.ts` | `simulation/domain/` |
| `lib/validatedSimulation.ts` | `simulation/application/` |
| `lib/input-validation.test.ts` と `__snapshots__` | `simulation/application/`（`runValidatedSimulation` の呼び出しガードとシミュレーション結果のスナップショットを含み engine を `vi.mock` するため。PR 4 で `validatedSimulation.ts` と一緒に移す） |
| `components/forms/number-input.integration.test.ts` | `simulation/ui/`（engine を使うため。PR 4 で移す） |
| `components/{SummaryBar,DepletionAdvice,ResultTable,AssumptionsPanel}.tsx`, `result-table-cards.ts` | `simulation/ui/` |
| `components/charts/{NetWorthChart,CashFlowChart}.tsx`, `netWorthChartData.ts`, `chart-aria.test.tsx` | `simulation/ui/` |

### scenario

| 現在 | 移動先 |
|------|------|
| `usePlanStore.ts` の `Snapshot`・`SnapshotOrigin` 型 | `scenario/domain/` |
| `lib/comparisonDiff.ts` | `scenario/domain/` |
| `lib/schema.ts` の `snapshotSchema` | `scenario/application/` |
| `usePlanStore` のスナップショット部分 | 3.2 のとおり `scenario/{application,infrastructure,ui}/` |
| `components/ScenarioBar.tsx`, `components/charts/{ComparisonChart,ComparisonDiffTable}.tsx` | `scenario/ui/` |

### game

| 現在 | 移動先 |
|------|------|
| `lib/game/{types,rng,events,stages,satisfaction,stats,householdAge,depletionText,advance,project}.ts` | `game/domain/` |
| `lib/game/flow.ts`（画面遷移の reducer） | `game/application/` |
| `components/game/*` | `game/ui/` |

`src/app/page.test.tsx` は `src/app/` に残す。

## 5. 移行手順

各 PR は `refactor/*` ブランチで1〜2日以内にスカッシュマージする。**各 PR は挙動を変えず、既存テストがすべて通ることを条件**とする。ファイル移動は `git mv` で行う。識別子の改名は移動と同じ PR で行わない。

| # | ブランチ | 内容 |
|---|------|------|
| 1 | `refactor/architecture-test` | 済（#53）。`src/architecture.test.ts` の追加（移行期間中は未移行の `src/lib`・`src/components` を検査・判定から除外）と `shared` の抽出 |
| 2a | `refactor/plan-domain` | `types.ts` の入力側の分割と、plan の domain・application・infrastructure へのファイル移動。ストア・フォームは旧位置のまま import だけ更新 |
| 2b | `refactor/plan-ui` | ストアとフォーム（`usePlanErrors.ts` を含む）を `plan/ui` へ移動。ストアは形を変えず移動のみ |
| 3 | `refactor/plan-usecases` | `usePlanStore` のアクション本体を `plan/application` の純粋関数へ抽出、`IdGenerator` 注入 |
| 4 | `refactor/simulation-feature` | simulation 一式の移動 |
| 5 | `refactor/game-feature` | game 一式の移動。`assetDiff` を `shared/lib` へ移動 |
| 6 | `refactor/scenario-feature` | scenario ストアの分離、plan ストアの `migrate` による persist キー移行、比較関連の移動 |
| 7 | `refactor/cleanup` | 済。空になった `src/lib`・`src/components` を削除（PR 6 までに消滅済み）、アーキテクチャテストの対象を `src` 全体へ拡大、CLAUDE.md の「構成」節を新構成に更新 |

リスクの高い scenario（永続化データの移行を伴う）は、単純な移動で済む game の後に回す。

## 6. テスト

- **アーキテクチャテスト**（`src/architecture.test.ts`, `environment: "node"`）: 対象ディレクトリの `.ts`/`.tsx` を走査し、静的 import・`export ... from`・動的 `import()` の指定子を抽出する。`@/` と相対パスを `src` からのパスに解決して機能と層を判定し、2.2 のルールに照らした違反を「ファイル → import 先 → 理由」の一覧にして、違反ゼロを assert する。ルール判定関数は純粋関数として切り出し、代表的な許可・違反パターンの単体テストを添える。
- **ユースケース**: `plan/application`・`scenario/application` に抽出した関数は TDD で単体テストを追加する。既存のストアテスト（`usePlanStore.test.ts`）は委譲後も残し、回帰検知に使う。
- **persist キー移行**: plan の `migrate` について「旧 snapshots あり・新キーなし → 新キーへコピー」「新キーあり → 上書きしない」「`snapshots` が配列でない・旧データ破損 → 新キーへ書かない」「2回実行しても結果が同じ」の各ケースを、scenario の `merge` について「一部の要素が破損 → 除外」「キーなし・破損 → 空配列」をテストする。
- **各 PR の確認**: `npm run test` と `npm run build`。PR 6 は既存の localStorage データを持つブラウザで、スナップショットが引き継がれることを手動確認する。

## 7. エラー処理

CLAUDE.md の方針どおり例外は投げず、`try`/`catch` も使わない。永続化データ・旧キーのデータは zod の `safeParse` で検証し、失敗時は既定値（入力）・除外（スナップショット要素）・空配列へフォールバックする。

## 8. スコープ外

- 計算ロジックの挙動変更、UI の見た目の変更
- ドメイン用語・識別子の改名（必要なら別 PR で行う）
- Repository インターフェース（ポート）の導入
- CI への lint ステップ追加
- 値オブジェクト（ブランド型）の導入
