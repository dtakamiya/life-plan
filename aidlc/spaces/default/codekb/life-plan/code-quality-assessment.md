# コード品質評価（life-plan）

## テストカバレッジ

- **テストディレクトリ**: 専用の `tests/` は無く、`src/**` にソースと
  コロケーションされた `*.test.ts(x)` / `*.integration.test.ts` が多数存在
  （テスト対象とほぼ1:1）。
- **テストフレームワーク**: Vitest。既定 `environment: "node"`、DOM 依存
  コンポーネントのみファイル冒頭で `// @vitest-environment jsdom` を個別指定
  するハイブリッド構成（`team.md` Testing Posture と一致）。
  `@testing-library/react` は意図的に未導入 — `react-dom/client` の
  `createRoot` と生DOMイベントによる自前ハーネスを使用（`project.md`
  Forbidden 規約）。
- **カバレッジ計測**: `@vitest/coverage-v8` 等は `package.json` に未導入。
  数値目標（80%）は `team.md` に記載されているが、今回のスコープでは計測
  導入は対象外（`ui-ux-audit-fix` 時点からの継続事項）。

## Linting

- ESLint（`eslint.config.mjs`）— `next/core-web-vitals`, `next/typescript` を
  継承するのみでカスタムルールなし。

## CI/CD

- `.github/workflows/ci.yml` — `push`/`pull_request`（`main` 対象）で
  `npm ci` → `npm run test`（`vitest run`）→ `npm run build` のみ実行。
  lint・型チェック単体ステップ、カバレッジ閾値ゲート、デプロイステップは
  含まれない（`team.md` の記述と一致。`project.md` Forbidden 規約によりこの
  ワークフローのスコープでは追加しない）。

## ドキュメント

- `README.md` は Next.js 標準の create-next-app 由来の簡易な内容。
- ドメインロジックには JSDoc 形式のブロックコメントが日本語で多数付与され、
  意図・チケットID（`lp-XXX`）・QA番号を記録する慣習が徹底されている
  （例: `engine.ts`, `NumberField` のコメント）。

## Technical Debt Signals（唯一の所有箇所 — 他ファイルはここを参照）

### 1. 開始年 > 終了年の未検証（issue #14 の直接原因）

- `PlanInput.startYear` / `endYear`（`src/lib/simulation/types.ts:102-103`）に
  大小関係の制約がない。
- `planInputSchema`（`src/lib/schema.ts:78-89`）も各フィールドを独立に
  `z.number().int()` で検証するのみで、`endYear >= startYear` の相互検証は
  実装されていない。参考実装として `assetSchema`（`schema.ts:63-76`）が
  `.transform`/`.refine` パターンを既に使用しており、同様の設計を適用できる。
- UI側（`src/components/forms/HouseholdForm.tsx:190-203`）の「開始年」
  「終了年」入力は、`NumberField` に用意されている `error` prop
  （`src/components/forms/fields.tsx:99-167`、aria-invalid 連携込みで実装済み）
  を一切使わず、単純に `usePlanStore().setRange` を呼ぶだけになっている。

### 2. サイレントな空結果の伝播経路

- `runSimulation`（`src/lib/simulation/engine.ts:103`）は
  `for (let year = startYear; year <= endYear; year++)` というループで、
  `startYear > endYear` なら1回も実行されず `results = []` を返す
  （例外もエラーも発生しない）。
- 呼び出し元 `src/app/page.tsx:109` の `results` がそのまま `Summary`
  （同ファイル 38-39行目、`results.length === 0` で `return null`）、
  `ResultTable`（`results=[]` なら `<tbody>` が空）、各チャート
  （`NetWorthChart` 等）に渡り、すべて「何も表示しない」形で沈黙する。
  ユーザーへの通知は一切ない。

### 3. ゲームモードにも同型の潜在バグ

- `src/lib/game/stages.ts:64-65` の `while (cursorYear <= endYear)` も同じ
  前提（`startYear <= endYear`）に依存しており、逆転入力時は空のステージ
  リストになりうる。issue #14 の対象はメインシミュレーターだが、同一の入力元
  `input.startYear/endYear` を共有するため、修正時の影響範囲として記録する。

### 4. エラー表現方針との整合（修正設計への示唆）

- `project.md` の Mandated 規約「異常系は例外ではなく戻り値の型で表現する」
  「zod の `safeParse` の成否や `null` 許容型を使う」と、`fields.tsx` に
  既に実装済みの `error` prop（aria-invalid + role="alert" 表示）の組み合わせ
  を使えば、`try`/`catch` を導入せずに issue #14 を解消できる素地がある。

### 5. 他の既知の逆転しうる範囲チェックの欠如（参考、issue #14 の直接対象外）

- `Person.retirementAge` と `pensionStartAge` の大小関係、`Loan.startYear +
  termYears` の妥当性なども同様に未検証だが、今回のスコープ（bugfix,
  Minimal depth）では対象外として記録するに留める。

## 修正時の留意点（Handoff）

- `HouseholdForm.tsx` にバリデーションエラー表示を追加する場合、`NumberField`
  の `error` prop は既存のUI/アクセシビリティ規約（`project.md` Mandated:
  回帰テストを自前DOMハーネスで追加）に沿って実装でき、新規パターンの導入は
  不要。
- 自動補正（例: 終了年を開始年に合わせる）を選ぶ場合、`src/lib/game/stages.ts`
  のゲームモード側の同型ループにも波及するかどうかを Requirements Analysis /
  Domain Design 以降で判断する必要がある（本スキャンでは事実の記録に留め、
  設計判断はしていない）。
- テストは `team.md` の Testing Posture（test-after、`lib/simulation` →
  `lib/store` → `components/*` の順でコロケーション、`vitest`、
  `@testing-library/react` 不使用）に厳密に従う必要がある。
