# Code Generation Plan — UI/UX 改善監査

対象: 全FR/NFR（`requirements.md`）。ゼロUnit（`ui-ux-audit-fix`スコープはUnits Generationをスキップ）につき、単一の実装反復として実行する。

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "各層（`lib/simulation` などの計算ロジック → `lib/store` の状態管理 →",
  "scope": "ui-ux-audit-fix",
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
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
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
  "input_sha256": "sha256:5e6aa9037b3387b3d4c79299d9ad19e12b8f9621142b5e8e1d5bfdf944633abe",
  "contract_sha256": "sha256:4a9b53d0a3c53f67507d78f78e4ded791eb5d3addc8fca532ddb1cd75487f846"
}
```

このユニットはUI表示層のみの改修であり、Data model/Repository/APIレイヤーは対象外（Frontend behaviorおよび該当箇所のBusiness logicのみ適用）。

## Implementation Steps

- [ ] Step 1: 既存テストランナー（vitest）の動作確認。実行コマンド: `npx vitest run src/components` （このユニット限定のスコープ実行）
- [ ] Step 2: Frontend behavior — コントラスト改善の実装（FR1.1, FR1.2）
      - `tailwind.config.ts` の `ink.mute` 色値をWCAG AA基準（4.5:1以上）を満たす値に変更
      - 影響を受ける14ファイル（`text-ink-mute` 使用箇所）の見た目を確認
      - Story: FR1 → コントラスト改善
- [ ] Step 3: Frontend behavior のテスト — Step 2 の回帰テスト（既存の自前DOMハーネスで、影響コンポーネントのレンダリング確認テストを追加/更新）
- [ ] Step 4: Frontend behavior — フォームバリデーション可視化の実装（FR2.1, FR2.2, FR2.3）
      - `src/components/forms/fields.tsx` の `NumberField`/`PercentField`/`TextField`/`SelectField` にエラー表示・`aria-invalid`・`aria-describedby`・必須明示を追加
      - Story: FR2 → バリデーション可視化
- [ ] Step 5: Frontend behavior のテスト — Step 4 の回帰テスト（不正値入力時のエラー表示を確認するテストを追加）
- [ ] Step 6: Frontend behavior — レスポンシブレイアウトの是正（FR3.1）
      - `EventForm.tsx`, `HouseholdForm.tsx`, `AssetForm.tsx`, `ExpenseForm.tsx`, `LoanForm.tsx` の固定グリッドをブレークポイント対応に修正
      - Story: FR3 → レスポンシブ是正
- [ ] Step 7: Frontend behavior のテスト — Step 6 の回帰テスト（レンダリング確認）
- [ ] Step 8: Frontend behavior — 削除操作の確認統一（FR4.1）
      - `GameResult.tsx` の `<dialog>` パターンを `EventForm.tsx`/`LoanForm.tsx`/`HouseholdForm.tsx`（子カード削除）/`ScenarioBar.tsx`（保存済みプラン削除）に展開
      - Story: FR4 → 削除確認統一
- [ ] Step 9: Frontend behavior のテスト — Step 8 の回帰テスト（確認ダイアログの表示・削除実行の挙動確認）
- [ ] Step 10: Frontend behavior — 選択状態フィードバックの追加（FR5.1）
      - `HouseholdForm.tsx` の教育プリセットボタンに `aria-pressed` と視覚的ハイライトを追加
      - Story: FR5 → 選択状態フィードバック
- [ ] Step 11: Frontend behavior のテスト — Step 10 の回帰テスト
- [ ] Step 12: Frontend behavior — チャートのテキスト代替（FR6.1）
      - `CashFlowChart.tsx`, `NetWorthChart.tsx`, `ComparisonChart.tsx` を `aria-describedby` で `ResultTable` と関連付け
      - Story: FR6 → チャート代替
- [ ] Step 13: Frontend behavior のテスト — Step 12 の回帰テスト（`aria-describedby` 属性の存在確認）
- [ ] Step 14: Frontend behavior — チェックボックスの見た目統一（FR7.1）
      - `HouseholdForm.tsx` の配偶者チェックボックスを他の選択UIと視覚的に統一
      - Story: FR7 → チェックボックス統一
- [ ] Step 15: Frontend behavior のテスト — Step 14 の回帰テスト
- [ ] Step 16: 環境/ビルド設定 — 変更なし（既存の `vitest.config.ts`, `tailwind.config.ts` の構造を維持、`ink.mute` の値のみ変更）
- [ ] Step 17: ドキュメント・トレーサビリティ — `code-summary.md`, `traceability.json`, `source-manifest.json` の作成

## Story-to-Code-Step Traceability

| Step | Requirement ID |
|---|---|
| 2, 3 | FR1.1, FR1.2 |
| 4, 5 | FR2.1, FR2.2, FR2.3 |
| 6, 7 | FR3.1 |
| 8, 9 | FR4.1 |
| 10, 11 | FR5.1 |
| 12, 13 | FR6.1 |
| 14, 15 | FR7.1 |
