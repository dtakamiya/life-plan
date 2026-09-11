# Discovered Rules

## Mandated

- ALWAYS 異常系（不正な入力・壊れた永続化データなど）は例外ではなく戻り値の型
  （zod の `safeParse` の成否や `null` 許容型など）で表現する。
- ALWAYS UI/UXの見た目・操作性・アクセシビリティを修正したコンポーネントには、
  既存の自前DOMハーネスによる回帰テストを追加・更新する。
- ALWAYS `main` を単一のトランクとし、PRはスカッシュマージで統合する。

## Forbidden

- NEVER コンポーネントテストの検証手段として `@testing-library/react` を導入
  しない（既存の `react-dom/client` + 生DOMイベントによる自前ハーネスを使う）。
- NEVER 今回のワークフロー（`ui-ux-audit-fix`）のスコープで、CIにlint・型
  チェック・SAST/シークレット/依存関係スキャンを追加しない（別ワークフローで
  改めて検討する）。
- NEVER 異常系の処理に `try`/`catch` による例外送出を使わない。
