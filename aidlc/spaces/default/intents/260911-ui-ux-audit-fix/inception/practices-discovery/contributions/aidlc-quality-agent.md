**Collaborator:** aidlc-quality-agent

## Contribution

リード（pipeline-deploy）ドラフトの記述を実ファイル（`vitest.config.ts`,
`package.json`, `.github/workflows/ci.yml`, `src/**/*.test.*`, `tsconfig.json`）
と突き合わせて検証した。事実関係はおおむね正確だが、テスト方針・カバレッジ
ツール・CI品質ゲートに関して、インタビューで明示的に決めておくべき点が
ドラフトの記述より多く残っている。

### 検証で確認した事実

- `vitest.config.ts` の `test.environment` は `"node"` であり、jsdom は
  グローバル設定ではなく `NumberField.test.tsx` 側で
  `// @vitest-environment jsdom` を個別指定して切り替えている。ドラフトの
  「`environment: node, jsdom 依存あり`」という書き方は、jsdom がテスト全体の
  既定環境であるかのように誤読されうる。実態は「既定は node、DOM が必要な
  テストだけ個別にjsdom化」というハイブリッド構成。
- `@testing-library/react` は **未導入**（`NumberField.test.tsx` 冒頭のコメント
  にも明記あり）。実際は `react-dom/client` の `createRoot` + 生DOMイベントで
  コンポーネントを検証する自前ハーネス。ドラフトの「React Testing Library
  相当の構成」という表現は、RTL的なクエリAPI（`getByRole`等）が使えると
  誤解させる。RTLは未導入という事実で書き直すべき。
- テストファイルは16件で分布の記述は正確（`lib/simulation`, `lib/game`,
  `lib/store`, `lib/`, `components/forms`）。ただし UI コンポーネント層の
  テストは `NumberField`/`number-input` 系の3ファイルのみで、他のUIコンポー
  ネント（フォーム部品以外の表示系コンポーネント）にはテストが無い。本
  ワークフローは `ui-ux-audit-fix`（UI/UX監査・修正）なので、変更対象になる
  可能性が高いコンポーネント層のテストカバレッジが薄いことは looking-ahead
  のリスクとして明記すべき。
- カバレッジ計測（`@vitest/coverage-v8` 等）は `package.json` の
  dependencies/devDependencies に存在せず、`vitest.config.ts` にも
  `coverage` セクションが無い。ドラフトの「カバレッジゲートは未導入」との
  結論は正しい。
- CI（`.github/workflows/ci.yml`）は `npm run test` と `npm run build` のみ。
  `npm run lint`（`next lint`）は package.json に定義済みだがCIでは呼ばれて
  いない。加えて **型チェック単体のステップも無い**（`tsc --noEmit` 等）。
  `tsconfig.json` は `strict: true` だが、CIの `next build` が型エラーを
  必ず fail させる設定になっているかは確認できていない（Next.js の
  `typescript.ignoreBuildErrors` 設定が無いことは確認済みなので通常は
  ビルド時に型エラーで落ちるはずだが、独立した速いフィードバックの型検査
  ステップは無い）。
- Test Strategy は `aidlc-state.md` で `Minimal`、かつ本ワークフローは
  `3.7 (ci-pipeline)` ステージを **SKIP** している。つまり、CI品質ゲート
  （lint・型チェック・カバレッジ閾値をCIに組み込むかどうか）を決め直す
  機会は、このステージ（practices-discovery）のインタビュー以外に
  ワークフロー内で残っていない。ここで「現状維持」と答えると、UI/UX監査で
  見つかった不備がCIで機械的に検出されないまま今後も推移する。

### インタビューで解消すべきギャップ（提案）

1. テストの実行環境: 「今後もコンポーネントテストは個別に `@vitest-environment
   jsdom` を指定する現行方式でよいか、それとも RTL 導入やグローバル jsdom
   化を検討するか」を確認する。
2. UI/UX監査修正で変更されるコンポーネントに対するテスト方針: 「UIの見た目・
   挙動を直す各修正について、少なくとも1つの回帰テスト（レンダリング確認
   または挙動確認）を追加することを必須とするか」を確認する
   （org.md の bugfix 系デフォルト「対象バグの回帰テスト必須」に相当する
   運用を、UI/UX修正という性質に合わせて明文化する）。
3. カバレッジ計測の導入要否: 現状ゼロなので、今回のスコープで新規導入する
   のか、導入は見送り既存テストのグリーン維持のみを求めるのかを明確に
   決める（Minimal戦略なら見送りが妥当な可能性が高いが、明示的な合意が
   必要）。
4. CIへのlint/型チェック組み込み: `npm run lint` と型チェックをCIに追加
   するかどうか。ci-pipelineステージがSKIPされるため、ここで決めないと
   本ワークフロー内で決める機会が無い。少なくとも「今回は追加しない」と
   いう判断であれば、その理由をevidence.mdに明記すべき。
5. テスト記述の正確性: `team-practices.md` の該当箇所は「RTL相当」ではなく
   「RTL未導入、react-dom/client による自前DOMハーネス」と書き直す
   （上記「検証で確認した事実」参照）。

## Positions

AGREE: Way of Working
AGREE: Walking Skeleton
OBJECT: Testing Posture — jsdomがグローバル既定であるかのような記述と
「React Testing Library 相当」という表現が実態（既定はnode、RTL未導入で
react-dom/client の自前ハーネス）と食い違っている。統合時に事実へ修正し、
UI/UX監査修正に対する回帰テスト要否・カバレッジ導入要否・CIへのlint/型
チェック組み込み（ci-pipelineがSKIPされるため今回が最後の機会）をインタ
ビューで明示的に決めるべき。
AGREE: Deployment
AGREE: Code Style
