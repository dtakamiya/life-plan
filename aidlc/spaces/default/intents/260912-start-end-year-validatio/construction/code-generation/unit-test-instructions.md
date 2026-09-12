# Unit Test Instructions — start-end-year-validatio（issue #14）

## Test Framework Setup

既存の `vitest` 構成をそのまま使用する。追加設定は不要（`vitest.config.ts` は既存のまま）。DOM操作を伴う `HouseholdForm.test.tsx` のみファイル冒頭で `// @vitest-environment jsdom` を指定する。それ以外（`dateRange.test.ts`, `usePlanStore.test.ts`）は既定の `node` 環境で実行する。

## How to Run THIS Scope's Tests

このスコープ（issue #14 対応）に関わるテストのみを対象とした、ユニットスコープの実行コマンド:

```bash
npx vitest run src/lib/simulation/dateRange.test.ts src/lib/store/usePlanStore.test.ts src/components/forms/HouseholdForm.test.tsx
```

（`src/app/page.tsx` の空結果メッセージに対する回帰テストファイルが確定した時点で、上記コマンドに追加する。）

## Expected Coverage Targets

Minimal strategy（bugfixスコープの的を絞った回帰テスト込み）:
- `dateRange.ts`（`correctDateRange` 純粋関数）: 要件駆動の単体テスト最低3件
  - 正常系（`endYear - startYear >= 1` で補正なし）
  - 境界値（`endYear - startYear === 1`、補正なしの境界確認）
  - 異常系（開始年 > 終了年、および期間1年未満）で `endYear = startYear + 1` に補正されること
- `usePlanStore.ts`（`setRange` および永続化復元時の補正）: 最低2件
  - `setRange` 呼び出し時に無効な期間が自動補正されること（`rangeAutoCorrected` フラグがtrueになること）
  - 永続化データ復元時に無効な期間が同様に補正されること
- `HouseholdForm.tsx`（注意文言表示）: 最低1件
  - `rangeAutoCorrected` がtrueのとき、終了年欄の直下に注意文言が表示されること（既存の自前DOMハーネスによる描画確認）
- 空結果の共通メッセージ表示: 最低1件（issue #14の直接原因（開始年>終了年）による空結果は自動補正で発生しなくなるため、この回帰テストは「万一空配列が渡された場合に無言にならない」ことを確認する防御的テストとする）

合計 目安5-15件（Minimal strategyの要件駆動テスト数に合致）。

## Mocking/Stubbing Guidance

- `usePlanStore` の永続化復元テストでは、`localStorage` を直接モックする（既存テストの慣習に従い、`vi.stubGlobal` または `localStorage.setItem` を使った実データ投入のいずれか、既存の `usePlanStore.test.ts` の既存パターンを踏襲する）。
- `@testing-library/react` は使用しない。`react-dom/client` の `createRoot` と生DOMイベント（`dispatchEvent` 等）による既存の自前ハーネスパターンを使用する。

## Test Data Management

- テスト用の `PlanInput` サンプルは、既存の `defaults.ts`（`src/lib/simulation/defaults.ts`）のデフォルト値をベースに、`startYear`/`endYear` のみを各テストケースで上書きする。
- 新規のテスト用フィクスチャファイルは作成しない（既存のインラインオブジェクト定義パターンに従う）。
