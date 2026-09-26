# PR 5: game 一式の features/game への移動 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/lib/game/*` と `src/components/game/*` を `src/features/game/{domain,application,ui}` へ移し、`assetDiff` を `src/shared/lib` へ移す。外部からは層の index 経由で使うようにする。計算結果・見た目・保存データは一切変えない。

**Architecture:** game は simulation・plan の下流機能（`shared ← plan ← simulation ← game`）。domain はゲーム進行・イベント・満足度等の純粋関数と型、application は画面遷移の reducer（`flow.ts`）、ui はゲーム画面のコンポーネント。infrastructure は作らない（空の層はフォルダを作らない）。`assetDiff` は scenario（`comparisonDiff`）と game の双方が使うため、scenario → game の依存を避けて `shared/lib` に置く。

**Tech Stack:** TypeScript 5.7, Next.js 15（App Router、`"use client"`）, React 19, vitest 3（既定 `environment: "node"`、コンポーネントテストは `// @vitest-environment jsdom`）

**Spec:** `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md`（本計画は 5 章の移行手順 #5 を実装する。根拠は 2.1・2.2 節の層と import ルール、4 章の shared（`assetDiff`）と game のファイル対応表）。前段の計画 `docs/superpowers/plans/2026-09-26-pr4-simulation-feature.md` の「後続 PR への申し送り」のうち PR 5 分も本計画で扱う。

## Global Constraints

- 各 PR は挙動を変えず、既存テストがすべて通ることを条件とする。
- ファイル移動は `git mv` で行う。識別子の改名は移動と同じ PR で行わない（関数名・型名・定数名・ファイル名は変えない）。
- 例外を投げない。`try`/`catch` を使わない。
- 新規の npm 依存を追加しない。
- テストは対象ファイルと同一ディレクトリに置く（コロケーション）。既定 `environment: "node"`。
- 他機能・`src/app`・旧ディレクトリ・同一機能の他の層からは `@/features/game/<layer>`・`@/shared/lib`（層の index）で import する。同じ層の中のファイル同士は相対パス（`./advance` 等）で import し、自層の index は import しない（アーキテクチャテストで「自層の index」違反になる）。
- コミットメッセージ・コード内コメントは日本語、識別子は英語。
- ブランチは `refactor/game-feature`。PR はスカッシュマージ。
- 各 PR の確認は `npm run test` と `npm run build`。

## 仕様からの補足・判断

1. **game の各層の index が公開するもの**: 層外（app・同一機能の他の層・旧ディレクトリ）から実際に使われているものだけにする（PR 4 と同じ方針）。
   - domain（`src/features/game/domain/index.ts`）:
     - `advance.ts`: `chooseStageOption`, `createGame`, `currentStage`, `pendingGameEvent`, `resolveEventChoice`
     - `stages.ts`: `STAGE_OPTION_TABLE`, `stageOptionCashLabel`, `stageOptionsFor`
     - `project.ts`: `projectInput`
     - `stats.ts`: `computeStats`, 型 `GameStats`
     - `satisfaction.ts`: `satisfactionMark`, `summarizeSatisfaction`, 型 `SatisfactionSummary`
     - `depletionText.ts`: `DEPLETION_DEFINITION`, `describeDepletion`, `describeDepletionDiff`
     - `householdAge.ts`: `formatMemberAge`
     - `types.ts`: 型 `GameState`, `LogEntry`, `Stage`
     - `events.ts`・`rng.ts` と上記以外の export（`EVENT_RATE`, `deriveStages`, `projectInputFromApplied` 等）は domain 内でしか使われないので出さない。
   - application（`src/features/game/application/index.ts`）: `createFlow`, `gameFlowReducer`, 型 `GameFlow`。`selectableIds`・`GameFlowAction` は層内（`flow.test.ts`）でしか使われないので出さない。
   - ui（`src/features/game/ui/index.ts`）: `AdventureLog`, `GameHud`, `GameResult`, `StageCard`, 型 `CardChoice`。`GameHud.tsx` の `EVENT_DISCLAIMER` 等は `GameResult.tsx` が相対 import するので出さない。
2. **`assetDiff` は `shared/lib` の index から `formatAssetDiff` だけを出す**: 層外で使われているのは `formatAssetDiff` のみ（`comparisonDiff.ts`・`GameResult.tsx`）。型 `AssetDiffRow` は出さない。`assetDiff.ts` 自身の `import { formatYen } from "@/shared/lib"` は、`shared/lib` に入ると自層の index の import になり違反かつ循環 import になるため、`./format` に書き換える。
3. **`flow.test.ts` の動的 import も index に書き換える**: 「確定結果は従来と同一（AC11）」の `await import("./advance")` は、`flow.test.ts` が application 層へ移ると解決できなくなる。`await import("@/features/game/domain")` に書き換える（`chooseStageOption`・`resolveEventChoice` は index が公開する）。アーキテクチャテストは動的 `import()` の指定子も検査する。
4. **旧ディレクトリの import も書き換える**: `src/lib/comparisonDiff.ts`（PR 6 で scenario へ移る）の `@/lib/game/assetDiff` を `@/shared/lib` に書き換える。
5. **`src/app/game/page.tsx` のコメント**: 「状態機械は lib/game/flow.ts。」を「状態機械は features/game/application/flow.ts。」に直す（パスの記述だけを直す）。
6. **アーキテクチャテストの走査確認に game の index を加える**: `src/architecture.test.ts` の「検査対象のファイルを走査できている」に `features/game/{domain,application,ui}/index.ts` の 3 行を足す（PR 2〜4 と同じ）。

### 後続 PR への申し送り（本 PR で更新）

| 対象 | 内容 | 対応する PR |
|------|------|------|
| `features/plan/ui/usePlanStore.ts` の `mergePersistedPlanState` | `plan/infrastructure` へ移す（snapshots の検証は scenario の `merge` へ） | PR 6（PR 3 から継続） |
| `features/plan/ui/usePlanStore.ts` の `saveSnapshot`・`removeSnapshot`・`loadSnapshot` | scenario ストア・ユースケースへ移す | PR 6（PR 3 から継続） |
| `src/components/charts/comparison-chart-aria.test.tsx` | `ComparisonChart` と一緒に `scenario/ui` へ移す | PR 6（PR 4 から継続） |
| `src/lib/comparisonDiff.ts` の `@/shared/lib` の import（`formatAssetDiff`） | scenario/domain へ移したあとも index 経由のまま（scenario → shared は許可） | PR 6（作業不要の確認のみ） |
| `.claude/CLAUDE.md` の「構成」節の `src/lib/game` の記述 | 旧構成の説明を新構成に更新する | PR 7 |

## Review Focus

1. **自層 index の循環 import**: `shared/lib/assetDiff.ts` が `@/shared/lib` を import したままだと、index → assetDiff → index の循環になり、評価順によっては `formatYen` が未定義のまま呼ばれうる。Task 1 で `./format` に書き換え、アーキテクチャテスト（「自層の index」違反）と `assetDiff.test.ts` が通ることで確認する。
2. **動的 import の取りこぼし**: `flow.test.ts` の `await import("./advance")` は静的 import の書き換えだけを見ていると漏れ、移動後にそのテストだけが実行時に失敗する。Task 3 のあと「確定結果は従来と同一（AC11）」の 3 ケースが PASS していることを名前で確認する。
3. **テストの消失・二重化**: 本 PR はテストの追加・削除をしない（アーキテクチャテストの `expect` 行の追加のみ）。Task 0 のテストファイル数 N・テスト数 M は全 Task を通じて不変。
4. **`/game` と比較画面の挙動の不変**: 同じ seed で同じステージ・イベントが出ること、結果画面の「基本計画との違い」の差額表記（`formatAssetDiff`）、比較画面の差分表の資産差の表記（`formatAssetDiff`）が移動前と同じであること。コンポーネントの中身は変えないが、`"use client"` の付いたファイルを index 経由で import するので、Task 5 の画面確認で必ず見る。
5. **バンドルサイズ**: `/` は `comparisonDiff` 経由で `@/shared/lib` を、`/game` は `@/features/game/{domain,application,ui}` を index 経由で読むようになる。Task 0 と Task 5 で `npm run build` のルート別サイズ（`/` と `/game` の First Load JS）を比べ、増えていれば PR 本文に数値を書く（仕様上 index 経由は必須なので、増加は許容して記録に留める）。

---

### Task 0: ブランチ作成とベースライン記録

**Files:** なし

- [x] **Step 1: ブランチを作成する**

```bash
git switch main && git pull
git switch -c refactor/game-feature
```

- [x] **Step 2: テスト件数のベースラインを記録する**

Run: `npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。`Test Files  N passed` と `Tests  M passed` の N・M を控える。

- [x] **Step 3: ルート別のバンドルサイズを記録する**

Run: `npm run build 2>&1 | grep -E "^(┌|├|└)"`
Expected: ビルド成功。`/` と `/game` の Size・First Load JS を控える（Review Focus 5）。

---

### Task 1: `assetDiff` を `shared/lib` へ移す

**Files:**
- Move: `src/lib/game/assetDiff.ts` → `src/shared/lib/assetDiff.ts`
- Move: `src/lib/game/assetDiff.test.ts` → `src/shared/lib/assetDiff.test.ts`
- Modify: `src/shared/lib/index.ts`
- Modify: `src/lib/comparisonDiff.ts:9`
- Modify: `src/components/game/GameResult.tsx:8`

**Interfaces:**
- Consumes: `src/shared/lib/format.ts` の `formatYen`
- Produces: `@/shared/lib` から `formatAssetDiff`（シグネチャは移動前と同じ）

- [x] **Step 1: ファイルを移動する**

```bash
git mv src/lib/game/assetDiff.ts src/shared/lib/assetDiff.ts
git mv src/lib/game/assetDiff.test.ts src/shared/lib/assetDiff.test.ts
```

- [x] **Step 2: アーキテクチャテストが失敗することを確認する**

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL。「features・shared・app に import ルール違反がない」で `shared/lib/assetDiff.ts → @/shared/lib: ... 自層の index ...` が報告される。

- [x] **Step 3: `assetDiff.ts` の import を相対パスにする**

`src/shared/lib/assetDiff.ts` の 1 行目:

```ts
import { formatYen } from "./format";
```

- [x] **Step 4: `shared/lib` の index に追加する**

`src/shared/lib/index.ts` を次の内容にする（既存 2 行の前に 1 行足す。並びはファイル名順）:

```ts
/** shared/lib の公開 API。機能・app からはこの index 経由で import する。 */
export { formatAssetDiff } from "./assetDiff";
export { formatManYen, formatManYenLabel, formatPercent, formatYen } from "./format";
export { GLOSSARY, type GlossaryEntry, type GlossaryTermKey } from "./glossary";
```

- [x] **Step 5: 利用側の import を書き換える**

`src/lib/comparisonDiff.ts` の 9〜10 行目を次の 1 行にまとめる:

```ts
import { formatAssetDiff, formatYen } from "@/shared/lib";
```

`src/components/game/GameResult.tsx` の 7〜8 行目を次の 1 行にまとめる:

```ts
import { formatAssetDiff, formatYen } from "@/shared/lib";
```

- [x] **Step 6: テストを実行する**

Run: `npx vitest run src/architecture.test.ts src/shared/lib src/lib/comparisonDiff.test.ts src/components/game`
Expected: すべて PASS。

Run: `grep -rn "game/assetDiff" src`
Expected: 出力なし。

- [x] **Step 7: コミットする**

```bash
git add -A src
git commit -m "refactor: assetDiff を shared/lib へ移動（PR 5）"
```

---

### Task 2: game の domain を `features/game/domain` へ移す

この時点では `flow.ts` と `components/game/*` は旧位置のまま。移動元のパスが消えるので、旧位置のファイルの import を `@/features/game/domain` に書き換える。

**Files:**
- Move: `src/lib/game/{types,rng,events,stages,satisfaction,stats,householdAge,depletionText,advance,project}.ts` → `src/features/game/domain/`
- Move: `src/lib/game/{rng,events,stages,satisfaction,stats,householdAge,depletionText,advance,project}.test.ts` → `src/features/game/domain/`
- Create: `src/features/game/domain/index.ts`
- Modify: `src/lib/game/flow.ts:15-22`
- Modify: `src/lib/game/flow.test.ts:2-7,145`
- Modify: `src/components/game/{AdventureLog,GameHud,GameHud.test,GameResult,GameResult.test}.tsx`
- Modify: `src/app/game/page.tsx:12,14-18`
- Modify: `src/architecture.test.ts`

**Interfaces:**
- Consumes: `@/features/plan/domain`（`PlanInput`, `LifeEvent`, `defaultPlanInput`）、`@/features/simulation/domain`（`runSimulation`, `findDepletion`, `YearlyResult`）。domain 内のファイルはすでにこれらを index 経由で import しているので変更不要。
- Produces: `@/features/game/domain` の index（「仕様からの補足・判断」1 の一覧）

- [x] **Step 1: アーキテクチャテストに走査確認を足す**

`src/architecture.test.ts` の「検査対象のファイルを走査できている」の末尾（`features/simulation/ui/index.ts` の行の後）に足す:

```ts
    expect(files).toContain("features/game/domain/index.ts");
```

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL（`features/game/domain/index.ts` が見つからない）。

- [x] **Step 2: ファイルを移動する**

```bash
mkdir -p src/features/game/domain
for f in types rng events stages satisfaction stats householdAge depletionText advance project; do
  git mv "src/lib/game/$f.ts" "src/features/game/domain/$f.ts"
done
for f in rng events stages satisfaction stats householdAge depletionText advance project; do
  git mv "src/lib/game/$f.test.ts" "src/features/game/domain/$f.test.ts"
done
ls src/lib/game
```

Expected: `src/lib/game` には `flow.ts` と `flow.test.ts` だけが残る。domain 内のファイル同士は相対 import（`./types` 等）なので、移動したファイルの中身は変えない。

- [x] **Step 3: domain の index を作る**

`src/features/game/domain/index.ts`:

```ts
/** game/domain の公開 API。他機能・app・旧ディレクトリ・同一機能の他層からはこの index 経由で import する。game/domain 内のファイルはこの index を import しない。 */
export {
  chooseStageOption,
  createGame,
  currentStage,
  pendingGameEvent,
  resolveEventChoice,
} from "./advance";
export { DEPLETION_DEFINITION, describeDepletion, describeDepletionDiff } from "./depletionText";
export { formatMemberAge } from "./householdAge";
export { projectInput } from "./project";
export { satisfactionMark, summarizeSatisfaction, type SatisfactionSummary } from "./satisfaction";
export { STAGE_OPTION_TABLE, stageOptionCashLabel, stageOptionsFor } from "./stages";
export { computeStats, type GameStats } from "./stats";
export type { GameState, LogEntry, Stage } from "./types";
```

- [x] **Step 4: 旧位置の `flow.ts` の import を書き換える**

`src/lib/game/flow.ts` の 15〜22 行目を次にする:

```ts
import {
  chooseStageOption,
  currentStage,
  pendingGameEvent,
  resolveEventChoice,
  stageOptionsFor,
  type GameState,
} from "@/features/game/domain";
```

- [x] **Step 5: 旧位置の `flow.test.ts` の import を書き換える**

`src/lib/game/flow.test.ts` の 2〜7 行目を次にする（`./flow` の行は同じディレクトリなので残す）:

```ts
import {
  STAGE_OPTION_TABLE,
  createGame,
  currentStage,
  pendingGameEvent,
  projectInput,
  stageOptionCashLabel,
} from "@/features/game/domain";
import { createFlow, gameFlowReducer, selectableIds, type GameFlow } from "./flow";
import { runSimulation } from "@/features/simulation/domain";
import { defaultPlanInput } from "@/features/plan/domain";
```

「確定結果は従来と同一（AC11）」の動的 import（元の 145 行目）を次にする:

```ts
    const { chooseStageOption, resolveEventChoice } = await import("@/features/game/domain");
```

- [x] **Step 6: `components/game/*` の import を書き換える**

`src/components/game/AdventureLog.tsx` の 3 行目:

```ts
import type { LogEntry, Stage } from "@/features/game/domain";
```

`src/components/game/GameHud.tsx` の 4〜9 行目と 12 行目（`@/lib/game/*` の 4 つの import）を削除し、4 行目に次を置く（`PlanInput`・`Panel`・`formatYen` の import は残す）:

```ts
import {
  formatMemberAge,
  satisfactionMark,
  type GameStats,
  type SatisfactionSummary,
  type Stage,
} from "@/features/game/domain";
```

`src/components/game/GameResult.tsx` の `@/lib/game/*` の 5 つの import（`types`・`stats`・`depletionText`・`satisfaction`・`stages`）を削除し、`useRef, useState` の import の直後に次を置く（`./GameHud`・`@/shared/ui`・`@/shared/lib` の import は残す）:

```ts
import {
  DEPLETION_DEFINITION,
  STAGE_OPTION_TABLE,
  describeDepletion,
  describeDepletionDiff,
  type GameState,
  type GameStats,
  type SatisfactionSummary,
} from "@/features/game/domain";
```

`src/components/game/GameHud.test.tsx` の 6〜7 行目:

```ts
import type { GameStats, SatisfactionSummary } from "@/features/game/domain";
```

`src/components/game/GameResult.test.tsx` の 5〜7 行目:

```ts
import type { GameState, GameStats, SatisfactionSummary } from "@/features/game/domain";
```

- [x] **Step 7: `src/app/game/page.tsx` の domain の import を書き換える**

12 行目と 14〜18 行目（`@/lib/game/{advance,stages,project,stats,satisfaction,types}`）を削除し、`@/lib/game/flow` の import の直前に次を置く（`@/lib/game/flow` と `@/components/game/*` の import は Task 3・4 で書き換えるので残す）:

```ts
import {
  computeStats,
  createGame,
  currentStage,
  pendingGameEvent,
  projectInput,
  stageOptionCashLabel,
  stageOptionsFor,
  summarizeSatisfaction,
  type GameState,
} from "@/features/game/domain";
```

- [x] **Step 8: テストと型を確認する**

Run: `npx vitest run src/architecture.test.ts src/features/game src/lib/game src/components/game src/app`
Expected: すべて PASS。

Run: `npx tsc --noEmit`
Expected: エラーなし。

Run: `grep -rnE "@/lib/game/(types|rng|events|stages|satisfaction|stats|householdAge|depletionText|advance|project)\b|\./advance\"\)" src`
Expected: 出力なし。

- [x] **Step 9: コミットする**

```bash
git add -A src
git commit -m "refactor: game の domain を features/game/domain へ移動（PR 5）"
```

---

### Task 3: `flow.ts` を `features/game/application` へ移す

**Files:**
- Move: `src/lib/game/flow.ts` → `src/features/game/application/flow.ts`
- Move: `src/lib/game/flow.test.ts` → `src/features/game/application/flow.test.ts`
- Create: `src/features/game/application/index.ts`
- Modify: `src/app/game/page.tsx`（`@/lib/game/flow` の import と 29 行目のコメント）
- Modify: `src/architecture.test.ts`

**Interfaces:**
- Consumes: `@/features/game/domain`（Task 2 の index）
- Produces: `@/features/game/application` から `createFlow(game: GameState): GameFlow`, `gameFlowReducer(flow: GameFlow, action: GameFlowAction): GameFlow`, 型 `GameFlow`

- [x] **Step 1: アーキテクチャテストに走査確認を足す**

`src/architecture.test.ts` の Task 2 で足した行の後に足す:

```ts
    expect(files).toContain("features/game/application/index.ts");
```

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL（`features/game/application/index.ts` が見つからない）。

- [x] **Step 2: ファイルを移動する**

```bash
mkdir -p src/features/game/application
git mv src/lib/game/flow.ts src/features/game/application/flow.ts
git mv src/lib/game/flow.test.ts src/features/game/application/flow.test.ts
ls src/lib
```

Expected: `src/lib` には `comparisonDiff.ts`, `comparisonDiff.test.ts` のみ（`game` ディレクトリは消えている。残っていれば中身を確認し、未追跡のゴミでなければ作業を止めて報告する）。`flow.ts`・`flow.test.ts` の import は Task 2 で index 経由にしてあるので中身は変えない。

- [x] **Step 3: application の index を作る**

`src/features/game/application/index.ts`:

```ts
/** game/application の公開 API。他機能・app・同一機能の他層からはこの index 経由で import する。game/application 内のファイルはこの index を import しない。 */
export { createFlow, gameFlowReducer, type GameFlow } from "./flow";
```

- [x] **Step 4: `src/app/game/page.tsx` を書き換える**

`@/lib/game/flow` の import を次にする:

```ts
import { createFlow, gameFlowReducer, type GameFlow } from "@/features/game/application";
```

29 行目のコメントを次にする:

```ts
  // 選択（プレビュー）と確定の状態機械は features/game/application/flow.ts。
```

- [x] **Step 5: テストを実行する**

Run: `npx vitest run src/architecture.test.ts src/features/game/application --reporter=verbose 2>&1 | grep -E "AC11|✓|×|FAIL|passed|failed" | tail -30`
Expected: すべて PASS。「確定結果は従来と同一（AC11）」の「選択列 0/1/2 を 2 段階操作で確定しても、旧 API 直呼びと完全一致」3 ケースが PASS として表示される（Review Focus 2）。

Run: `grep -rn "lib/game" src`
Expected: 出力なし。

- [x] **Step 6: コミットする**

```bash
git add -A src
git commit -m "refactor: game の flow を features/game/application へ移動（PR 5）"
```

---

### Task 4: `components/game/*` を `features/game/ui` へ移す

**Files:**
- Move: `src/components/game/{AdventureLog,GameHud,GameHud.test,GameResult,GameResult.test,StageCard}.tsx` → `src/features/game/ui/`
- Create: `src/features/game/ui/index.ts`
- Modify: `src/app/game/page.tsx:8-11`
- Modify: `src/architecture.test.ts`

**Interfaces:**
- Consumes: `@/features/game/domain`、`@/shared/ui`、`@/shared/lib`
- Produces: `@/features/game/ui` から `AdventureLog`, `GameHud`, `GameResult`, `StageCard`, 型 `CardChoice`

- [x] **Step 1: アーキテクチャテストに走査確認を足す**

`src/architecture.test.ts` の Task 3 で足した行の後に足す:

```ts
    expect(files).toContain("features/game/ui/index.ts");
```

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL（`features/game/ui/index.ts` が見つからない）。

- [x] **Step 2: ファイルを移動する**

```bash
mkdir -p src/features/game/ui
for f in AdventureLog GameHud GameHud.test GameResult GameResult.test StageCard; do
  git mv "src/components/game/$f.tsx" "src/features/game/ui/$f.tsx"
done
ls src/components
```

Expected: `src/components` には `ScenarioBar.tsx`, `ScenarioBar.test.tsx`, `charts` のみ。ui 内のファイル同士は相対 import（`./GameHud` 等）で、他の import は Task 1・2 で index 経由にしてあるので中身は変えない。

- [x] **Step 3: ui の index を作る**

`src/features/game/ui/index.ts`:

```ts
/** game/ui の公開 API。他機能・app からはこの index 経由で import する。game/ui 内のファイルはこの index を import しない。 */
export { AdventureLog } from "./AdventureLog";
export { GameHud } from "./GameHud";
export { GameResult } from "./GameResult";
export { StageCard, type CardChoice } from "./StageCard";
```

- [x] **Step 4: `src/app/game/page.tsx` を書き換える**

8〜11 行目（`@/components/game/*` の 4 つの import）を次の 1 つにする:

```ts
import { AdventureLog, GameHud, GameResult, StageCard, type CardChoice } from "@/features/game/ui";
```

- [x] **Step 5: テストを実行する**

Run: `npx vitest run src/architecture.test.ts src/features/game src/app`
Expected: すべて PASS。

Run: `grep -rn "components/game" src`
Expected: 出力なし。

- [x] **Step 6: コミットする**

```bash
git add -A src
git commit -m "refactor: game の UI を features/game/ui へ移動（PR 5）"
```

---

### Task 5: 全体確認と PR 作成

**Files:** なし（確認で問題が見つかった場合のみ修正）

- [x] **Step 1: 全テスト・lint・ビルドを通す**

Run: `CI=true npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。`Test Files` は Task 0 の N と同じ、`Tests` は Task 0 の M と同じ（Review Focus 3。アーキテクチャテストは `expect` 行が増えただけでケース数は変わらない）。

Run: `git status --short`
Expected: 出力なし（`.claude/settings.json` の未追跡は作業前からのもので対象外）。

Run: `npm run lint`
Expected: エラー・警告なし。

Run: `npm run build 2>&1 | grep -E "^(┌|├|└)"`
Expected: ビルド成功。`/` と `/game` の First Load JS を Task 0 と比べる（Review Focus 5）。

- [x] **Step 2: 旧パスが残っていないことを確認する**

Run: `grep -rnE "@/lib/game|@/components/game|lib/game/|components/game/" src; ls src/lib src/components`
Expected: grep は出力なし。`src/lib` は `comparisonDiff.ts`, `comparisonDiff.test.ts`、`src/components` は `ScenarioBar.tsx`, `ScenarioBar.test.tsx`, `charts` のみ。

- [x] **Step 3: 画面で確認する（Review Focus 4）**

`npm run dev` で起動し、ブラウザで次を確認する（既存の localStorage `life-plan/v1` がある状態で開く）:
- `/game`: ゲームを開始し、HUD（年齢・資産・満足度）が表示される。方針カードの選択（プレビュー）と確定ができ、イベントが出たら選択肢を確定できる。冒険ログが増える。最後まで進めて結果画面に到達し、「基本計画との違い」の差額（`+¥…` / `¥-…` の表記）と枯渇の説明が表示される。
- `/game` で同じ seed のままやり直す操作（結果画面の確認ダイアログを含む）が移動前と同じように動く。
- `/`: スナップショットを 1 件保存し、比較の差分表の資産差が `+¥…（…）` の形で表示される（`formatAssetDiff` の移動の確認）。

- [x] **Step 4: プッシュして PR を作る**

```bash
git push -u origin refactor/game-feature
gh pr create --title "refactor: game 一式の features/game への移動（PR 5）" --body "$(cat <<'EOF'
## 概要

設計 `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md` の移行手順 #5。ゲームモードの計算ロジック・画面遷移・UI を `src/features/game/{domain,application,ui}` へ移し、`assetDiff` を `src/shared/lib` へ移した。挙動・見た目・保存データは変えていない。

- `src/lib/game/*`（`flow.ts`・`assetDiff.ts` 以外）→ `game/domain`
- `src/lib/game/flow.ts` → `game/application`
- `src/components/game/*` → `game/ui`
- `src/lib/game/assetDiff.ts` → `shared/lib`（scenario の `comparisonDiff` と game の双方が使うため）
- 外部からの import は層の index（`@/features/game/<layer>`・`@/shared/lib`）経由に書き換えた
- 詳細と後続 PR への申し送りは `docs/superpowers/plans/2026-09-26-pr5-game-feature.md`

## 確認

- [x] `npm run test`（テスト数は移動前と同じ）
- [x] `npm run lint`
- [x] `npm run build`
- [x] 画面操作（ゲームの進行・イベント・結果画面の差額表示・やり直し、比較画面の差分表）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

バンドルサイズが増えていた場合は、PR 本文の「確認」の下に Task 0 と Task 5 の `/`・`/game` の First Load JS を追記する。
