# PR 6: scenario ストアの分離と比較機能の features/scenario への移動 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** plan ストアに同居している比較用スナップショットを scenario の別ストア（persist キー `life-plan/scenarios/v1`）へ分離し、既存ユーザーの保存データを plan ストアの persist `migrate` で新キーへ移す。あわせて比較関連（`comparisonDiff`・`ScenarioBar`・`ComparisonChart`・`ComparisonDiffTable`）を `src/features/scenario/{domain,application,infrastructure,ui}` へ移す。計算結果・見た目・保存データの中身は変えない。

**Architecture:** scenario は simulation・plan の下流機能（`shared ← plan ← simulation ← scenario`）。domain はスナップショットの型と比較差分の純粋関数、application はスナップショット一覧を操作する純粋関数と zod スキーマ、infrastructure は scenario ストアの persist `merge`、ui は scenario ストアと比較 UI。plan は scenario のコードを import せず、移行先のキー文字列とバージョンだけを `plan/infrastructure` の定数として知る。2 ストアにまたがる操作（読込・全消去）は scenario ストアのアクションが plan ストアの公開アクションを呼ぶ（scenario → plan の向き）。

**Tech Stack:** TypeScript 5.7, Next.js 15（App Router、`"use client"`）, React 19, Zustand 5.0（`persist` ミドルウェア）, zod, vitest 3（既定 `environment: "node"`、DOM が要るテストは `// @vitest-environment jsdom`）

**Spec:** `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md`（本計画は 5 章の移行手順 #6 を実装する。根拠は 3.1・3.2 節のストア分解、4 章の scenario のファイル対応表、6 章の persist キー移行のテスト、7 章のエラー処理）。前段の計画 `docs/superpowers/plans/2026-09-26-pr5-game-feature.md` の「後続 PR への申し送り」のうち PR 6 分も本計画で扱う。

## Global Constraints

- 各 PR は挙動を変えず、既存テストがすべて通ることを条件とする（唯一の例外は「仕様からの補足・判断」3 で、仕様 3.2 節が指定する `replaceInput` 経由の読込による）。
- ファイル移動は `git mv` で行う。識別子の改名は移動と同じ PR で行わない（既存の関数名・型名・アクション名・ファイル名は変えない）。
- 例外を投げない。`try`/`catch` を使わない。永続化データは zod の `safeParse` で検証し、失敗時は既定値（入力）・除外（スナップショット要素）・空配列へフォールバックする。
- 新規の npm 依存を追加しない。
- テストは対象ファイルと同一ディレクトリに置く（コロケーション）。既定 `environment: "node"`。
- 他機能・`src/app`・旧ディレクトリ・同一機能の他の層からは `@/features/<feature>/<layer>`（層の index）で import する。同じ層の中のファイル同士は相対パス（`./snapshots` 等）で import し、自層の index は import しない（アーキテクチャテストで「自層の index」違反になる）。
- plan は scenario を import しない（下流機能の import は違反）。simulation・game も scenario を import しない。`src/app` は scenario を import できる。
- コミットメッセージ・コード内コメントは日本語、識別子は英語。
- ブランチは `refactor/scenario-feature`。PR はスカッシュマージ。
- 各 PR の確認は `npm run test` と `npm run build`。PR 6 は既存の localStorage データを持つブラウザで、スナップショットが引き継がれることを手動確認する。

## 仕様からの補足・判断

1. **移行先のキーとバージョンは `plan/infrastructure` の定数にし、scenario ストアもそれを使う**: `SCENARIOS_STORAGE_KEY = "life-plan/scenarios/v1"` と `SCENARIOS_STORAGE_VERSION = 1`。plan の `migrate` が書き出すキー・バージョンと、scenario ストアが読むキー・バージョンが食い違うと、移行したスナップショットが読まれず、次の保存で上書きされて消える。文字列を 2 か所に書かないことでこれを防ぐ。scenario/ui → plan/infrastructure の import は依存ルール上許可される。
2. **`migrate` は保存データのバージョン番号を見ない**: これまでの保存データは version 1 だけ。`snapshots` 配列を持つかどうかだけで判断し、冪等にする。
3. **`loadSnapshot` は plan の `replaceInput` を経由する（唯一の挙動差）**: 仕様 3.2 節のとおり。旧実装は `input` だけを書き換えて `rangeAutoCorrected` を据え置いていたが、`replaceInput` は `rangeAutoCorrected` を `false` に戻す。このため、期間自動補正の注意（HouseholdForm）が表示されている状態でスナップショットを読み込むと、注意が消えるようになる。読み込んだ入力はその補正と関係がないため消える方が正しく、ファイル読込（lp-033）とも揃う。Task 5 のテストで固定し、PR 本文に書く。
4. **全消去は scenario ストアの `reset`、plan の `reset` は入力のみ**: アクション名は改名しない。ページの「初期値に戻す」は scenario ストアの `reset` を呼ぶ（入力と保存済みプランを両方消す現在の挙動を保つ）。
   - 既存の不具合（本 PR では直さない）: `src/app/page.tsx` の「初期値に戻す」ダイアログは「保存済みプランは削除されません」と書いているが、実際には削除される（lp-020 で文言を追加したとき以来の食い違い）。挙動不変の原則により、文言と挙動のどちらに合わせるかは別 PR で決める。
5. **純粋関数の名前はストアのアクションと同名にする**: `saveSnapshot`・`removeSnapshot`・`loadSnapshot`（PR 3 の plan のユースケースと同じ流儀。ストアでは `saveSnapshot: (...) => set((s) => ({ snapshots: saveSnapshot(s.snapshots, ...) }))` のように委譲する）。
6. **scenario の各層の index が公開するもの**: 層外から実際に使われているものだけにする（PR 4・5 と同じ方針）。
   - domain: `buildComparisonDiff`、型 `ComparisonInput`・`DiffDirection`・`Snapshot`・`SnapshotOrigin`（`describeDepletion`・`diffDepletion`・`ComparisonDiffRow` は層内でしか使われないので出さない）
   - application: `snapshotSchema`, `saveSnapshot`, `removeSnapshot`, `loadSnapshot`（`snapshotOriginSchema` は出さない）
   - infrastructure: `mergePersistedScenarioState`
   - ui: `useScenarioStore`, `ScenarioBar`, `ComparisonChart`（`ComparisonDiffTable` は `ComparisonChart` が相対 import するので出さない）
7. **`Snapshot` 型は手書きの型のまま `scenario/domain` に移す**: `z.infer` にはしない（domain は zod を import できない）。`mergePersistedScenarioState` で `snapshotSchema` の出力を `Snapshot[]` に代入しているため、型のずれはビルドで検出される。
8. **`simulation/ui/planStore.integration.test.ts` の `store.saveSnapshot("noise")` は削除する**: simulation から scenario は下流の import になるため。スナップショットの保存は入力を変えないので、そのテストが検証する内容（reset 後の年次系列）は変わらない。
9. **既知の制約（テストしない）**:
   - 移行前のコードを読み込んだ古いタブが開いたままだと、そのタブが移行後に `life-plan/v1` へ version 1 で `snapshots` を書き戻すことがある。次回の読み込みでは新キーが既にあるため上書きせず、古いタブで移行後に保存したスナップショットは取り込まれない（冪等性の要件を優先する）。ローカル運用で再読み込みすれば解消するため許容する。
   - 新キーへの書き込みが容量超過等で失敗すると、ハイドレートが完了せず「読み込み中…」のままになる。`try`/`catch` を使わない方針のため扱わない。このとき旧キーは書き換わらないので、スナップショットは失われず次回の読み込みで再試行される。新キーへ書くのは旧キーに既にあったデータと同じ量なので、実際に起きる可能性は低い。
   - 本 PR より前のビルドへ戻すと、移行済みのデータ（`life-plan/v1` の version 2）を旧ビルドは migrate できず、入力が既定値で表示され、最初の編集で上書きされる。スナップショットも新キーにあるため見えなくなる。本 PR より前へロールバックしない（どうしても戻すときは、先に DevTools で `life-plan/v1` の `version` を 1 に戻す）。
10. **`src/lib`・`src/components` は本 PR で空になる**: git は空ディレクトリを追跡しないため、ディレクトリ自体も消える。`importRules.ts` の `LEGACY_DIRS` の削除とアーキテクチャテストの対象拡大、`.claude/CLAUDE.md` の「構成」節の更新は PR 7 で行う。

### 後続 PR への申し送り（本 PR で更新）

| 対象 | 内容 | 対応する PR |
|------|------|------|
| `src/architecture/importRules.ts` の `LEGACY_DIRS`・`src/architecture.test.ts` の `SCAN_ROOTS` | 旧ディレクトリの除外をやめ、アーキテクチャテストの対象を `src` 全体へ広げる | PR 7 |
| 各層の `index.ts` 冒頭コメントの「旧ディレクトリ」 | 旧ディレクトリが無くなるので記述を消す | PR 7 |
| `.claude/CLAUDE.md` の「構成」節 | 旧構成（`src/components` → `src/lib/store` → `src/lib/simulation`）の説明を新構成に更新する | PR 7 |
| `src/app/page.tsx` の「初期値に戻す」ダイアログの文言 | 「保存済みプランは削除されません」と実際の挙動（削除される）の食い違いを解消する | 別 PR（挙動の変更を伴う） |
| `@/features/scenario/ui` の index 経由で `/game` が比較グラフ（recharts）まで読み込む | `/game` の First Load JS が 150 kB → 258 kB に増えた。package.json の `sideEffects` 指定、または `/game` が使う `useScenarioStore` の import 経路から `ComparisonChart` を外すことを検討する | PR 7 または別 PR |

## Review Focus

1. **既存ユーザーのスナップショットの消失**: 旧形式（`life-plan/v1` に `snapshots` が同居、version 1）のデータを持つブラウザで新しいコードを開いたとき、plan ストアの移行が scenario ストアのハイドレートより先に走り、スナップショットがすべて scenario ストアに現れること。キーやバージョンの食い違い、ストアの読み込み順の取り違えで起きる。Task 5 の jsdom 結合テスト（実際の persist のハイドレート）と Task 7 の画面確認で押さえる。
2. **再読み込み・新キーが既にある場合の上書き**: 移行済みのユーザーが再読み込みしたとき、または新キーが既にある状態で version 1 の旧キーが残っていたとき、新キーのスナップショットが旧キーの内容で上書きされないこと。Task 4 の単体テスト（冪等・上書きしない）と Task 5 の結合テスト（2 回目のハイドレート）で押さえる。
3. **壊れた保存データ**: `snapshots` が配列でない、要素の一部が壊れている、state が `null` や文字列、のいずれでも例外を出さず、壊れた要素だけを除外して残りを表示すること（旧実装の `mergePersistedPlanState` と同じ結果）。Task 3・Task 4 の単体テストで押さえる。
4. **ゲーム由来のスナップショットの読込**: `/game` で保存したプランを `/` で読み込むと、`game-` で始まる id のイベントだけに「（ゲーム）」が 1 回だけ前置されること。Task 2 の単体テスト（対象の限定・冪等）と Task 7 の画面確認で押さえる。
5. **全消去の範囲**: 「初期値に戻す」は入力とスナップショットの両方を消し、「単身・賃貸で始める」「まっさらから入力」とファイル読込はスナップショットを消さないこと（分離前と同じ）。Task 5 の scenario ストアのテストで押さえる。

---

### Task 0: ブランチ作成・ベースライン記録・移行確認用データの準備

**Files:** なし

- [ ] **Step 1: 移行確認用の旧形式データをブラウザに作る（`main` のまま行う）**

```bash
git switch main && git pull
npm run dev
```

ブラウザで `http://localhost:3000/` を開き、次を行う（Task 7 の画面確認で、同じオリジンの localStorage を新しいコードで読み込むため。ポートを変えない）:
- 「現在のプランを保存」でプランを 2 件保存する（名前は「移行確認A」「移行確認B」）。
- `/game` でゲームを最後まで進め、結果画面から保存する（名前は「移行確認G」。比較画面で「ゲーム」の標識が付くもの）。
- DevTools の Application → Local Storage で `life-plan/v1` の値が `"version":1` で `"snapshots":[…3件…]` を含み、`life-plan/scenarios/v1` が無いことを確認する。値をテキストとして控える（Task 7 で比べる）。

dev サーバーを止める。

- [ ] **Step 2: ブランチを作成する**

```bash
git switch -c refactor/scenario-feature
```

- [ ] **Step 3: テスト件数のベースラインを記録する**

Run: `npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。計画作成時点では `Test Files  87 passed`・`Tests  752 passed`。実際の N・M を控える。

- [ ] **Step 4: ルート別のバンドルサイズを記録する**

Run: `npm run build 2>&1 | grep -E "^(┌|├|└)"`
Expected: ビルド成功。`/` と `/game` の Size・First Load JS を控える。

---

### Task 1: scenario/domain（スナップショットの型と比較差分）

**Files:**
- Create: `src/features/scenario/domain/snapshot.ts`
- Create: `src/features/scenario/domain/index.ts`
- Move: `src/lib/comparisonDiff.ts` → `src/features/scenario/domain/comparisonDiff.ts`
- Move: `src/lib/comparisonDiff.test.ts` → `src/features/scenario/domain/comparisonDiff.test.ts`
- Modify: `src/components/charts/ComparisonDiffTable.tsx:1`
- Modify: `src/architecture.test.ts`（走査確認の `expect` 行）

**Interfaces:**
- Consumes: `@/features/plan/domain` の型 `PlanInput`
- Produces: `@/features/scenario/domain` から型 `Snapshot = { id: string; name: string; input: PlanInput; origin: SnapshotOrigin }`、型 `SnapshotOrigin = "manual" | "game"`、`buildComparisonDiff(inputs: ComparisonInput[]): ComparisonDiffRow[]`、型 `ComparisonInput`・`DiffDirection`（シグネチャは移動前と同じ）

- [ ] **Step 1: アーキテクチャテストの走査確認に scenario/domain を足す**

`src/architecture.test.ts` の「検査対象のファイルを走査できている」で、`features/game/ui/index.ts` の行の後に 1 行足す:

```ts
    expect(files).toContain("features/scenario/domain/index.ts");
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL。「検査対象のファイルを走査できている」が `features/scenario/domain/index.ts` を含まないため失敗する。

- [ ] **Step 3: ファイルを移動する**

```bash
mkdir -p src/features/scenario/domain
git mv src/lib/comparisonDiff.ts src/features/scenario/domain/comparisonDiff.ts
git mv src/lib/comparisonDiff.test.ts src/features/scenario/domain/comparisonDiff.test.ts
```

`comparisonDiff.ts` の import（`@/shared/lib`・`@/features/simulation/domain`）と `comparisonDiff.test.ts` の import（`@/features/simulation/domain`・`./comparisonDiff`）はそのままでよい（scenario → shared・simulation は許可）。

- [ ] **Step 4: スナップショットの型を作る**

`src/features/scenario/domain/snapshot.ts`（中身は `src/features/plan/ui/usePlanStore.ts` の同名の型と同じ。plan 側の型は Task 5 で消す）:

```ts
import type { PlanInput } from "@/features/plan/domain";

/** スナップショットの由来（"game" はゲームモードの進行から保存されたもの）。 */
export type SnapshotOrigin = "manual" | "game";

/** 名前付きで保存した計画のスナップショット（比較用）。 */
export type Snapshot = {
  id: string;
  name: string;
  input: PlanInput;
  origin: SnapshotOrigin;
};
```

- [ ] **Step 5: domain の index を作る**

`src/features/scenario/domain/index.ts`:

```ts
/** scenario/domain の公開 API。他機能・app・旧ディレクトリ・同一機能の他層からはこの index 経由で import する。scenario/domain 内のファイルはこの index を import しない。 */
export { buildComparisonDiff, type ComparisonInput, type DiffDirection } from "./comparisonDiff";
export type { Snapshot, SnapshotOrigin } from "./snapshot";
```

- [ ] **Step 6: `ComparisonDiffTable.tsx` の import を書き換える**

`src/components/charts/ComparisonDiffTable.tsx` の 1 行目:

```ts
import { buildComparisonDiff, type ComparisonInput, type DiffDirection } from "@/features/scenario/domain";
```

- [ ] **Step 7: テストを実行する**

Run: `npx vitest run src/architecture.test.ts src/features/scenario src/components src/app`
Expected: すべて PASS（`comparisonDiff.test.ts` のケース数は移動前と同じ）。

Run: `grep -rn "lib/comparisonDiff" src`
Expected: 出力なし。

- [ ] **Step 8: コミットする**

```bash
git add -A src
git commit -m "refactor: 比較差分とスナップショットの型を features/scenario/domain へ移動（PR 6）"
```

---

### Task 2: scenario/application（スナップショットのスキーマとユースケース）

**Files:**
- Create: `src/features/scenario/application/snapshotSchema.ts`
- Create: `src/features/scenario/application/snapshotSchema.test.ts`
- Create: `src/features/scenario/application/snapshots.ts`
- Create: `src/features/scenario/application/snapshots.test.ts`
- Create: `src/features/scenario/application/index.ts`
- Modify: `src/features/plan/application/schema.test.ts:1-55`（`snapshotSchema` の describe を移す）
- Modify: `src/architecture.test.ts`（走査確認の `expect` 行）

**Interfaces:**
- Consumes: `@/features/plan/application` の `planInputSchema` と型 `IdGenerator = (prefix: string) => string`、`@/features/plan/domain` の型 `PlanInput`、`@/features/scenario/domain` の型 `Snapshot`・`SnapshotOrigin`
- Produces（`@/features/scenario/application` から）:
  - `snapshotSchema`（zod スキーマ。移動前と同じ定義）
  - `saveSnapshot(snapshots: Snapshot[], name: string, input: PlanInput, origin: SnapshotOrigin, idGen: IdGenerator): Snapshot[]`
  - `removeSnapshot(snapshots: Snapshot[], id: string): Snapshot[]`
  - `loadSnapshot(snapshots: Snapshot[], id: string): PlanInput | null`

`src/features/plan/application/schema.ts` の `snapshotSchema`・`snapshotOriginSchema` は plan ストアがまだ使っているため、このタスクでは残す（Task 5 で消す）。

- [ ] **Step 1: 走査確認に scenario/application を足す**

`src/architecture.test.ts` の「検査対象のファイルを走査できている」で、Task 1 で足した行の後に 1 行足す:

```ts
    expect(files).toContain("features/scenario/application/index.ts");
```

- [ ] **Step 2: スキーマのテストを移す**

`src/features/plan/application/schema.test.ts` から `describe("snapshotSchema", …)` のブロック全体（5〜55 行目）を切り取り、2 行目の import を次のようにする（3 行目の `defaultPlanInput` の import は残りのテストでも使っているので残す）:

```ts
import { planInputSchema } from "./schema";
```

切り取ったブロックで `src/features/scenario/application/snapshotSchema.test.ts` を作る:

```ts
import { describe, it, expect } from "vitest";
import { defaultPlanInput } from "@/features/plan/domain";
import { snapshotSchema } from "./snapshotSchema";

describe("snapshotSchema", () => {
  it("origin を持たない既存の保存データは manual として通る", () => {
    const parsed = snapshotSchema.safeParse({
      id: "snap-1",
      name: "プラン1",
      input: defaultPlanInput,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.origin).toBe("manual");
  });

  it("origin: game を保持する", () => {
    const parsed = snapshotSchema.safeParse({
      id: "snap-2",
      name: "ゲームの結果",
      input: defaultPlanInput,
      origin: "game",
    });
    expect(parsed.success && parsed.data.origin).toBe("game");
  });

  it("未知の origin は弾く", () => {
    const parsed = snapshotSchema.safeParse({
      id: "snap-3",
      name: "壊れたデータ",
      input: defaultPlanInput,
      origin: "unknown",
    });
    expect(parsed.success).toBe(false);
  });

  it("input が壊れていれば弾く", () => {
    const parsed = snapshotSchema.safeParse({
      id: "snap-4",
      name: "壊れたデータ",
      input: { startYear: "2030" },
    });
    expect(parsed.success).toBe(false);
  });

  it("id / name が文字列でなければ弾く", () => {
    expect(
      snapshotSchema.safeParse({ id: 1, name: "x", input: defaultPlanInput })
        .success,
    ).toBe(false);
    expect(
      snapshotSchema.safeParse({ id: "x", name: 1, input: defaultPlanInput })
        .success,
    ).toBe(false);
  });
});
```

（移す前の内容と差があれば、移す前の内容を正とする。テストの中身は変えない。）

- [ ] **Step 3: ユースケースの失敗するテストを書く**

`src/features/scenario/application/snapshots.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import type { Snapshot } from "@/features/scenario/domain";
import { loadSnapshot, removeSnapshot, saveSnapshot } from "./snapshots";

const idGen = (prefix: string) => `${prefix}-t1`;
const base = (): PlanInput => structuredClone(defaultPlanInput);

/** ゲーム由来（game- で始まる id）と本体のイベントが混ざった入力。 */
const gameInput = (): PlanInput => ({
  ...base(),
  events: [
    { id: "event-1", year: 2031, label: "住宅購入（頭金）", amount: -5_000_000 },
    { id: "game-ev-1", year: 2035, label: "臨時収入", amount: 300_000 },
    { id: "game-ev-2", year: 2040, label: "（ゲーム）医療費", amount: -200_000 },
  ],
});

const GAME_LABELS = ["住宅購入（頭金）", "（ゲーム）臨時収入", "（ゲーム）医療費"];

describe("saveSnapshot", () => {
  it("入力を複製したスナップショットを末尾に追加する", () => {
    const input = base();
    const existing: Snapshot[] = [
      { id: "snap-0", name: "既存", input: base(), origin: "manual" },
    ];
    const next = saveSnapshot(existing, "案A", input, "game", idGen);
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ id: "snap-t1", name: "案A", input, origin: "game" });
    // 保存後に元の入力を編集しても、保存済みのスナップショットに波及しない
    expect(next[1].input).not.toBe(input);
  });

  it("元の一覧を書き換えない", () => {
    const existing: Snapshot[] = [];
    saveSnapshot(existing, "案A", base(), "manual", idGen);
    expect(existing).toEqual([]);
  });
});

describe("removeSnapshot", () => {
  it("指定した id のスナップショットだけを取り除き、元の一覧は書き換えない", () => {
    const snaps: Snapshot[] = [
      { id: "snap-1", name: "A", input: base(), origin: "manual" },
      { id: "snap-2", name: "B", input: base(), origin: "manual" },
    ];
    expect(removeSnapshot(snaps, "snap-1").map((s) => s.id)).toEqual(["snap-2"]);
    expect(snaps).toHaveLength(2);
  });
});

describe("loadSnapshot", () => {
  it("手動保存のスナップショットは入力をそのまま複製して返す（ラベルを変えない）", () => {
    const snap: Snapshot = { id: "snap-1", name: "A", input: gameInput(), origin: "manual" };
    const loaded = loadSnapshot([snap], "snap-1");
    expect(loaded).toEqual(snap.input);
    expect(loaded).not.toBe(snap.input);
  });

  it("ゲーム由来は game- で始まる id のイベントにだけ「（ゲーム）」を前置する", () => {
    const snap: Snapshot = { id: "snap-1", name: "G", input: gameInput(), origin: "game" };
    expect(loadSnapshot([snap], "snap-1")?.events.map((e) => e.label)).toEqual(GAME_LABELS);
    // 保存済みのスナップショット自体は書き換えない
    expect(snap.input.events[1].label).toBe("臨時収入");
  });

  it("前置は冪等（読み込んだ入力を保存し直して再度読み込んでも二重にならない）", () => {
    const first = loadSnapshot(
      [{ id: "snap-1", name: "G", input: gameInput(), origin: "game" }],
      "snap-1",
    );
    expect(first).not.toBeNull();
    const again = loadSnapshot(
      [{ id: "snap-2", name: "G2", input: first as PlanInput, origin: "game" }],
      "snap-2",
    );
    expect(again?.events.map((e) => e.label)).toEqual(GAME_LABELS);
  });

  it("該当する id が無ければ null を返す", () => {
    expect(loadSnapshot([], "snap-x")).toBeNull();
  });
});
```

- [ ] **Step 4: テストが失敗することを確認する**

Run: `npx vitest run src/features/scenario/application`
Expected: FAIL。`./snapshotSchema` と `./snapshots` が解決できない。

- [ ] **Step 5: スキーマを作る**

`src/features/scenario/application/snapshotSchema.ts`（定義は `src/features/plan/application/schema.ts` の同名のものと同じ）:

```ts
import { z } from "zod";
import { planInputSchema } from "@/features/plan/application";

/**
 * スナップショットの由来。ゲームモードで作られたものは乱数由来の数値を含むため、
 * 恒久的に標識して本体のシナリオと区別できるようにする。
 * 既存の保存データ（origin を持たない）は "manual" として通す。
 */
export const snapshotOriginSchema = z.enum(["manual", "game"]).default("manual");

export const snapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: planInputSchema,
  origin: snapshotOriginSchema,
});
```

- [ ] **Step 6: ユースケースを作る**

`src/features/scenario/application/snapshots.ts`（本体は `src/features/plan/ui/usePlanStore.ts` の `saveSnapshot`・`removeSnapshot`・`loadSnapshot` アクションから取り出したもの）:

```ts
import type { PlanInput } from "@/features/plan/domain";
import type { IdGenerator } from "@/features/plan/application";
import type { Snapshot, SnapshotOrigin } from "@/features/scenario/domain";

/** ゲーム由来のイベントのラベルに前置する標識。 */
const GAME_EVENT_LABEL_PREFIX = "（ゲーム）";

/**
 * 計画を名前付きスナップショットとして末尾に追加した一覧を返す。
 * 入力は複製して保存し、以降の編集が保存済みのスナップショットに波及しないようにする。
 */
export function saveSnapshot(
  snapshots: Snapshot[],
  name: string,
  input: PlanInput,
  origin: SnapshotOrigin,
  idGen: IdGenerator,
): Snapshot[] {
  const snapshot: Snapshot = {
    id: idGen("snap"),
    name,
    input: structuredClone(input),
    origin,
  };
  return [...snapshots, snapshot];
}

/** 指定した id のスナップショットを取り除いた一覧を返す。 */
export function removeSnapshot(snapshots: Snapshot[], id: string): Snapshot[] {
  return snapshots.filter((snap) => snap.id !== id);
}

/**
 * スナップショットの入力を、現在の入力へ読み込める複製にして返す。該当する id が無ければ null。
 * ゲーム由来の乱数イベントが本体入力に無標識で混ざるのを防ぐ（免責節の要件）ため、
 * origin が game のときは game- で始まる id のイベント label に「（ゲーム）」を前置する。
 * 既に前置済みなら二重付与しない（冪等）。
 */
export function loadSnapshot(snapshots: Snapshot[], id: string): PlanInput | null {
  const snapshot = snapshots.find((snap) => snap.id === id);
  if (!snapshot) return null;
  const input = structuredClone(snapshot.input);
  if (snapshot.origin !== "game") return input;
  return {
    ...input,
    events: input.events.map((e) =>
      e.id.startsWith("game-") && !e.label.startsWith(GAME_EVENT_LABEL_PREFIX)
        ? { ...e, label: `${GAME_EVENT_LABEL_PREFIX}${e.label}` }
        : e,
    ),
  };
}
```

- [ ] **Step 7: application の index を作る**

`src/features/scenario/application/index.ts`:

```ts
/** scenario/application の公開 API。他機能・app・同一機能の他層からはこの index 経由で import する。scenario/application 内のファイルはこの index を import しない。 */
export { snapshotSchema } from "./snapshotSchema";
export { loadSnapshot, removeSnapshot, saveSnapshot } from "./snapshots";
```

- [ ] **Step 8: テストを実行する**

Run: `npx vitest run src/architecture.test.ts src/features/scenario src/features/plan/application`
Expected: すべて PASS。`snapshots.test.ts` の 7 ケースと `snapshotSchema.test.ts` の 5 ケースが PASS し、`plan/application/schema.test.ts` から `snapshotSchema` の describe が無くなっている。

- [ ] **Step 9: コミットする**

```bash
git add -A src
git commit -m "refactor: スナップショットのスキーマとユースケースを features/scenario/application に追加（PR 6）"
```

---

### Task 3: scenario/infrastructure（scenario ストアの persist merge）

**Files:**
- Create: `src/features/scenario/infrastructure/mergePersistedScenarioState.ts`
- Create: `src/features/scenario/infrastructure/mergePersistedScenarioState.test.ts`
- Create: `src/features/scenario/infrastructure/index.ts`
- Modify: `src/architecture.test.ts`（走査確認の `expect` 行）

**Interfaces:**
- Consumes: `@/features/scenario/application` の `snapshotSchema`、`@/features/scenario/domain` の型 `Snapshot`
- Produces: `@/features/scenario/infrastructure` から `mergePersistedScenarioState<T extends { snapshots: Snapshot[] }>(persisted: unknown, current: T): T`

- [ ] **Step 1: 走査確認に scenario/infrastructure を足す**

`src/architecture.test.ts` の「検査対象のファイルを走査できている」で、Task 2 で足した行の後に 1 行足す:

```ts
    expect(files).toContain("features/scenario/infrastructure/index.ts");
```

- [ ] **Step 2: 失敗するテストを書く**

`src/features/scenario/infrastructure/mergePersistedScenarioState.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { defaultPlanInput } from "@/features/plan/domain";
import type { Snapshot } from "@/features/scenario/domain";
import { mergePersistedScenarioState } from "./mergePersistedScenarioState";

/**
 * zustand persist は `localStorage` の無い実行環境（本プロジェクトのテストの
 * 既定 `environment: "node"`）では merge を呼び出さないため、純粋関数を直接検証する。
 */

const current = { snapshots: [] as Snapshot[] };
const valid: Snapshot = { id: "snap-1", name: "A", input: defaultPlanInput, origin: "manual" };

describe("mergePersistedScenarioState", () => {
  it("有効なスナップショットを保持し、origin の無い旧要素は manual として復元する", () => {
    const legacy = { id: "snap-2", name: "B", input: defaultPlanInput };
    const merged = mergePersistedScenarioState({ snapshots: [valid, legacy] }, current);
    expect(merged.snapshots).toEqual([valid, { ...legacy, origin: "manual" }]);
  });

  it("一部の要素が壊れていれば、その要素だけを除外する", () => {
    const merged = mergePersistedScenarioState(
      {
        snapshots: [
          valid,
          { id: 1, name: "x", input: defaultPlanInput },
          "broken",
          { ...valid, id: "snap-3", input: { startYear: "2030" } },
        ],
      },
      current,
    );
    expect(merged.snapshots).toEqual([valid]);
  });

  it("保存データが無ければ空配列にする", () => {
    expect(mergePersistedScenarioState(undefined, current).snapshots).toEqual([]);
  });

  it("snapshots が配列でない・state が壊れていれば空配列にする（例外を出さない）", () => {
    for (const persisted of [{ snapshots: "x" }, { snapshots: { a: 1 } }, {}, null, "broken", 42]) {
      expect(mergePersistedScenarioState(persisted, current).snapshots).toEqual([]);
    }
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `npx vitest run src/features/scenario/infrastructure`
Expected: FAIL。`./mergePersistedScenarioState` が解決できない。

- [ ] **Step 4: 実装する**

`src/features/scenario/infrastructure/mergePersistedScenarioState.ts`:

```ts
import { snapshotSchema } from "@/features/scenario/application";
import type { Snapshot } from "@/features/scenario/domain";

/**
 * scenario ストアの persist の `merge` オプション本体。
 * zustand の persist ミドルウェアは、実行環境に `localStorage` が無い場合
 * （本プロジェクトのテストの既定 `environment: "node"` を含む）は `merge` を
 * 一切呼び出さない実装のため、単体テストで直接呼び出せるよう純粋関数として
 * 切り出す（例外は投げない）。
 *
 * 永続化されたスナップショットを zod で 1 件ずつ検証し、壊れた要素は除外する。
 * 保存データが無い・snapshots が配列でない場合は空配列にする。
 */
export function mergePersistedScenarioState<T extends { snapshots: Snapshot[] }>(
  persisted: unknown,
  current: T,
): T {
  const p = persisted as { snapshots?: unknown } | undefined;

  const snapshots: Snapshot[] = Array.isArray(p?.snapshots)
    ? p.snapshots.flatMap((raw) => {
        const parsed = snapshotSchema.safeParse(raw);
        return parsed.success ? [parsed.data] : [];
      })
    : [];

  return { ...current, snapshots };
}
```

- [ ] **Step 5: infrastructure の index を作る**

`src/features/scenario/infrastructure/index.ts`:

```ts
/** scenario/infrastructure の公開 API。他機能・app・同一機能の他層からはこの index 経由で import する。scenario/infrastructure 内のファイルはこの index を import しない。 */
export { mergePersistedScenarioState } from "./mergePersistedScenarioState";
```

- [ ] **Step 6: テストを実行する**

Run: `npx vitest run src/architecture.test.ts src/features/scenario`
Expected: すべて PASS（`mergePersistedScenarioState.test.ts` の 4 ケースを含む）。

- [ ] **Step 7: コミットする**

```bash
git add -A src
git commit -m "refactor: scenario ストアの persist merge を features/scenario/infrastructure に追加（PR 6）"
```

---

### Task 4: plan/infrastructure に旧データの移行（persist migrate）を追加

**Files:**
- Create: `src/features/plan/infrastructure/migratePersistedPlanState.ts`
- Create: `src/features/plan/infrastructure/migratePersistedPlanState.test.ts`
- Modify: `src/features/plan/infrastructure/index.ts`

**Interfaces:**
- Consumes: なし
- Produces（`@/features/plan/infrastructure` から）:
  - `SCENARIOS_STORAGE_KEY = "life-plan/scenarios/v1"`
  - `SCENARIOS_STORAGE_VERSION = 1`
  - `migratePersistedPlanState(persisted: unknown, storage: Pick<Storage, "getItem" | "setItem">): unknown`（`snapshots` を取り除いた状態を返す。移行先へ書く値は `JSON.stringify({ state: { snapshots }, version: SCENARIOS_STORAGE_VERSION })`）

- [ ] **Step 1: 失敗するテストを書く**

`src/features/plan/infrastructure/migratePersistedPlanState.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { defaultPlanInput } from "@/features/plan/domain";
import {
  SCENARIOS_STORAGE_KEY,
  SCENARIOS_STORAGE_VERSION,
  migratePersistedPlanState,
} from "./migratePersistedPlanState";

/** 移行先キーの読み書きを記録するインメモリのストレージ。 */
function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

const rawSnapshots = [
  { id: "snap-1", name: "A", input: defaultPlanInput, origin: "manual" },
  // 要素の検証は scenario ストアの merge が行うため、壊れた要素もそのまま移す
  { id: 1, broken: true },
];

const legacyState = () => ({
  input: defaultPlanInput,
  snapshots: rawSnapshots,
  rangeAutoCorrected: false,
});

describe("migratePersistedPlanState（life-plan/v1 の version 1 → 2）", () => {
  it("旧 snapshots があり新キーが無ければ、生の配列を scenario の persist 形式で新キーへ書き出す", () => {
    const storage = memoryStorage();
    migratePersistedPlanState(legacyState(), storage);
    expect(SCENARIOS_STORAGE_KEY).toBe("life-plan/scenarios/v1");
    expect(JSON.parse(storage.items.get(SCENARIOS_STORAGE_KEY) ?? "null")).toEqual({
      state: { snapshots: rawSnapshots },
      version: SCENARIOS_STORAGE_VERSION,
    });
  });

  it("snapshots だけを取り除き、input と rangeAutoCorrected はそのまま返す（引数は書き換えない）", () => {
    const persisted = legacyState();
    const migrated = migratePersistedPlanState(persisted, memoryStorage());
    expect(migrated).toEqual({ input: defaultPlanInput, rangeAutoCorrected: false });
    expect(persisted.snapshots).toBe(rawSnapshots);
  });

  it("新キーが既にあれば上書きしない", () => {
    const existing = JSON.stringify({ state: { snapshots: [] }, version: 1 });
    const storage = memoryStorage({ [SCENARIOS_STORAGE_KEY]: existing });
    const migrated = migratePersistedPlanState(legacyState(), storage);
    expect(storage.items.get(SCENARIOS_STORAGE_KEY)).toBe(existing);
    expect(migrated).not.toHaveProperty("snapshots");
  });

  it("snapshots が配列でなければ新キーへ何も書かない", () => {
    for (const snapshots of [undefined, null, "x", { a: 1 }]) {
      const storage = memoryStorage();
      const migrated = migratePersistedPlanState({ input: defaultPlanInput, snapshots }, storage);
      expect(storage.items.has(SCENARIOS_STORAGE_KEY)).toBe(false);
      expect(migrated).toEqual({ input: defaultPlanInput });
    }
  });

  it("旧データが壊れていれば新キーへ何も書かず、例外も出さない", () => {
    for (const persisted of [undefined, null, "broken", 42]) {
      const storage = memoryStorage();
      expect(migratePersistedPlanState(persisted, storage)).toBe(persisted);
      expect(storage.items.has(SCENARIOS_STORAGE_KEY)).toBe(false);
    }
  });

  it("2 回実行しても結果が同じ（冪等）", () => {
    const storage = memoryStorage();
    const first = migratePersistedPlanState(legacyState(), storage);
    const written = storage.items.get(SCENARIOS_STORAGE_KEY);
    const second = migratePersistedPlanState(legacyState(), storage);
    expect(second).toEqual(first);
    expect(storage.items.get(SCENARIOS_STORAGE_KEY)).toBe(written);
    // 移行後の状態（snapshots なし）をもう一度通しても変わらない
    expect(migratePersistedPlanState(first, storage)).toEqual(first);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/features/plan/infrastructure/migratePersistedPlanState.test.ts`
Expected: FAIL。`./migratePersistedPlanState` が解決できない。

- [ ] **Step 3: 実装する**

`src/features/plan/infrastructure/migratePersistedPlanState.ts`:

```ts
/**
 * scenario ストアの persist キーとバージョン。plan は scenario のコードを import せず、
 * 旧データの移行先としてこの 2 つだけを知る。scenario ストアもこの定数を使い、
 * 移行先と読込先の食い違いを防ぐ。
 */
export const SCENARIOS_STORAGE_KEY = "life-plan/scenarios/v1";
export const SCENARIOS_STORAGE_VERSION = 1;

/** migrate が移行先キーの読み書きに使うストレージ（localStorage の必要部分）。 */
type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * plan ストアの persist の `migrate` オプション本体（version 1 → 2）。
 * version 1 では比較用スナップショットを plan のキー（life-plan/v1）に同居させていた。
 *
 * snapshots 配列があり、かつ移行先キーがまだ無いときに限り、生の配列を
 * scenario ストアの persist 形式で移行先キーへ書き出す（要素の検証は scenario
 * ストアの merge が行う）。移行先キーが既にあれば上書きしない（冪等）。
 * いずれの場合も snapshots を取り除いた状態を返し、input の検証は
 * mergePersistedPlanState に任せる。壊れた旧データはそのまま返す。例外は投げない。
 * テストではインメモリのストレージを渡して直接呼び出す。
 */
export function migratePersistedPlanState(persisted: unknown, storage: KeyValueStorage): unknown {
  if (typeof persisted !== "object" || persisted === null) return persisted;
  const { snapshots, ...rest } = persisted as Record<string, unknown>;
  if (Array.isArray(snapshots) && storage.getItem(SCENARIOS_STORAGE_KEY) === null) {
    storage.setItem(
      SCENARIOS_STORAGE_KEY,
      JSON.stringify({ state: { snapshots }, version: SCENARIOS_STORAGE_VERSION }),
    );
  }
  return rest;
}
```

- [ ] **Step 4: index に追加する**

`src/features/plan/infrastructure/index.ts` の末尾（`makeId` の行の後）に足す:

```ts
export {
  SCENARIOS_STORAGE_KEY,
  SCENARIOS_STORAGE_VERSION,
  migratePersistedPlanState,
} from "./migratePersistedPlanState";
```

- [ ] **Step 5: テストを実行する**

Run: `npx vitest run src/architecture.test.ts src/features/plan/infrastructure`
Expected: すべて PASS（`migratePersistedPlanState.test.ts` の 6 ケースを含む）。

- [ ] **Step 6: コミットする**

```bash
git add -A src
git commit -m "refactor: plan の persist に旧スナップショットを scenario のキーへ移す migrate を追加（PR 6）"
```

---

### Task 5: ストアの分離（plan ストアからスナップショットを外し、scenario ストアを作る）

plan ストアの縮小・`mergePersistedPlanState` の移動・scenario ストアの追加・呼び出し側の切り替えは、途中で止めると「スナップショットを保存する場所が無い」状態になるため 1 タスクで行う。

**Files:**
- Create: `src/features/plan/infrastructure/mergePersistedPlanState.ts`
- Create: `src/features/plan/infrastructure/mergePersistedPlanState.test.ts`
- Modify: `src/features/plan/infrastructure/index.ts`
- Modify: `src/features/plan/ui/usePlanStore.ts`
- Modify: `src/features/plan/ui/usePlanStore.test.ts`
- Modify: `src/features/plan/ui/index.ts`
- Modify: `src/features/plan/application/schema.ts:128-140`（`snapshotOriginSchema`・`snapshotSchema` を消す）
- Modify: `src/features/plan/application/index.ts`
- Modify: `src/features/simulation/ui/planStore.integration.test.ts:45`
- Create: `src/features/scenario/ui/useScenarioStore.ts`
- Create: `src/features/scenario/ui/useScenarioStore.test.ts`
- Create: `src/features/scenario/ui/persistMigration.integration.test.ts`
- Create: `src/features/scenario/ui/index.ts`
- Modify: `src/components/ScenarioBar.tsx`
- Modify: `src/components/ScenarioBar.test.tsx`
- Modify: `src/components/charts/ComparisonChart.tsx:16`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/app/game/page.tsx`
- Modify: `src/architecture.test.ts`（走査確認の `expect` 行）

**Interfaces:**
- Consumes: Task 1〜4 の `Snapshot`・`SnapshotOrigin`、`saveSnapshot`・`removeSnapshot`・`loadSnapshot`（純粋関数）、`mergePersistedScenarioState`、`migratePersistedPlanState`・`SCENARIOS_STORAGE_KEY`・`SCENARIOS_STORAGE_VERSION`、既存の `makeId: IdGenerator`
- Produces:
  - `@/features/plan/infrastructure` から `mergePersistedPlanState<T extends { input: PlanInput; rangeAutoCorrected: boolean }>(persisted: unknown, current: T): T`
  - `@/features/plan/ui` の `usePlanStore`（`snapshots`・`saveSnapshot`・`removeSnapshot`・`loadSnapshot` が無くなる。`reset` は入力のみを既定値へ戻す。persist は `life-plan/v1` の version 2）。型 `Snapshot` の再エクスポートは無くなる
  - `@/features/scenario/ui` から `useScenarioStore`。状態は `snapshots: Snapshot[]`、アクションは `saveSnapshot(name: string, input?: PlanInput, origin?: SnapshotOrigin): void`（`input` 省略時は plan の現在の入力、`origin` 省略時は `"manual"`）、`removeSnapshot(id: string): void`、`loadSnapshot(id: string): void`（plan の `replaceInput` を呼ぶ）、`reset(): void`（plan の `reset` を呼び、スナップショットも空にする）

- [ ] **Step 1: 走査確認に scenario/ui を足す**

`src/architecture.test.ts` の「検査対象のファイルを走査できている」で、Task 3 で足した行の後に 1 行足す:

```ts
    expect(files).toContain("features/scenario/ui/index.ts");
```

- [ ] **Step 2: `mergePersistedPlanState` のテストを plan/infrastructure へ移す**

`src/features/plan/ui/usePlanStore.test.ts` から `/** lp-019 / QA#1: 永続化復元時（persist の merge）…*/` のコメントと `describe("usePlanStore — 永続化復元時の期間自動補正", …)` のブロック（120〜171 行目付近）を切り取る。2 行目の import を次にする:

```ts
import { usePlanStore } from "./usePlanStore";
```

切り取ったブロックで `src/features/plan/infrastructure/mergePersistedPlanState.test.ts` を作り、`currentFragment` と各 `mergePersistedPlanState` 呼び出しの第 1 引数から `snapshots` を消す。snapshots を含む旧形式のケースを 1 つ足す:

```ts
import { describe, it, expect } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { mergePersistedPlanState } from "./mergePersistedPlanState";

/**
 * lp-019 / QA#1: 永続化復元時（persist の merge）の自動補正の回帰テスト。
 * zustand persist は `localStorage` の無い実行環境（本プロジェクトのテストの
 * 既定 `environment: "node"` を含む）では merge を呼び出さない実装のため、
 * merge ロジックを切り出した純粋関数 `mergePersistedPlanState` を直接検証する。
 */
describe("usePlanStore — 永続化復元時の期間自動補正", () => {
  const currentFragment = {
    input: defaultPlanInput,
    rangeAutoCorrected: false,
  };

  // （ここに切り取った 3 つの it を置く。各呼び出しの `{ input: persistedInput, snapshots: [] }` は
  //   `{ input: persistedInput }` にする。それ以外の中身は変えない）

  it("snapshots を含む旧形式のデータでも input だけを復元し、state に snapshots を持ち込まない", () => {
    const persistedInput: PlanInput = { ...defaultPlanInput, startYear: 2030, endYear: 2080 };
    const merged = mergePersistedPlanState(
      { input: persistedInput, snapshots: [{ id: "snap-1" }], rangeAutoCorrected: false },
      currentFragment,
    );
    expect(merged.input).toEqual(persistedInput);
    expect(merged).not.toHaveProperty("snapshots");
  });
});
```

（`PlanInput` の import が切り取った 3 ケースで不要なら、足したケースで使うので残す。）

- [ ] **Step 3: scenario ストアの失敗するテストを書く**

plan のストアテストから、スナップショットにかかわる検証を scenario ストアのテストへ移す。`src/features/plan/ui/usePlanStore.test.ts` を次のように直す:
- `describe("usePlanStore.reset", …)` の「30歳ペルソナ（配偶者・子・ローン・イベント・保存プラン）を全消去する」: タイトルを「30歳ペルソナ（配偶者・子・ローン・イベント）の入力を全消去する」にし、`store.saveSnapshot("プランA");`・`store.saveSnapshot("プランB");`・`expect(dirty.snapshots.length).toBe(2);`・`// 保存済み比較プラン（シナリオ）も全消去` とその次の `expect(after.snapshots).toEqual([]);` を消す。
- 同じ describe の「リセット後に別ペルソナ（20歳）を入力しても…」: `first.saveSnapshot("前ペルソナ");` と `expect(state.snapshots).toEqual([]);` を消す。
- 同じ describe の「保存済み比較プランが0件でもエラーなくリセットできる」「保存済み比較プランが複数件でもエラーなく全消去できる」を消す（下の scenario ストアのテストへ移す）。
- `describe("読み込み失敗時に現在のプランが不変", …)` の「成功時は replaceInput で置換され、snapshots は保持される」を消す（同上）。
- これで未使用になる `rich` ヘルパー（`/** プランファイルの読み込みテスト用の、… */` のコメントを含む）を消し、3〜4 行目の import から `type PlanInput` と `serializePlan` を消す（残す import は `defaultPlanInput`・`PLAN_FILE_FORMAT`・`parsePlanFile`。未使用のままだと `npm run lint` が失敗する）。

`src/features/scenario/ui/useScenarioStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { parsePlanFile, serializePlan } from "@/features/plan/infrastructure";
import { usePlanStore } from "@/features/plan/ui";
import { useScenarioStore } from "./useScenarioStore";

beforeEach(() => {
  useScenarioStore.getState().reset();
});

describe("useScenarioStore.saveSnapshot", () => {
  it("input を省略すると plan の現在の入力を複製して manual で保存する", () => {
    usePlanStore.getState().updateSelf({ name: "保存時点" });
    useScenarioStore.getState().saveSnapshot("案A");

    const [snap] = useScenarioStore.getState().snapshots;
    expect(snap).toMatchObject({ name: "案A", origin: "manual" });
    expect(snap.id).toMatch(/^snap-/);
    expect(snap.input).toEqual(usePlanStore.getState().input);

    usePlanStore.getState().updateSelf({ name: "保存後に変更" });
    expect(useScenarioStore.getState().snapshots[0].input.self.name).toBe("保存時点");
  });

  it("input と origin を渡すと、その内容で保存する（ゲームモードの保存）", () => {
    const projected: PlanInput = { ...structuredClone(defaultPlanInput), startYear: 2030 };
    useScenarioStore.getState().saveSnapshot("ゲームの結果", projected, "game");
    const [snap] = useScenarioStore.getState().snapshots;
    expect(snap).toMatchObject({ name: "ゲームの結果", origin: "game", input: projected });
    expect(usePlanStore.getState().input.startYear).not.toBe(2030);
  });
});

describe("useScenarioStore.removeSnapshot", () => {
  it("指定した id のスナップショットだけを削除する", () => {
    const store = useScenarioStore.getState();
    store.saveSnapshot("a");
    store.saveSnapshot("b");
    const [a, b] = useScenarioStore.getState().snapshots;
    useScenarioStore.getState().removeSnapshot(a.id);
    expect(useScenarioStore.getState().snapshots).toEqual([b]);
  });
});

describe("useScenarioStore.loadSnapshot", () => {
  it("スナップショットの入力を plan の replaceInput で読み込み、期間補正の表示を戻す", () => {
    usePlanStore.getState().updateSelf({ name: "保存したプラン" });
    useScenarioStore.getState().saveSnapshot("案A");
    usePlanStore.getState().updateSelf({ name: "編集中" });
    // 開始年 > 終了年で自動補正させ、補正の注意が出ている状態にする
    usePlanStore.getState().setRange(2050, 2040);
    expect(usePlanStore.getState().rangeAutoCorrected).toBe(true);

    const [snap] = useScenarioStore.getState().snapshots;
    useScenarioStore.getState().loadSnapshot(snap.id);

    expect(usePlanStore.getState().input).toEqual(snap.input);
    expect(usePlanStore.getState().input.self.name).toBe("保存したプラン");
    expect(usePlanStore.getState().rangeAutoCorrected).toBe(false);
  });

  it("存在しない id では plan の入力を変えない", () => {
    const before = usePlanStore.getState().input;
    useScenarioStore.getState().loadSnapshot("snap-missing");
    expect(usePlanStore.getState().input).toBe(before);
  });
});

describe("useScenarioStore.reset（全消去）", () => {
  it("plan の入力を既定値へ戻し、保存済み比較プランも空にする", () => {
    usePlanStore.getState().addLoan();
    usePlanStore.getState().addEvent();
    useScenarioStore.getState().saveSnapshot("プランA");
    useScenarioStore.getState().saveSnapshot("プランB");
    expect(useScenarioStore.getState().snapshots).toHaveLength(2);

    useScenarioStore.getState().reset();

    expect(usePlanStore.getState().input).toEqual(defaultPlanInput);
    expect(useScenarioStore.getState().snapshots).toEqual([]);
  });

  it("保存済み比較プランが0件でもエラーなくリセットできる", () => {
    expect(useScenarioStore.getState().snapshots).toEqual([]);
    expect(() => useScenarioStore.getState().reset()).not.toThrow();
    expect(useScenarioStore.getState().snapshots).toEqual([]);
  });

  it("保存済み比較プランが複数件でもエラーなく全消去できる", () => {
    const store = useScenarioStore.getState();
    store.saveSnapshot("a");
    store.saveSnapshot("b");
    store.saveSnapshot("c");
    expect(useScenarioStore.getState().snapshots.length).toBe(3);

    expect(() => useScenarioStore.getState().reset()).not.toThrow();
    expect(useScenarioStore.getState().snapshots).toEqual([]);
  });
});

describe("plan の入力だけを置き換える操作はスナップショットを保持する", () => {
  it("成功時は replaceInput で置換され、snapshots は保持される", () => {
    useScenarioStore.getState().saveSnapshot("keep");
    const src: PlanInput = { ...structuredClone(defaultPlanInput), startYear: 2030 };
    const r = parsePlanFile(serializePlan(src));
    if (r.ok) usePlanStore.getState().replaceInput(r.input);
    expect(usePlanStore.getState().input).toEqual(src);
    expect(useScenarioStore.getState().snapshots).toHaveLength(1);
  });

  it("単身・賃貸で始める（resetSingle）・まっさらから入力（startBlank）では消えない", () => {
    useScenarioStore.getState().saveSnapshot("keep");
    usePlanStore.getState().resetSingle();
    usePlanStore.getState().startBlank();
    expect(useScenarioStore.getState().snapshots).toHaveLength(1);
  });
});
```

（「成功時は replaceInput で置換され…」は plan のテストの `rich()` の代わりに開始年を変えた既定入力を使う。`serializePlan` → `parsePlanFile` の往復で値が変わらないことは `planFile.test.ts` が別に検証している。）

- [ ] **Step 4: 旧形式データからの移行の失敗する結合テストを書く**

`src/features/scenario/ui/persistMigration.integration.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { defaultPlanInput } from "@/features/plan/domain";

/**
 * 旧形式（life-plan/v1 に snapshots を同居、version 1）の保存データからの移行を、
 * 実際の persist のハイドレートで確認する。ストアはモジュールの読み込み時に
 * localStorage から同期的にハイドレートするため、テストごとに localStorage を
 * 用意してからモジュールを読み込み直す。scenario ストアは plan ストアを import する
 * ので、plan の migrate が scenario のハイドレートより先に走ることもここで確かめる。
 */

const PLAN_KEY = "life-plan/v1";
const SCENARIOS_KEY = "life-plan/scenarios/v1";

const legacySnapshot = {
  id: "snap-old",
  name: "旧プラン",
  input: defaultPlanInput,
  origin: "manual",
};
const legacyInput = { ...defaultPlanInput, self: { ...defaultPlanInput.self, name: "旧データの本人" } };

function writeLegacyPlan() {
  localStorage.setItem(
    PLAN_KEY,
    JSON.stringify({
      state: { input: legacyInput, snapshots: [legacySnapshot], rangeAutoCorrected: false },
      version: 1,
    }),
  );
}

function readItem(key: string) {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

/** モジュールを読み込み直し、localStorage からハイドレートした新しいストアを返す。 */
async function loadStores() {
  vi.resetModules();
  const { useScenarioStore } = await import("./useScenarioStore");
  const { usePlanStore } = await import("@/features/plan/ui");
  return { useScenarioStore, usePlanStore };
}

beforeEach(() => {
  localStorage.clear();
});

describe("旧形式の保存データからの移行（life-plan/v1 → life-plan/scenarios/v1）", () => {
  it("旧 snapshots が scenario ストアへ引き継がれ、plan のキーは version 2 で snapshots を持たない", async () => {
    writeLegacyPlan();
    const { useScenarioStore, usePlanStore } = await loadStores();

    expect(usePlanStore.getState().input.self.name).toBe("旧データの本人");
    expect(useScenarioStore.getState().snapshots).toEqual([legacySnapshot]);

    const plan = readItem(PLAN_KEY);
    expect(plan.version).toBe(2);
    expect(plan.state).not.toHaveProperty("snapshots");
    expect(readItem(SCENARIOS_KEY)).toEqual({ state: { snapshots: [legacySnapshot] }, version: 1 });
  });

  it("再読み込み（2 回目のハイドレート）でもスナップショットが保たれる", async () => {
    writeLegacyPlan();
    await loadStores();
    const { useScenarioStore } = await loadStores();
    expect(useScenarioStore.getState().snapshots).toEqual([legacySnapshot]);
    expect(readItem(PLAN_KEY).version).toBe(2);
  });

  it("新キーが既にあれば、version 1 の旧キーが残っていても上書きしない", async () => {
    const current = { ...legacySnapshot, id: "snap-new", name: "移行後に保存" };
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify({ state: { snapshots: [current] }, version: 1 }));
    writeLegacyPlan();

    const { useScenarioStore } = await loadStores();
    expect(useScenarioStore.getState().snapshots).toEqual([current]);
  });

  it("保存データが無ければ、どちらのストアも既定値で始まり新キーを作らない", async () => {
    const { useScenarioStore, usePlanStore } = await loadStores();
    expect(usePlanStore.getState().input).toEqual(defaultPlanInput);
    expect(useScenarioStore.getState().snapshots).toEqual([]);
    expect(localStorage.getItem(SCENARIOS_KEY)).toBeNull();
  });

  it("移行後の保存は scenario のキーにだけ書かれ、plan のキーには snapshots を書かない", async () => {
    writeLegacyPlan();
    const { useScenarioStore, usePlanStore } = await loadStores();

    useScenarioStore.getState().saveSnapshot("移行後");
    usePlanStore.getState().updateSelf({ name: "編集" });

    expect(readItem(SCENARIOS_KEY).state.snapshots.map((s: { name: string }) => s.name)).toEqual([
      "旧プラン",
      "移行後",
    ]);
    expect(readItem(PLAN_KEY).state).not.toHaveProperty("snapshots");
  });
});
```

- [ ] **Step 5: テストが失敗することを確認する**

Run: `npx vitest run src/features/scenario/ui src/features/plan/infrastructure/mergePersistedPlanState.test.ts`
Expected: FAIL。`./useScenarioStore` と `./mergePersistedPlanState` が解決できない。

- [ ] **Step 6: `mergePersistedPlanState` を plan/infrastructure へ移す**

`src/features/plan/infrastructure/mergePersistedPlanState.ts`（`usePlanStore.ts` の同名関数から snapshots の扱いを除いたもの）:

```ts
import { correctDateRange, defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { planInputSchema } from "@/features/plan/application";

/**
 * 永続化復元（persist の merge）で使う、復元後の input の断片型。
 * `rangeAutoCorrected` を含む点が PlanInput と異なる。
 */
type RestoredPersistFragment = {
  input: PlanInput;
  rangeAutoCorrected: boolean;
};

/**
 * lp-019 / QA#1: plan ストアの persist の `merge` オプション本体。
 * zustand の persist ミドルウェアは、実行環境に `localStorage` が
 * 無い場合（本プロジェクトのテストの既定 `environment: "node"` を含む）は
 * `merge` を一切呼び出さない実装のため、単体テストで直接呼び出せるよう
 * 純粋関数として切り出す（例外は投げない）。
 *
 * 永続化された入力を zod で検証し、壊れていれば既定値でフォールバックする。
 * さらに、復元した期間（startYear/endYear）が無効
 * （開始年>終了年、または期間1年未満）なら `correctDateRange` で
 * setRange と同じ補正を行い、`rangeAutoCorrected` に反映する。
 * スナップショットは scenario ストアが持つため、ここでは扱わない
 * （旧データの snapshots は migratePersistedPlanState が移す）。
 */
export function mergePersistedPlanState<T extends RestoredPersistFragment>(
  persisted: unknown,
  current: T,
): T {
  const p = persisted as { input?: unknown } | undefined;

  const parsedInput = planInputSchema.safeParse(p?.input);
  const restoredInput = parsedInput.success ? parsedInput.data : defaultPlanInput;

  const rangeCorrection = correctDateRange(
    restoredInput.startYear,
    restoredInput.endYear,
  );
  const input = rangeCorrection.corrected
    ? { ...restoredInput, endYear: rangeCorrection.endYear }
    : restoredInput;

  return {
    ...current,
    input,
    rangeAutoCorrected: rangeCorrection.corrected,
  };
}
```

`src/features/plan/infrastructure/index.ts` の末尾に足す:

```ts
export { mergePersistedPlanState } from "./mergePersistedPlanState";
```

- [ ] **Step 7: plan ストアからスナップショットを外す**

`src/features/plan/ui/usePlanStore.ts` を次のように直す。

import 部分: `@/features/plan/application` の import から `snapshotSchema` と `planInputSchema` を消し、`@/features/plan/domain` の import から `correctDateRange` を消す。`@/features/plan/infrastructure` の import を次にする:

```ts
import {
  makeId,
  mergePersistedPlanState,
  migratePersistedPlanState,
} from "@/features/plan/infrastructure";
```

型: `SnapshotOrigin`・`Snapshot` の型定義（各ドキュメントコメントを含む）を消す。`PlanState` から `snapshots`（とそのコメント）、`saveSnapshot`・`removeSnapshot`・`loadSnapshot`（と各コメント）を消す。`replaceInput` のコメントを次にする:

```ts
  /**
   * lp-033: 検証済みの PlanInput（ファイル読み込み・スナップショットの読込）で
   * 現在の入力を置き換える。
   */
  replaceInput: (input: PlanInput) => void;
```

`RestoredPersistFragment` 型と `mergePersistedPlanState` 関数（各ドキュメントコメントを含む）を消す。

ストア本体: 初期値の `snapshots: [],` を消す。`saveSnapshot`・`removeSnapshot`・`loadSnapshot` の 3 つのアクションを消す。`reset` をコメントごと次にする:

```ts
      /**
       * 入力を既定値へ戻す。
       * 対象は「入力」のみ: self / spouse / children / loans / events /
       * recurringExpenses / assets（taxable・taxFree）。これにより前ペルソナの
       * ローン・イベントが次のペルソナ入力へ混入しない。
       * 保存済み比較プラン（snapshots）は scenario ストアの reset が、この reset と
       * 合わせて空にする（全消去）。テーマ等の UI 設定や localStorage 上の
       * 別キーには触れない。
       */
      reset: () =>
        set({
          input: resetInput(),
          rangeAutoCorrected: false,
        }),
```

persist のオプションを次にする:

```ts
    {
      name: "life-plan/v1",
      // version 2: 比較用スナップショットを scenario ストア（life-plan/scenarios/v1）へ分離した。
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted) => migratePersistedPlanState(persisted, localStorage),
      merge: mergePersistedPlanState,
    },
```

（`migrate` は localStorage がある環境でしか呼ばれない。localStorage の無い環境では persist がストレージを持たず、migrate も merge も呼ばない。）

`src/features/plan/ui/index.ts` の最後の行を次にする:

```ts
export { usePlanStore } from "./usePlanStore";
```

- [ ] **Step 8: plan/application からスナップショットのスキーマを消す**

`src/features/plan/application/schema.ts` の `snapshotOriginSchema`・`snapshotSchema` の定義（ドキュメントコメントを含む、128〜140 行目付近）を消す。`src/features/plan/application/index.ts` の `./schema` の export から `snapshotOriginSchema,` と `snapshotSchema,` を消す。

- [ ] **Step 9: scenario ストアを作る**

`src/features/scenario/ui/useScenarioStore.ts`:

```ts
/**
 * 比較用スナップショットのグローバルストア。Zustand + persist で localStorage の
 * `life-plan/scenarios/v1` に保存する。旧データ（`life-plan/v1` に同居していた
 * snapshots）の移行は plan ストアの persist `migrate` が行う。このファイルは
 * plan ストアを import するため、scenario のハイドレートは常に plan の移行の後になる。
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PlanInput } from "@/features/plan/domain";
import {
  SCENARIOS_STORAGE_KEY,
  SCENARIOS_STORAGE_VERSION,
  makeId,
} from "@/features/plan/infrastructure";
import { usePlanStore } from "@/features/plan/ui";
import type { Snapshot, SnapshotOrigin } from "@/features/scenario/domain";
import {
  loadSnapshot,
  removeSnapshot,
  saveSnapshot,
} from "@/features/scenario/application";
import { mergePersistedScenarioState } from "@/features/scenario/infrastructure";

type ScenarioState = {
  /** 比較用に保存した計画のスナップショット一覧。 */
  snapshots: Snapshot[];
  /**
   * 計画を名前付きスナップショットとして保存する。
   * input を省略すると plan の現在の入力を複製する。ゲームモードは
   * 射影済みの PlanInput と origin: "game" を渡す。
   */
  saveSnapshot: (
    name: string,
    input?: PlanInput,
    origin?: SnapshotOrigin,
  ) => void;
  /** スナップショットを削除する。 */
  removeSnapshot: (id: string) => void;
  /** スナップショットの内容を plan の現在の入力に読み込む（plan の replaceInput）。 */
  loadSnapshot: (id: string) => void;
  /** 全消去。plan の入力を既定値へ戻し、保存済み比較プランも空にする。 */
  reset: () => void;
};

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set, get) => ({
      snapshots: [],

      saveSnapshot: (name, input, origin = "manual") =>
        set((s) => ({
          snapshots: saveSnapshot(
            s.snapshots,
            name,
            input ?? usePlanStore.getState().input,
            origin,
            makeId,
          ),
        })),

      removeSnapshot: (id) =>
        set((s) => ({ snapshots: removeSnapshot(s.snapshots, id) })),

      loadSnapshot: (id) => {
        const input = loadSnapshot(get().snapshots, id);
        if (input) usePlanStore.getState().replaceInput(input);
      },

      reset: () => {
        usePlanStore.getState().reset();
        set({ snapshots: [] });
      },
    }),
    {
      name: SCENARIOS_STORAGE_KEY,
      version: SCENARIOS_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      merge: mergePersistedScenarioState,
    },
  ),
);
```

`src/features/scenario/ui/index.ts`:

```ts
/** scenario/ui の公開 API。他機能・app・旧ディレクトリからはこの index 経由で import する。scenario/ui 内のファイルはこの index を import しない。 */
export { useScenarioStore } from "./useScenarioStore";
```

- [ ] **Step 10: 呼び出し側を scenario ストアへ切り替える**

`src/components/ScenarioBar.tsx`: import に `import { useScenarioStore } from "@/features/scenario/ui";` を足し（`@/features/plan/ui` の import の次の行）、18〜22 行目を次にする:

```ts
  const snapshots = useScenarioStore((s) => s.snapshots);
  const saveSnapshot = useScenarioStore((s) => s.saveSnapshot);
  const removeSnapshot = useScenarioStore((s) => s.removeSnapshot);
  const loadSnapshot = useScenarioStore((s) => s.loadSnapshot);
  const replaceInput = usePlanStore((s) => s.replaceInput);
```

`src/components/ScenarioBar.test.tsx`: import に `import { useScenarioStore } from "@/features/scenario/ui";` を足し、`usePlanStore` の import を消す。`afterEach` の中の `usePlanStore.getState().reset();` と、その後の `for (const snap of …) { …removeSnapshot… }` の 3 行を次の 1 行にする:

```ts
  useScenarioStore.getState().reset();
```

テスト本体の `usePlanStore.getState().saveSnapshot("テストプラン")` と 3 か所の `usePlanStore.getState().snapshots` を `useScenarioStore` に置き換える。

`src/components/charts/ComparisonChart.tsx` の 16 行目:

```ts
import type { Snapshot } from "@/features/scenario/domain";
```

`src/app/page.tsx`: import に `import { useScenarioStore } from "@/features/scenario/ui";` を足し（`@/features/plan/ui` の import の後）、`Home` の先頭の 2 行を次にする:

```ts
  const snapshots = useScenarioStore((s) => s.snapshots);
  // 「初期値に戻す」は全消去（入力と保存済み比較プラン。scenario ストアの reset）
  const reset = useScenarioStore((s) => s.reset);
```

（`input`・`startBlank`・`resetSingle` は `usePlanStore` のまま。ダイアログの文言は変えない。）

`src/app/page.test.tsx`: import に `import { useScenarioStore } from "@/features/scenario/ui";` を足す。`afterEach` の `usePlanStore.getState().reset();` を `useScenarioStore.getState().reset();` にする（スナップショットが後続のテストへ残らないようにする。scenario の reset は plan の reset も呼ぶ）。224 行目の `usePlanStore.getState().saveSnapshot("同じ案");` を `useScenarioStore.getState().saveSnapshot("同じ案");` にする。

`src/app/game/page.tsx`: import に `import { useScenarioStore } from "@/features/scenario/ui";` を足し（`@/features/plan/ui` の import の次の行）、29 行目を次にする:

```ts
  const saveSnapshot = useScenarioStore((s) => s.saveSnapshot);
```

`src/features/simulation/ui/planStore.integration.test.ts` の 45 行目 `store.saveSnapshot("noise");` を消す（「仕様からの補足・判断」8）。

- [ ] **Step 11: 残った参照が無いことを確認する**

Run: `grep -rnE "usePlanStore\(\(s\) => s\.(snapshots|saveSnapshot|removeSnapshot|loadSnapshot)|usePlanStore\.getState\(\)\.(snapshots|saveSnapshot|removeSnapshot|loadSnapshot)|\.snapshots\b" src/features/plan src/features/simulation src/features/game`
Expected: 出力なし。

Run: `grep -rn "snapshotSchema\|SnapshotOrigin\|type Snapshot" src/features/plan`
Expected: 出力なし。

- [ ] **Step 12: テストを実行する**

Run: `npx vitest run src/architecture.test.ts src/features src/components src/app`
Expected: すべて PASS。とくに次を名前で確認する:
- `persistMigration.integration.test.ts` の 5 ケース
- `useScenarioStore.test.ts` の 10 ケース（「スナップショットの入力を plan の replaceInput で読み込み、期間補正の表示を戻す」を含む）
- `mergePersistedPlanState.test.ts` の 4 ケース
- `ScenarioBar.test.tsx` と `page.test.tsx` の「同一シナリオのスナップショットを保存すると、差額・枯渇年の差がゼロで表示される」

Run: `npx tsc --noEmit -p .`
Expected: エラーなし。

- [ ] **Step 13: コミットする**

```bash
git add -A src
git commit -m "refactor: スナップショットを scenario の別ストアへ分離し、旧データを persist の migrate で移行（PR 6）"
```

---

### Task 6: 比較 UI を scenario/ui へ移す

**Files:**
- Move: `src/components/ScenarioBar.tsx` → `src/features/scenario/ui/ScenarioBar.tsx`
- Move: `src/components/ScenarioBar.test.tsx` → `src/features/scenario/ui/ScenarioBar.test.tsx`
- Move: `src/components/charts/ComparisonChart.tsx` → `src/features/scenario/ui/ComparisonChart.tsx`
- Move: `src/components/charts/ComparisonDiffTable.tsx` → `src/features/scenario/ui/ComparisonDiffTable.tsx`
- Move: `src/components/charts/comparison-chart-aria.test.tsx` → `src/features/scenario/ui/comparison-chart-aria.test.tsx`
- Modify: `src/features/scenario/ui/index.ts`
- Modify: `src/app/page.tsx:28-29`

**Interfaces:**
- Consumes: Task 5 の `useScenarioStore`
- Produces: `@/features/scenario/ui` から `ScenarioBar`・`ComparisonChart`（props は移動前と同じ）

- [ ] **Step 1: ファイルを移動する**

```bash
git mv src/components/ScenarioBar.tsx src/features/scenario/ui/ScenarioBar.tsx
git mv src/components/ScenarioBar.test.tsx src/features/scenario/ui/ScenarioBar.test.tsx
git mv src/components/charts/ComparisonChart.tsx src/features/scenario/ui/ComparisonChart.tsx
git mv src/components/charts/ComparisonDiffTable.tsx src/features/scenario/ui/ComparisonDiffTable.tsx
git mv src/components/charts/comparison-chart-aria.test.tsx src/features/scenario/ui/comparison-chart-aria.test.tsx
```

- [ ] **Step 2: アーキテクチャテストが失敗することを確認する**

Run: `npx vitest run src/architecture.test.ts`
Expected: FAIL。「features・shared・app に import ルール違反がない」で `features/scenario/ui/ScenarioBar.tsx → @/features/scenario/ui` と `features/scenario/ui/ScenarioBar.test.tsx → @/features/scenario/ui` が「自層の index」違反として報告される（`src/app/page.tsx` の `@/components/...` は旧ディレクトリの import なので検査対象外のまま、ビルドで失敗する）。

- [ ] **Step 3: 自層の index の import を相対パスにする**

`src/features/scenario/ui/ScenarioBar.tsx` と `src/features/scenario/ui/ScenarioBar.test.tsx` の

```ts
import { useScenarioStore } from "@/features/scenario/ui";
```

を次にする:

```ts
import { useScenarioStore } from "./useScenarioStore";
```

`ComparisonChart.tsx` の `./ComparisonDiffTable`（相対）、`@/features/scenario/domain`・`@/features/simulation/*`・`@/shared/*` の import はそのままでよい。

- [ ] **Step 4: ui の index に足す**

`src/features/scenario/ui/index.ts`:

```ts
/** scenario/ui の公開 API。他機能・app・旧ディレクトリからはこの index 経由で import する。scenario/ui 内のファイルはこの index を import しない。 */
export { ComparisonChart } from "./ComparisonChart";
export { ScenarioBar } from "./ScenarioBar";
export { useScenarioStore } from "./useScenarioStore";
```

- [ ] **Step 5: `src/app/page.tsx` の import を書き換える**

28〜29 行目（`@/components/charts/ComparisonChart` と `@/components/ScenarioBar` の import）を消し、Task 5 で足した `useScenarioStore` の import を次にする:

```ts
import { ComparisonChart, ScenarioBar, useScenarioStore } from "@/features/scenario/ui";
```

- [ ] **Step 6: テストを実行する**

Run: `npx vitest run src/architecture.test.ts src/features/scenario src/app`
Expected: すべて PASS。

Run: `grep -rnE "@/components/|@/lib/" src; ls src/lib src/components 2>&1`
Expected: grep は出力なし。`ls` は両方とも `No such file or directory`（git が空ディレクトリを追跡しないため、作業ツリーに空ディレクトリが残っていれば `rmdir src/components/charts src/components src/lib` で消す）。

- [ ] **Step 7: コミットする**

```bash
git add -A src
git commit -m "refactor: 比較 UI を features/scenario/ui へ移動（PR 6）"
```

---

### Task 7: 全体確認・移行の画面確認・PR 作成

**Files:** なし（確認で問題が見つかった場合のみ修正）

- [ ] **Step 1: 全テスト・lint・ビルドを通す**

Run: `CI=true npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。Task 0 の N・M に対して `Test Files` は N + 7、`Tests` は M + 30（計画作成時点の値では 94・782）。内訳:
- 新しいテストファイル 7: `snapshotSchema.test.ts`・`snapshots.test.ts`・`mergePersistedScenarioState.test.ts`・`migratePersistedPlanState.test.ts`・`mergePersistedPlanState.test.ts`・`useScenarioStore.test.ts`・`persistMigration.integration.test.ts`（移動したファイルは増減なし）
- 新しいケース 30: `snapshots.test.ts` 7、`mergePersistedScenarioState.test.ts` 4、`migratePersistedPlanState.test.ts` 6、`mergePersistedPlanState.test.ts` の追加 1、`useScenarioStore.test.ts` のうち新規 7（10 ケース中 3 ケースは plan のストアテストから移したもの）、`persistMigration.integration.test.ts` 5
- 数が合わなければ、消えたケースが無いか（移したケースの移し漏れ）を先に調べる。

Run: `git status --short`
Expected: 出力なし（`.claude/settings.json` の未追跡は作業前からのもので対象外）。

Run: `npm run lint`
Expected: エラー・警告なし。

Run: `npm run build 2>&1 | grep -E "^(┌|├|└)"`
Expected: ビルド成功。`/` と `/game` の First Load JS を Task 0 と比べる（`/game` は scenario ストアを読み込むようになるので増えうる。増えていれば PR 本文に数値を書く）。

- [ ] **Step 2: 既存データの移行を画面で確認する（Review Focus 1・2・4・5）**

`npm run dev` で起動し、Task 0 で旧形式データを作ったのと同じオリジン（`http://localhost:3000`）で開く。
- `/`: 「移行確認A」「移行確認B」「移行確認G（ゲームの標識付き）」の 3 件が比較バーに並び、比較グラフと差分表に 3 系列（＋現在）が出る。入力フォームの内容が Task 0 の時点と同じ。
- DevTools の Local Storage: `life-plan/v1` が `"version":2` で `snapshots` を含まない。`life-plan/scenarios/v1` が `"version":1` で 3 件の snapshots を含む（Task 0 で控えた値と中身が同じ）。
- 再読み込みを 2 回して、3 件のまま・値が変わらないことを確認する。
- 「移行確認G」を読込: 単発イベントのうちゲーム由来のものだけラベルが「（ゲーム）…」になり、二重にならない。もう一度読込しても同じ。
- プランを 1 件削除して再読み込み: 削除が保たれる。
- 「単身・賃貸で始める」と「JSONで書き出し」→「JSONを読み込み」: 保存済みプランは残る。
- 「初期値に戻す」: 入力が既定値に戻り、保存済みプランも消える（分離前と同じ挙動。ダイアログの文言との食い違いは既知の問題として別 PR）。
- `/game`: ゲームを最後まで進めて保存し、`/` に戻ると「ゲーム」の標識付きで比較バーに現れる。
- DevTools の Local Storage を全部消して再読み込み: 既定値で始まり、エラーにならない（新規利用者）。

- [ ] **Step 3: プッシュして PR を作る**

```bash
git push -u origin refactor/scenario-feature
gh pr create --title "refactor: scenario ストアの分離と比較機能の features/scenario への移動（PR 6）" --body "$(cat <<'EOF'
## 概要

設計 `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md` の移行手順 #6。比較用スナップショットを plan ストアから scenario の別ストア（persist キー `life-plan/scenarios/v1`）へ分離し、比較関連を `src/features/scenario/{domain,application,infrastructure,ui}` へ移した。

- 既存ユーザーのスナップショットは、plan ストアの persist を version 2 に上げ、`migrate`（`plan/infrastructure/migratePersistedPlanState.ts`）で新キーへ移す。新キーが既にあれば上書きしない（冪等）。plan は scenario のコードを import せず、移行先のキーとバージョンの定数だけを持つ
- スナップショット要素の検証は scenario ストアの `merge`（`scenario/infrastructure`）が行い、壊れた要素は除外する（従来と同じ結果）
- 読込・全消去は scenario ストアのアクションが plan ストアの `replaceInput`・`reset` を呼ぶ
- `src/lib/comparisonDiff.ts` → `scenario/domain`、`ScenarioBar`・`ComparisonChart`・`ComparisonDiffTable` → `scenario/ui`。`src/lib`・`src/components` はこれで空になった
- 詳細と後続 PR への申し送りは `docs/superpowers/plans/2026-09-26-pr6-scenario-feature.md`

## 挙動の差

- スナップショットの読込は plan の `replaceInput` を経由するため、期間自動補正の注意が出ている状態で読み込むと注意が消える（ファイル読込と同じ挙動に揃った）。それ以外の計算結果・見た目・保存データの中身は変えていない

## 既知の問題（本 PR では直さない）

- 「初期値に戻す」のダイアログは「保存済みプランは削除されません」と書いているが、実際には削除される（本 PR の前から）

## 確認

- [x] `npm run test`（旧形式データからの移行を jsdom で実際にハイドレートする結合テストを含む）
- [x] `npm run lint`
- [x] `npm run build`
- [x] 旧形式の localStorage を持つブラウザで、スナップショット 3 件（ゲーム由来を含む）が引き継がれ、再読み込みしても保たれることを確認

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

バンドルサイズが増えていた場合は、PR 本文の「確認」の下に Task 0 と Task 7 の `/`・`/game` の First Load JS を追記する。
