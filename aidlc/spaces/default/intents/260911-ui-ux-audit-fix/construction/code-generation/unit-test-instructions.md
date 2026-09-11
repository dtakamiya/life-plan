# Unit Test Instructions — UI/UX 改善監査

## Test Framework Setup

既存の `vitest` 構成をそのまま使用する。追加のセットアップは不要。`@testing-library/react` は導入しない（`team-practices.md` の Forbidden 参照）。DOM検証が必要なテストのみ、ファイル冒頭で `// @vitest-environment jsdom` を個別指定する。

## Run Command (このユニット限定)

```
npx vitest run src/components/forms/fields.test.tsx src/components/forms/EventForm.test.tsx src/components/forms/LoanForm.test.tsx src/components/forms/HouseholdForm.test.tsx src/components/ScenarioBar.test.tsx src/components/game/GameResult.test.tsx src/components/CashFlowChart.test.tsx src/components/NetWorthChart.test.tsx src/components/ComparisonChart.test.tsx
```

（各テストファイルは既存または本ユニットで新規作成するもの。実際に作成したファイルに応じて上記コマンドを最終的なファイル一覧に合わせて確定する。）

## Expected Coverage Targets

- Minimal戦略: 要件1件につき最低1テスト（happy-path中心）。カバレッジ数値目標は80%（`team-practices.md`）だが、計測ツール未導入のため今回は既存＋新規テストの全通過を確認基準とする。

## Mocking/Stubbing Guidance

- グローバル状態（`usePlanStore` 等のZustandストア）は既存パターンに従い、テスト内で直接ストアを操作するか、素のPropsで対象コンポーネントを描画する。
- 外部ライブラリ（Recharts）はモックせず、実描画で `aria-describedby` 属性の存在を確認する軽量な検証にとどめる。

## Test Data Management

- 既存テスト（`src/components/forms/NumberField.test.tsx` 等）のパターンに倣い、テストファイル内にインラインでテストデータを定義する。共有フィクスチャは導入しない。

## Requirement-to-Test Mapping

| Requirement | Test focus |
|---|---|
| FR1 | 変更後の `ink.mute` を使用するコンポーネントが期待通りレンダリングされる |
| FR2 | 不正な数値入力時にエラーメッセージ・`aria-invalid`が表示される |
| FR3 | 該当フォームコンポーネントのレンダリングが崩れない（クラス名の存在確認） |
| FR4 | 削除ボタン押下で確認ダイアログが表示され、確認後に削除が実行される |
| FR5 | 教育プリセットボタン押下で`aria-pressed`が切り替わる |
| FR6 | チャートコンポーネントに`aria-describedby`が設定され、対応する`ResultTable`のidと一致する |
| FR7 | チェックボックスのクラス名が他の選択UIと統一されている |
