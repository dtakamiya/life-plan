**Collaborator:** aidlc-developer-agent

## Contribution

独立レビュアーとして、命名規約・レイヤー境界・エラーハンドリング・ファイル構成・コードスタイル慣習を実コード（`src/`, `eslint.config.mjs`, `tsconfig.json`, `package.json`）から直接確認した。リードドラフト（`team-practices.md` / `discovered-rules.md` / `evidence.md`）と突き合わせた結果を以下に示す。

### 1. ファイル構成・レイヤー境界

- `src/app`（Next.js App Router）、`src/components`（`charts` / `forms` / `game` / `ui` の4サブディレクトリ）、`src/lib`（`game` / `simulation` / `store` の3サブディレクトリ）という3層構成が明確に観測できる。
  - `lib/simulation`: 計算エンジン本体（`engine.ts`, `tax.ts`, `pension.ts`, `loan.ts`, `socialInsurance.ts`, `education.ts`, `defaults.ts`, `types.ts`）。純粋関数中心のドメインロジック層。
  - `lib/game`: ゲームモード固有ロジック（`advance.ts`, `events.ts`, `project.ts`, `rng.ts`, `satisfaction.ts`, `stages.ts`, `stats.ts`, `types.ts`）。
  - `lib/store`: Zustand によるグローバル状態（`usePlanStore.ts`）と、状態生成の補助（`newLoan.ts`）。
  - `lib/schema.ts`, `lib/assumptions.ts`, `lib/format.ts`: 直下に置かれた横断的ユーティリティ（永続化検証、既定前提、表示フォーマット）。
  - `components/forms`: 入力フォームコンポーネント＋そのロジック（`number-input.ts` は「入力文字列→number」の純粋関数で、コンポーネント本体と分離されている）。
  - `components/charts`, `components/game`, `components/ui`: 用途別のプレゼンテーション層。
  - レイヤー間の依存方向は "UI（components）→ store → lib（simulation/game）→ schema" という単方向になっており、逆方向の依存（lib から components を import するなど）は確認できなかった。境界は概ね健全。
- リードドラフトの Code Style セクションは「命名・レイヤー構成は developer-agent のレビューで別途評価する」としており、本レビューがその役割を担う。上記の構成観測をそのまま `team-practices.md` の Code Style セクションへ統合することを推奨する。

### 2. 命名規約

- ファイル名: コンポーネントは PascalCase（`AssumptionsPanel.tsx`, `ScenarioBar.tsx`, `GameHud.tsx`）、非コンポーネントのロジックファイルは camelCase（`usePlanStore.ts`, `newLoan.ts`）または kebab-case（`number-input.ts`, `number-input.integration.test.ts`）が混在している。kebab-case はテスト種別（`.integration.test.ts`）の表現にも使われており、意図的な使い分けに見える。
- 変数・関数: camelCase（`sanitizeNumberDraft`, `normalizeNumberInput`, `updateSpouse`）、型・スキーマ: PascalCase 型名（`PlanInput`, `Snapshot`）＋camelCase スキーマ変数（`planInputSchema`, `personSchema`）という TypeScript/React 慣習に沿った一貫性がある。
- テストファイルは対象ファイルと同一ディレクトリに `<対象名>.test.ts(x)` として配置される colocation パターンが徹底されている（16件全て）。
- org.md の「language idiomatic（camelCase for JS/TS）」という原則に実態は整合しており、リードドラフトの命名観測に加える具体例として有用。

### 3. エラーハンドリング

- **重要な発見**: `src/` 配下の非テストコードに `try`/`catch` は一件も存在しない（`grep -rln "try {" / "catch" src` はテストファイルを除き0件）。construction フェーズガードレール（`phases/construction.md`）は「統合境界（API呼び出し、DB操作、ファイルI/O、外部サービス）には常にエラーハンドリングを含める」ことを求めているが、本プロジェクトは外部API/DBを持たず、統合境界は「localStorage 永続化」と「JSON.parse 相当のパース」に限られる。
- 実際の防御パターンは例外処理ではなく **zod の `safeParse` による検証** に一本化されている（`src/lib/store/usePlanStore.ts:263`, `:268`）。壊れた永続化データはエラーを投げずに `safeParse` の成否で分岐し、失敗時は既定値へフォールバックする設計。`schema.ts` 冒頭のコメントも「壊れたデータでクラッシュしないようにするため」と明言しており、意図的な方針と読める。
- 数値入力の異常系（空文字・符号のみ・小数点のみ）も例外ではなく `NormalizeResult.value: number | null` という戻り値の型で表現している（`number-input.ts`）。すなわち「例外ではなく型で異常系を表現する」がこのプロジェクトの支配的なエラーハンドリング慣習であり、`team-practices.md` の Code Style または新設の観点として明文化することを提案する。
- React の Error Boundary は未導入（`*error*` 名のファイルなし）。UI/UX audit-fix のスコープでエラーバウンダリ導入が必要になった場合は、既存の「例外を投げない」方針とどう整合させるか、インタビューで確認する価値がある。

### 4. コードスタイル慣習

- JSDoc 形式のブロックコメントで「方針（チケットID / QA番号付き）」を明記する慣習が徹底されている（`number-input.ts` 冒頭コメントが典型例: `方針（lp-012 / QA#1）:` の形で背景・意図・層の責務分担まで記述）。この「なぜ」を残すコメント文化は construction phase の可読性要求と整合し、team-practices.md の Code Style に加える価値がある。
- Prettier 設定ファイルは検出されず（リードドラフトの記載どおり）、ESLint も `next/core-web-vitals` / `next/typescript` の継承のみでカスタムルールなし。org.md の「フォーマッタ／リンタは既存プロジェクト設定に委ねる」方針と矛盾しない。
- 日本語コメント・日本語コミットメッセージの徹底（識別子は英語）が全域で一貫しており、コード内ドキュメンテーションの言語規約として明文化に値する。

## Positions

AGREE: Way of Working
AGREE: Walking Skeleton
AGREE: Testing Posture
AGREE: Deployment
OBJECT: Code Style — 「命名・レイヤー構成は developer-agent のレビューで別途評価する」とだけ記載され具体的な評価結果が空欄になっている。本レビューで得た（1）3層構成とレイヤー依存の単方向性、（2）ファイル/変数命名規約の実例、（3）例外を投げず zod `safeParse` と戻り値型で異常系を表現する支配的パターン、（4）チケットID付き方針コメントと日本語コメント慣習、を Step 5 の統合時に Code Style セクションへ明文的に反映すべき。
