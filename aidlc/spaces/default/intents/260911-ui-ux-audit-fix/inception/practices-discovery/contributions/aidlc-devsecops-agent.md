**Collaborator:** aidlc-devsecops-agent

## Contribution

セキュリティ観点（lint/format ルール、SAST/DAST、シークレット・依存関係スキャン、サプライチェーン管理）でリードドラフトと実際の設定を突き合わせた結果を報告する。

### Lint / Format ルール

- `eslint.config.mjs` は `next/core-web-vitals`, `next/typescript` を継承する Next.js 標準構成のみで、セキュリティ寄りのルール（例: `eslint-plugin-security`、`no-eval`、`no-unsanitized` 系）は導入されていない。本プロジェクトはクライアント側計算アプリで外部入力面が小さいため優先度は低いが、`dangerouslySetInnerHTML` や `eval` 系APIの使用を防ぐ最低限のルールは安価に追加できる。
- CI（`.github/workflows/ci.yml`）は `npm run test` と `npm run build` のみを実行し、`npm run lint` を呼んでいない。`package.json` には `lint` スクリプトが存在するため、**CIでlintが実行されていないのは明確なギャップ**であり、リードドラフトの Testing Posture セクションでも指摘されている通り事実確認は一致する。ただし現時点では「discovered-rules」に反映されておらず、インタビューで明示的な方針確認（意図的か抜け漏れか）が必要。
- Prettier 等のフォーマッタ設定ファイルは存在しない。フォーマット未整備自体はセキュリティリスクではないが、コードレビューでの差分ノイズを減らす観点では改善余地。

### SAST / DAST

- SAST（CodeQL、Semgrep、SonarQube等）はCIに一切組み込まれていない。GitHub Actions ワークフローは `test-and-build` ジョブのみで、コードスキャンジョブは存在しない。
- DASTは対象外と判断する。本アプリはサーバーサイドAPIや外部公開エンドポイントを持たない静的な家計シミュレーションSPA（Next.js + Zustand、ローカル計算のみ）であり、動的スキャン対象となる稼働中サーバーが確認できない。ただしデプロイ方式が証拠から未確定（evidence.md の未解決事項1）であるため、実際にサーバーサイドAPIルート（`app/api/*` 等）が存在するかは要再確認。
- 現状GitHubの標準セキュリティ機能（Dependabot alerts, CodeQL default setup, secret scanning）が有効化されているかはリポジトリ設定（`.github/`配下にワークフロー以外の設定なし）からは判別できない。`.github/dependabot.yml` は未検出。

### シークレット管理

- リポジトリ内に `.env` 等のハードコードされた認証情報ファイルは確認されなかった。`.gitignore` の内容は今回未確認だが、`package.json` の依存関係からは外部APIキーを要するサービス（決済、認証基盤等）への依存は見当たらない。
- シークレットスキャン（GitHub Secret Scanning, gitleaks, trufflehog等）のCI組み込みは確認できない。現状の依存関係を見る限り緊急性は低いが、将来的な外部API連携（家計データの外部同期等）を見据えるなら早期導入が望ましい。

### 依存関係・サプライチェーン管理

- `package.json` の依存は少数（`next`, `react`, `react-dom`, `recharts`, `zod`, `zustand` + devDependencies）で、いずれも著名なOSSパッケージ。lockfile（`package-lock.json`推定、`npm ci`使用のため存在するはず）による再現可能インストールは行われている。
- 依存関係の脆弱性スキャン（`npm audit` のCI組み込み、Dependabot、Snyk、GitHub Advanced Security）は現状のCIワークフローに含まれていない。`npm audit --audit-level=high` 等の軽量チェックをCIに追加するコストは低く、投資対効果が高い。
- Dependabot設定ファイル（`.github/dependabot.yml`）は未検出。依存更新は手動運用と推測される。
- サプライチェーン署名検証（npm provenance、SBOM生成）は未導入。プロジェクト規模・スコープ（UI/UX監査・修正）を踏まえると現時点でSBOM必須化は過剰と考えるが、`npm audit` 導入程度は本スコープでも現実的な最小ラインとして提案したい。

### リードドラフトへの補足

- Testing Posture セクションの「lintがCIに含まれていない」という事実認識はリードと一致する。加えて、SAST・依存関係スキャン・シークレットスキャンのいずれもCIに存在しない点を新たな事実として追加する。
- Code Style セクションはESLintのベースルールのみ言及しているが、セキュリティ寄りの静的解析（SAST）は範囲外として扱われており、区別して評価する必要がある。
- 本ワークフローのスコープが `ui-ux-audit-fix`（UI/UX監査・修正）である点を踏まえると、SAST/依存関係スキャンの本格導入をこのインテントの必須要件にするのは過剰である可能性が高い。ただし「discovered-rules」や `project.md` の `Forbidden` に、既存のセキュリティ欠如状態（lintやSASTが未導入であること）を"現状追認"する形で書き込むべきではない。インタビューでは「今回のスコープでlintをCIに追加するか」を明示的に確認することを推奨する。

## Positions

AGREE: Way of Working
AGREE: Walking Skeleton
OBJECT: Testing Posture — lint未実行の事実指摘は正しいが、SAST・シークレットスキャン・依存関係脆弱性スキャンがCIに一切存在しない点への言及が欠けている。セキュリティ観点の評価はTesting Postureとは別軸として`evidence.md`の「調査で判明した具体的事実」に追記すべき。
AGREE: Deployment
OBJECT: Code Style — ESLint構成の記述はNext.js標準ルールの継承のみに留まり、セキュリティ寄りの静的解析（SAST、`eslint-plugin-security`等）が導入されていないという評価軸が抜けている。Code Styleとセキュリティ静的解析は別ものとして評価軸を分離した方がインタビューで実態確認しやすい。
