# Team Practices

## Way of Working

- `main` を単一のトランクとするトランクベース開発を継続する。フィーチャーブランチは
  `feature/*`, `refactor/*`, `feat/lp-*` のような短命な命名で作成し、1〜2日程度で
  マージする。
- PR は **スカッシュマージ**とする（1PR = `main` 上の1コミット）。PR #5 以降の履歴
  （`lp-006` 以降）で既にこの運用へ移行しており、今回のインタビューでこの現状運用を
  継続することを明示的に確認した。
- コミットメッセージは `lp-XXX: <日本語の要約>（QA#N）(#PR番号)` のように、チケット
  ID と日本語要約を組み合わせる慣習を維持する。

## Walking Skeleton

- 本プロジェクトでは、既存UI改修のような「新規の一気通貫フローを持たない」作業に
  ウォーキングスケルトン（実機能の前に最小限の一気通貫処理を作る進め方）は不要と
  判断する。通常のBoltとして進める。
- 新規に大きなドメイン機能（一気通貫の新フロー）を追加する際は、都度この方針を
  見直す。

## Testing Posture

- **Methodology**: test-after
- **Ordering**: 各層（`lib/simulation` などの計算ロジック → `lib/store` の状態管理 →
  `components/*` のUI）を実装したのち、その層に対するテストを同一ディレクトリに
  `<対象名>.test.ts(x)` として追加・実行する（コロケーション徹底）。
- テスト実行環境は `vitest` を使用し、既定は `environment: "node"`。DOM が必要な
  コンポーネントテストのみファイル冒頭で `// @vitest-environment jsdom` を個別指定
  するハイブリッド構成を維持する。**`@testing-library/react` は導入しない** —
  `react-dom/client` の `createRoot` と生DOMイベントによる自前ハーネスをそのまま
  継続する。
- UI/UXの見た目・操作性・アクセシビリティを修正した箇所には、既存の書き方（自前
  DOMハーネス）で回帰テスト（レンダリング確認または挙動確認）を必ず追加・更新する。
- テストカバレッジの数値目標は **80%** とする。現状カバレッジ計測ツール
  （`@vitest/coverage-v8` 等）は未導入のため、今回のスコープで導入を検討する。
- CI（`.github/workflows/ci.yml`）は `npm run test`（vitest run）と `npm run build`
  を実行する。lint・型チェック単体ステップ・カバレッジ閾値のCI組み込みは、今回の
  ワークフロー（`ci-pipeline` ステージはSKIP）のスコープ外とする。

## Deployment

- **手元でビルドし、ローカル環境または自宅サーバーで運用する**。Vercel 等の
  ホスティングサービスによる自動デプロイは使用しない。
- ステージング/本番の環境分離、CD パイプラインは現時点で導入していない。将来
  外部公開・複数人利用を伴う運用へ移行する際に改めて検討する。

## Code Style

- レイヤー構成は `components`（UI）→ `store`（Zustand によるグローバル状態）→
  `lib/simulation` / `lib/game`（ドメインロジック）→ `lib/schema`（永続化検証）の
  単方向依存を維持する。逆方向の依存（`lib` から `components` を import する等）
  は行わない。
- 命名規約: コンポーネントファイルは PascalCase、非コンポーネントのロジック
  ファイルは camelCase または kebab-case（テスト種別の表現に `.integration.test.ts`
  のように利用）。変数・関数は camelCase、型・zodスキーマは型名 PascalCase +
  スキーマ変数 camelCase という TypeScript/React の慣習に従う。
- **エラーハンドリング方針: 例外を投げず、戻り値の型で異常系を表現する。**
  永続化データの検証は zod の `safeParse` の成否で分岐し、失敗時は既定値へ
  フォールバックする。数値入力等の異常系（空文字・符号のみ等）は
  `value: number | null` のような null 許容型の戻り値で表現する。`try`/`catch`
  による例外処理は使わない。
- 方針や意図（チケットID・QA番号付き）を JSDoc 形式のブロックコメントで残す
  慣習を継続する。コード内コメント・コミットメッセージは日本語、識別子は英語と
  する言語規約を維持する。
- フォーマッタは Prettier 等を個別導入せず、ESLint（`next/core-web-vitals`,
  `next/typescript` の継承のみ、カスタムルールなし）に委ねる既定を維持する。
