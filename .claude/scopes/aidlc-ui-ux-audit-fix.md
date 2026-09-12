---
name: ui-ux-audit-fix
depth: Minimal
keywords: []
description: 既存UIのUI/UX改善点分析と修正
skeleton: off
review_cap: advisory
change_control: relaxed
---

# ui-ux-audit-fix scope

Minimal depth のカスタムスコープ。既存UIのUI/UX上の問題点を分析し、修正を
実装するための最小限のワークフローを構成する。合成スコープのため
`keywords: []` とし、キーワード推測による自動選択の対象にはしない
（`--scope ui-ux-audit-fix` での明示指定でのみ選択される）。

Change Control は relaxed: 承認後に入力が変わっても記録して一言案内し、
そのまま作業を継続する。

## Why these stages, why skip those

意図の把握（intent-capture）、承認ハンドオフ（approval-handoff）、既存の
開発慣習の把握（practices-discovery）、要件分析（requirements-analysis）、
実装（code-generation）、検証（build-and-test）の6ステージのみを実行する。
既存UIへのピンポイントな改善であり、市場調査・スコープ定義・チーム編成・
モックアップ・ドメイン設計・ユニット分解・契約設計・配送計画・機能設計・
NFR・インフラ設計・CI/CD・環境構築・デプロイ・可観測性・インシデント対応・
性能検証・フィードバック最適化といった重厚な工程は不要と判断し、すべて
SKIP とする。

Walking skeleton は off（`skeleton: off`）: 単一のBolt構成で足場作りの
儀式は行わない。

## Membership

キーワード推測なし（合成スコープ）。`--scope ui-ux-audit-fix` での明示選択、
または compose 承認フローを通じてのみ選択される。
