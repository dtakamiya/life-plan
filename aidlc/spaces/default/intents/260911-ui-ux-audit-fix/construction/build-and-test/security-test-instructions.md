# Security Test Instructions — UI/UX 改善監査

## Applicability

Not applicable — `discovered-rules.md` の Forbidden により、本ワークフローのスコープでSAST/シークレット/依存関係スキャンの追加は対象外と affirm 済み。

## Rationale

本改修はクライアントサイドの表示ロジックのみの変更であり、新規の認証・認可・外部入出力境界は追加していない。セキュリティテストの追加対象は無い。
