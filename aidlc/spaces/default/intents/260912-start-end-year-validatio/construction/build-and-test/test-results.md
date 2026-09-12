# Test Results — start-end-year-validatio

## Build Status

- `npm run build`（`next build`）: **成功**。exit code 0。プロダクションビルドが `/`, `/game`, `/_not-found` の3ルートを含めて正常に生成された。

## Test Results

- `npm run test`（`vitest run`、プロジェクト全体）: **全件成功**
  - Test Files: 28 passed (28)
  - Tests: 239 passed (239)
  - 失敗・スキップ: 0件
- 今回のスコープで追加されたテスト（15件）:
  - `src/lib/simulation/dateRange.test.ts`: 4件（正常系1、境界値1、異常系2）
  - `src/lib/store/usePlanStore.test.ts` 追加分: 6件（`setRange` 自動補正3件、永続化復元時補正3件）
  - `src/components/forms/HouseholdForm.test.tsx`: 3件（注意文言なし、自動補正で表示、再入力で消える）
  - `src/app/page.test.tsx`: 2件（通常時は非表示、空結果で共通メッセージ表示）
- 既存テストスイート: すべてグリーンのまま維持（回帰なし）。

## Type Check

- `npx tsc --noEmit`: エラー1件（`src/components/charts/chart-aria.test.tsx(33,3)`, `YearlyResult` 型に不足プロパティ）。
  - `git log -- src/components/charts/chart-aria.test.tsx` で直近コミット `b4bcb06`（本インテント開始前の既存コミット）が最終変更であることを確認。今回のスコープ（`source-manifest.json` の9ファイル）には含まれない。
  - 本インテントの変更範囲（`dateRange.ts`, `usePlanStore.ts`, `HouseholdForm.tsx`, `page.tsx` 等）には型エラーなし。
  - 既存の未着手事項として記録するのみとし、本スコープ（bugfix, issue #14）では対応しない。

## Coverage Report

数値カバレッジ計測ツール（`@vitest/coverage-v8` 等）は本プロジェクトに未導入（`team.md` Testing Postureに明記の既知事項、本スコープでの導入は対象外）。テストケース数による定性的な確認は上記の通り。

## Failure Details

なし（ビルド・テストともに失敗なし）。

## Target Verification Matrix

要件書（`requirements.md`）の機能要件・非機能要件、および承認済み `code-generation-plan.md` の Testing Contract obligations を対象とする。upstream Design（nfr-requirements/nfr-design）は本ワークフロー（bugfixスコープ）でSKIPのため対象外。

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T-FR1 | requirements.md FR1.1-1.4 | 開始年>終了年、または期間1年未満の入力を`endYear=startYear+1`に自動補正し、内部値（ストア）も復元時も反映される | 実装どおり動作を確認 | `src/lib/simulation/dateRange.ts`, `dateRange.test.ts`（4件pass）、`usePlanStore.ts`/`usePlanStore.test.ts`（6件pass） | build-and-test | Met |
| T-FR2 | requirements.md FR2.1-2.2 | 補正時、終了年欄直下に既存`error` propスタイルで注意文言を表示 | 実装どおり動作を確認 | `src/components/forms/HouseholdForm.tsx`, `HouseholdForm.test.tsx`（3件pass） | build-and-test | Met |
| T-FR3 | requirements.md FR3.1-3.2 | 人生ゲームモードもストア層の単一補正源で自動的に保護される（重複ロジックなし） | `deriveStages`が`usePlanStore`由来の補正済み値を使用することを確認（コード変更不要） | `src/lib/game/stages.ts`（確認コメント）、アーキテクチャレビューで実地確認済み | build-and-test | Met |
| T-FR4 | requirements.md FR4.1-4.2 | 結果が空の場合、`Summary`/`ResultTable`/チャートの代わりに共通メッセージを表示 | 実装どおり動作を確認 | `src/app/page.tsx`（`EmptyResultsNotice`）, `page.test.tsx`（2件pass） | build-and-test | Met |
| T-NFR1 | requirements.md NFR1（保守性/レイヤー依存） | `components → store → lib/simulation・lib/game → lib/schema` の単方向依存を維持、逆依存なし | 逆依存なしを確認 | アーキテクチャレビュー（`.aidlc-reviews/code-generation/stage/2797f039e104b02e/1.review.md`） | build-and-test | Met |
| T-NFR2 | requirements.md NFR2（アクセシビリティ） | 注意文言表示は既存の`aria-invalid`連携を踏襲 | 既存`NumberField`の`error` propをそのまま再利用（新規パターンなし） | `src/components/forms/fields.tsx`（既存実装）, `HouseholdForm.tsx` | build-and-test | Met |
| T-NFR3 | requirements.md NFR3（テスト容易性） | vitestハイブリッド環境（node既定、DOM必要時のみjsdom）でテスト可能、`@testing-library/react`不使用 | 全新規テストファイルが規約通り実装されていることを確認 | `dateRange.test.ts`（node）, `HouseholdForm.test.tsx`（`// @vitest-environment jsdom`指定）, `page.test.tsx`（jsdom指定） | build-and-test | Met |
| T-SCOPE-1 | code-generation-plan.md Testing Contract obligations（scope_floor） | issueの不具合に対する的を絞った回帰テストを含む | `dateRange.test.ts`, `usePlanStore.test.ts`が直接issue #14の原因（期間逆転）を再現・検証 | 上記2ファイル | build-and-test | Met |
| T-SCOPE-2 | code-generation-plan.md Testing Contract obligations（scope_floor） | 既存テストスイートをグリーンに維持する | `npm run test`全件成功（既存211件 + 新規15件 = 239件） | 本ファイル冒頭のテスト結果 | build-and-test | Met |
| T-PROJECT-1 | project.md Forbidden | `try`/`catch`による例外送出を使わない | 新規実装（`correctDateRange`等）はすべて戻り値の型で異常系を表現、`try`/`catch`なし | アーキテクチャレビューで確認済み | build-and-test | Met |
| T-PROJECT-2 | project.md Forbidden | `@testing-library/react`を導入しない | 新規テストファイルはすべて自前DOMハーネス（`react-dom/client`の`createRoot`＋生DOMイベント）を使用 | `HouseholdForm.test.tsx`, `page.test.tsx` | build-and-test | Met |

## Loop-Back Log

本ステージでループバックは発生していない（初回実行でビルド・テストとも成功）。
