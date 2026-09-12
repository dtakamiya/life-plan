# 技術スタック（life-plan）

## 言語

- **TypeScript** ^5.7.3（`tsconfig.json` で設定）

## フレームワーク・主要ライブラリ

| ライブラリ | バージョン | 用途 |
|---|---|---|
| `next` | ^15.1.6 | App Router によるページ構成、React Server/Client Components |
| `react` / `react-dom` | ^19.0.0 | UIレンダリング |
| `zustand` | ^5.0.3 | グローバル状態管理。`persist` ミドルウェアで `localStorage` 永続化 |
| `zod` | ^3.24.1 | 永続化データの検証（`safeParse`）。`src/lib/schema.ts` で使用 |
| `recharts` | ^2.15.0 | シミュレーション結果のグラフ描画（`src/components/charts/`） |
| `tailwindcss` | ^3.4.17 | スタイリング（ユーティリティCSS） |

## テスト・品質ツール

| ツール | バージョン | 用途 |
|---|---|---|
| `vitest` | ^3.0.2 | テストランナー。既定 `environment: "node"`、DOM必要時のみ `jsdom` を個別指定 |
| `jsdom` | ^26.0.0 | コンポーネントテスト用DOM環境 |
| `eslint` | ^9.18.0 | Lint（`next/core-web-vitals`, `next/typescript` を継承のみ） |

詳細なテスト構成・カバレッジ状況・CI構成は `code-quality-assessment.md` に
一本化して記録する（重複記載しない）。

## ビルドシステム

- **種別**: npm + Next.js CLI（`next dev` / `next build` / `next start`）。
- **設定ファイル**: `package.json`, `next.config.ts`, `tsconfig.json`,
  `postcss.config.mjs`, `tailwind.config.ts`, `eslint.config.mjs`,
  `vitest.config.ts`。

## 永続化・インフラ

- **永続化**: ブラウザの `localStorage` のみ（Zustand `persist` ミドルウェア
  経由）。外部データベース・外部APIは存在しない。
- **デプロイ**: `team.md` Deployment 方針により、手元ビルド後にローカル環境
  または自宅サーバーで運用。Vercel 等の外部ホスティング・CD パイプラインは
  未導入（`code-quality-assessment.md` の CI/CD 節も参照）。

## バージョン管理上の注意

`package.json` の依存はすべて `^` によるレンジ指定であり、正確な固定
バージョンは `package-lock.json` を参照する必要がある（本スキャンでは
`package.json` の宣言バージョンのみを記録）。
