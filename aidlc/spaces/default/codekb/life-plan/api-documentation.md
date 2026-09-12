# APIドキュメント（life-plan）

## 外部 HTTP API

**なし。** `src/app/api/` に相当するサーバーサイド API ルートは存在しない。
本アプリは完全にクライアントサイドで完結し、外部との通信は行わない
（永続化は `localStorage` のみ。詳細は `technology-stack.md` および
`architecture.md` の Data Flow を参照）。

## 内部「契約」としての関数群

サーバーAPIが存在しないため、モジュール間の関数シグネチャがコンポーネント
境界の「契約」として機能する。責務の詳細は `component-inventory.md` を参照し、
ここではインターフェース仕様のみを記録する。

### `runSimulation`

- **場所**: `src/lib/simulation/engine.ts:103`
- **シグネチャ**: `runSimulation(input: PlanInput): YearlyResult[]`
- **契約**: `PlanInput.startYear` から `endYear` までの年次計算結果を配列で
  返す純関数。例外を投げない。
- **既知の境界条件（未対応）**: `startYear > endYear` の場合、ループが0回
  実行され空配列 `[]` を返す。これはエラーではなく「結果ゼロ」として上位に
  伝播する（issue #14 の直接原因。詳細は `code-quality-assessment.md`）。

### `usePlanStore`（Zustand ストア）

- **場所**: `src/lib/store/usePlanStore.ts`
- **契約**: 約20個の状態更新メソッド（例: `setRange(startYear, endYear)`,
  `updateSelf`, `addLoan`）を公開する React フック。呼び出し側は正規化済みの
  `PlanInput` 状態を読み書きする。
- **既知の境界条件（未対応）**: `setRange` は引数の大小関係を検証せず、
  逆転した値もそのまま状態にセットする。

### zod スキーマ群（永続化検証境界）

- **場所**: `src/lib/schema.ts`
- **契約**: `planInputSchema.safeParse(data)` / `snapshotSchema.safeParse(data)`
  が `localStorage` から読み戻したデータの検証境界。成功時は検証済みデータ、
  失敗時は `{ success: false }` を返し、呼び出し側は既定値にフォールバックする
  （例外を投げない設計、`project.md` Mandated 規約）。
- **既知の境界条件（未対応）**: 各フィールドは独立に検証されるのみで、
  `startYear <= endYear` のようなフィールド間の相互検証（`.refine`）は
  未実装。参考実装として `assetSchema`（`schema.ts:63-76`）が
  `.transform`/`.refine` パターンを既に使用している。

## APIサーフェスのまとめ

| 種別 | エントリポイント | 契約の形 |
|---|---|---|
| 外部HTTP | なし | — |
| 状態更新 | `usePlanStore` の各メソッド | 引数を検証せず状態へ反映 |
| ドメイン計算 | `runSimulation` | 純関数、例外なし、境界値で空配列 |
| 永続化検証 | `planInputSchema` / `snapshotSchema` | `safeParse` の成否で分岐 |
