## Developer Code Scan Results

対象: `life-plan` リポジトリ全体（`./`）。フルスキャン初回実行（既存コードKBストアなし = NO_STORE）。
関連課題: GitHub issue #14 — シミュレーション期間の開始年が終了年より後の場合に、
エラー表示なく結果が無言で空白になる。

### Scan Coverage

- **Analyzed deeply**:
  - `./`
  - `package.json`
  - `vitest.config.ts`
  - `.github/workflows/ci.yml`
  - `eslint.config.mjs`
  - `src/app/page.tsx`
  - `src/app/game/page.tsx`
  - `src/app/layout.tsx`
  - `src/lib/simulation/types.ts`
  - `src/lib/simulation/engine.ts`
  - `src/lib/simulation/defaults.ts`
  - `src/lib/simulation/loan.ts`
  - `src/lib/schema.ts`
  - `src/lib/store/usePlanStore.ts`
  - `src/lib/store/newLoan.ts`
  - `src/lib/game/types.ts`
  - `src/lib/game/stages.ts`
  - `src/lib/game/advance.ts`
  - `src/lib/game/events.ts`
  - `src/components/forms/HouseholdForm.tsx`
  - `src/components/forms/fields.tsx`
  - `src/components/forms/number-input.ts`
  - `src/components/forms/LoanForm.tsx`
  - `src/components/ResultTable.tsx`
  - `src/components/game/GameHud.tsx`
- **Skimmed only**（ディレクトリ単位で存在・目的のみ確認、行レベルの精読はせず）:
  - `src/components/charts/`
  - `src/components/forms/ExpenseForm.tsx`, `AssetForm.tsx`, `EventForm.tsx`
  - `src/components/game/AdventureLog.tsx`, `GameResult.tsx`, `StageCard.tsx`
  - `src/components/ui/`
  - `src/lib/simulation/education.ts`, `pension.ts`, `socialInsurance.ts`, `tax.ts`
  - `src/lib/game/rng.ts`, `satisfaction.ts`, `stats.ts`
  - `src/lib/assumptions.ts`
  - `src/lib/format.ts`
  - `docs/`, `aidlc/`, `.claude/`（ワークフロー基盤。アプリケーションコードではない）
  - すべての `*.test.ts(x)` ファイル（テスト有無・命名パターンのみ確認、ケース内容は精読せず）

## Packages Found
- `life-plan`（ルート唯一のパッケージ） — アプリケーション — TypeScript / Next.js（App Router） — 世帯のライフプラン・シミュレーターと「人生ゲーム」モードを提供する単一ページ Web アプリ。単一リポジトリ構成でサブパッケージ分割なし。

## Build System
- **Type**: npm + Next.js CLI（`next dev` / `next build` / `next start`）、テストは Vitest。
- **Config Files**: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts`, `eslint.config.mjs`, `vitest.config.ts`。
- **Build Dependencies**: `components` → `store`(zustand) → `lib/simulation`・`lib/game` → `lib/schema` の単方向依存（`team.md` の Code Style 節に明記された規約と一致。今回確認した範囲で逆方向依存の違反は確認されていない）。

## APIs Discovered
- 外部 HTTP API: なし（サーバーサイド API ルートは未確認。`localStorage` のみで永続化する完全クライアントサイドアプリ）。
- 内部「契約」としての関数群:
  - `runSimulation(input: PlanInput): YearlyResult[]`（`src/lib/simulation/engine.ts`) — シミュレーションの中核純関数。
  - `usePlanStore`（Zustand ストア、`src/lib/store/usePlanStore.ts`) — `setRange`, `updateSelf`, `addLoan` など約20メソッドの状態更新API。
  - zod スキーマ群（`src/lib/schema.ts`) — `planInputSchema` / `snapshotSchema` が localStorage 復元時の検証境界。

## Frameworks & Libraries
- `next` ^15.1.6 — App Router, React Server/Client Components
- `react` / `react-dom` ^19.0.0
- `zustand` ^5.0.3 — persist ミドルウェアで localStorage 永続化
- `zod` ^3.24.1 — 永続化データの検証（`safeParse`）
- `recharts` ^2.15.0 — チャート描画
- `tailwindcss` ^3.4.17 — スタイリング
- `vitest` ^3.0.2 + `jsdom` ^26.0.0 — テスト実行（ハイブリッド環境: 既定 node、DOM 必要時のみ `// @vitest-environment jsdom` 個別指定）
- `typescript` ^5.7.3、`eslint` ^9.18.0 + `eslint-config-next`

## Test Coverage
- **Test Directories**: 専用の `tests/` ディレクトリはなく、`src/**` にソースとコロケーションされた `*.test.ts(x)` / `*.integration.test.ts`。テスト対象と1:1で多数存在（`engine.test.ts`, `schema.test.ts`, `usePlanStore.test.ts`, `number-input.test.ts`, `HouseholdForm` 直接のテストは無いが `fields.test.ts` 等で間接カバー、等）。
- **Test Frameworks**: Vitest（`environment: "node"` 既定、DOM 依存コンポーネントのみ jsdom）。`@testing-library/react` は**意図的に未導入**（`team.md` Forbidden 相当の方針）— `react-dom/client` の `createRoot` と生DOMイベントによる自前ハーネスを使用。
- **Coverage Config**: `@vitest/coverage-v8` 等のカバレッジ計測ツールは `package.json` に**未導入**。数値目標（80%）は `team.md` に記載されているが、計測は今回のスコープ外（`ui-ux-audit-fix` 時点の記録どおり）。

## Code Quality Indicators
- **Linting**: ESLint（`eslint.config.mjs`）— `next/core-web-vitals`, `next/typescript` を継承するのみでカスタムルールなし。CI では lint 単体ステップは組み込まれていない。
- **CI/CD**: `.github/workflows/ci.yml` — `push`/`pull_request`（`main` 対象）で `npm ci` → `npm run test`（`vitest run`）→ `npm run build` のみ。lint・型チェック単体ステップ、カバレッジ閾値ゲート、デプロイステップは含まれない（`team.md` の記述と一致）。
- **Documentation**: `README.md`（Next.js 標準の create-next-app 由来の簡易な内容）。ドメインロジックには JSDoc 形式のブロックコメントが日本語で多数付与されており、意図・チケットID（`lp-XXX`）・QA番号を記録する慣習が徹底されている（例: `engine.ts`, `NumberField` のコメント）。

## Technical Debt Signals
- **開始年 > 終了年の未検証（issue #14 の直接原因）**: `PlanInput.startYear` / `endYear`（`src/lib/simulation/types.ts:102-103`）に大小関係の制約がなく、`zod` スキーマ（`src/lib/schema.ts:78-89`）も各フィールドを独立に `z.number().int()` で検証するのみで相互関係（`endYear >= startYear`）はチェックしていない。UI 側（`src/components/forms/HouseholdForm.tsx:190-203`）の「開始年」「終了年」入力も、`NumberField` に用意されている `error` prop（`src/components/forms/fields.tsx:99-167`、aria-invalid 連携込みで実装済み）を一切使わず、単純に `usePlanStore().setRange` を呼ぶだけ。
- **サイレントな空結果の伝播経路**: `runSimulation`（`src/lib/simulation/engine.ts:103`）は `for (let year = startYear; year <= endYear; year++)` というループで、`startYear > endYear` なら1回も実行されず `results = []` を返す（例外もエラーも発生しない）。呼び出し元 `src/app/page.tsx:109` の `results` がそのまま `Summary`（同ファイル `38-39` 行目、`results.length === 0` で `return null`）・`ResultTable`（`src/components/ResultTable.tsx`、`results=[]` なら `<tbody>` が空）・各チャート（`NetWorthChart` 等、今回は精読せずシグネチャのみ確認）に渡り、すべて「何も表示しない」形で沈黙する。ユーザーへの通知は一切ない。
- **ゲームモードにも同型の潜在バグ**: `src/lib/game/stages.ts:64-65` の `while (cursorYear <= endYear)` も同じ前提（`startYear <= endYear`）に依存しており、逆転入力時は空のステージリストになりうる（今回の issue の対象はメインシミュレーターだが、同一の入力元 `input.startYear/endYear` を共有するため影響範囲として記録）。
- **エラー表現方針との整合**: `project.md` の Mandated 規約「異常系は例外ではなく戻り値の型で表現する」「zod の `safeParse` の成否や `null` 許容型を使う」と、`fields.tsx` に既に実装済みの `error` prop（aria-invalid + role="alert" 表示）の組み合わせを使えば、`try`/`catch` を導入せずに本 issue を解消できる素地がある。
- **他の既知の逆転しうる範囲チェックの欠如（参考、issue #14 の直接対象外）**: `Person.retirementAge` と `pensionStartAge` の大小関係、`Loan.startYear + termYears` の妥当性なども同様に未検証だが、今回のスコープ（bugfix, Minimal depth）では対象外として記録するに留める。

## Handoff Summary
- **Intent-relevant finding**: バグの根本原因は次の3点の欠如の組み合わせ。
  1. `src/lib/schema.ts:78-89`（`planInputSchema`）に `startYear <= endYear` の相互検証がない。
  2. `src/components/forms/HouseholdForm.tsx:190-203` の「開始年」「終了年」`NumberField` に、既存の `error` prop 機構（`src/components/forms/fields.tsx:99-167`）を使ったバリデーション表示が接続されていない。
  3. `src/lib/simulation/engine.ts:103`（`runSimulation` のループ条件 `year <= endYear`）が逆転入力時に無言で空配列を返し、`src/app/page.tsx:38-39` の `Summary` はじめ全結果表示コンポーネントがその空配列を「結果ゼロ」として何の説明もなく描画しない。
  修正はこの3点のいずれか（または組み合わせ）に対して、例外を投げずに「エラー表示」または「自動補正」を行う形で入る想定。
- **Risks / follow-up**:
  - `HouseholdForm.tsx` の「開始年」「終了年」フィールドにバリデーションエラーを表示する場合、`NumberField` の `error` prop は既存の UI/アクセシビリティ規約（`project.md` Mandated: 回帰テストを自前DOMハーネスで追加）に沿って実装できるため、新規パターンの導入は不要。
  - 自動補正（例: 終了年を開始年に合わせる）を選ぶ場合、`src/lib/game/stages.ts` のゲームモード側の同型ループにも波及するかどうかを Architect Synthesis で判断してもらう必要がある（本スキャンでは事実の記録に留め、設計判断はしていない）。
  - `planInputSchema` に相互検証を足す場合、`assetSchema` と同様に `.transform`/`.refine` を使う設計が既存コードの慣習と整合する（`src/lib/schema.ts:63-76` の `assetSchema` が参考実装として存在）。
  - テストは `team.md` の Testing Posture（test-after、`lib/simulation` → `lib/store` → `components/*` の順でコロケーション、`vitest`、`@testing-library/react` 不使用）に厳密に従う必要がある。
