# Smoke Test Results — start-end-year-validatio

## 実施日時

2026-09-12（プロダクションビルドのローカル起動確認）

## テスト結果

| # | 確認項目 | 期待結果 | 実際の結果 | 判定 |
|---|---|---|---|---|
| 1 | `npm run build` の成功 | exit code 0 | exit code 0（Build and Testステージで確認済み） | Pass |
| 2 | `npm run start` によるサーバー起動 | エラーなく起動 | `✓ Ready in 429ms` | Pass |
| 3 | `GET /`（メインシミュレーター画面）への疎通 | HTTP 200 | HTTP 200 | Pass |
| 4 | `GET /game`（人生ゲーム画面）への疎通 | HTTP 200 | HTTP 200 | Pass |

## issue #14 の手動確認（回帰の再現不可であることの確認）

ユニットテスト（`dateRange.test.ts`, `usePlanStore.test.ts`）で開始年>終了年の自動補正ロジックは検証済み（`build-and-test/test-results.md` 参照）。本スモークテストではアプリケーションが起動しページが表示されることのみを確認し、ロジックの詳細動作確認はユニットテストの守備範囲とする。

## 総合判定

**Pass** — すべての確認項目が合格。デプロイ（手元ビルド・起動）に支障となる問題は検出されなかった。
