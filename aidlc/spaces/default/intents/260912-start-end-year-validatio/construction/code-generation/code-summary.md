# Code Generation Summary — start-end-year-validatio（issue #14 / lp-019）

## 作成・変更したファイル

### 新規作成
- `src/lib/simulation/dateRange.ts` — 純粋関数 `correctDateRange(startYear, endYear)`。`endYear - startYear < 1` を無効な期間とみなし、`endYear = startYear + 1` に補正した `{ startYear, endYear, corrected }` を返す。例外は投げない。
- `src/lib/simulation/dateRange.test.ts` — `correctDateRange` の単体テスト（正常系・境界値・異常系2パターン）。
- `src/components/forms/HouseholdForm.test.tsx` — 終了年欄の自動補正通知（`rangeAutoCorrected` 購読）の回帰テスト。
- `src/app/page.test.tsx` — `results.length === 0` 時の共通メッセージ表示の防御的回帰テスト。

### 変更
- `src/lib/store/usePlanStore.ts`
  - `PlanState` に `rangeAutoCorrected: boolean` を追加。
  - `setRange` を `correctDateRange` 経由に変更し、補正の有無を `rangeAutoCorrected` に反映。
  - persist の `merge` ロジックを、単体テストで直接呼び出せる純粋関数 `mergePersistedPlanState`（named export）として切り出し、永続化復元時にも `correctDateRange` を適用するようにした。
  - `reset()` で `rangeAutoCorrected` も false に戻すよう追加（フラグの一貫性のための小さな追加）。
- `src/lib/store/usePlanStore.test.ts` — `setRange` の自動補正・`rangeAutoCorrected` フラグ、`mergePersistedPlanState` による永続化復元時補正のテストケースを追加。
- `src/components/forms/HouseholdForm.tsx` — 終了年 `NumberField` に `usePlanStore` の `rangeAutoCorrected` を接続し、true のとき既存の `error` prop（aria-invalid連携）で注意文言を表示。
- `src/lib/game/stages.ts` — `deriveStages` の `startYear`/`endYear` が既にストア層で補正済みである前提を明記する確認コメントのみ追加（ロジック変更なし）。
- `src/app/page.tsx` — `EmptyResultsNotice` コンポーネントを追加し、`results.length === 0` のとき `Summary`/`ScenarioBar`/比較チャート/`NetWorthChart`/`CashFlowChart`/`ResultTable` の代わりに表示するよう分岐。`AssumptionsPanel` とゲームモード導線パネルは対象外（要件どおり）。

## 主要な実装判断

1. **`correctDateRange` を純粋関数として `lib/simulation` に切り出した。** 例外を投げず戻り値の型（`{ corrected: boolean }`）で異常系を表現する project.md の Mandated/Forbidden 規約に従う。`setRange` と永続化復元処理の両方から同じ関数を呼ぶことで、FR3.2（補正ロジックの重複実装禁止）を満たす単一の補正源とした。
2. **persist の `merge` オプションを `mergePersistedPlanState` という named export の純粋関数へ切り出した。** zustand v5 の `persist` ミドルウェアは、`createJSONStorage` に渡した storage getter（`() => localStorage`）が例外を投げる実行環境（本プロジェクトの vitest 既定 `environment: "node"` を含む）では `merge` を一切呼び出さない実装になっている（`storage` が `undefined` になり、`persist` が丸ごとスルーされる）。インラインクロージャのままではテストで `merge` を直接検証する手段がなく、`usePlanStore.persist.getOptions()` 経由での取得も node 環境では `undefined` になるため、テスト容易性のために関数を切り出した。ジェネリック `<T extends RestoredPersistFragment>` にすることで、実際の `PlanState` にも、テスト用の軽量フラグメント型にもそのまま使える（`persist(...)` への型伝播が壊れないことを `tsc --noEmit` で確認済み）。
3. **`stages.ts` はロジック変更なし、確認コメントのみ追加。** `deriveStages` は `PlanInput`（`usePlanStore` 由来）の `startYear`/`endYear` をそのまま使っており、ストア層の補正が単一の入力源になっているため、ゲームモード側の二重ガードは追加していない（FR3.1/FR3.2）。
4. **`page.tsx` の空結果メッセージは `Summary`/`ScenarioBar`/比較チャート/`NetWorthChart`/`CashFlowChart`/`ResultTable` の6要素のみを対象にし、`AssumptionsPanel` とゲームモード導線パネルは対象外とした。** これは requirements.md の Out of Scope 記載（人生ゲームモードUIはFR4対象外、`AssumptionsPanel` は入力のプレビューであり結果一覧ではないため）と整合させた判断。

## テストカバレッジ概要

- `dateRange.test.ts`: 4件（正常系1、境界値1、異常系2）。
- `usePlanStore.test.ts`: 追加6件（`setRange` の自動補正3件、永続化復元時の補正3件）。
- `HouseholdForm.test.tsx`: 新規3件（注意文言なし、自動補正で表示、再入力で消える）。
- `page.test.tsx`: 新規2件（通常時は非表示、空結果で共通メッセージ表示かつテーブル非表示）。
- 今回追加分は計15件（dateRange 4 + usePlanStore 6 + HouseholdForm 3 + page 2）。
- 全体: `npm run test`（vitest run、プロジェクト全体）— **Test Files 28 passed (28) / Tests 239 passed (239)**。既存テストは全て green のまま維持されている。

## プランからの逸脱

- **`unit-test-instructions.md` が示していた「永続化復元テストは `localStorage` を直接モックする」方針から逸脱し、`mergePersistedPlanState` という純粋関数への切り出しに変更した。** 理由: zustand v5 の `persist` 実装は `createJSONStorage` の storage getter を**モジュール読み込み時に同期的に**呼び出し、例外時は `storage` を `undefined` にして `merge` を含む persist 機構全体をスキップする。テストファイル内で `localStorage` を事前にスタブしても、モジュールの静的 import 時点（テストコードの実行前）に評価が走るため確実性に欠け、かつ同一テストファイル内の他のテスト（既存の `usePlanStore.reset` テスト群）とストアのシングルトンインスタンスを共有するため、環境（`environment: "node"`）を変えると既存テストへの影響範囲が広がるリスクがあった。関数を切り出すことで、実装（`persist` の `merge` オプション）とテストの両方から同じロジックを環境非依存に検証できるようにした。挙動・シグネチャ（`(persisted, current) => merged`）自体はプラン記載の意図（永続化復元時に `correctDateRange` を適用し `rangeAutoCorrected` を設定する）を完全に満たしている。
- **`usePlanStore.reset()` に `rangeAutoCorrected: false` のリセットを追加した。** プランに明記された変更点ではないが、既存の `reset()` の「入力を初期化する」意図と整合させるための小さな一貫性維持であり、動作追加は伴わない。
- それ以外はプランのステップ・トレーサビリティ記載どおりに実装した。Step 9（`stages.ts`）はプランの想定どおりコード変更不要と判断し、確認コメントのみ追加した。

## 検証

- `npx vitest run src/lib/simulation/dateRange.test.ts src/lib/store/usePlanStore.test.ts src/components/forms/HouseholdForm.test.tsx src/app/page.test.tsx` — 全件グリーン。
- `npm run test`（vitest run、プロジェクト全体）— **Test Files 28 passed (28)、Tests 239 passed (239)**。
- `npx tsc --noEmit` — 今回変更した範囲（`usePlanStore.ts` 含む）に起因する型エラーはゼロ。`src/components/charts/chart-aria.test.tsx` に1件の型エラーが残るが、これは本タスク着手前から存在する既存ファイルの既存エラーであり（`git log` で直近コミット `b4bcb06` の時点から変更なしを確認）、本スコープの変更に起因しないため対応していない。
