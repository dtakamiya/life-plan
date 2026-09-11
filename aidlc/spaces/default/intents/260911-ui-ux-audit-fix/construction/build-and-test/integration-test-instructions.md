# Integration Test Instructions — UI/UX 改善監査

## Applicability

Not applicable — このスコープでは統合テストファイルを追加生成しない。

## Rationale

このワークフローの Test Strategy は **Minimal** である（`aidlc-state.md`）。Minimal戦略ではユニットテストのみが要求され、追加の統合テストファイルは生成しない（`build-and-test.md` Step 3-7）。本改修はUI表示層のみの変更であり、外部システムやユニット間の新規結合点も発生していないため、統合テストの追加対象は無い。
