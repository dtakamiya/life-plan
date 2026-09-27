# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# life-plan

ライフプランシミュレーションアプリ（Next.js 15 App Router + React 19 + Zustand +
Recharts + zod）。サーバーは持たず、データはブラウザの localStorage に保存する。

## コマンド

- `npm run dev` — 開発サーバー（http://localhost:3000、ページは `/` と `/game`）
- `npm run lint` — `eslint . --max-warnings 0`（警告も失敗扱い）
- `npm run test` — `vitest run`（`src/**/*.test.{ts,tsx}`）
- 単一ファイル: `npx vitest run src/features/simulation/domain/engine.test.ts`
- テスト名で絞る: `npx vitest run -t "テスト名の一部"`
- スナップショット更新: `npx vitest run -u`
  （`src/features/simulation/application/__snapshots__` 等）
- `npm run build` — 本番ビルド（型チェック込み）

## 構成

- `src/features/<feature>/{domain,application,infrastructure,ui}` と
  `src/shared/{lib,ui}` による機能別レイヤー構成。機能は `plan`・`simulation`・
  `scenario`・`game` で、依存方向は `shared ← plan ← simulation ← scenario / game`。
- import の許可ルールは
  `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md`
  の 2.2 節にあり、`src/architecture.test.ts` が `src` 全体を検証する。
  `src/app`・`src/features/<feature>/<layer>`・`src/shared/<sub>` 以外に
  ファイルを置くことも違反になる。
- 他機能・`src/app` からは層の index（`@/features/<feature>/<layer>`）経由で
  import し、層内の個別ファイルを直接 import しない。
- 判定ロジック本体は `src/architecture/importRules.ts`。要点:
  - 層の依存は `domain ← application ← infrastructure ← ui`（内側へのみ）。
  - 同一層内で自層の index を import しない（バレルの循環参照の原因になる）。
  - 他機能は `@/` エイリアスで import する（相対パス不可）。
  - `react`・`react-dom`・`next`・`zustand`・`recharts` は ui 層
    （`shared/ui`・`src/app` を含む）のみ、`zod` は application・infrastructure
    層のみ。それ以外の外部パッケージは未許可で、追加時は `importRules.ts` の
    更新が必要。
  - `src/shared` のサブディレクトリは `domain ← lib ← ui`（現状 `domain` は未作成）。
- データの流れ: `plan/ui/usePlanStore`（Zustand persist、キー
  `life-plan/v1`）が `PlanInput` を保持 → `simulation/application` の
  `runValidatedSimulation` が `validatePlanInput` を通過したときだけ純関数
  `simulation/domain/engine.ts` の `runSimulation` を呼ぶ（不正入力は `null`）→
  `YearlyResult[]` を simulation/scenario/game の UI が描画する。
- 永続化データの変更時は、plan ストアの `version` と
  `plan/infrastructure` の `migratePersistedPlanState`・`mergePersistedPlanState`
  （scenario は別キー `life-plan/scenarios/v1`）を合わせて更新する。
- 設計仕様・実装計画は `docs/superpowers/specs`・`docs/superpowers/plans` にある。

## コーディング規約

- 命名規約: コンポーネントファイルは PascalCase、非コンポーネントのロジック
  ファイルは camelCase または kebab-case（テスト種別の表現に
  `.integration.test.ts` のように利用）。変数・関数は camelCase、型・zod
  スキーマは型名 PascalCase + スキーマ変数 camelCase という TypeScript/React
  の慣習に従う。
- エラーハンドリング方針: 例外を投げず、戻り値の型で異常系を表現する。
  永続化データの検証は zod の `safeParse` の成否で分岐し、失敗時は既定値へ
  フォールバックする。数値入力等の異常系（空文字・符号のみ等）は
  `value: number | null` のような null 許容型の戻り値で表現する。`try`/`catch`
  による例外処理は使わない。
- コンポーネントテストは `@testing-library/react` を導入せず、
  `react-dom/client` の `createRoot` と生DOMイベントによる自前ハーネスを使う。
- テストは `vitest` を使用し、既定は `environment: "node"`。DOM が必要な
  コンポーネントテストのみファイル冒頭で `// @vitest-environment jsdom` を
  個別指定する。テストファイルは対象ファイルと同一ディレクトリに
  `<対象名>.test.ts(x)` として配置する（コロケーション）。
- UI/UXの見た目・操作性・アクセシビリティを修正した箇所には、既存のDOM
  ハーネスで回帰テストを追加・更新する。
- フォーマッタは個別導入せず、ESLint（`next/core-web-vitals`,
  `next/typescript` の継承のみ）に委ねる。

## Way of Working

- `main` を単一のトランクとするトランクベース開発。フィーチャーブランチは
  `feature/*`, `refactor/*` のような短命な命名で作成し、1〜2日程度でマージする。
- PR は**スカッシュマージ**とする（1PR = `main` 上の1コミット）。
- コミットメッセージ・コード内コメントは日本語、識別子は英語とする。

## デプロイ

- 手元でビルドし、ローカル環境または自宅サーバーで運用する。Vercel 等の
  ホスティングサービスによる自動デプロイは使用しない。

## CI

- `.github/workflows/ci.yml` で `npm run lint`（ESLint CLI の `eslint .`）、
  `npm run test`（vitest run）、`npm run build` を実行する。
