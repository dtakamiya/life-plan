# Build Instructions — UI/UX 改善監査

## Dependency Installation

```
npm ci
```

追加の依存関係は今回導入していない（`@testing-library/react`は導入禁止、既存の`vitest`構成をそのまま使用）。

## Environment Setup

環境変数・追加設定ファイルは不要。既存の `next.config.ts`, `tailwind.config.ts`（`ink.mute`値のみ変更）, `tsconfig.json` をそのまま使用する。

## Build Commands

```
npm run build
```

Next.jsのビルド（型チェック・ESLintを含む）を実行する。

## Build Verification Steps

1. `npm run build` が終了コード0で完了することを確認する。
2. ビルド出力に型エラー・lintエラーが含まれないことを確認する。

## Troubleshooting

- 型エラーが出た場合: `fields.tsx`の`error`/`required` propsの型定義を確認する。
- ビルドが`ink.mute`関連のCSSで失敗する場合: `tailwind.config.ts`の該当行の構文を確認する。
