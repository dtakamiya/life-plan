# Build Instructions — start-end-year-validatio

## Dependency Installation

```bash
npm ci
```

（既存の `package-lock.json` に基づく再現可能インストール。新規依存は今回追加していない。）

## Environment Setup

- 環境変数・追加の設定ファイルは不要（完全クライアントサイドアプリ、`.env` 等の新規追加なし）。
- Node.js は既存の CI 設定（`.github/workflows/ci.yml`）に準拠。

## Build Commands

```bash
npm run build
```

（`next build`。App Router のプロダクションビルド。）

## Build Verification Steps

1. `npm run build` が exit code 0 で完了すること。
2. ビルド出力に今回変更したページ（`/`, `/game`）のルートが含まれること。
3. 型エラーがないこと（Next.js のビルドは内部で型チェックを実行する。加えて `npx tsc --noEmit` で明示確認する）。

## Troubleshooting Common Build Issues

- 型エラーが出た場合、`src/lib/store/usePlanStore.ts` の `mergePersistedPlanState` ジェネリック型（`RestoredPersistFragment`）周辺を優先的に確認する（今回のスコープでの変更点）。
- 既存の `src/components/charts/chart-aria.test.tsx` の型エラーは本スコープ変更前から存在する既知の未着手事項であり、ビルド（`next build`）には影響しない（テストファイルは型チェック対象外）。
