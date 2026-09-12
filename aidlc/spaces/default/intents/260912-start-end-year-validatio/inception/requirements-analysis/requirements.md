# Requirements — start-end-year-validatio（GitHub issue #14）

## Sources

- [desc] GitHub issue #14: 開始年>終了年の入力でエラー表示なく結果が無言で空白になる。シミュレーション期間の開始年が終了年より後の場合にバリデーションエラーを表示するか自動補正し、結果が空白になる理由をユーザーに伝える。
- [memory:M1] Reverse Engineering成果物（`aidlc/spaces/default/codekb/life-plan/architecture.md`, `code-quality-assessment.md`）: 根本原因の3点（`planInputSchema` の相互検証欠如、`HouseholdForm` の `error` prop 未接続、`runSimulation` のサイレントな空配列返却）。
- [memory:M2] `src/lib/game/stages.ts` のゲームモードの同型潜在バグ。
- [Q1]〜[Q5], [Follow-up Q1]〜[Follow-up Q3] の回答（`requirements-analysis-questions.md` 参照）。

## Intent Analysis

ユーザー（世帯）がシミュレーション期間の開始年・終了年を入力する際、開始年が終了年より後（または期間が短すぎる）という無効な入力をしても、現状は何のフィードバックもなく結果画面が無言で空白になる。目標は、この無効な入力を検知した際にシステム側で自動的に有効な期間へ補正し、補正が行われた事実をユーザーに明示することで、「結果が無言で空白になる」という混乱を解消すること。あわせて、他の要因で結果が空になるケースについても、ユーザーに理由が伝わるよう表示側の一般的なハンドリングを改善する。

## Functional Requirements

### FR1: 期間の自動補正（コア機能）

**FR1.1**: システムは、`endYear < startYear + 1`（すなわち期間が2年未満、開始年 > 終了年を含む）を無効な期間とみなす。[Q2, Follow-up Q1]

**FR1.2**: 無効な期間が検出された場合、システムは `startYear` を基準として `endYear = startYear + 1` に自動的に補正する。[Q1(B), Follow-up Q1(B)]

**FR1.3**: 補正は、開始年・終了年のいずれかが変更された時点（フォーム入力時）に加え、`localStorage` から永続化データを復元する時点でも行う。復元時に無効な期間が検出された場合も同様に自動補正し、FR2の通知を表示する。[Follow-up Q5(A)]

**FR1.4**: 補正は表示上の警告に留めず、`usePlanStore` 内部の `endYear` の値自体を補正値に更新する。以降の `runSimulation` 実行は、補正後の内部値を用いて行う。[Follow-up Q4(A)]

### FR2: 補正の通知表示

**FR2.1**: 自動補正が行われた場合、終了年の入力欄の直下に、既存の `NumberField` の `error` prop と同じ表示スタイル（aria-invalid連携を含む視覚的な警告表示）を用いて、補正が行われた旨の注意文言（例:「終了年を自動調整しました」）を表示する。[Q3, Follow-up Q2]

**FR2.2**: 注意文言は、補正の直接の原因（開始年に対して終了年が不足していたこと）が推測できる内容とする。

### FR3: 対応範囲（メインシミュレーター・人生ゲーム共通化）

**FR3.1**: FR1の補正ロジックは、`PlanInput.startYear`/`endYear` を共有するフォーム/ストア層（`HouseholdForm` および `usePlanStore`）に実装し、メインシミュレーター（`src/app/page.tsx`）と人生ゲームモード（`src/app/game/page.tsx`, `src/lib/game/stages.ts`）の両方に適用されるようにする。[Q4]

**FR3.2**: 人生ゲームモード側で個別にバリデーション・補正ロジックを重複実装しない（単一の入力源での補正に一本化する）。

### FR4: 結果が空の場合の一般的なハンドリング

**FR4.1**: FR1の補正により「開始年 > 終了年」を原因とする空結果は発生しなくなるが、他の要因（未実装の将来ケース等）で `runSimulation` またはゲームステージ生成の結果が空になった場合に備え、`Summary`、`ResultTable`、各チャート（`charts/*`）が空の結果を受け取った際に、無言で何も表示しない代わりに「表示できる結果がありません」等の共通メッセージを表示する。[Q5, Follow-up Q3]

**FR4.2**: FR4.1の共通メッセージは、既存の異常系表現方針（例外を投げず戻り値の型で表現する）と整合する形で実装する — 例えば `results.length === 0` の分岐に共通メッセージ表示を追加する形とし、新たな例外処理機構は導入しない。

## Non-Functional Requirements

**NFR1（保守性）**: 補正ロジックは既存のレイヤー依存（`components → store → lib/simulation・lib/game → lib/schema`）を維持し、`lib` 層から `components` 層への逆依存を発生させない。

**NFR2（アクセシビリティ）**: FR2の注意文言表示は、既存の `NumberField` の `error` prop が持つ `aria-invalid` 連携を踏襲し、スクリーンリーダー利用者にも補正が行われたことが伝わるようにする。

**NFR3（テスト容易性）**: 補正ロジック（`lib/simulation` または `lib/store` に配置する純粋なバリデーション/補正関数）は既存の `vitest` ハイブリッド環境（`node` 既定、DOM必要時のみ `jsdom`）でテスト可能な形で実装し、`team.md` のテスト方針（test-after、コロケーション、`@testing-library/react` 不使用、自前DOMハーネス）に従う。

## Constraints

- **C1**: 異常系は例外ではなく戻り値の型で表現する（`project.md` Mandated）。`try`/`catch` による例外送出は使用しない。
- **C2**: コンポーネントテストの検証手段として `@testing-library/react` を導入しない（`project.md` Forbidden）。既存の `react-dom/client` + 生DOMイベントによる自前ハーネスを使用する。
- **C3**: 今回のワークフロー（bugfix scope）のスコープで、CIへのlint・型チェック単体ステップ・SAST/シークレット/依存関係スキャンの追加は行わない（`project.md` Forbidden）。
- **C4**: UI/UXの見た目・操作性・アクセシビリティを修正したコンポーネントには、既存の自前DOMハーネスによる回帰テストを追加・更新する（`project.md` Mandated）。

## Assumptions

- **A1**: 「2年以上」という最低期間要件は、今回のissue対応の一環としてQ2/Follow-up Q1で確認されたユーザー決定であり、既存のドキュメント（team.md/project.md）には事前に明記されていなかった新規のビジネスルールである。次回以降の変更に備え、この決定は本要件書に唯一の記録として残す。
- **A2**: `startYear` の値自体（例えば西暦として妥当な範囲か等）についての追加バリデーションは、今回のissueの対象外とする（issueは開始年・終了年の相互関係のみを問題にしている）。
- **A3**: 補正後の値をユーザーが再度手動で変更することは可能であり、その際は再度FR1の判定・補正ロジックが働く（都度リアルタイムに検証する想定）。

## Out of Scope

- `Person.retirementAge` と `pensionStartAge` の大小関係、`Loan.startYear + termYears` の妥当性など、他の未検証の範囲チェック（Reverse Engineeringのcode-quality-assessment.mdに参考記録あり、issue #14の直接対象外）。
- カバレッジ計測ツール（`@vitest/coverage-v8` 等）の導入。
- CIへのlint・型チェック単体ステップ、SAST/シークレット/依存関係スキャンの追加。

## Open Questions

None. — 本ステージのすべての疑問点は `requirements-analysis-questions.md` のQ1〜Q5・Follow-up Q1〜Q5で解決済み。プロダクトリードのadvisoryレビューで指摘されたMajor2点（ストア内部値の更新有無、永続化復元時の挙動）はFollow-up Q4/Q5で確認しFR1.3/FR1.4に反映した。Minor指摘（通知文言の確定表現、境界値テストテーブルの明記、FR4.1の「未実装の将来ケース」という表現）は、bugfix/Minimal depthのスコープでは実装・テスト設計段階（Code Generation）での判断に委ねる。
