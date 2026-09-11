# Practices Discovery — Interview

## Sources

- [desc] Initial description: "UI/UXの改善点がないか分析を行い、改善点があれば実施して"
- リードドラフト（`team-practices.md` / `discovered-rules.md` / `evidence.md`）
- 支援エージェント3名のブラインドレビュー（`contributions/`）

## Questions

### Q1. ブランチ運用について — 現在は `main` 1本のトランクで、PRごとにスカッシュマージ（1PR=1コミット）されている実態が見えます。今後もこのやり方（トランクベース・スカッシュマージ）で良いですか？

- A. はい、このまま（トランクベース・スカッシュマージ）で良い
- B. いいえ、変更したい
- X. Other (please specify)

[Answer]: A. はい、このまま（トランクベース・スカッシュマージ）で良い（人間確認済み）

### Q2. ウォーキングスケルトンについて — 「ウォーキングスケルトン」とは、実機能を作り込む前に、まず最小限の一気通貫の処理を作って各部品がつながることを確認する進め方です。今回のような既存UIの改善作業で、最初にこのような足場作りステップを挟む必要がありますか？

- A. 不要。通常のBoltとして進めてよい（今回はUI改修であり新規の一気通貫フローは存在しないため）
- B. 必要
- X. Other (please specify)

[Answer]: A. 不要。通常のBoltとして進めてよい（今回はUI改修であり新規の一気通貫フローは存在しないため）

### Q3. テストの実行環境について — 現状、テストは主に `node` 環境で動いており、画面コンポーネントのテストは `@testing-library/react` を使わず、素のDOM操作で書かれています。この方針を継続しますか？

- A. 継続する（軽量な自前DOMハーネスのままでよい）
- B. `@testing-library/react` を導入し、コンポーネントテストの書き方を標準化したい
- X. Other (please specify)

[Answer]: A. 継続する（軽量な自前DOMハーネスのままでよい）

### Q4. UI変更に対する回帰テストについて — 今回UI/UXの改善（見た目・操作性・アクセシビリティの修正）を行いますが、変更した箇所について自動テストで壊れていないことを確認する必要がありますか？

- A. 必要。変更したコンポーネントについては既存の書き方（自前DOMハーネス）でテストを追加/更新する
- B. 不要。目視確認で十分
- X. Other (please specify)

[Answer]: A. 必要。変更したコンポーネントについては既存の書き方（自前DOMハーネス）でテストを追加/更新する

### Q5. テストカバレッジの数値目標について — 現状カバレッジ計測ツールは未導入です。今回の改修で数値目標（例: 80%）を設けますか？

- A. 設けない。既存テストが通っていることを維持すれば十分（このワークフローのテスト戦略はMinimal）
- B. 数値目標を設けたい
- X. Other (please specify)

[Answer]: B. 数値目標を設けたい（80%）

### Q6. CIへのlint・型チェックの組み込みについて — 現在CIでは `npm run test` と `npm run build` のみ実行され、ESLintや型チェックの単体ステップはありません。今回のワークフロー内でCIにlint/型チェックを追加しますか？

- A. 追加しない（今回のスコープ外。CI Pipelineステージ自体もこのワークフローではSKIPされている）
- B. 追加したい
- X. Other (please specify)

[Answer]: A. 追加しない（今回のスコープ外。CI Pipelineステージ自体もこのワークフローではSKIPされている）

### Q7. エラーハンドリングの方針について — 実装調査の結果、このコードベースには `try`/`catch` を使うパターンがほぼ無く、代わりに zod の `safeParse`（成功/失敗を戻り値で判定）や `number | null` のような戻り値で異常系を表現する方針が徹底されています。この方針をチームのコードスタイルとして明文化してよいですか？

- A. はい。「例外を投げず、戻り値の型（`safeParse` の結果や `null` 許容型）で異常系を表現する」を明文化する
- B. いいえ、別の方針にしたい
- X. Other (please specify)

[Answer]: A. はい。「例外を投げず、戻り値の型（`safeParse` の結果や `null` 許容型）で異常系を表現する」を明文化する

### Q8. セキュリティ関連のCIチェック（SAST・シークレットスキャン・依存関係の脆弱性スキャン）について — 現状CIには組み込まれていません。今回のワークフローで追加しますか？

- A. 追加しない（個人向け内部ツールであり、今回のスコープ外）
- B. 追加したい
- X. Other (please specify)

[Answer]: A. 追加しない（個人向け内部ツールであり、今回のスコープ外）

### Q9. デプロイ方式について — リポジトリ内にデプロイ設定ファイル（`vercel.json`等）が見つからず、実際のデプロイ手段は証拠から判定できませんでした。現在どのようにデプロイしていますか？

- A. Vercel等のホスティングサービスでGit連携による自動デプロイ
- B. 手元でビルドしてローカル/自宅サーバーで動かしている
- C. Not applicable（まだ本番デプロイはしていない）
- X. Other (please specify)

[Answer]: B. 手元でビルドしてローカル/自宅サーバーで動かしている

## Assumptions & Open Questions

None.

## Consolidated Summary Confirmation

- Way of Working: トランクベース・スカッシュマージを継続
- Walking Skeleton: 不要（通常のBoltとして進める）
- Testing Posture: 既存の自前DOMハーネス（node環境）を継続。UI変更箇所には回帰テストを追加。カバレッジ目標は80%
- Deployment: 手元ビルドしてローカル/自宅サーバーで運用
- Code Style: 例外を投げず戻り値の型で異常系を表現する方針を明文化
- CI（lint/型チェック/セキュリティスキャン）の追加: 今回のスコープ外

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
