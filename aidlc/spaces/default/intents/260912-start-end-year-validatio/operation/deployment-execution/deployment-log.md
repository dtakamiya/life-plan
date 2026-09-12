# Deployment Log — start-end-year-validatio

## デプロイ方式

本プロジェクトは自動デプロイパイプラインを持たない（`team.md` Deployment方針）。デプロイは、ユーザー自身が手元でビルドし、ローカル環境または自宅サーバーで起動する手動プロセスである。

## 実施した検証手順

1. `npm run build`（`next build`）を実行し、プロダクションビルドが成功することを確認（Build and Testステージで確認済み、`build-and-test/test-results.md` 参照）。
2. `npm run start -- -p 4173` でプロダクションビルドをローカル起動し、以下2ルートへの疎通を確認:
   - `http://localhost:4173/`（メインシミュレーター画面）
   - `http://localhost:4173/game`（人生ゲーム画面）
3. 検証後、起動したプロセスを停止（本番稼働への影響なし）。

## 実際のユーザー手順（本番運用時）

```bash
npm ci
npm run build
npm run start
```

（または `npm run build` 後、静的ホスティングではなく `next start` によるNode.jsサーバー起動、もしくは自宅サーバー上での同等の起動手順。既存の運用方式に変更はない。）

## 変更内容

今回のインテント（issue #14）による変更は、既存のアプリケーションコード（`src/`）への修正のみであり、デプロイ手順・インフラ構成そのものには一切変更がない。
