# Evidence

## Sources

本ワークフローのスコープ（`ui-ux-audit-fix`）は reverse-engineering ステージ
（2.1）をSKIPしているため、reverse-engineering成果物は存在しない。リード
（`aidlc-pipeline-deploy-agent`）および3つの支援エージェント
（`aidlc-quality-agent`, `aidlc-developer-agent`, `aidlc-devsecops-agent`）が、
それぞれ独立に以下を調査した。

- `package.json`（依存関係・npm scripts）
- `.github/workflows/ci.yml`（CIパイプライン定義）
- `vitest.config.ts`（テスト構成、`test.environment: "node"`）
- `eslint.config.mjs`（Lint構成）
- `tsconfig.json`（TypeScript設定）
- `git log` / `git branch -a`（コミット履歴・ブランチ運用）
- `src/**/*.test.{ts,tsx}`（テストファイルの分布・内容、16件）
- `src/` 配下の実装コード（`grep -rln "try {"` で例外処理パターンを確認）
- デプロイ関連設定ファイル・`.prettierrc*`・`.github/dependabot.yml` の有無
  （いずれも未検出）
- `aidlc/spaces/default/memory/org.md`（フレームワークデフォルト）

`aidlc/spaces/default/memory/team.md`, `project.md` はいずれも空のテンプレート
であり、再実行時の既存合意内容は無い（初回のディスカバリー）。

## 各参加者の調査・推論

### リード（aidlc-pipeline-deploy-agent）

- CI・テスト設定・ブランチ運用・コミット履歴から、トランクベース・スカッシュ
  マージへの移行を示唆する証拠を確認。デプロイ設定は未検出のためorg.mdの
  デフォルトを仮案として提示した。

### aidlc-quality-agent

- `vitest.config.ts` の実態は「既定は `node`、DOMが必要なテストだけ個別に
  `@vitest-environment jsdom` を指定するハイブリッド構成」であり、
  リードドラフトの「jsdom依存あり」という書き方は誤読を招くと指摘し、修正した。
- `@testing-library/react` は**未導入**であり、`react-dom/client` の
  `createRoot` + 生DOMイベントによる自前ハーネスであることを確認（ドラフトの
  「RTL相当」という表現は誤り）。
- UIコンポーネント層のテストが `NumberField`/`number-input` 系の3ファイルに
  限られ、他の表示系コンポーネントにテストが無い点を、UI/UX監査で変更対象に
  なりうるリスクとして指摘。
- CIにlint・型チェック単体ステップが無いこと、Test Strategyが `Minimal` かつ
  `ci-pipeline` ステージがSKIPされるため、CI品質ゲートを決め直す機会が本
  ステージのインタビュー以外に無いことを指摘し、Q6として明示的に確認した。

### aidlc-developer-agent

- `components → store → lib(simulation/game) → schema` という単方向のレイヤー
  依存を確認（逆方向依存なし）。
- ファイル/変数命名規約（コンポーネントはPascalCase、ロジックはcamelCase/
  kebab-case、テストはコロケーション）を実例とともに確認。
- **重要な発見**: `src/` 配下の非テストコードに `try`/`catch` が一件も無く、
  zodの `safeParse` および `number | null` のような戻り値の型で異常系を表現する
  方針が支配的であることを確認。これをQ7でチームに明文化の可否を確認した。
- チケットID・QA番号付きのJSDocコメント慣習、日本語コメント・コミット
  メッセージの徹底を確認。

### aidlc-devsecops-agent

- SAST・シークレットスキャン・依存関係脆弱性スキャン（`npm audit`,
  Dependabot等）がCIに一切組み込まれていないことを確認。
- 本アプリは外部公開APIを持たない静的な家計シミュレーションSPAであり、DAST
  は対象外と判断。
- 上記のセキュリティCIチェック追加要否をQ8でチームに確認した。

## インタビュー決定事項

- Q1 ブランチ運用: トランクベース・スカッシュマージを継続。
- Q2 ウォーキングスケルトン: 不要（通常のBoltとして進める）。
- Q3 テスト実行環境: 継続（node環境・自前DOMハーネス、`@testing-library/react`
  は導入しない）。
- Q4 UI変更への回帰テスト: 必須（既存の書き方でテストを追加/更新する）。
- Q5 テストカバレッジ目標: 80%を設ける（現状カバレッジ計測は未導入のため、
  今回のスコープでの計測ツール導入が前提になる）。
- Q6 CIへのlint/型チェック追加: 今回は追加しない（スコープ外。`ci-pipeline`
  ステージ自体がSKIPされているため）。
- Q7 エラーハンドリング方針: 例外を投げず、戻り値の型（`safeParse` の結果や
  `null` 許容型）で異常系を表現する方針を明文化する。
- Q8 セキュリティ関連CIチェック（SAST/シークレット/依存関係スキャン）追加:
  今回は追加しない（個人向け内部ツールでありスコープ外）。
- Q9 デプロイ方式: 手元でビルドしてローカル/自宅サーバーで運用している。

## 残る未解決の不確実性

- **カバレッジ計測ツールの選定・導入方法**: 80%目標は合意したが、
  `@vitest/coverage-v8` 等どのプロバイダをどう導入するかは本ステージの
  スコープ外であり、後続のテスト実装・CI関連の作業で具体化する。
- **CI拡張（lint/型チェック/セキュリティスキャン）**: 今回のワークフローの
  スコープ外と明示的に合意した。将来的にCI Pipelineステージを実行する別
  ワークフローで再検討する対象として残す。
- **マージ方式が現在の運用として定着した経緯**: 履歴上スカッシュマージへの
  移行は確認できるが、GitHub側の既定設定変更によるものか明示的な合意による
  ものかは今回のインタビューでは深掘りしておらず、実務上の影響は無いため
  未解決のまま残す。
