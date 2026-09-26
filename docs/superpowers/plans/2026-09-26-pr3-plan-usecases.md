# PR 3: plan の編集ユースケースの抽出と IdGenerator 注入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/features/plan/ui/usePlanStore.ts` の入力編集アクションの本体を `src/features/plan/application` の純粋関数（`(input, args, idGen) => PlanInput`）へ抜き出し、ストアは `set((s) => ({ input: toggleSpouse(s.input, enabled, makeId) }))` のように委譲するだけにする。ID 生成は `IdGenerator` 関数型（application）と実装 `makeId`（infrastructure）に分ける。挙動・見た目・永続化形式は変えない。

**Architecture:** ユースケースはエンティティ単位のファイル（`period.ts`, `household.ts`, `loans.ts`, `lifeEvents.ts`, `recurringExpenses.ts`, `incomeAdjustments.ts`, `properties.ts`, `settings.ts`, `presets.ts`）に置き、`plan/application/index.ts` から公開する。どれも引数の `PlanInput` を変更せず新しいオブジェクトを返す（変更が無いときは引数の参照をそのまま返す）。ID が必要な関数だけが `idGen: IdGenerator` を受け取り、テストでは決定的な実装を渡す。ストア（ui）は `@/features/plan/application` と `@/features/plan/infrastructure` の index から import して委譲する。

**Tech Stack:** TypeScript 5.7, Next.js 15, Zustand（persist）, vitest 3（既定 `environment: "node"`）, Node 22

**Spec:** `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md`（本計画は 5 章の移行手順 #3 を実装する。根拠は 2.1・2.2 節の層と import ルール、3.1 節の plan ストアの分解表、6 章「ユースケース」）。前段の計画 `docs/superpowers/plans/2026-09-26-pr2b-plan-ui.md` の「後続 PR への申し送り」も参照する。

## Global Constraints

- 各 PR は挙動を変えず、既存テストがすべて通ることを条件とする。
- 識別子の改名は移動と同じ PR で行わない（ストアのアクション名・state 名・`makeId` の名前は変えない）。
- 例外を投げない。`try`/`catch` を使わない。
- 新規の npm 依存を追加しない。
- `plan/application` は `react`・`zustand` 等を import しない（`zod` のみ可）。`plan/infrastructure` も同様。
- 他機能・`src/app`・旧ディレクトリ・同一機能の他の層からは `@/features/plan/<layer>`（層の index）で import する。同じ層の中のファイル同士は相対パス（`./household` 等）で import し、自層の index は import しない。
- テストは対象ファイルと同一ディレクトリに置く（コロケーション）。既定 `environment: "node"`。
- 既存のストアテスト `src/features/plan/ui/usePlanStore.test.ts` は変更しない（委譲後の回帰検知に使う）。
- コミットメッセージ・コード内コメントは日本語、識別子は英語。
- ブランチは `refactor/plan-usecases`。PR はスカッシュマージ。
- 各 PR の確認は `npm run test` と `npm run build`。

## 仕様からの補足・判断

1. **ユースケースの関数名はストアのアクション名と同じにする**（`setRange`, `toggleSpouse`, `addLoan` …）。仕様 3.1 節の例 `toggleSpouse(s.input, enabled, idGen)` に合わせる。例外は `reset`→`resetInput`、`resetSingle`→`resetSingleInput`（ストアの `reset` は snapshots も消すので、入力だけを返す関数と区別する）。ストア内ではオブジェクトのプロパティ名と import した関数名が同じになるが、プロパティ名は束縛を作らないので本体の `setRange(...)` は import した関数を指す。
2. **`setRange` は `{ input, rangeAutoCorrected }` を返す**: 補正の有無もユースケースの結果なので、ストアの state 断片と同じ形で返し、ストアは `set((s) => setRange(s.input, startYear, endYear))` とする。
3. **変更が無いときは同じ参照を返す**: 現行の `toggleSpouse`（既に同じ状態）と `updateSpouse`（配偶者なし）はストアで `return s` しており、state が更新されず persist も書き込まない。委譲後もストア側で `input === s.input ? s : { input }` とし、この挙動を保つ。
4. **ID の形式は変えない**: `makeId` は `${prefix}-${randomUUID}` を返す。ゲームモードは `game-` で始まる id でゲーム由来イベントを見分けるため、prefix 付きの形式を保つ。`IdGenerator` は `(prefix: string) => string` とし、prefix（`child`・`loan`・`event`・`property`・`rec`・`adj`・`snap`）は各ユースケースが渡す。
5. **本 PR で扱わないもの**:
   - スナップショット関連（`snapshots`, `saveSnapshot`, `removeSnapshot`, `loadSnapshot`）は PR 6 で scenario へ移すので、ストアに残す。`saveSnapshot` の `makeId` だけは infrastructure の `makeId` に置き換わる。
   - `mergePersistedPlanState` の `plan/infrastructure` への移動は PR 6 に回す。`Snapshot` 型（ui）と snapshots の復元に依存しており、PR 6 で snapshots を外して書き直すため、今移すと同じ関数を 2 回動かすことになる。
   - `replaceInput` は `structuredClone` するだけなのでストアに残す。
   - PR 2b の申し送り（`usePlanStore.test.ts` の `runSimulation` を使うケースの分離）は PR 4 で扱う。本 PR ではストアテストを変更しない。

### 後続 PR への申し送り（本 PR で更新）

| 対象 | 内容 | 対応する PR |
|------|------|------|
| `features/plan/ui/usePlanStore.ts` の `mergePersistedPlanState` | `plan/infrastructure` へ移す（snapshots の検証は scenario の `merge` へ） | PR 6 |
| `features/plan/ui/usePlanStore.ts` の `saveSnapshot`・`removeSnapshot`・`loadSnapshot` | scenario ストア・ユースケースへ移す。ID は `IdGenerator`（`@/features/plan/application`）と `makeId`（`@/features/plan/infrastructure`）を使う | PR 6 |
| `features/plan/ui/usePlanStore.test.ts` の `runSimulation` を使うケース | simulation 側の統合テストへ分離する（PR 2b から継続） | PR 4 |
| `features/plan/infrastructure/planFile.test.ts`・`features/plan/application/{newLoan,newRecurringExpense}.test.ts`・`src/components/forms/number-input.integration.test.ts` | `runSimulation` への依存（PR 2a・2b から継続） | PR 4 |

## Review Focus

1. **引数の破壊的変更**: ユースケースが引数の `PlanInput`（特に共有参照の `defaultPlanInput` や、その `children`・`loans` 等の配列）を書き換えると、既定値やスナップショットが汚染される。各テストで呼び出し前の `structuredClone` と呼び出し後の引数を `toEqual` で比べる。
2. **変更が無い操作で state が更新されない**: 配偶者ありで `toggleSpouse(true)`、配偶者なしで `updateSpouse` を呼んだとき、ユースケースは同じ参照を返し、ID も採番しないこと（テストで `toBe` と採番回数を確認）。ストアは `return s` を保つこと（Task 2 のストア差し替えで確認）。
3. **ID の形式と一意性**: `makeId` が `prefix-` で始まり、呼ぶたびに異なる値を返すこと。`crypto.randomUUID` が無い環境（フォールバック）でも同じ形式であること（Task 1 のテスト）。
4. **`incomeAdjustments`・`properties` が未定義の古い入力**: 旧データでは両者が `undefined` のことがある。追加・更新・削除で例外にならず、追加は 1 件の配列になること。`updateLoan` は `properties` が `undefined` なら `undefined` のまま返すこと（現行の `?.map` と同じ）。
5. **保存済みデータの復元**: persist の `name`・`version`・`merge` は変えないので、既存の localStorage `life-plan/v1` がそのまま復元されること。Task 6 の画面確認で見る。

---

### Task 0: ブランチ作成とベースライン記録

**Files:** なし

- [x] **Step 1: ブランチを作成する**

```bash
git switch main && git pull
git switch -c refactor/plan-usecases
```

- [x] **Step 2: テスト件数のベースラインを記録する**

Run: `npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。`Test Files  N passed` と `Tests  M passed` の N・M を控える。本 PR ではテストを追加するだけなので、最終的に N・M はそれぞれ増え、減ることはない。

---

### Task 1: IdGenerator 型と makeId 実装

**Files:**
- Create: `src/features/plan/application/idGenerator.ts`
- Modify: `src/features/plan/application/index.ts`
- Create: `src/features/plan/infrastructure/makeId.ts`
- Create: `src/features/plan/infrastructure/makeId.test.ts`
- Modify: `src/features/plan/infrastructure/index.ts`
- Modify: `src/features/plan/ui/usePlanStore.ts:168-175`（ローカルの `makeId` を削除し import に置き換え）

**Interfaces:**
- Produces: `@/features/plan/application` から `type IdGenerator = (prefix: string) => string`。`@/features/plan/infrastructure` から `makeId: IdGenerator`（戻り値 `${prefix}-${乱数}`）

- [x] **Step 1: 失敗するテストを書く**

`src/features/plan/infrastructure/makeId.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeId } from "./makeId";

describe("makeId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefix- で始まる id を返す", () => {
    expect(makeId("loan")).toMatch(/^loan-[0-9a-f-]{36}$/);
  });

  it("呼ぶたびに異なる id を返す", () => {
    expect(makeId("event")).not.toBe(makeId("event"));
  });

  it("crypto が無い環境でも prefix- で始まる id を返す", () => {
    vi.stubGlobal("crypto", undefined);
    expect(makeId("child")).toMatch(/^child-[0-9a-z]+$/);
  });
});
```

- [x] **Step 2: 失敗を確認する**

Run: `npx vitest run src/features/plan/infrastructure/makeId.test.ts`
Expected: FAIL（`./makeId` が見つからない）

- [x] **Step 3: 型と実装を書く**

`src/features/plan/application/idGenerator.ts`:

```ts
/**
 * 新しい要素（子・ローン・イベント等）の id を採番する関数の型。
 * 戻り値は `${prefix}-…` の形にする（ゲームモードは `game-` で始まる id で
 * ゲーム由来のイベントを見分けるため）。実装は plan/infrastructure の makeId。
 * テストでは決定的な実装を渡す。
 */
export type IdGenerator = (prefix: string) => string;
```

`src/features/plan/application/index.ts` の先頭の `export { applyHouseholdDefaults } ...` の直後に 1 行追加する:

```ts
export type { IdGenerator } from "./idGenerator";
```

`src/features/plan/infrastructure/makeId.ts`（`usePlanStore.ts` の `makeId` 本体をそのまま移す）:

```ts
import type { IdGenerator } from "@/features/plan/application";

/** ランダムな id を生成する（crypto があれば利用）。 */
export const makeId: IdGenerator = (prefix) => {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
};
```

`src/features/plan/infrastructure/index.ts` の末尾に追加する:

```ts
export { makeId } from "./makeId";
```

- [x] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/features/plan/infrastructure/makeId.test.ts`
Expected: PASS（3 件）

- [x] **Step 5: ストアのローカル makeId を置き換える**

`src/features/plan/ui/usePlanStore.ts` から次のブロックを削除する:

```ts
/** ランダムな id を生成する（crypto があれば利用）。 */
function makeId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
}
```

`@/features/plan/application` の import ブロックの直後に追加する:

```ts
import { makeId } from "@/features/plan/infrastructure";
```

- [x] **Step 6: 全テストとアーキテクチャテストを確認する**

Run: `npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。Tests は M + 3。

- [x] **Step 7: コミットする**

```bash
git add src/features/plan/application/idGenerator.ts src/features/plan/application/index.ts src/features/plan/infrastructure/makeId.ts src/features/plan/infrastructure/makeId.test.ts src/features/plan/infrastructure/index.ts src/features/plan/ui/usePlanStore.ts
git commit -m "$(cat <<'EOF'
refactor: id 採番を IdGenerator 型と infrastructure の makeId に分離

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 期間・世帯（本人・配偶者・子）のユースケース

**Files:**
- Create: `src/features/plan/application/period.ts`, `period.test.ts`
- Create: `src/features/plan/application/household.ts`, `household.test.ts`
- Modify: `src/features/plan/application/index.ts`
- Modify: `src/features/plan/ui/usePlanStore.ts`（`setRange`・`updateSelf`・`toggleSpouse`・`updateSpouse`・`addChild`・`updateChild`・`removeChild`）

**Interfaces:**
- Consumes: `IdGenerator`（Task 1、`./idGenerator`）、`applyHouseholdDefaults(input, previousComposition, newIds)`（`./householdDefaultsSync`）、`nextChildName(children)`（`./nextChildName`）
- Produces（`@/features/plan/application`）:
  - `setRange(input: PlanInput, startYear: number, endYear: number): { input: PlanInput; rangeAutoCorrected: boolean }`
  - `updateSelf(input: PlanInput, patch: Partial<Person>): PlanInput`
  - `toggleSpouse(input: PlanInput, enabled: boolean, idGen: IdGenerator): PlanInput`
  - `updateSpouse(input: PlanInput, patch: Partial<Person>): PlanInput`
  - `addChild(input: PlanInput, idGen: IdGenerator): PlanInput`
  - `updateChild(input: PlanInput, id: string, patch: Partial<Child>): PlanInput`
  - `removeChild(input: PlanInput, id: string, idGen: IdGenerator): PlanInput`

- [x] **Step 1: 失敗するテストを書く**

`src/features/plan/application/period.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { setRange } from "./period";

const base = (): PlanInput => structuredClone(defaultPlanInput);

describe("setRange", () => {
  it("正常な期間はそのまま設定し、rangeAutoCorrected は false", () => {
    const input = base();
    const before = structuredClone(input);
    const result = setRange(input, 2030, 2080);
    expect(result.input).toEqual({ ...before, startYear: 2030, endYear: 2080 });
    expect(result.rangeAutoCorrected).toBe(false);
    expect(input).toEqual(before);
  });

  it("開始年 > 終了年なら endYear = startYear + 1 に補正し、rangeAutoCorrected は true", () => {
    const result = setRange(base(), 2040, 2030);
    expect(result.input.startYear).toBe(2040);
    expect(result.input.endYear).toBe(2041);
    expect(result.rangeAutoCorrected).toBe(true);
  });
});
```

`src/features/plan/application/household.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_EDUCATION, defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";
import {
  addChild,
  removeChild,
  toggleSpouse,
  updateChild,
  updateSelf,
  updateSpouse,
} from "./household";

const base = (): PlanInput => structuredClone(defaultPlanInput);

/** 呼ばれた順に prefix-t1, prefix-t2 … を返す決定的な採番と、呼び出し回数。 */
function sequentialIds(): { idGen: IdGenerator; calls: () => number } {
  let n = 0;
  return { idGen: (prefix) => `${prefix}-t${++n}`, calls: () => n };
}

describe("updateSelf", () => {
  it("生年を変えると、差分だけ終了年をずらす（終了年齢を保つ）", () => {
    const input = base();
    const before = structuredClone(input);
    const next = updateSelf(input, { birthYear: input.self.birthYear - 5 });
    expect(next.self.birthYear).toBe(before.self.birthYear - 5);
    expect(next.endYear).toBe(before.endYear - 5);
    expect(input).toEqual(before);
  });

  it("生年以外の更新では終了年を動かさない", () => {
    const input = base();
    const next = updateSelf(input, { grossAnnualIncome: 6_000_000 });
    expect(next.self.grossAnnualIncome).toBe(6_000_000);
    expect(next.endYear).toBe(input.endYear);
  });
});

describe("toggleSpouse", () => {
  it("配偶者を外すと spouse が null になる", () => {
    const input = base();
    const before = structuredClone(input);
    const { idGen } = sequentialIds();
    expect(toggleSpouse(input, false, idGen).spouse).toBeNull();
    expect(input).toEqual(before);
  });

  it("配偶者がいないときに有効にすると、本人を雛形に名前「配偶者」で作る", () => {
    const { idGen } = sequentialIds();
    const single = toggleSpouse(base(), false, idGen);
    const next = toggleSpouse(single, true, idGen);
    expect(next.spouse).toEqual({ ...single.self, name: "配偶者" });
  });

  it("既に配偶者がいるときに有効にしても、同じ参照を返し id を採番しない", () => {
    const input = base();
    const { idGen, calls } = sequentialIds();
    expect(toggleSpouse(input, true, idGen)).toBe(input);
    expect(calls()).toBe(0);
  });
});

describe("updateSpouse", () => {
  it("配偶者がいれば patch を反映する", () => {
    const input = base();
    const before = structuredClone(input);
    expect(updateSpouse(input, { grossAnnualIncome: 4_000_000 }).spouse?.grossAnnualIncome).toBe(4_000_000);
    expect(input).toEqual(before);
  });

  it("配偶者がいなければ同じ参照を返す", () => {
    const input: PlanInput = { ...base(), spouse: null };
    expect(updateSpouse(input, { grossAnnualIncome: 4_000_000 })).toBe(input);
  });
});

describe("addChild", () => {
  it("連番の名前・開始年生まれ・既定の進路で子を追加し、id を採番する", () => {
    const input = base();
    const before = structuredClone(input);
    const { idGen } = sequentialIds();
    const next = addChild(input, idGen);
    expect(next.children).toHaveLength(2);
    expect(next.children[1]).toEqual({
      id: "child-t1",
      name: "子2",
      birthYear: input.startYear,
      education: DEFAULT_EDUCATION,
    });
    expect(input).toEqual(before);
  });
});

describe("updateChild / removeChild", () => {
  it("指定した id の子だけを更新する", () => {
    const input = base();
    const next = updateChild(input, "child-1", { name: "太郎" });
    expect(next.children[0].name).toBe("太郎");
    expect(input.children[0].name).toBe("子1");
  });

  it("指定した id の子を削除し、引数の入力は変わらない", () => {
    const input = base();
    const before = structuredClone(input);
    const { idGen } = sequentialIds();
    const next = removeChild(input, "child-1", idGen);
    expect(next.children).toEqual([]);
    expect(input).toEqual(before);
  });
});
```

- [x] **Step 2: 失敗を確認する**

Run: `npx vitest run src/features/plan/application/period.test.ts src/features/plan/application/household.test.ts`
Expected: FAIL（`./period`・`./household` が見つからない）

- [x] **Step 3: 実装を書く**

`src/features/plan/application/period.ts`:

```ts
import { correctDateRange, type PlanInput } from "@/features/plan/domain";

/**
 * lp-019 / QA#1: 開始年・終了年を更新する。`correctDateRange`
 * （純粋関数、例外を投げない）で相互検証し、無効な組み合わせ
 * （開始年>終了年、または期間1年未満）は endYear を自動補正する。
 * 補正の有無を `rangeAutoCorrected` で返し、UI 側（HouseholdForm）が
 * 注意文言の表示に利用する。
 */
export function setRange(
  input: PlanInput,
  startYear: number,
  endYear: number,
): { input: PlanInput; rangeAutoCorrected: boolean } {
  const corrected = correctDateRange(startYear, endYear);
  return {
    input: { ...input, startYear: corrected.startYear, endYear: corrected.endYear },
    rangeAutoCorrected: corrected.corrected,
  };
}
```

`src/features/plan/application/household.ts`:

```ts
/**
 * 世帯（本人・配偶者・子）を編集するユースケース。どれも引数の入力を変更せず、
 * 新しい PlanInput を返す（変更が無いときは引数をそのまま返す）。
 */

import {
  DEFAULT_EDUCATION,
  type Child,
  type HouseholdComposition,
  type Person,
  type PlanInput,
} from "@/features/plan/domain";
import { applyHouseholdDefaults } from "./householdDefaultsSync";
import type { IdGenerator } from "./idGenerator";
import { nextChildName } from "./nextChildName";

function compositionOf(input: PlanInput): HouseholdComposition {
  return { hasSpouse: input.spouse !== null, childCount: input.children.length };
}

// lp-030: 世帯構成が変わったので、既定の生活費・ローン・イベント・自宅を
// 新しい世帯構成へ追従させる（編集済みの項目は上書きしない）。
function followHouseholdDefaults(
  next: PlanInput,
  previous: PlanInput,
  idGen: IdGenerator,
): PlanInput {
  return applyHouseholdDefaults(next, compositionOf(previous), {
    loan: idGen("loan"),
    event: idGen("event"),
    property: idGen("property"),
  });
}

// 終了年は西暦で保持するが、UI は「本人が◯歳になる年」（lp-031）で見せる。
// 生年が変わっても終了年齢が保たれるよう、生年の差分だけ終了年をずらす。
// 数値欄は1キーごとに確定するため、差分で追従させて途中の値（1→19→199…）に依存しない。
export function updateSelf(input: PlanInput, patch: Partial<Person>): PlanInput {
  return {
    ...input,
    endYear:
      patch.birthYear === undefined
        ? input.endYear
        : input.endYear + (patch.birthYear - input.self.birthYear),
    self: { ...input.self, ...patch },
  };
}

/** 配偶者の有無を切り替える。enabled=true で未設定なら本人を雛形に作成。 */
export function toggleSpouse(
  input: PlanInput,
  enabled: boolean,
  idGen: IdGenerator,
): PlanInput {
  let next: PlanInput | null = null;
  if (enabled && !input.spouse) {
    const spouse: Person = { ...input.self, name: "配偶者" };
    next = { ...input, spouse };
  } else if (!enabled) {
    next = { ...input, spouse: null };
  }
  if (!next) return input;
  return followHouseholdDefaults(next, input, idGen);
}

export function updateSpouse(input: PlanInput, patch: Partial<Person>): PlanInput {
  if (!input.spouse) return input;
  return { ...input, spouse: { ...input.spouse, ...patch } };
}

export function addChild(input: PlanInput, idGen: IdGenerator): PlanInput {
  const child: Child = {
    id: idGen("child"),
    // lp-021: 既定名を「子1」「子2」…の連番にして判別できるようにする。
    name: nextChildName(input.children),
    birthYear: input.startYear,
    education: DEFAULT_EDUCATION,
  };
  return followHouseholdDefaults(
    { ...input, children: [...input.children, child] },
    input,
    idGen,
  );
}

export function updateChild(input: PlanInput, id: string, patch: Partial<Child>): PlanInput {
  return {
    ...input,
    children: input.children.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
}

export function removeChild(input: PlanInput, id: string, idGen: IdGenerator): PlanInput {
  return followHouseholdDefaults(
    { ...input, children: input.children.filter((c) => c.id !== id) },
    input,
    idGen,
  );
}
```

`src/features/plan/application/index.ts` の `export type { IdGenerator } ...` の直後に追加する:

```ts
export {
  addChild,
  removeChild,
  toggleSpouse,
  updateChild,
  updateSelf,
  updateSpouse,
} from "./household";
export { setRange } from "./period";
```

- [x] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/features/plan/application/period.test.ts src/features/plan/application/household.test.ts`
Expected: PASS（2 件 + 10 件）

- [x] **Step 5: ストアを委譲に書き換える**

`src/features/plan/ui/usePlanStore.ts` の `@/features/plan/application` の import に `addChild`, `removeChild`, `setRange`, `toggleSpouse`, `updateChild`, `updateSelf`, `updateSpouse` を追加する。`setRange` から `removeChild` までのアクション（`setRange:` の JSDoc の直前から `removeChild` の閉じ `}),` まで）を次に置き換える:

```ts
      /**
       * lp-019 / QA#1: 開始年・終了年を更新する。無効な組み合わせは endYear を
       * 自動補正し、`rangeAutoCorrected` に補正の有無を反映する（本体は plan/application）。
       */
      setRange: (startYear, endYear) =>
        set((s) => setRange(s.input, startYear, endYear)),

      updateSelf: (patch) => set((s) => ({ input: updateSelf(s.input, patch) })),

      // 変更が無いときは state を更新しない（persist にも書き込まない）。
      toggleSpouse: (enabled) =>
        set((s) => {
          const input = toggleSpouse(s.input, enabled, makeId);
          return input === s.input ? s : { input };
        }),

      updateSpouse: (patch) =>
        set((s) => {
          const input = updateSpouse(s.input, patch);
          return input === s.input ? s : { input };
        }),

      updateExpenses: (patch) =>
        set((s) => ({
          input: { ...s.input, expenses: { ...s.input.expenses, ...patch } },
        })),

      updateAssets: (patch) =>
        set((s) => ({
          input: { ...s.input, assets: { ...s.input.assets, ...patch } },
        })),

      addChild: () => set((s) => ({ input: addChild(s.input, makeId) })),

      updateChild: (id, patch) =>
        set((s) => ({ input: updateChild(s.input, id, patch) })),

      removeChild: (id) => set((s) => ({ input: removeChild(s.input, id, makeId) })),
```

（`updateExpenses`・`updateAssets` は Task 5 で置き換えるので、ここでは元のまま残す。）

使われなくなった import（`correctDateRange`, `DEFAULT_EDUCATION`, `applyHouseholdDefaults`, `nextChildName`, 型 `Child`, `HouseholdComposition`, `Person`）を削除する。ただし `PlanState` の型定義が使う型（`Child`, `Person` 等）は残す。判断は Step 6 の `npx tsc --noEmit` と `npm run lint`（未使用 import の警告）に従う。

- [x] **Step 6: 全テスト・型・lint を確認する**

Run: `npx vitest run 2>&1 | tail -6 && npx tsc --noEmit && npm run lint`
Expected: すべて PASS（`usePlanStore.test.ts` の setRange・updateSelf・addChild・世帯構成連動のケースを含む）。型エラー・lint エラーなし。

- [x] **Step 7: コミットする**

```bash
git add src/features/plan/application/period.ts src/features/plan/application/period.test.ts src/features/plan/application/household.ts src/features/plan/application/household.test.ts src/features/plan/application/index.ts src/features/plan/ui/usePlanStore.ts
git commit -m "$(cat <<'EOF'
refactor: 期間と世帯の編集をユースケースへ抽出

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: ローンとライフイベントのユースケース

**Files:**
- Create: `src/features/plan/application/loans.ts`, `loans.test.ts`
- Create: `src/features/plan/application/lifeEvents.ts`, `lifeEvents.test.ts`
- Modify: `src/features/plan/application/index.ts`
- Modify: `src/features/plan/ui/usePlanStore.ts`（`addEvent`・`updateEvent`・`removeEvent`・`addLoan`・`updateLoan`・`removeLoan`）

**Interfaces:**
- Consumes: `IdGenerator`（`./idGenerator`）、`newLoan(id, currentYear)`（`./newLoan`）
- Produces（`@/features/plan/application`）:
  - `addEvent(input: PlanInput, idGen: IdGenerator): PlanInput`
  - `updateEvent(input: PlanInput, id: string, patch: Partial<LifeEvent>): PlanInput`
  - `removeEvent(input: PlanInput, id: string): PlanInput`
  - `addLoan(input: PlanInput, idGen: IdGenerator): PlanInput`
  - `updateLoan(input: PlanInput, id: string, patch: Partial<Loan>): PlanInput`
  - `removeLoan(input: PlanInput, id: string): PlanInput`

- [x] **Step 1: 失敗するテストを書く**

`src/features/plan/application/lifeEvents.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { addEvent, removeEvent, updateEvent } from "./lifeEvents";

const base = (): PlanInput => structuredClone(defaultPlanInput);

describe("ライフイベントのユースケース", () => {
  it("addEvent は開始年・金額0・ラベル「イベント」の行を末尾に追加する", () => {
    const input = base();
    const before = structuredClone(input);
    const next = addEvent(input, (prefix) => `${prefix}-t1`);
    expect(next.events.at(-1)).toEqual({
      id: "event-t1",
      year: input.startYear,
      label: "イベント",
      amount: 0,
    });
    expect(input).toEqual(before);
  });

  it("updateEvent は指定した id の行だけを更新する", () => {
    const input = base();
    const next = updateEvent(input, "event-1", { amount: -1_000_000 });
    expect(next.events[0].amount).toBe(-1_000_000);
    expect(input.events[0].amount).toBe(-5_000_000);
  });

  it("removeEvent は指定した id の行を削除する", () => {
    const input = base();
    expect(removeEvent(input, "event-1").events).toEqual([]);
    expect(input.events).toHaveLength(1);
  });
});
```

`src/features/plan/application/loans.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { addLoan, removeLoan, updateLoan } from "./loans";
import { newLoan } from "./newLoan";

const base = (): PlanInput => structuredClone(defaultPlanInput);

describe("ローンのユースケース", () => {
  it("addLoan は開始年の新規ローン行を末尾に追加する", () => {
    const input = base();
    const before = structuredClone(input);
    const next = addLoan(input, (prefix) => `${prefix}-t1`);
    expect(next.loans.at(-1)).toEqual(newLoan("loan-t1", input.startYear));
    expect(input).toEqual(before);
  });

  it("updateLoan で返済開始年を変えると、同じ年の住宅購入（頭金）イベントと自宅も動く", () => {
    const input = base();
    const before = structuredClone(input);
    const moved = input.loans[0].startYear + 2;
    const next = updateLoan(input, "loan-1", { startYear: moved });
    expect(next.loans[0].startYear).toBe(moved);
    expect(next.events[0].year).toBe(moved);
    expect(next.properties?.[0].purchaseYear).toBe(moved);
    expect(input).toEqual(before);
  });

  it("updateLoan は年のずれた頭金イベントや他のラベルのイベント・物件を動かさない", () => {
    const input = base();
    const loanYear = input.loans[0].startYear;
    const withOthers: PlanInput = {
      ...input,
      events: [
        { ...input.events[0], year: loanYear - 1 },
        { id: "event-2", year: loanYear, label: "車の購入", amount: -2_000_000 },
      ],
      properties: [{ ...input.properties![0], label: "別荘" }],
    };
    const next = updateLoan(withOthers, "loan-1", { startYear: loanYear + 2 });
    expect(next.events).toEqual(withOthers.events);
    expect(next.properties).toEqual(withOthers.properties);
  });

  it("updateLoan は返済開始年以外の更新ではイベント・物件を動かさない", () => {
    const input = base();
    const next = updateLoan(input, "loan-1", { principal: 20_000_000 });
    expect(next.loans[0].principal).toBe(20_000_000);
    expect(next.events).toEqual(input.events);
    expect(next.properties).toEqual(input.properties);
  });

  it("updateLoan は properties が未定義の入力でも未定義のまま返す", () => {
    const input: PlanInput = { ...base(), properties: undefined };
    const next = updateLoan(input, "loan-1", { startYear: input.loans[0].startYear + 1 });
    expect(next.properties).toBeUndefined();
  });

  it("removeLoan は指定した id のローンを削除する", () => {
    const input = base();
    expect(removeLoan(input, "loan-1").loans).toEqual([]);
    expect(input.loans).toHaveLength(1);
  });
});
```

- [x] **Step 2: 失敗を確認する**

Run: `npx vitest run src/features/plan/application/lifeEvents.test.ts src/features/plan/application/loans.test.ts`
Expected: FAIL（`./lifeEvents`・`./loans` が見つからない）

- [x] **Step 3: 実装を書く**

`src/features/plan/application/lifeEvents.ts`:

```ts
import type { LifeEvent, PlanInput } from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";

export function addEvent(input: PlanInput, idGen: IdGenerator): PlanInput {
  const event: LifeEvent = {
    id: idGen("event"),
    year: input.startYear,
    label: "イベント",
    amount: 0,
  };
  return { ...input, events: [...input.events, event] };
}

export function updateEvent(input: PlanInput, id: string, patch: Partial<LifeEvent>): PlanInput {
  return {
    ...input,
    events: input.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  };
}

export function removeEvent(input: PlanInput, id: string): PlanInput {
  return { ...input, events: input.events.filter((e) => e.id !== id) };
}
```

`src/features/plan/application/loans.ts`:

```ts
import {
  HOME_PROPERTY_LABEL,
  HOUSING_PURCHASE_EVENT_LABEL,
  type Loan,
  type PlanInput,
} from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";
import { newLoan } from "./newLoan";

// 新規行は 0 円始まり（借入額・金利 0）。ユーザーが値を入れるまで
// 返済額に寄与しない。既定値の定義は newLoan を参照。
export function addLoan(input: PlanInput, idGen: IdGenerator): PlanInput {
  return { ...input, loans: [...input.loans, newLoan(idGen("loan"), input.startYear)] };
}

export function updateLoan(input: PlanInput, id: string, patch: Partial<Loan>): PlanInput {
  const previous = input.loans.find((l) => l.id === id);
  const nextStartYear = patch.startYear;
  // 子育て共働きペルソナレビュー #8: 返済開始年と同じ年の住宅購入（頭金）
  // イベントと自宅（不動産）は、返済開始年の変更に追従させる（購入年のずれを防ぐ）。
  const moved =
    previous !== undefined &&
    nextStartYear !== undefined &&
    nextStartYear !== previous.startYear;
  const events = moved
    ? input.events.map((e) =>
        e.label === HOUSING_PURCHASE_EVENT_LABEL && e.year === previous.startYear
          ? { ...e, year: nextStartYear }
          : e,
      )
    : input.events;
  const properties = moved
    ? input.properties?.map((p) =>
        p.label === HOME_PROPERTY_LABEL && p.purchaseYear === previous.startYear
          ? { ...p, purchaseYear: nextStartYear }
          : p,
      )
    : input.properties;
  return {
    ...input,
    events,
    properties,
    loans: input.loans.map((l) => (l.id === id ? { ...l, ...patch } : l)),
  };
}

export function removeLoan(input: PlanInput, id: string): PlanInput {
  return { ...input, loans: input.loans.filter((l) => l.id !== id) };
}
```

`src/features/plan/application/index.ts` の `export { setRange } from "./period";` の直前に追加する:

```ts
export { addEvent, removeEvent, updateEvent } from "./lifeEvents";
export { addLoan, removeLoan, updateLoan } from "./loans";
```

- [x] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/features/plan/application/lifeEvents.test.ts src/features/plan/application/loans.test.ts`
Expected: PASS（3 件 + 6 件）

- [x] **Step 5: ストアを委譲に書き換える**

`src/features/plan/ui/usePlanStore.ts` の `@/features/plan/application` の import に `addEvent`, `addLoan`, `removeEvent`, `removeLoan`, `updateEvent`, `updateLoan` を追加する。

`addEvent`・`updateEvent`・`removeEvent` の 3 アクション（`addEvent: () =>` から `removeEvent` の閉じ `}),` まで）を次に置き換える:

```ts
      addEvent: () => set((s) => ({ input: addEvent(s.input, makeId) })),

      updateEvent: (id, patch) =>
        set((s) => ({ input: updateEvent(s.input, id, patch) })),

      removeEvent: (id) => set((s) => ({ input: removeEvent(s.input, id) })),
```

`addLoan`・`updateLoan`・`removeLoan` の 3 アクション（`addLoan: () =>` から `removeLoan` の閉じ `}),` まで）を次に置き換える:

```ts
      addLoan: () => set((s) => ({ input: addLoan(s.input, makeId) })),

      updateLoan: (id, patch) =>
        set((s) => ({ input: updateLoan(s.input, id, patch) })),

      removeLoan: (id) => set((s) => ({ input: removeLoan(s.input, id) })),
```

使われなくなった import（`HOME_PROPERTY_LABEL`, `HOUSING_PURCHASE_EVENT_LABEL`, `newLoan`）を削除する。`LifeEvent`・`Loan` 型は `PlanState` の定義で使うので残す。

- [x] **Step 6: 全テスト・型・lint を確認する**

Run: `npx vitest run 2>&1 | tail -6 && npx tsc --noEmit && npm run lint`
Expected: すべて PASS（`usePlanStore.test.ts` の「住宅ローンと頭金イベントの連動（#8）」を含む）。型エラー・lint エラーなし。

- [x] **Step 7: コミットする**

```bash
git add src/features/plan/application/lifeEvents.ts src/features/plan/application/lifeEvents.test.ts src/features/plan/application/loans.ts src/features/plan/application/loans.test.ts src/features/plan/application/index.ts src/features/plan/ui/usePlanStore.ts
git commit -m "$(cat <<'EOF'
refactor: ローンとライフイベントの編集をユースケースへ抽出

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 継続支出・収入調整・不動産のユースケース

**Files:**
- Create: `src/features/plan/application/recurringExpenses.ts`, `recurringExpenses.test.ts`
- Create: `src/features/plan/application/incomeAdjustments.ts`, `incomeAdjustments.test.ts`
- Create: `src/features/plan/application/properties.ts`, `properties.test.ts`
- Modify: `src/features/plan/application/index.ts`
- Modify: `src/features/plan/ui/usePlanStore.ts`（各 add/update/remove の 9 アクション）

**Interfaces:**
- Consumes: `IdGenerator`（`./idGenerator`）、`newRecurringExpense(id, startYear)`（`./newRecurringExpense`）
- Produces（`@/features/plan/application`）:
  - `addRecurringExpense(input: PlanInput, idGen: IdGenerator): PlanInput`
  - `updateRecurringExpense(input: PlanInput, id: string, patch: Partial<RecurringExpense>): PlanInput`
  - `removeRecurringExpense(input: PlanInput, id: string): PlanInput`
  - `addIncomeAdjustment(input: PlanInput, idGen: IdGenerator): PlanInput`
  - `updateIncomeAdjustment(input: PlanInput, id: string, patch: Partial<IncomeAdjustment>): PlanInput`
  - `removeIncomeAdjustment(input: PlanInput, id: string): PlanInput`
  - `addProperty(input: PlanInput, idGen: IdGenerator): PlanInput`
  - `updateProperty(input: PlanInput, id: string, patch: Partial<Property>): PlanInput`
  - `removeProperty(input: PlanInput, id: string): PlanInput`

- [x] **Step 1: 失敗するテストを書く**

`src/features/plan/application/recurringExpenses.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { newRecurringExpense } from "./newRecurringExpense";
import {
  addRecurringExpense,
  removeRecurringExpense,
  updateRecurringExpense,
} from "./recurringExpenses";

const base = (): PlanInput => structuredClone(defaultPlanInput);

describe("継続支出のユースケース", () => {
  it("追加・更新・削除ができ、引数の入力は変わらない", () => {
    const input = base();
    const before = structuredClone(input);

    const added = addRecurringExpense(input, (prefix) => `${prefix}-t1`);
    expect(added.recurringExpenses).toEqual([newRecurringExpense("rec-t1", input.startYear)]);

    const updated = updateRecurringExpense(added, "rec-t1", { annualAmount: 120_000 });
    expect(updated.recurringExpenses[0].annualAmount).toBe(120_000);
    expect(added.recurringExpenses[0].annualAmount).toBe(0);

    expect(removeRecurringExpense(updated, "rec-t1").recurringExpenses).toEqual([]);
    expect(input).toEqual(before);
  });
});
```

`src/features/plan/application/incomeAdjustments.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import {
  addIncomeAdjustment,
  removeIncomeAdjustment,
  updateIncomeAdjustment,
} from "./incomeAdjustments";

const base = (): PlanInput => structuredClone(defaultPlanInput);
const idGen = (prefix: string) => `${prefix}-t1`;

describe("収入調整のユースケース", () => {
  it("配偶者がいれば、開始年の1年間・割合100%・課税の行を配偶者向けに追加する", () => {
    const input = base();
    const before = structuredClone(input);
    expect(addIncomeAdjustment(input, idGen).incomeAdjustments).toEqual([
      {
        id: "adj-t1",
        person: "spouse",
        label: "収入の調整",
        startYear: input.startYear,
        endYear: input.startYear,
        ratio: 1,
        nonTaxable: false,
      },
    ]);
    expect(input).toEqual(before);
  });

  it("配偶者がいなければ本人向けに追加する", () => {
    const input: PlanInput = { ...base(), spouse: null };
    expect(addIncomeAdjustment(input, idGen).incomeAdjustments?.[0].person).toBe("self");
  });

  it("incomeAdjustments が未定義の入力でも追加・更新・削除できる", () => {
    const input: PlanInput = { ...base(), incomeAdjustments: undefined };
    expect(addIncomeAdjustment(input, idGen).incomeAdjustments).toHaveLength(1);
    expect(updateIncomeAdjustment(input, "adj-t1", { ratio: 0.5 }).incomeAdjustments).toEqual([]);
    expect(removeIncomeAdjustment(input, "adj-t1").incomeAdjustments).toEqual([]);
  });

  it("指定した id の行だけを更新・削除する", () => {
    const added = addIncomeAdjustment(base(), idGen);
    const updated = updateIncomeAdjustment(added, "adj-t1", { ratio: 0.67, nonTaxable: true });
    expect(updated.incomeAdjustments?.[0]).toMatchObject({ ratio: 0.67, nonTaxable: true });
    expect(added.incomeAdjustments?.[0].ratio).toBe(1);
    expect(removeIncomeAdjustment(updated, "adj-t1").incomeAdjustments).toEqual([]);
  });
});
```

`src/features/plan/application/properties.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROPERTY_DEPRECIATION_RATE,
  defaultPlanInput,
  type PlanInput,
} from "@/features/plan/domain";
import { addProperty, removeProperty, updateProperty } from "./properties";

const base = (): PlanInput => structuredClone(defaultPlanInput);
const idGen = (prefix: string) => `${prefix}-t1`;

describe("不動産のユースケース", () => {
  it("addProperty は購入価格0・開始年購入・既定の減価率の行を末尾に追加する", () => {
    const input = base();
    const before = structuredClone(input);
    expect(addProperty(input, idGen).properties?.at(-1)).toEqual({
      id: "property-t1",
      label: "不動産",
      purchaseYear: input.startYear,
      price: 0,
      annualDepreciationRate: DEFAULT_PROPERTY_DEPRECIATION_RATE,
    });
    expect(input).toEqual(before);
  });

  it("properties が未定義の入力でも追加・更新・削除できる", () => {
    const input: PlanInput = { ...base(), properties: undefined };
    expect(addProperty(input, idGen).properties).toHaveLength(1);
    expect(updateProperty(input, "property-1", { price: 1 }).properties).toEqual([]);
    expect(removeProperty(input, "property-1").properties).toEqual([]);
  });

  it("指定した id の行だけを更新・削除する", () => {
    const input = base();
    const updated = updateProperty(input, "property-1", { price: 20_000_000 });
    expect(updated.properties?.[0].price).toBe(20_000_000);
    expect(input.properties?.[0].price).toBe(35_000_000);
    expect(removeProperty(updated, "property-1").properties).toEqual([]);
  });
});
```

- [x] **Step 2: 失敗を確認する**

Run: `npx vitest run src/features/plan/application/recurringExpenses.test.ts src/features/plan/application/incomeAdjustments.test.ts src/features/plan/application/properties.test.ts`
Expected: FAIL（3 ファイルとも実装が見つからない）

- [x] **Step 3: 実装を書く**

`src/features/plan/application/recurringExpenses.ts`:

```ts
import type { PlanInput, RecurringExpense } from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";
import { newRecurringExpense } from "./newRecurringExpense";

// 新規行は年額 0 円・当年開始/終了。ユーザーが値を入れるまで収支に寄与しない。
export function addRecurringExpense(input: PlanInput, idGen: IdGenerator): PlanInput {
  return {
    ...input,
    recurringExpenses: [
      ...input.recurringExpenses,
      newRecurringExpense(idGen("rec"), input.startYear),
    ],
  };
}

export function updateRecurringExpense(
  input: PlanInput,
  id: string,
  patch: Partial<RecurringExpense>,
): PlanInput {
  return {
    ...input,
    recurringExpenses: input.recurringExpenses.map((r) =>
      r.id === id ? { ...r, ...patch } : r,
    ),
  };
}

export function removeRecurringExpense(input: PlanInput, id: string): PlanInput {
  return {
    ...input,
    recurringExpenses: input.recurringExpenses.filter((r) => r.id !== id),
  };
}
```

`src/features/plan/application/incomeAdjustments.ts`:

```ts
import type { IncomeAdjustment, PlanInput } from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";

/**
 * 収入調整（育休・時短）を追加する。配偶者がいれば配偶者向け、いなければ本人向け。
 * 新規行は開始年の1年間・割合100%（＝調整なし）。値を入れるまで収支は変わらない。
 */
export function addIncomeAdjustment(input: PlanInput, idGen: IdGenerator): PlanInput {
  const item: IncomeAdjustment = {
    id: idGen("adj"),
    person: input.spouse ? "spouse" : "self",
    label: "収入の調整",
    startYear: input.startYear,
    endYear: input.startYear,
    ratio: 1,
    nonTaxable: false,
  };
  return { ...input, incomeAdjustments: [...(input.incomeAdjustments ?? []), item] };
}

export function updateIncomeAdjustment(
  input: PlanInput,
  id: string,
  patch: Partial<IncomeAdjustment>,
): PlanInput {
  return {
    ...input,
    incomeAdjustments: (input.incomeAdjustments ?? []).map((a) =>
      a.id === id ? { ...a, ...patch } : a,
    ),
  };
}

export function removeIncomeAdjustment(input: PlanInput, id: string): PlanInput {
  return {
    ...input,
    incomeAdjustments: (input.incomeAdjustments ?? []).filter((a) => a.id !== id),
  };
}
```

`src/features/plan/application/properties.ts`:

```ts
import {
  DEFAULT_PROPERTY_DEPRECIATION_RATE,
  type PlanInput,
  type Property,
} from "@/features/plan/domain";
import type { IdGenerator } from "./idGenerator";

// 新規行は購入価格 0 円。値を入れるまで純資産は変わらない。
export function addProperty(input: PlanInput, idGen: IdGenerator): PlanInput {
  const item: Property = {
    id: idGen("property"),
    label: "不動産",
    purchaseYear: input.startYear,
    price: 0,
    annualDepreciationRate: DEFAULT_PROPERTY_DEPRECIATION_RATE,
  };
  return { ...input, properties: [...(input.properties ?? []), item] };
}

export function updateProperty(input: PlanInput, id: string, patch: Partial<Property>): PlanInput {
  return {
    ...input,
    properties: (input.properties ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
  };
}

export function removeProperty(input: PlanInput, id: string): PlanInput {
  return { ...input, properties: (input.properties ?? []).filter((p) => p.id !== id) };
}
```

`src/features/plan/application/index.ts` に追加する（アルファベット順の位置に。`./householdDefaultsSync` の後に `./incomeAdjustments`、`./period` の後に `./properties` と `./recurringExpenses`）:

```ts
export {
  addIncomeAdjustment,
  removeIncomeAdjustment,
  updateIncomeAdjustment,
} from "./incomeAdjustments";
export { addProperty, removeProperty, updateProperty } from "./properties";
export {
  addRecurringExpense,
  removeRecurringExpense,
  updateRecurringExpense,
} from "./recurringExpenses";
```

- [x] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/features/plan/application/recurringExpenses.test.ts src/features/plan/application/incomeAdjustments.test.ts src/features/plan/application/properties.test.ts`
Expected: PASS（1 件 + 4 件 + 3 件）

- [x] **Step 5: ストアを委譲に書き換える**

`src/features/plan/ui/usePlanStore.ts` の `@/features/plan/application` の import に上記 9 関数を追加する。

`addRecurringExpense`・`updateRecurringExpense`・`removeRecurringExpense`（直前のコメント `// 新規行は年額 0 円…` から `removeRecurringExpense` の閉じ `}),` まで）を次に置き換える:

```ts
      addRecurringExpense: () =>
        set((s) => ({ input: addRecurringExpense(s.input, makeId) })),

      updateRecurringExpense: (id, patch) =>
        set((s) => ({ input: updateRecurringExpense(s.input, id, patch) })),

      removeRecurringExpense: (id) =>
        set((s) => ({ input: removeRecurringExpense(s.input, id) })),
```

`addIncomeAdjustment` から `removeProperty` まで（直前のコメント `// 新規行は開始年の1年間…` から `removeProperty` の閉じ `}),` まで）を次に置き換える:

```ts
      addIncomeAdjustment: () =>
        set((s) => ({ input: addIncomeAdjustment(s.input, makeId) })),

      updateIncomeAdjustment: (id, patch) =>
        set((s) => ({ input: updateIncomeAdjustment(s.input, id, patch) })),

      removeIncomeAdjustment: (id) =>
        set((s) => ({ input: removeIncomeAdjustment(s.input, id) })),

      addProperty: () => set((s) => ({ input: addProperty(s.input, makeId) })),

      updateProperty: (id, patch) =>
        set((s) => ({ input: updateProperty(s.input, id, patch) })),

      removeProperty: (id) => set((s) => ({ input: removeProperty(s.input, id) })),
```

使われなくなった import（`DEFAULT_PROPERTY_DEPRECIATION_RATE`, `newRecurringExpense`）を削除する。`IncomeAdjustment`・`Property`・`RecurringExpense` 型は `PlanState` の定義で使うので残す。

- [x] **Step 6: 全テスト・型・lint を確認する**

Run: `npx vitest run 2>&1 | tail -6 && npx tsc --noEmit && npm run lint`
Expected: すべて PASS（`usePlanStore.test.ts` の「継続支出のアクション」「収入調整・不動産」を含む）。型エラー・lint エラーなし。

- [x] **Step 7: コミットする**

```bash
git add src/features/plan/application/recurringExpenses.ts src/features/plan/application/recurringExpenses.test.ts src/features/plan/application/incomeAdjustments.ts src/features/plan/application/incomeAdjustments.test.ts src/features/plan/application/properties.ts src/features/plan/application/properties.test.ts src/features/plan/application/index.ts src/features/plan/ui/usePlanStore.ts
git commit -m "$(cat <<'EOF'
refactor: 継続支出・収入調整・不動産の編集をユースケースへ抽出

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 支出・資産設定とプリセットのユースケース

**Files:**
- Create: `src/features/plan/application/settings.ts`, `settings.test.ts`
- Create: `src/features/plan/application/presets.ts`, `presets.test.ts`
- Modify: `src/features/plan/application/index.ts`
- Modify: `src/features/plan/ui/usePlanStore.ts`（`updateExpenses`・`updateAssets`・`reset`・`resetSingle`・`startBlank`）

**Interfaces:**
- Produces（`@/features/plan/application`）:
  - `updateExpenses(input: PlanInput, patch: Partial<PlanInput["expenses"]>): PlanInput`
  - `updateAssets(input: PlanInput, patch: Partial<PlanInput["assets"]>): PlanInput`
  - `resetInput(): PlanInput`（`defaultPlanInput` の深いコピー）
  - `resetSingleInput(): PlanInput`（`singleRenterPlanInput` の深いコピー）
  - `startBlank(input: PlanInput): PlanInput`

- [x] **Step 1: 失敗するテストを書く**

`src/features/plan/application/settings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultPlanInput, type PlanInput } from "@/features/plan/domain";
import { updateAssets, updateExpenses } from "./settings";

const base = (): PlanInput => structuredClone(defaultPlanInput);

describe("支出・資産設定のユースケース", () => {
  it("updateExpenses は patch の項目だけを更新する", () => {
    const input = base();
    const before = structuredClone(input);
    const next = updateExpenses(input, { baseAnnualLivingExpense: 2_500_000 });
    expect(next.expenses).toEqual({ ...before.expenses, baseAnnualLivingExpense: 2_500_000 });
    expect(input).toEqual(before);
  });

  it("updateAssets は patch の項目だけを更新する", () => {
    const input = base();
    const before = structuredClone(input);
    const next = updateAssets(input, { taxFreeAssets: 1_000_000 });
    expect(next.assets).toEqual({ ...before.assets, taxFreeAssets: 1_000_000 });
    expect(input).toEqual(before);
  });
});
```

`src/features/plan/application/presets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  defaultPlanInput,
  singleRenterPlanInput,
  type PlanInput,
} from "@/features/plan/domain";
import { resetInput, resetSingleInput, startBlank } from "./presets";

describe("プリセットのユースケース", () => {
  it("resetInput は既定値と等しい別オブジェクトを返し、書き換えても既定値は汚染されない", () => {
    const before = structuredClone(defaultPlanInput);
    const input = resetInput();
    expect(input).toEqual(defaultPlanInput);
    input.children.push({ ...input.children[0], id: "child-x" });
    input.self.name = "変更";
    expect(defaultPlanInput).toEqual(before);
  });

  it("resetSingleInput は単身・賃貸プリセットと等しい別オブジェクトを返す", () => {
    const before = structuredClone(singleRenterPlanInput);
    const input = resetSingleInput();
    expect(input).toEqual(singleRenterPlanInput);
    input.events.push({ id: "event-x", year: 2030, label: "x", amount: 0 });
    expect(singleRenterPlanInput).toEqual(before);
  });

  it("startBlank は基礎生活費を0、ローン・イベントを空にし、それ以外には触れない", () => {
    const input: PlanInput = structuredClone(defaultPlanInput);
    const before = structuredClone(input);
    const next = startBlank(input);
    expect(next).toEqual({
      ...before,
      expenses: { ...before.expenses, baseAnnualLivingExpense: 0 },
      loans: [],
      events: [],
    });
    expect(input).toEqual(before);
  });
});
```

- [x] **Step 2: 失敗を確認する**

Run: `npx vitest run src/features/plan/application/settings.test.ts src/features/plan/application/presets.test.ts`
Expected: FAIL（`./settings`・`./presets` が見つからない）

- [x] **Step 3: 実装を書く**

`src/features/plan/application/settings.ts`:

```ts
import type { PlanInput } from "@/features/plan/domain";

export function updateExpenses(
  input: PlanInput,
  patch: Partial<PlanInput["expenses"]>,
): PlanInput {
  return { ...input, expenses: { ...input.expenses, ...patch } };
}

export function updateAssets(input: PlanInput, patch: Partial<PlanInput["assets"]>): PlanInput {
  return { ...input, assets: { ...input.assets, ...patch } };
}
```

`src/features/plan/application/presets.ts`:

```ts
import {
  defaultPlanInput,
  singleRenterPlanInput,
  type PlanInput,
} from "@/features/plan/domain";

/**
 * 既定の入力を返す。defaultPlanInput は共有参照のため structuredClone して、
 * 以降の編集が既定値オブジェクトを汚染しないようにする。
 */
export function resetInput(): PlanInput {
  return structuredClone(defaultPlanInput);
}

/** 低収入ペルソナレビュー #8: 「単身・賃貸」のプリセットの入力を返す。 */
export function resetSingleInput(): PlanInput {
  return structuredClone(singleRenterPlanInput);
}

/**
 * lp-030: 「まっさらから入力」。基礎生活費・ローン・イベントを 0/空にする。
 * self / spouse / children / assets（保有資産・運用条件）には触れない
 * ——世帯構成や年収・資産条件は決まっているが、支出面はこれから
 * 自分で組み立てたいユーザー向けの開始地点。
 * 以後、生活費は 0 のためどの世帯構成の既定値とも一致せず、
 * applyHouseholdDefaults による自動追従の対象から外れる
 * （ローン・イベントも空のため同様）。
 */
export function startBlank(input: PlanInput): PlanInput {
  return {
    ...input,
    expenses: { ...input.expenses, baseAnnualLivingExpense: 0 },
    loans: [],
    events: [],
  };
}
```

`src/features/plan/application/index.ts` に追加する（`./period` の後に `./presets`、`./schema` の後に `./settings`）:

```ts
export { resetInput, resetSingleInput, startBlank } from "./presets";
export { updateAssets, updateExpenses } from "./settings";
```

- [x] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/features/plan/application/settings.test.ts src/features/plan/application/presets.test.ts`
Expected: PASS（2 件 + 3 件）

- [x] **Step 5: ストアを委譲に書き換える**

`src/features/plan/ui/usePlanStore.ts` の `@/features/plan/application` の import に `resetInput`, `resetSingleInput`, `startBlank`, `updateAssets`, `updateExpenses` を追加する。

`updateExpenses`・`updateAssets` を次に置き換える:

```ts
      updateExpenses: (patch) =>
        set((s) => ({ input: updateExpenses(s.input, patch) })),

      updateAssets: (patch) => set((s) => ({ input: updateAssets(s.input, patch) })),
```

`reset`・`resetSingle`・`startBlank` の 3 アクションの本体を次のとおりにする（`reset` の JSDoc は「全入力ステートを既定値へ戻す。」から始まる現在の説明をそのまま残し、末尾の「defaultPlanInput は共有参照のため structuredClone して、以降の編集が既定値オブジェクトを汚染しないようにする。」の 2 行だけを削除する。この説明は `resetInput` へ移った。`startBlank` の JSDoc は `presets.ts` へ移ったので、ストア側は 1 行に縮める）:

```ts
      reset: () =>
        set({
          input: resetInput(),
          snapshots: [],
          rangeAutoCorrected: false,
        }),

      resetSingle: () =>
        set({
          input: resetSingleInput(),
          rangeAutoCorrected: false,
        }),

      /** lp-030: 「まっさらから入力」（本体は plan/application の startBlank）。 */
      startBlank: () => set((s) => ({ input: startBlank(s.input) })),
```

使われなくなった import（`singleRenterPlanInput`）を削除する。`defaultPlanInput` はストアの初期値と `mergePersistedPlanState` で使うので残す。

- [x] **Step 6: ストアに編集ロジックが残っていないことを確認する**

Run: `grep -nE "\.map\(|\.filter\(|makeId\(" src/features/plan/ui/usePlanStore.ts`
Expected: 次の 3 行だけが出る（いずれも PR 6 で scenario へ移すスナップショット関連）。これ以外が出たら委譲し忘れ。

- `saveSnapshot` の `id: makeId("snap"),`
- `removeSnapshot` の `snapshots: s.snapshots.filter(`
- `loadSnapshot` の `input.events = input.events.map(`

- [x] **Step 7: 全テスト・型・lint を確認する**

Run: `npx vitest run 2>&1 | tail -6 && npx tsc --noEmit && npm run lint`
Expected: すべて PASS（`usePlanStore.test.ts` の reset・startBlank のケースを含む）。型エラー・lint エラーなし。

- [x] **Step 8: コミットする**

```bash
git add src/features/plan/application/settings.ts src/features/plan/application/settings.test.ts src/features/plan/application/presets.ts src/features/plan/application/presets.test.ts src/features/plan/application/index.ts src/features/plan/ui/usePlanStore.ts
git commit -m "$(cat <<'EOF'
refactor: 支出・資産設定とプリセットの編集をユースケースへ抽出

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 最終確認と PR 作成

**Files:** なし

- [x] **Step 1: ストアテストが変更されていないことを確認する**

Run: `git diff main --stat -- src/features/plan/ui/usePlanStore.test.ts`
Expected: 出力なし（Global Constraints: 既存のストアテストは変更しない）。

- [x] **Step 2: テスト・lint・ビルド**

Run: `npm run test 2>&1 | tail -6 && npm run lint && npm run build 2>&1 | tail -25`
Expected: 全テスト PASS。Test Files は Task 0 の N + 10（`makeId`・`period`・`household`・`lifeEvents`・`loans`・`recurringExpenses`・`incomeAdjustments`・`properties`・`settings`・`presets`）、Tests は M + 37（Task 1〜5 の順に 3 + 12 + 9 + 8 + 5）。lint エラーなし、ビルド成功。

- [x] **Step 3: 画面で挙動が変わっていないことを確認する**

Run: `npm run dev` で起動し、`http://localhost:3000/` で次を確認する。
- 既存の入力（localStorage の `life-plan/v1`）がそのまま表示される（Review Focus 5）
- 期間の終了年を開始年より前にすると自動補正の注意文言が出る
- 本人の生年を変えても終了年齢が変わらない
- 配偶者の切り替え・子の追加/削除で生活費・住宅ローン・頭金イベントの既定値が追従する
- ローンの返済開始年を変えると頭金イベントと自宅の購入年が動く
- イベント・継続支出・収入調整・不動産の追加・編集・削除ができる
- 「まっさらから入力」「単身・賃貸で始める」「リセット」が従来どおり動く
- スナップショットの保存・比較・読み込みができる
- `http://localhost:3000/game` が開け、現在のプランからゲームを始められる

- [x] **Step 4: プッシュと PR 作成**

```bash
git push -u origin refactor/plan-usecases
gh pr create --title "refactor: plan の編集ユースケースの抽出と IdGenerator 注入（PR 3）" --body "$(cat <<'EOF'
## 概要

設計書 `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md` の移行手順 #3。挙動・見た目・永続化形式の変更はありません。

- `usePlanStore` の入力編集アクションの本体を `features/plan/application` の純粋関数（`period`・`household`・`loans`・`lifeEvents`・`recurringExpenses`・`incomeAdjustments`・`properties`・`settings`・`presets`）へ抽出し、ストアは委譲のみに
- ID 採番を `IdGenerator` 型（application）と `makeId` 実装（infrastructure）に分離し、ユースケースへ注入
- 抽出した各ユースケースに単体テストを追加（既存のストアテストは無変更で回帰検知に使用）

## 設計からの補足

- スナップショット関連のアクションと `mergePersistedPlanState` は PR 6（scenario の分離）で移すため、ストアに残す
- 変更が無い `toggleSpouse`・`updateSpouse` は従来どおり state を更新しない（persist にも書き込まない）
- 後続 PR への申し送りは計画書 `docs/superpowers/plans/2026-09-26-pr3-plan-usecases.md` に記載

## 確認

- [x] `npm run test`
- [x] `npm run lint`
- [x] `npm run build`
- [x] 画面操作（入力の復元・期間補正・世帯構成連動・ローン開始年の連動・各行の追加/編集/削除・プリセット・スナップショット・ゲーム画面）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
