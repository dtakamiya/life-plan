# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Change Control

<!-- Project-specific. Mode: strict or relaxed. Strict here holds for every intent and cannot be changed from chat. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER コンポーネントテストの検証手段として `@testing-library/react` を導入 (affirmed 2026-09-11)

しない（既存の `react-dom/client` + 生DOMイベントによる自前ハーネスを使う）。 (affirmed 2026-09-11)

- NEVER 今回のワークフロー（`ui-ux-audit-fix`）のスコープで、CIにlint・型 (affirmed 2026-09-11)

チェック・SAST/シークレット/依存関係スキャンを追加しない（別ワークフローで (affirmed 2026-09-11)

改めて検討する）。 (affirmed 2026-09-11)

- NEVER 異常系の処理に `try`/`catch` による例外送出を使わない。 (affirmed 2026-09-11)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS 異常系（不正な入力・壊れた永続化データなど）は例外ではなく戻り値の型 (affirmed 2026-09-11)

（zod の `safeParse` の成否や `null` 許容型など）で表現する。 (affirmed 2026-09-11)

- ALWAYS UI/UXの見た目・操作性・アクセシビリティを修正したコンポーネントには、 (affirmed 2026-09-11)

既存の自前DOMハーネスによる回帰テストを追加・更新する。 (affirmed 2026-09-11)

- ALWAYS `main` を単一のトランクとし、PRはスカッシュマージで統合する。 (affirmed 2026-09-11)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
