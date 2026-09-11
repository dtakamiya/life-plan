# Requirements Analysis — Questions

## Sources

- [desc] Initial description: "UI/UXの改善点がないか分析を行い、改善点があれば実施して"
- `aidlc/spaces/default/intents/260911-ui-ux-audit-fix/ideation/intent-capture/intent-statement.md`
- `aidlc/spaces/default/intents/260911-ui-ux-audit-fix/inception/practices-discovery/team-practices.md`
- コードベース監査結果（`src/components/` の実地調査、file:line付き）

## 監査で見つかった問題点

### High（アクセシビリティ基準に直結）
1. `text-ink-mute`（#8493a5）の低コントラスト。ヒント・注記等11ファイルで使用、WCAG AA基準（4.5:1）未達（約3.2:1）
2. フォーム全体にバリデーションエラー表示・`aria-invalid`・必須項目明示の仕組みが皆無
3. 狭い画面幅（320〜375px）で崩れる固定カラムグリッド（`EventForm`, `HouseholdForm`, `AssetForm`, `ExpenseForm`, `LoanForm`）

### Medium
4. 削除操作の確認ダイアログの有無が画面ごとにバラバラ（誤操作の取り消し手段なし）
5. 教育プリセットボタンに選択状態フィードバック（`aria-pressed`等）がない
6. チャート（CashFlowChart等）にテキスト代替・ARIAラベルがなく、視覚に依存できないユーザーが内容を取得できない
7. チェックボックスの見た目が他の選択UIと不統一

### Low
8. `ResultTable`の`<th>`に`scope="col"`がない
9. `StageCard`のグローバルkeydownリスナーが`select`要素を除外していない（潜在リスク）
10. `title`属性のみのツールチップ（キーボード・スクリーンリーダーで到達不可）

## Questions

### Q1. 今回のスコープ（`ui-ux-audit-fix`、確認済み成功指標はアクセシビリティ基準遵守）で、どこまで対応しますか？

- A. High（1-3）のみ対応する
- B. High + Medium（1-7）まで対応する
- C. High + Medium + Low（1-10）すべて対応する
- X. Other (please specify)

[Answer]: B. High + Medium（1-7）まで対応する

### Q2.（Q1でHighのみ選んだ場合を除き）Medium項目のうち、削除操作の確認ダイアログ統一（#4）は対応に含めますか？既存の`GameResult`にある`<dialog>`パターンを他の削除操作にも展開する想定です。

- A. 含める
- B. 含めない（見送り、Not applicable）
- X. Other (please specify)

[Answer]: A. 含める

### Q3. チャートへのテキスト代替追加（#6）は、既存の`ResultTable`（数値表）とグラフを明示的に関連付ける形（例: `aria-describedby`でテーブルを参照）で良いですか？それとも別の対応を希望しますか？

- A. 既存のResultTableと関連付ける（`aria-describedby`等）
- B. 各グラフに個別のテキストサマリーを追加する
- C. Not applicable（今回は対応しない）
- X. Other (please specify)

[Answer]: A. 既存のResultTableと関連付ける（`aria-describedby`等）

### Q4. コントラスト改善（#1）にあたり、`text-ink-mute`の色自体を変更しますか、それとも用途によって使い分けますか？

- A. `text-ink-mute`の色値自体をWCAG AA基準を満たす値に変更する（全箇所に影響）
- B. 小さいフォントサイズで使われている箇所のみ、より濃い色に個別変更する
- X. Other (please specify)

[Answer]: A. `text-ink-mute`の色値自体をWCAG AA基準を満たす値に変更する（全箇所に影響）

## Assumptions & Open Questions

None.

## Consolidated Summary Confirmation

- 対応範囲: High + Medium（項目1〜7）
- コントラスト: `text-ink-mute` の色値自体をWCAG AA基準に変更（全箇所）
- バリデーション: フォーム全体にエラー表示・`aria-invalid`・必須明示を追加
- レスポンシブ: 固定グリッドをブレークポイント対応に修正
- 削除確認: 既存の`<dialog>`パターンを他の削除操作にも展開
- 選択状態フィードバック: 教育プリセットボタンに`aria-pressed`等を追加
- チャート代替: 既存ResultTableと`aria-describedby`で関連付け
- チェックボックス統一: 見た目を他の選択UIと揃える
- Low項目（8-10）は対象外

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
