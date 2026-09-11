# Requirements — UI/UX 改善監査

## Intent Analysis

既存のライフプランニングアプリのUIに残る使いにくさ・分かりにくさ、特にアクセシビリティ上の問題（コントラスト・キーボード操作等）を解消することが目的である。単なる見た目の調整ではなく、家族・友人という限定利用者が実際に迷わず・支障なく操作できる状態を達成する [Q1]。

## Functional Requirements

### FR1. テキストコントラストの改善

- **FR1.1**: `tailwind.config.ts` で定義される `ink.mute` の色値を、背景色（`paper`/`surface`）に対しWCAG AA基準（通常テキストで4.5:1以上）を満たす値に変更する [Q4]。
- **FR1.2**: 変更後の色は、`text-ink-mute` を使用する既存の全箇所（`fields.tsx`, `GameHud.tsx`, `GameResult.tsx`, `AdventureLog.tsx`, `AssumptionsPanel.tsx`）で見た目の一貫性を保つ。

### FR2. フォームバリデーションの可視化

- **FR2.1**: `NumberField`/`PercentField`/`TextField`/`SelectField`（`src/components/forms/fields.tsx`）に、不正な入力に対するエラーメッセージ表示の仕組みを追加する。
- **FR2.2**: エラー状態の入力欄には `aria-invalid="true"` と `aria-describedby` でエラーメッセージ要素を関連付ける。
- **FR2.3**: 必須項目には視覚的な明示（例: `*`とラベル）を追加する。

### FR3. レスポンシブレイアウトの是正

- **FR3.1**: `EventForm.tsx`, `HouseholdForm.tsx`, `AssetForm.tsx`, `ExpenseForm.tsx`, `LoanForm.tsx` の固定 `grid-cols-2`/`grid-cols-3` を、`AssumptionsPanel.tsx` と同様にブレークポイント対応（例: `grid-cols-1 sm:grid-cols-2`）へ修正し、320〜375px幅で崩れないようにする。

### FR4. 削除操作の確認統一

- **FR4.1**: `GameResult.tsx` の `<dialog>` による確認パターンを、`EventForm.tsx`・`LoanForm.tsx`・`HouseholdForm.tsx`（子カード削除）・`ScenarioBar.tsx`（保存済みプラン削除）の削除操作にも展開する [Q2]。

### FR5. 選択状態フィードバックの追加

- **FR5.1**: `HouseholdForm.tsx` の教育プリセットボタンに、現在選択中の状態を示す `aria-pressed` および視覚的なハイライトを追加する。

### FR6. チャートのテキスト代替

- **FR6.1**: `CashFlowChart.tsx`, `NetWorthChart.tsx`, `ComparisonChart.tsx` を、`aria-describedby` によって既存の `ResultTable`（数値表）と明示的に関連付け、スクリーンリーダー利用者がグラフの内容を数値表から取得できるようにする [Q3]。

### FR7. チェックボックスの見た目統一

- **FR7.1**: `HouseholdForm.tsx` の配偶者チェックボックスの見た目を、`StageCard.tsx` のカード選択や教育プリセットのピル型ボタンと視覚的に一貫したスタイルに揃える。

## Non-Functional Requirements

- **NFR1**: 変更後のテキストコントラストは、通常テキストでWCAG 2.1 AA基準（4.5:1以上）を満たすこと。
- **NFR2**: 既存のテストスイート（vitest、node環境・自前DOMハーネス）はすべて green を維持すること。変更したコンポーネントには回帰テストを追加する（`team-practices.md` の Testing Posture に準拠）。
- **NFR3**: 変更は既存のコードスタイル（レイヤー境界、命名規約、例外を使わない戻り値型でのエラー表現）に従うこと。

## Constraints

- スコープは `ui-ux-audit-fix`（9/33ステージ）に限定し、新機能企画・アーキテクチャ再設計は対象外。
- CIへのlint/型チェック/セキュリティスキャンの追加は今回のスコープ外（`discovered-rules.md` の Forbidden 参照）。
- `@testing-library/react` は導入しない。既存の自前DOMハーネスを使用する。

## Assumptions

- 家族・友人利用者の具体的な不便点は未確認のまま、監査で見つかった一般的なアクセシビリティ・使い勝手の問題を優先順位付けの根拠とした [memory: intent-capture stage]。

## Out of Scope

- Low判定の3項目: `ResultTable` の `<th scope="col">` 追加、`StageCard` のkeydownリスナーのselect除外、`title`属性ツールチップの代替 [Q1]。
- テストカバレッジ計測ツールの導入（`team-practices.md` に記載の別途検討事項）。

## Open Questions

None.
