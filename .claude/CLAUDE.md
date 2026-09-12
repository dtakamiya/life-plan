# life-plan

ライフプランシミュレーションアプリ（Next.js）。

## 構成

- `components/`（UI）→ `store`（Zustand によるグローバル状態）→
  `lib/simulation` / `lib/game`（ドメインロジック）→ `lib/schema`（永続化検証）の
  単方向依存を維持する。逆方向の依存（`lib` から `components` を import する等）
  は行わない。

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

- `.github/workflows/ci.yml` で `npm run test`（vitest run）と `npm run build`
  を実行する。
