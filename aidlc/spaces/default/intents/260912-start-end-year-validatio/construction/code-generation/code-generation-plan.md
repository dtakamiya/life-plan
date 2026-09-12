# Code Generation Plan — start-end-year-validatio（issue #14）

## Sources

- `requirements.md`（FR1〜FR4, NFR1〜NFR3, C1〜C4）
- codekb: `architecture.md`, `code-structure.md`, `code-quality-assessment.md`

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "各層（`lib/simulation` などの計算ロジック → `lib/store` の状態管理 →",
  "scope": "bugfix",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: 各層（`lib/simulation` などの計算ロジック → `lib/store` の状態管理 →\n  `components/*` のUI）を実装したのち、その層に対するテストを同一ディレクトリに\n  `<対象名>.test.ts(x)` として追加・実行する（コロケーション徹底）。\n- テスト実行環境は `vitest` を使用し、既定は `environment: \"node\"`。DOM が必要な\n  コンポーネントテストのみファイル冒頭で `// @vitest-environment jsdom` を個別指定\n  するハイブリッド構成を維持する。**`@testing-library/react` は導入しない** —\n  `react-dom/client` の `createRoot` と生DOMイベントによる自前ハーネスをそのまま\n  継続する。\n- UI/UXの見た目・操作性・アクセシビリティを修正した箇所には、既存の書き方（自前\n  DOMハーネス）で回帰テスト（レンダリング確認または挙動確認）を必ず追加・更新する。\n- テストカバレッジの数値目標は **80%** とする。現状カバレッジ計測ツール\n  （`@vitest/coverage-v8` 等）は未導入のため、今回のスコープで導入を検討する。\n- CI（`.github/workflows/ci.yml`）は `npm run test`（vitest run）と `npm run build`\n  を実行する。lint・型チェック単体ステップ・カバレッジ閾値のCI組み込みは、今回の\n  ワークフロー（`ci-pipeline` ステージはSKIP）のスコープ外とする。"
    },
    {
      "layer": "project",
      "text": "- zustand v5 の persist は、node 環境（vitest 既定）で storage getter（例: () => localStorage）が例外を投げると merge オプションを一切呼び出さない実装になっている。永続化復元ロジック（merge）を直接テストしたい場合は、localStorage を直接モックするのではなく、merge ロジックを環境非依存の純粋関数として切り出し、それを直接呼び出してテストすること。 (learned 2026-09-12)"
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Include a targeted regression for the bug or vulnerability.",
      "Keep the existing test suite green."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c12a17c47b6d3d913892f409e060d7d05f95a530f4b630f2316877a3a78aad55",
  "contract_sha256": "sha256:7c459e724883e3f0bc1733768ad3d9c551b833849e6a8ee215035a4551db05da"
}
```

## Implementation Steps

適用外レイヤー（Data model/database, Repository/data access, API/endpoint）は本プロジェクトの構成上存在しない（クライアントサイドSPA、DB・APIなし）ため省略し、Business logic層とFrontend behavior層のみを対象とする。

- [x] Step 1: 既存のテストランナー構成を確認し、ユニットスコープの実行コマンドを記録する（`unit-test-instructions.md` 参照）。
- [x] Step 2: Business logic — `src/lib/schema.ts` の `planInputSchema` に、`startYear`/`endYear` の相互検証を追加する純粋関数 `correctDateRange`（`src/lib/simulation/dateRange.ts` 新規作成）を実装する。`endYear - startYear < 1` の場合、`endYear = startYear + 1` に補正した値と `corrected: boolean` を返す（例外を投げない）。[FR1.1, FR1.2, Follow-up Q1]
  - トレーサビリティ: FR1.1, FR1.2 → `src/lib/simulation/dateRange.ts`
- [x] Step 3: Business logic — `correctDateRange` のテストを同一ディレクトリに `dateRange.test.ts` として作成・実行する（コロケーション、test-after）。
- [x] Step 4: Business logic — `src/lib/store/usePlanStore.ts` の `setRange` アクションを修正し、`correctDateRange` を呼び出して内部状態の `endYear` を補正値で更新する。合わせて、補正が行われたかを示すフラグ（例: `rangeAutoCorrected: boolean`）をストアに保持する。[FR1.4, Follow-up Q4]
  - トレーサビリティ: FR1.4 → `src/lib/store/usePlanStore.ts`
- [x] Step 5: Business logic — `usePlanStore` の永続化データ復元処理（`persist` の `onRehydrateStorage` またはストア初期化時）に `correctDateRange` を適用し、復元時にも同じ補正・フラグ設定を行う。[FR1.3, Follow-up Q5]
  - トレーサビリティ: FR1.3 → `src/lib/store/usePlanStore.ts`
- [x] Step 6: Business logic — `usePlanStore` 関連のテストを更新し、`setRange` の補正ロジックと復元時補正のテストを `usePlanStore.test.ts` に追加・実行する（コロケーション、test-after）。この工程が今回のissueに対する的を絞った回帰テストを兼ねる。[targeted regression]
- [x] Step 7: Frontend behavior — `src/components/forms/HouseholdForm.tsx` の終了年 `NumberField` に、`usePlanStore` の `rangeAutoCorrected` フラグを購読して `error` prop（aria-invalid連携）で注意文言（「終了年を自動調整しました」等）を表示する接続を実装する。[FR2.1, FR2.2]
  - トレーサビリティ: FR2.1, FR2.2 → `src/components/forms/HouseholdForm.tsx`
- [x] Step 8: Frontend behavior — `HouseholdForm.tsx` の変更に対する回帰テストを `HouseholdForm.test.tsx`（または既存の関連テストファイル）に自前DOMハーネスで追加・実行する（`project.md` Mandated: UI/UX修正には回帰テスト必須）。
- [x] Step 9: Frontend behavior — `src/lib/game/stages.ts` の `while (cursorYear <= endYear)` ロジックが、FR3.1で一本化された補正済み `startYear`/`endYear`（`usePlanStore` 経由）を使うことを確認する。フォーム/ストア層の補正により人生ゲーム側は自動的に保護される想定のため、コード変更は不要な見込みだが、念のため該当箇所を確認し、必要であれば直接的な二重ガードを避けつつ確認コメントを残す。[FR3.1, FR3.2]
- [x] Step 10: Frontend behavior — 結果が空の場合の共通メッセージ表示を、`src/app/page.tsx` の `Summary`/`ResultTable`/各チャート呼び出し箇所に追加する。`results.length === 0` の場合に「表示できる結果がありません」等の共通メッセージコンポーネントを表示する。[FR4.1, FR4.2]
  - トレーサビリティ: FR4.1 → `src/app/page.tsx`
- [x] Step 11: Frontend behavior — Step 10の変更に対する回帰テストを既存のテストファイルまたは新規ファイルに自前DOMハーネスで追加・実行する。
- [x] Step 12: Documentation and traceability — 変更箇所にJSDoc形式のブロックコメント（チケットID `lp-XXX`・QA番号付き、日本語）を追加する（`team.md` Code Style慣習）。`traceability.json` を作成する。
- [x] Step 13: 既存テストスイート全体（`npm run test`）を実行し、グリーンであることを確認する（`team.md` Testing Postureのスコープフロア: 既存スイートを壊さない）。

## Out of Scope（本プランでは対応しない）

- advisoryレビュー指摘のMinor事項（人生ゲームモードUIへの空結果メッセージ適用、永続化復元時の通知タイミング）は、要件書のOpen Questionsに記録の通りこの実装段階で判断する: 人生ゲームモードのUI（`GameHud`等）は今回のFR4の対象に含めない（FR4はメインシミュレーター画面の`Summary`/`ResultTable`/チャートのみを対象とすると解釈する。理由: 人生ゲームは結果を「空配列」として表示するのではなく「ステージが0件」という別の表現形式であり、FR3の期間補正で開始年>終了年自体は発生しなくなるため、FR4の空結果ハンドリング改修は同一のコード変更で自動的にカバーされない）。永続化復元時の通知はページロード直後（Step 5の適用と同時）に即時表示する。
