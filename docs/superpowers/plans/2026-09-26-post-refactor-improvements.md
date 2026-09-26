# 機能別レイヤー構成リファクタリング後の改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR 1〜7 の機能別レイヤー構成リファクタリング後に残った重さを解消する。具体的には、CI への lint の追加、`src/app/page.tsx` の薄型化、`HouseholdForm.tsx` と `plan/application/schema.ts` の分割、設計書・計画書の進捗表記の更新を行う。アプリの挙動は変えない。

**Architecture:** 5本の短命 PR に分ける。PR 1 で lint を CI に入れ、以降の PR の未使用 import などを自動で検出できるようにする。PR 2 では `page.tsx` から、機能に属する部品（要約カード・空結果の案内・ハイドレーション待ち・プリセット操作・全消去操作・ゲームモード案内）を各機能の `ui` 層か `shared/ui` へ移す。page には機能をまたぐ組み立てだけを残す。PR 3・4 はファイル分割だけで、識別子と公開 API は変えない。PR 5 はドキュメントだけを更新する。

**Tech Stack:** Next.js 15.5, React 19, TypeScript 5.7, Zustand 5（persist）, zod 3, vitest 3（既定 `environment: "node"`、DOM テストはファイル単位で jsdom）, ESLint 9（flat config、`next/core-web-vitals`・`next/typescript`）

**Spec:** `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md`。本計画は 2.1 節（層の責務）と 2.2 節（import 許可ルール）に従って部品の置き場所を決める。また、8 章でスコープ外とした「CI への lint ステップ追加」をここで回収する。改善項目の出どころは、リファクタリング完了後のレビュー（2026-09-26）。

## Global Constraints

- 各 PR は挙動を変えず、既存テストがすべて通ることを条件とする（PR 1 の lint 設定と PR 5 のドキュメントを除き、実行時の挙動と DOM 構造・文言・クラス名を変えない）。
- 例外を投げない。`try`/`catch` を使わない。
- 新規の npm 依存を追加しない。
- コンポーネントファイルは PascalCase、非コンポーネントのロジックファイルは camelCase。
- 他機能・`src/app` からは層の index（`@/features/<feature>/<layer>`）経由で import する。同一機能の他層も index 経由（既存の `ui` ファイルと同じ書き方）。
- `shared/ui` は ui 層からのみ import できる。`react`・`next` は ui 層（`shared/ui`・`src/app` を含む）のみで使える。
- 依存方向は `shared ← plan ← simulation ← scenario / game`。下流機能の import は違反になる（例: plan/ui から scenario/ui を import しない）。
- テストは対象ファイルと同一ディレクトリに `<対象名>.test.ts(x)` で置く。DOM が要るものだけファイル冒頭に `// @vitest-environment jsdom` を付ける。`@testing-library/react` は使わず、`react-dom/client` の `createRoot` と生 DOM イベントで検証する。
- コミットメッセージ・コード内コメントは日本語、識別子は英語。
- ブランチは短命（`chore/*`・`refactor/*`・`docs/*`）。PR はスカッシュマージ。
- 各 PR の確認は `npm run lint`（PR 1 以降）・`npm run test`・`npm run build`。

## 仕様からの補足・判断

1. **lint は `next lint` をやめて ESLint CLI（`eslint .`）にする**: Next.js 15.5 の `next lint` は非推奨の警告を出し、Next.js 16 で削除される。`eslint.config.mjs` は既に flat config なので、変更は `package.json` の `lint` スクリプトと `ignores` の追加で済む。
   - `eslint .` はリポジトリ直下のすべてを対象にするので、ローカルにしかないツール用ディレクトリ（`.claude/worktrees` の別チェックアウト、`.superpowers`）を拾う。実際に手元で 5885 件（エラー 227 件）が出た。`ignores` に `.claude/**`・`.superpowers/**` と、ビルド成果物の `out/**`・`build/**`・`coverage/**` を加える。
   - これらを除けば現状のコードはエラーゼロ（手元で確認済み）。
2. **`plan/application/schema.ts` の永続化スキーマは application 層に残す**: 2.1 節では「persist の merge」は infrastructure の責務とある。一方で `planInputSchema` は `scenario/application/snapshotSchema.ts` からも使われる。仕様 2.2 節では application 層から上流機能の infrastructure 層は import できない（M ≤ L）。そのため infrastructure へ移すと違反になる。本計画では、同じ application 層の中で「永続化スキーマ」と「入力バリデーション」の2ファイルに分けるだけにする。
3. **全消去（「初期値に戻す」）は scenario/ui、他の2つのプリセットは plan/ui に置く**: 「初期値に戻す」は `useScenarioStore.reset`（plan の入力と比較プランの両方を消す）を呼ぶので、plan/ui からは使えない（下流の import になる）。ヘッダーのボタンは「まっさらから入力」「単身・賃貸で始める」「初期値に戻す」の順のまま、page で `PlanPresetActions`（plan/ui）と `ResetAllAction`（scenario/ui）を並べて組み立てる。
   - 各部品は `<>` でボタンと `ConfirmDialog` を返す。閉じた `<dialog>` は `display: none` で flex の gap にも影響しないので、見た目は変わらない。
4. **`Summary` は `SummaryCards` として公開する**: page 内の非公開関数だった `Summary` を simulation/ui の公開 API にする。その際、既存の `SummaryBar` と区別できる名前にする。公開 API の改名ではなく、新規公開の命名として扱う。
5. **ハイドレーション待ちは `usePlanHydrated` フックとして plan/ui に置く**: `usePlanStore.persist` に依存するので plan/ui の責務になる。scenario ストアの復元は今もページ側で待っていないので、待ち合わせる対象は増やさない（挙動を変えない）。
6. **ヘッダーのロゴ・見出しとフッターは page に残す**: アプリ全体の枠で、どの機能にも属さない。
7. **「初期値に戻す」ダイアログの文言の食い違いは本計画では直さない**: 説明文は「保存済みプランは削除されません」だが、実際には比較プランも消える。PR 7 からの申し送り事項で、文言の変更は挙動（UI）の変更になるので別 PR にする。`ResetAllAction` への移動では文言をそのまま移す。

### 後続 PR への申し送り（本計画では扱わない）

| 対象 | 内容 |
|------|------|
| `ResetAllAction` の説明文 | 「保存済みプランは削除されません」と実際の挙動（比較プランも削除される）の食い違いを解消する |
| `/game` の First Load JS | `@/features/scenario/ui` の index 経由で比較グラフ（recharts）まで読み込み、150 kB → 258 kB に増えている（PR 6 からの申し送り） |
| `shared/ui/fields.tsx`（404行） | 6 部品が同居している。今回は触らない |

## Review Focus

1. **復元前の入力欄の描画**: `usePlanHydrated` への置き換え後も、localStorage の復元が終わる前はフォームも結果も描画せず「読み込み中…」を出すこと。復元前に既定値のフォームを出すと、保存済みの内容を既定値で上書きする操作ができてしまう。Task 2 のフック単体テストと、既存の `page.test.tsx`「ハイドレーション前は入力列を描画しない」で押さえる。
2. **破壊的操作の確認ダイアログ**: 部品に切り出した後も、3つのボタンはどれも単体のクリックでは入力を変えず、ダイアログの確定操作でだけ実行されること。Task 5 の部品テストと既存の page テストで押さえる。
3. **ヘッダーのボタンの並び順**: 部品の組み立てを変えても、ヘッダーのボタンが「まっさらから入力」「単身・賃貸で始める」「初期値に戻す」の順で並ぶこと。Task 5 で page テストに順序の検証を追加する。
4. **lint が CI で本当に違反を落とすこと**: スクリプトの置き換え後に「何も検査していないので常に成功」という状態にならないこと。Task 1 で、違反を含むファイルを一時的に置いて `npm run lint` が失敗することを確認する。
5. **旧形式の保存データの読み込み**: `schema.ts` の分割後も、v1 形式（`initialAssets` を持つ、`recurringExpenses` などを持たない）の保存データとプランファイルがこれまでどおり移行・読み込みできること。既存の `persistedPlanSchema.test.ts`（旧 `schema.test.ts`）、`simulation/application/input-validation.test.ts` の v1 ケース、`plan/infrastructure` の merge・planFile テストで押さえ、Task 9 でこれらが全部通ることを確認する。

---

## PR 1: CI への lint の追加（ブランチ `chore/ci-lint`）

### Task 1: ESLint CLI への移行と CI の lint ステップ

**Files:**
- Modify: `eslint.config.mjs`（`ignores`）
- Modify: `package.json`（`scripts.lint`）
- Modify: `.github/workflows/ci.yml`（Lint ステップの追加）
- Modify: `.claude/CLAUDE.md`（「CI」節）

**Interfaces:**
- Consumes: なし
- Produces: `npm run lint`（`eslint .`、違反があれば終了コード 1）。PR 2 以降の各タスクの確認で使う。

- [ ] **Step 1: ブランチを作る**

```bash
git switch main && git pull && git switch -c chore/ci-lint
```

- [ ] **Step 2: `eslint .` の現状を確認する**

Run: `npx eslint . ; echo "exit=$?"`
Expected: `.claude/worktrees` の別チェックアウトがある環境では、`.claude/worktrees/...` 配下のファイルについて数千件の problem が出て `exit=1`。ない環境では `exit=0`。どちらでも `src/` 配下の違反は出ないこと。

- [ ] **Step 3: `eslint.config.mjs` の `ignores` にツール用ディレクトリとビルド成果物を加える**

`eslint.config.mjs` の次の部分を置き換える。

```js
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
```

置き換え後:

```js
  {
    // .claude/.superpowers はローカルのツール用ディレクトリ（worktree の別チェックアウトを含む）。
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "out/**",
      "build/**",
      "coverage/**",
      ".claude/**",
      ".superpowers/**",
    ],
  },
```

- [ ] **Step 4: `package.json` の `lint` スクリプトを ESLint CLI にする**

`package.json` の次の行を置き換える。

```json
    "lint": "next lint",
```

置き換え後:

```json
    "lint": "eslint .",
```

- [ ] **Step 5: lint が通ることを確認する**

Run: `npm run lint ; echo "exit=$?"`
Expected: 違反の出力なし、`exit=0`。`next lint` の非推奨警告も出ない。

- [ ] **Step 6: lint が違反を検出することを確認する（一時ファイルで確認し、コミットしない）**

```bash
printf 'export const lintProbe = (x: any) => x;\n' > src/shared/lib/lintProbe.ts
npm run lint ; echo "exit=$?"
rm src/shared/lib/lintProbe.ts
```

Expected: `src/shared/lib/lintProbe.ts` について `@typescript-eslint/no-explicit-any` のエラーが出て `exit=1`。削除後に `git status --short src` が空であること。

- [ ] **Step 7: CI に Lint ステップを加える**

`.github/workflows/ci.yml` の次の部分を置き換える。

```yaml
      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test
```

置き換え後:

```yaml
      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm run test
```

- [ ] **Step 8: CLAUDE.md の「CI」節を更新する**

`.claude/CLAUDE.md` の次の部分を置き換える。

```markdown
- `.github/workflows/ci.yml` で `npm run test`（vitest run）と `npm run build`
  を実行する。
```

置き換え後:

```markdown
- `.github/workflows/ci.yml` で `npm run lint`（ESLint CLI の `eslint .`）、
  `npm run test`（vitest run）、`npm run build` を実行する。
```

- [ ] **Step 9: テストとビルドを確認する**

Run: `npm run test && npm run build`
Expected: テストがすべて PASS、ビルドが成功する。

- [ ] **Step 10: コミットして PR を作る**

```bash
git add eslint.config.mjs package.json .github/workflows/ci.yml .claude/CLAUDE.md
git commit -m "$(cat <<'EOF'
chore: lint を ESLint CLI に移行して CI で実行する

next lint は Next.js 16 で削除予定のため eslint . に置き換え、ローカルの
ツール用ディレクトリ（.claude・.superpowers）を検査対象から外す。

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push -u origin chore/ci-lint
gh pr create --title "chore: lint を ESLint CLI に移行して CI で実行する" --body "$(cat <<'EOF'
## 概要
- `next lint`（Next.js 16 で削除予定）を `eslint .` に置き換え
- `.claude`・`.superpowers`・ビルド成果物を lint の対象外に
- CI に Lint ステップを追加、CLAUDE.md の CI 節を更新

## 確認
- `npm run lint` / `npm run test` / `npm run build`
- 一時ファイルに `any` を書いて `npm run lint` が失敗することを確認

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

CI が通ったらスカッシュマージする。

---

## PR 2: `src/app/page.tsx` の薄型化（ブランチ `refactor/page-composition`）

- [ ] **ブランチを作る**

```bash
git switch main && git pull && git switch -c refactor/page-composition
```

### Task 2: ハイドレーション待ちを `usePlanHydrated`（plan/ui）へ切り出す

**Files:**
- Create: `src/features/plan/ui/usePlanHydrated.ts`
- Test: `src/features/plan/ui/usePlanHydrated.test.tsx`
- Modify: `src/features/plan/ui/index.ts`
- Modify: `src/app/page.tsx:3`（react の import）, `:160-166`（ハイドレーションの state と effect）

**Interfaces:**
- Consumes: `usePlanStore.persist.hasHydrated(): boolean`, `usePlanStore.persist.onFinishHydration(cb): () => void`（zustand persist）
- Produces: `usePlanHydrated(): boolean`（`@/features/plan/ui` から公開）

- [ ] **Step 1: 失敗するテストを書く**

`src/features/plan/ui/usePlanHydrated.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "./usePlanStore";
import { usePlanHydrated } from "./usePlanHydrated";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function Probe() {
  return <span data-hydrated={String(usePlanHydrated())} />;
}

/** Probe をマウントし、現在の hydrated 値を読む関数を返す。 */
function mountProbe() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Probe />));
  return () => container.querySelector("span")?.getAttribute("data-hydrated");
}

describe("usePlanHydrated", () => {
  it("復元済みならマウント直後から true", () => {
    vi.spyOn(usePlanStore.persist, "hasHydrated").mockReturnValue(true);
    const hydrated = mountProbe();
    expect(hydrated()).toBe("true");
  });

  it("復元前は false で、復元完了の通知を受けて true になる", () => {
    let finish: () => void = () => {};
    vi.spyOn(usePlanStore.persist, "hasHydrated").mockReturnValue(false);
    vi.spyOn(usePlanStore.persist, "onFinishHydration").mockImplementation((cb) => {
      finish = () => cb(usePlanStore.getState());
      return () => {};
    });
    const hydrated = mountProbe();
    expect(hydrated()).toBe("false");

    act(() => finish());
    expect(hydrated()).toBe("true");
  });

  it("アンマウント時に復元完了の購読を解除する", () => {
    const unsubscribe = vi.fn();
    vi.spyOn(usePlanStore.persist, "hasHydrated").mockReturnValue(false);
    vi.spyOn(usePlanStore.persist, "onFinishHydration").mockReturnValue(unsubscribe);
    mountProbe();

    act(() => root.unmount());
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    // afterEach の unmount 用に新しい root を用意する
    root = createRoot(container);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/features/plan/ui/usePlanHydrated.test.tsx`
Expected: FAIL（`Failed to resolve import "./usePlanHydrated"`）

- [ ] **Step 3: フックを実装する**

`src/features/plan/ui/usePlanHydrated.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { usePlanStore } from "./usePlanStore";

/**
 * plan ストアの localStorage からの復元（ハイドレーション）が終わったか。
 * 復元前に既定値を描画すると、保存済みの内容と食い違った状態で入力できて
 * しまい、サーバー描画ともミスマッチするため、描画の出し分けに使う。
 */
export function usePlanHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(usePlanStore.persist.hasHydrated());
    const unsub = usePlanStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}
```

`src/features/plan/ui/index.ts` の末尾に追加する。

```ts
export { usePlanHydrated } from "./usePlanHydrated";
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/features/plan/ui/usePlanHydrated.test.tsx`
Expected: PASS（3 件）

- [ ] **Step 5: page.tsx をフックに置き換える**

`src/app/page.tsx` の react の import を置き換える。

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
```

置き換え後:

```tsx
import { useMemo, useRef } from "react";
```

plan/ui の import に `usePlanHydrated` を加える。

```tsx
  RecurringExpenseForm,
  usePlanHydrated,
  usePlanStore,
} from "@/features/plan/ui";
```

`Home` 内の次の部分を置き換える。

```tsx
  // localStorage からの復元（ハイドレーション）後にのみ結果を描画し、
  // サーバー描画とのミスマッチを避ける。
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(usePlanStore.persist.hasHydrated());
    const unsub = usePlanStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
```

置き換え後:

```tsx
  // localStorage からの復元（ハイドレーション）後にのみ結果を描画し、
  // サーバー描画とのミスマッチを避ける。
  const hydrated = usePlanHydrated();
```

- [ ] **Step 6: 全体を確認する**

Run: `npm run lint && npx vitest run src/app src/features/plan/ui src/architecture.test.ts`
Expected: lint の違反なし。テストはすべて PASS（`page.test.tsx` の「ハイドレーション前は入力列を描画しない」を含む）。

- [ ] **Step 7: コミットする**

```bash
git add src/features/plan/ui/usePlanHydrated.ts src/features/plan/ui/usePlanHydrated.test.tsx src/features/plan/ui/index.ts src/app/page.tsx
git commit -m "$(cat <<'EOF'
refactor: ハイドレーション待ちを usePlanHydrated として plan/ui へ切り出す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 3: 要約カードと空結果の案内を simulation/ui へ移す

**Files:**
- Create: `src/features/simulation/ui/SummaryCards.tsx`
- Create: `src/features/simulation/ui/EmptyResultsNotice.tsx`
- Test: `src/features/simulation/ui/SummaryCards.test.tsx`
- Test: `src/features/simulation/ui/EmptyResultsNotice.test.tsx`
- Modify: `src/features/simulation/ui/index.ts`
- Modify: `src/app/page.tsx:18-20`（import）, `:30-54`（`Tone`・`toneAccent`・`toneText`・`EmptyResultsNotice`）, `:68-142`（`Summary`）, `<Summary results={results} />` の呼び出し

**Interfaces:**
- Consumes: `summarizeResults(results: YearlyResult[]): ResultSummary | null`, `describeAssetLongevity(results: YearlyResult[]): string | null`, `type YearlyResult`（`@/features/simulation/domain`）, `formatYen(value: number): string`（`@/shared/lib`、例: `¥5,000,000`）, `Eyebrow`（`@/shared/ui`）
- Produces: `SummaryCards({ results }: { results: YearlyResult[] }): JSX.Element | null`、`EmptyResultsNotice(): JSX.Element`（どちらも `@/features/simulation/ui` から公開）

- [ ] **Step 1: 失敗するテストを書く**

`src/features/simulation/ui/SummaryCards.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { YearlyResult } from "@/features/simulation/domain";
import { SummaryCards } from "./SummaryCards";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** 結果冒頭のサマリーカード（最終純資産・最小純資産・資産が尽きる年）の回帰テスト。 */

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function mount(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return container;
}

function row(
  year: number,
  selfAge: number,
  assets: number,
  financialAssets = assets,
): YearlyResult {
  return { year, selfAge, assets, financialAssets, loanBalance: 0 } as YearlyResult;
}

/** ラベルで始まるカードの値の要素と、カード全体の文字列を返す。 */
function card(el: HTMLElement, label: string) {
  const div = [...el.querySelectorAll(".rounded-2xl")].find((d) =>
    d.textContent?.startsWith(label),
  );
  return {
    text: div?.textContent ?? "",
    danger: div?.querySelector(".font-display")?.classList.contains("text-danger"),
  };
}

describe("SummaryCards", () => {
  it("枯渇しない結果では、1行判定と3枚のカードを表示し危険色を使わない", () => {
    const el = mount(
      <SummaryCards results={[row(2030, 40, 5_000_000), row(2031, 41, 6_000_000)]} />,
    );
    expect(el.textContent).toContain("生涯枯渇なし");
    expect(card(el, "最終純資産").text).toContain("¥6,000,000");
    expect(card(el, "最終純資産").text).toContain("2031年（本人41歳）時点");
    expect(card(el, "最終純資産").danger).toBe(false);
    expect(card(el, "最小純資産").text).toContain("2030年（本人40歳）で最小");
    expect(card(el, "資産が尽きる年").text).toContain("なし");
    expect(card(el, "資産が尽きる年").text).toContain("生涯を通じて枯渇なし");
    expect(card(el, "資産が尽きる年").danger).toBe(false);
  });

  it("金融資産がマイナスになる年があれば、その年を危険色で表示する", () => {
    const el = mount(
      <SummaryCards
        results={[row(2030, 40, 1_000_000), row(2031, 41, -500_000), row(2032, 42, -900_000)]}
      />,
    );
    expect(el.textContent).toContain("40歳まで資産が持ちます");
    expect(card(el, "最小純資産").text).toContain("最終年まで減り続けています");
    expect(card(el, "最小純資産").danger).toBe(true);
    expect(card(el, "資産が尽きる年").text).toContain("2031年");
    expect(card(el, "資産が尽きる年").text).toContain("本人41歳で初めて残高マイナス");
    expect(card(el, "資産が尽きる年").danger).toBe(true);
  });

  it("金融資産は枯渇せず純資産だけがマイナスなら、判定基準の違いを補足する", () => {
    const el = mount(
      <SummaryCards
        results={[row(2030, 40, -2_000_000, 1_000_000), row(2031, 41, 500_000, 1_500_000)]}
      />,
    );
    expect(card(el, "資産が尽きる年").text).toContain(
      "金融資産は枯渇なし（ローン残高を含む純資産は2030年に最小）",
    );
  });

  it("結果が空なら何も描画しない", () => {
    const el = mount(<SummaryCards results={[]} />);
    expect(el.innerHTML).toBe("");
  });
});
```

`src/features/simulation/ui/EmptyResultsNotice.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { EmptyResultsNotice } from "./EmptyResultsNotice";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("EmptyResultsNotice", () => {
  it("結果が空のときの共通メッセージを表示する（lp-019 / QA#1）", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<EmptyResultsNotice />));

    expect(container.textContent).toBe(
      "表示できる結果がありません。シミュレーション期間や入力内容をご確認ください。",
    );
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/features/simulation/ui/SummaryCards.test.tsx src/features/simulation/ui/EmptyResultsNotice.test.tsx`
Expected: FAIL（`Failed to resolve import "./SummaryCards"`、`"./EmptyResultsNotice"`）

- [ ] **Step 3: 部品を作る（page.tsx の中身をそのまま移し、`Summary` を `SummaryCards` にする）**

`src/features/simulation/ui/SummaryCards.tsx`:

```tsx
import { formatYen } from "@/shared/lib";
import { Eyebrow } from "@/shared/ui";
import {
  describeAssetLongevity,
  summarizeResults,
  type YearlyResult,
} from "@/features/simulation/domain";

type Tone = "brand" | "ink" | "danger";

const toneAccent: Record<Tone, string> = {
  brand: "bg-brand",
  ink: "bg-ink/30",
  danger: "bg-danger",
};
const toneText: Record<Tone, string> = {
  brand: "text-brand-700",
  ink: "text-ink",
  danger: "text-danger",
};

/** サマリーカード（最終純資産・最小純資産・赤字転落年）。 */
export function SummaryCards({ results }: { results: YearlyResult[] }) {
  const summary = summarizeResults(results);
  if (!summary) return null;
  const { last, min, depleted } = summary;
  // lp-031: 結果冒頭の1行判定。判定は lp-003 の summarizeResults を再利用し、
  // ここでは文言の描画のみ行う。
  const longevityText = describeAssetLongevity(results);

  const cards: {
    label: string;
    value: string;
    caption: string;
    tone: Tone;
  }[] = [
    {
      label: "最終純資産",
      value: formatYen(last.assets),
      caption: `${last.year}年（本人${last.selfAge}歳）時点`,
      tone: last.assets < 0 ? "danger" : "brand",
    },
    {
      label: "最小純資産",
      value: formatYen(min.assets),
      caption:
        min.year === last.year
          ? "最終年まで減り続けています"
          : `${min.year}年（本人${min.selfAge}歳）で最小`,
      tone: min.assets < 0 ? "danger" : "ink",
    },
    {
      label: "資産が尽きる年",
      value: depleted ? `${depleted.year}年` : "なし",
      // 枯渇判定は金融資産（ローン残高を引く前）。純資産がマイナスの期間があると
      // 「枯渇なし」と赤字表示が食い違って見えるため、基準の違いを補足する。
      caption: depleted
        ? `本人${depleted.selfAge}歳で初めて残高マイナス`
        : min.assets < 0
          ? `金融資産は枯渇なし（ローン残高を含む純資産は${min.year}年に最小）`
          : "生涯を通じて枯渇なし",
      tone: depleted ? "danger" : "ink",
    },
  ];

  return (
    <div className="space-y-3">
      {longevityText && (
        <p className="font-display text-[15px] font-semibold text-ink">
          {longevityText}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c, i) => (
          <div
            key={c.label}
            className="animate-fade-up relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-panel"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span
              className={`absolute inset-y-0 left-0 w-1 ${toneAccent[c.tone]}`}
              aria-hidden
            />
            <Eyebrow>{c.label}</Eyebrow>
            <div
              className={`mt-2 font-display text-[28px] font-semibold leading-tight tabular-nums ${toneText[c.tone]}`}
            >
              {c.value}
            </div>
            <div className="mt-1.5 text-[11px] text-ink-mute">{c.caption}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

`src/features/simulation/ui/EmptyResultsNotice.tsx`:

```tsx
/**
 * lp-019 / QA#1: `results` が空のときに SummaryCards/ResultTable/各チャートの
 * 代わりに表示する共通メッセージ。例外は投げず、呼び出し側が
 * `results.length === 0` を判定して差し替える戻り値ベースの表現とする。
 */
export function EmptyResultsNotice() {
  return (
    <div className="flex h-40 items-center justify-center rounded-2xl border border-line bg-surface p-6 text-center text-sm text-ink-mute">
      表示できる結果がありません。シミュレーション期間や入力内容をご確認ください。
    </div>
  );
}
```

`src/features/simulation/ui/index.ts` に追加し、アルファベット順を保つ。

```ts
export { AssumptionsPanel } from "./AssumptionsPanel";
export { CashFlowChart } from "./CashFlowChart";
export { DepletionAdvice } from "./DepletionAdvice";
export { EmptyResultsNotice } from "./EmptyResultsNotice";
export { NetWorthChart } from "./NetWorthChart";
export { ResultTable } from "./ResultTable";
export { SummaryBar } from "./SummaryBar";
export { SummaryCards } from "./SummaryCards";
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/features/simulation/ui/SummaryCards.test.tsx src/features/simulation/ui/EmptyResultsNotice.test.tsx`
Expected: PASS（5 件）

- [ ] **Step 5: page.tsx から移した部分を消し、公開部品を使う**

`src/app/page.tsx` から次を削除する。
- `type Tone`・`toneAccent`・`toneText` の定義（`type Tone = "brand" | "ink" | "danger";` から `toneText` の閉じ `};` まで）
- `EmptyResultsNotice` 関数とその直前の JSDoc
- `Summary` 関数とその直前の JSDoc `/** サマリーカード（最終純資産・最小純資産・赤字転落年）。 */`

次の import を置き換える。

```tsx
import { describeAssetLongevity, summarizeResults, type YearlyResult } from "@/features/simulation/domain";
import { formatYen } from "@/shared/lib";
```

置き換え後:

```tsx
import type { YearlyResult } from "@/features/simulation/domain";
```

simulation/ui の import を置き換える。

```tsx
import {
  AssumptionsPanel,
  CashFlowChart,
  DepletionAdvice,
  EmptyResultsNotice,
  NetWorthChart,
  ResultTable,
  SummaryBar,
  SummaryCards,
} from "@/features/simulation/ui";
```

JSX の呼び出しを置き換える。

```tsx
                  <Summary results={results} />
```

置き換え後:

```tsx
                  <SummaryCards results={results} />
```

`Eyebrow` は page のヘッダー（`<Eyebrow>Life Plan Simulator</Eyebrow>`）でまだ使うので、`@/shared/ui` の import に残す。

- [ ] **Step 6: 全体を確認する**

Run: `npm run lint && npx vitest run src/app src/features/simulation/ui src/architecture.test.ts`
Expected: lint の違反なし（未使用 import が残っていないこと）。テストはすべて PASS（`page.test.tsx` の「枯渇なしでも純資産がマイナスの期間があるときの補足」「結果が空のときの共通メッセージ」を含む）。

- [ ] **Step 7: コミットする**

```bash
git add src/features/simulation/ui/SummaryCards.tsx src/features/simulation/ui/SummaryCards.test.tsx src/features/simulation/ui/EmptyResultsNotice.tsx src/features/simulation/ui/EmptyResultsNotice.test.tsx src/features/simulation/ui/index.ts src/app/page.tsx
git commit -m "$(cat <<'EOF'
refactor: 要約カードと空結果の案内を simulation/ui へ移す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 4: 読み込み中の表示を shared/ui へ移す

**Files:**
- Create: `src/shared/ui/LoadingPlaceholder.tsx`
- Test: `src/shared/ui/LoadingPlaceholder.test.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `src/app/page.tsx`（`LoadingPlaceholder` 関数の削除と import）

**Interfaces:**
- Consumes: なし
- Produces: `LoadingPlaceholder({ className }: { className: string }): JSX.Element`（`@/shared/ui` から公開）

- [ ] **Step 1: 失敗するテストを書く**

`src/shared/ui/LoadingPlaceholder.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LoadingPlaceholder } from "./LoadingPlaceholder";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("LoadingPlaceholder", () => {
  it("「読み込み中…」を表示し、呼び出し側の className で高さを決める", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<LoadingPlaceholder className="h-40" />));

    const box = container.firstElementChild as HTMLElement;
    expect(box.textContent).toBe("読み込み中…");
    expect(box.classList.contains("h-40")).toBe(true);
    expect(box.querySelector(".animate-pulse")).not.toBeNull();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/shared/ui/LoadingPlaceholder.test.tsx`
Expected: FAIL（`Failed to resolve import "./LoadingPlaceholder"`）

- [ ] **Step 3: 部品を作る（page.tsx の中身をそのまま移す）**

`src/shared/ui/LoadingPlaceholder.tsx`:

```tsx
/** localStorage 復元（ハイドレーション）待ちの共通プレースホルダー。 */
export function LoadingPlaceholder({ className }: { className: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-sm text-ink-mute ${className}`}
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
      読み込み中…
    </div>
  );
}
```

`src/shared/ui/index.ts` の `export { Eyebrow } from "./Eyebrow";` の次の行に追加する。

```ts
export { LoadingPlaceholder } from "./LoadingPlaceholder";
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/shared/ui/LoadingPlaceholder.test.tsx`
Expected: PASS（1 件）

- [ ] **Step 5: page.tsx の定義を消して shared/ui から使う**

`src/app/page.tsx` から `LoadingPlaceholder` 関数とその直前の JSDoc `/** localStorage 復元（ハイドレーション）待ちの共通プレースホルダー。 */` を削除する。`@/shared/ui` の import を置き換える。

```tsx
import { Button, ConfirmDialog, Eyebrow, LoadingPlaceholder, Panel, type ConfirmDialogHandle } from "@/shared/ui";
```

- [ ] **Step 6: 全体を確認する**

Run: `npm run lint && npx vitest run src/app src/shared/ui src/architecture.test.ts`
Expected: lint の違反なし。テストはすべて PASS。

- [ ] **Step 7: コミットする**

```bash
git add src/shared/ui/LoadingPlaceholder.tsx src/shared/ui/LoadingPlaceholder.test.tsx src/shared/ui/index.ts src/app/page.tsx
git commit -m "$(cat <<'EOF'
refactor: 読み込み中の表示を shared/ui の LoadingPlaceholder へ移す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 5: ヘッダーのプリセット操作と全消去を部品にする

**Files:**
- Create: `src/features/plan/ui/PlanPresetActions.tsx`
- Test: `src/features/plan/ui/PlanPresetActions.test.tsx`
- Modify: `src/features/plan/ui/index.ts`
- Create: `src/features/scenario/ui/ResetAllAction.tsx`
- Test: `src/features/scenario/ui/ResetAllAction.test.tsx`
- Modify: `src/features/scenario/ui/index.ts`
- Modify: `src/app/page.tsx`（ref・ストア購読・ボタン・`ConfirmDialog` の削除）
- Test: `src/app/page.test.tsx`（ボタンの並び順のテストを追加）

**Interfaces:**
- Consumes: `usePlanStore` の `startBlank(): void`・`resetSingle(): void`、`useScenarioStore` の `reset(): void`・`saveSnapshot(name: string, input: PlanInput, origin?): void`、`Button`・`ConfirmDialog`・`type ConfirmDialogHandle`（`@/shared/ui`）
- Produces: `PlanPresetActions(): JSX.Element`（`@/features/plan/ui` から公開。「まっさらから入力」「単身・賃貸で始める」ボタンとそれぞれの確認ダイアログ）、`ResetAllAction(): JSX.Element`（`@/features/scenario/ui` から公開。「初期値に戻す」ボタンと確認ダイアログ）

- [ ] **Step 1: 失敗するテストを書く**

`src/features/plan/ui/PlanPresetActions.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, beforeEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "./usePlanStore";
import { PlanPresetActions } from "./PlanPresetActions";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom は <dialog> の showModal/close を持たないため最小限の代替を積む。
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  usePlanStore.getState().reset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<PlanPresetActions />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function outsideButton(label: string) {
  return [...container.querySelectorAll("button")].find(
    (b) => b.textContent === label && !b.closest("dialog"),
  ) as HTMLButtonElement;
}

function dialogButton(label: string) {
  return [...container.querySelectorAll("dialog button")].find(
    (b) => b.textContent === label,
  ) as HTMLButtonElement;
}

describe("PlanPresetActions", () => {
  it("ボタンは「まっさらから入力」「単身・賃貸で始める」の順に並ぶ", () => {
    const labels = [...container.querySelectorAll("button")]
      .filter((b) => !b.closest("dialog"))
      .map((b) => b.textContent);
    expect(labels).toEqual(["まっさらから入力", "単身・賃貸で始める"]);
  });

  it("「まっさらから入力」は確認ダイアログの確定でだけ生活費・ローン・イベントを空にする", () => {
    act(() => outsideButton("まっさらから入力").click());
    expect(usePlanStore.getState().input.loans.length).toBeGreaterThan(0); // まだ変わらない

    act(() => dialogButton("まっさらにする").click());
    const { input } = usePlanStore.getState();
    expect(input.expenses.baseAnnualLivingExpense).toBe(0);
    expect(input.loans).toEqual([]);
    expect(input.events).toEqual([]);
  });

  it("「単身・賃貸で始める」は確認ダイアログの確定でだけ単身世帯にする", () => {
    act(() => outsideButton("単身・賃貸で始める").click());
    expect(usePlanStore.getState().input.spouse).not.toBeNull(); // まだ変わらない

    act(() => dialogButton("単身・賃貸で始める").click());
    const { input } = usePlanStore.getState();
    expect(input.spouse).toBeNull();
    expect(input.children).toEqual([]);
  });
});
```

`src/features/scenario/ui/ResetAllAction.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, beforeEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/features/plan/ui";
import { useScenarioStore } from "./useScenarioStore";
import { ResetAllAction } from "./ResetAllAction";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom は <dialog> の showModal/close を持たないため最小限の代替を積む。
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  useScenarioStore.getState().reset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ResetAllAction />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useScenarioStore.getState().reset();
});

describe("ResetAllAction", () => {
  it("「初期値に戻す」は確認ダイアログの確定でだけ入力と比較プランを消す（issue #15）", () => {
    act(() => {
      usePlanStore.setState((s) => ({ input: { ...s.input, startYear: 2025 } }));
      useScenarioStore.getState().saveSnapshot("案A", usePlanStore.getState().input);
    });

    const openButton = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "初期値に戻す" && !b.closest("dialog"),
    ) as HTMLButtonElement;
    act(() => openButton.click());
    expect(usePlanStore.getState().input.startYear).toBe(2025); // まだ戻らない
    expect(useScenarioStore.getState().snapshots).toHaveLength(1);

    const confirmButton = [...container.querySelectorAll("dialog button")].find(
      (b) => b.textContent === "初期値に戻す",
    ) as HTMLButtonElement;
    act(() => confirmButton.click());
    expect(usePlanStore.getState().input.startYear).not.toBe(2025);
    expect(useScenarioStore.getState().snapshots).toEqual([]);
  });
});
```

`src/app/page.test.tsx` の「「初期値に戻す」は確認ダイアログ経由（issue #15）」の `describe` の直後に追加する。

```tsx
describe("Home ページ — ヘッダーの操作ボタンの並び", () => {
  it("「まっさらから入力」「単身・賃貸で始める」「初期値に戻す」の順に並ぶ", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    const labels = [...el.querySelectorAll("header button")]
      .filter((b) => !b.closest("dialog"))
      .map((b) => b.textContent);
    expect(labels).toEqual(["まっさらから入力", "単身・賃貸で始める", "初期値に戻す"]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/features/plan/ui/PlanPresetActions.test.tsx src/features/scenario/ui/ResetAllAction.test.tsx src/app/page.test.tsx`
Expected: 部品の2ファイルは FAIL（`Failed to resolve import "./PlanPresetActions"`、`"./ResetAllAction"`）。`page.test.tsx` の追加分はこの時点では PASS（今の page でも順序は同じ。部品化の後も同じ順序であることを保証するための回帰テスト）。

- [ ] **Step 3: 部品を作る（page.tsx の文言・ボタンの props をそのまま移す）**

`src/features/plan/ui/PlanPresetActions.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { Button, ConfirmDialog, type ConfirmDialogHandle } from "@/shared/ui";
import { usePlanStore } from "./usePlanStore";

/**
 * ヘッダーに置く、入力の作り直し用のプリセット操作。
 * どちらも入力を消す破壊的操作のため、確認ダイアログを経由する。
 * 閉じた <dialog> は表示されないため、呼び出し側の flex 行にボタンだけが並ぶ。
 */
export function PlanPresetActions() {
  const startBlank = usePlanStore((s) => s.startBlank);
  const resetSingle = usePlanStore((s) => s.resetSingle);

  // lp-030: 「まっさらから入力」も生活費・ローン・イベントを消去する破壊的
  // 操作のため、同様に確認ダイアログを経由する
  const blankConfirmRef = useRef<ConfirmDialogHandle>(null);
  // 低収入ペルソナレビュー #8: 単身・賃貸にするための削除操作を1回で済ませる
  const singleConfirmRef = useRef<ConfirmDialogHandle>(null);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => blankConfirmRef.current?.open()}
      >
        まっさらから入力
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => singleConfirmRef.current?.open()}
      >
        単身・賃貸で始める
      </Button>

      <ConfirmDialog
        ref={singleConfirmRef}
        title="単身・賃貸の例で始めますか？"
        description="配偶者・子・住宅ローン・住宅購入イベントのない単身世帯の例に置き換わります。年収・生活費・資産は目安の値になるので、ご自身の数字に書き換えてください。この操作は元に戻せません（保存済みプランは削除されません）。"
        confirmLabel="単身・賃貸で始める"
        onConfirm={resetSingle}
      />

      <ConfirmDialog
        ref={blankConfirmRef}
        title="生活費・ローン・イベントをまっさらにしますか？"
        description="基礎生活費・住宅ローンなどの借入・単発イベントがすべて0/空になります。本人・配偶者・子・資産の入力はそのまま残ります。この操作は元に戻せません。"
        confirmLabel="まっさらにする"
        onConfirm={startBlank}
      />
    </>
  );
}
```

`src/features/scenario/ui/ResetAllAction.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { Button, ConfirmDialog, type ConfirmDialogHandle } from "@/shared/ui";
import { useScenarioStore } from "./useScenarioStore";

/**
 * ヘッダーの「初期値に戻す」。入力と保存済み比較プランの全消去
 * （scenario ストアの reset）のため、plan ではなく scenario に置く。
 */
export function ResetAllAction() {
  const reset = useScenarioStore((s) => s.reset);
  // issue #15: 「初期値に戻す」は破壊的操作のため確認ダイアログを経由する
  const resetConfirmRef = useRef<ConfirmDialogHandle>(null);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => resetConfirmRef.current?.open()}
      >
        初期値に戻す
      </Button>

      <ConfirmDialog
        ref={resetConfirmRef}
        title="入力内容を初期値に戻しますか？"
        description="世帯構成・支出・資産・イベントなどすべての入力が初期値に戻ります。この操作は元に戻せません（保存済みプランは削除されません）。"
        confirmLabel="初期値に戻す"
        onConfirm={reset}
      />
    </>
  );
}
```

`src/features/plan/ui/index.ts` の `export { LoanForm } from "./LoanForm";` の次の行に追加する。

```ts
export { PlanPresetActions } from "./PlanPresetActions";
```

`src/features/scenario/ui/index.ts` を置き換える。

```ts
/** scenario/ui の公開 API。他機能・app からはこの index 経由で import する。scenario/ui 内のファイルはこの index を import しない。 */
export { ComparisonChart } from "./ComparisonChart";
export { ResetAllAction } from "./ResetAllAction";
export { ScenarioBar } from "./ScenarioBar";
export { useScenarioStore } from "./useScenarioStore";
```

- [ ] **Step 4: 部品のテストが通ることを確認する**

Run: `npx vitest run src/features/plan/ui/PlanPresetActions.test.tsx src/features/scenario/ui/ResetAllAction.test.tsx`
Expected: PASS（4 件）

- [ ] **Step 5: page.tsx を部品に置き換える**

`src/app/page.tsx` の `Home` 内から次を削除する。
- `const reset = useScenarioStore((s) => s.reset);` とその直前のコメント行
- `const startBlank = ...`・`const resetSingle = ...`
- `resetConfirmRef`・`blankConfirmRef`・`singleConfirmRef` の3つの `useRef` とそれぞれの直前のコメント
- `</header>` の直後にある `<ConfirmDialog ... />` 3つ

ヘッダー右側のボタン群を置き換える。

```tsx
        <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => blankConfirmRef.current?.open()}
          >
            まっさらから入力
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => singleConfirmRef.current?.open()}
          >
            単身・賃貸で始める
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetConfirmRef.current?.open()}
          >
            初期値に戻す
          </Button>
        </div>
```

置き換え後:

```tsx
        <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-auto">
          <PlanPresetActions />
          <ResetAllAction />
        </div>
```

import を更新する。

```tsx
import { useMemo } from "react";
```

```tsx
  LoanForm,
  PlanPresetActions,
  PropertyForm,
```

```tsx
import { ComparisonChart, ResetAllAction, ScenarioBar, useScenarioStore } from "@/features/scenario/ui";
```

```tsx
import { Eyebrow, LoadingPlaceholder, Panel } from "@/shared/ui";
```

（`useScenarioStore` は `snapshots` の購読でまだ使う。`Button`・`ConfirmDialog`・`ConfirmDialogHandle`・`useRef` は page から使わなくなる。）

- [ ] **Step 6: 全体を確認する**

Run: `npm run lint && npx vitest run src/app src/features/plan/ui src/features/scenario/ui src/architecture.test.ts`
Expected: lint の違反なし。テストはすべて PASS（page の「初期値に戻す」「単身・賃貸で始める」と、追加したボタンの並び順を含む）。

- [ ] **Step 7: コミットする**

```bash
git add src/features/plan/ui/PlanPresetActions.tsx src/features/plan/ui/PlanPresetActions.test.tsx src/features/plan/ui/index.ts src/features/scenario/ui/ResetAllAction.tsx src/features/scenario/ui/ResetAllAction.test.tsx src/features/scenario/ui/index.ts src/app/page.tsx src/app/page.test.tsx
git commit -m "$(cat <<'EOF'
refactor: ヘッダーのプリセット操作と全消去を plan/ui・scenario/ui の部品にする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 6: ゲームモードの案内を game/ui へ移し、page を仕上げる

**Files:**
- Create: `src/features/game/ui/GameModeIntro.tsx`
- Test: `src/features/game/ui/GameModeIntro.test.tsx`
- Modify: `src/features/game/ui/index.ts`
- Modify: `src/app/page.tsx`（Game mode の `Panel` と `Link` の import）

**Interfaces:**
- Consumes: `Panel`（`@/shared/ui`）、`Link`（`next/link`）
- Produces: `GameModeIntro(): JSX.Element`（`@/features/game/ui` から公開）

- [ ] **Step 1: 失敗するテストを書く**

`src/features/game/ui/GameModeIntro.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { GameModeIntro } from "./GameModeIntro";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("GameModeIntro", () => {
  it("ゲームモードの説明と /game への導線を表示する", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<GameModeIntro />));

    expect(container.textContent).toContain("人生の選択を進めてみる");
    expect(container.textContent).toContain("イベントはゲーム上の演出です");
    const link = container.querySelector("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/game");
    expect(link.textContent).toBe("人生の選択をはじめる");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/features/game/ui/GameModeIntro.test.tsx`
Expected: FAIL（`Failed to resolve import "./GameModeIntro"`）

- [ ] **Step 3: 部品を作る（page.tsx の Panel をそのまま移す）**

`src/features/game/ui/GameModeIntro.tsx`:

```tsx
import Link from "next/link";
import { Panel } from "@/shared/ui";

/** メイン画面からゲームモード（/game）へ誘導する案内パネル。 */
export function GameModeIntro() {
  return (
    <Panel eyebrow="Game mode" title="人生の選択を進めてみる">
      <p className="text-sm leading-relaxed text-ink-soft">
        10 年ごとの節目に方針を選びながら、このプランがどう動くかを追う
        モードです。10〜15 分で 1 回分の人生を通せます。ここでの選択は
        上の入力・グラフ・年次明細を書き換えません。
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
        イベントはゲーム上の演出です。あなたに起こる確率の予測ではありません。
      </p>
      <div className="mt-4">
        <Link
          href="/game"
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-px hover:bg-brand-700 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 focus-visible:ring-offset-paper"
        >
          人生の選択をはじめる
        </Link>
      </div>
    </Panel>
  );
}
```

`src/features/game/ui/index.ts` の `export { AdventureLog } from "./AdventureLog";` の次の行に追加する。

```ts
export { GameModeIntro } from "./GameModeIntro";
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/features/game/ui/GameModeIntro.test.tsx`
Expected: PASS（1 件）

- [ ] **Step 5: page.tsx を部品に置き換える**

`src/app/page.tsx` の次の部分を置き換える。

```tsx
              <div className="animate-fade-up" style={{ animationDelay: "500ms" }}>
                <Panel eyebrow="Game mode" title="人生の選択を進めてみる">
```

から、対応する `</Panel>` と外側の `</div>` までを、次に置き換える。

```tsx
              <div className="animate-fade-up" style={{ animationDelay: "500ms" }}>
                <GameModeIntro />
              </div>
```

import を更新する。`import Link from "next/link";` を削除し、次を追加する。

```tsx
import { GameModeIntro } from "@/features/game/ui";
```

- [ ] **Step 6: page の規模と PR 全体を確認する**

Run: `wc -l src/app/page.tsx && npm run lint && npm run test && npm run build`
Expected: `page.tsx` が 230 行以下（399 行から、移した部品の分だけ減る）。lint の違反なし。テストはすべて PASS（`src/architecture.test.ts` を含む）。ビルドが成功する。

- [ ] **Step 7: ブラウザで目視確認する**

Run: `npm run dev` で http://localhost:3000 を開く
Expected: ヘッダーの3ボタンの並び・余白、要約カード、ゲームモードの案内が変更前と同じ見た目で表示される。各ボタンで確認ダイアログが開き、「閉じる」で何も変わらない。

- [ ] **Step 8: コミットして PR を作る**

```bash
git add src/features/game/ui/GameModeIntro.tsx src/features/game/ui/GameModeIntro.test.tsx src/features/game/ui/index.ts src/app/page.tsx
git commit -m "$(cat <<'EOF'
refactor: ゲームモードの案内を game/ui へ移す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push -u origin refactor/page-composition
gh pr create --title "refactor: src/app/page.tsx の部品を各機能へ移して薄くする" --body "$(cat <<'EOF'
## 概要
page.tsx（399行）から機能に属する部品を各層へ移し、page は機能をまたぐ組み立てだけにする。挙動・DOM・文言は変えない。

- `usePlanHydrated`（plan/ui）: ハイドレーション待ち
- `SummaryCards`・`EmptyResultsNotice`（simulation/ui）
- `LoadingPlaceholder`（shared/ui）
- `PlanPresetActions`（plan/ui）・`ResetAllAction`（scenario/ui）: ヘッダーの破壊的操作と確認ダイアログ
- `GameModeIntro`（game/ui）

## 確認
- `npm run lint` / `npm run test` / `npm run build`
- ブラウザでヘッダー・要約カード・ゲーム案内の見た目と確認ダイアログを目視確認

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

CI が通ったらスカッシュマージする。

---

## PR 3: `HouseholdForm.tsx` の分割（ブランチ `refactor/household-form-split`）

### Task 7: `PersonFields` と `ChildCard` を別ファイルにする

**Files:**
- Create: `src/features/plan/ui/PersonFields.tsx`（`HouseholdForm.tsx:31-35` の定数と `:37-140`）
- Create: `src/features/plan/ui/ChildCard.tsx`（`HouseholdForm.tsx:23-29` の定数と `:142-278`）
- Modify: `src/features/plan/ui/HouseholdForm.tsx`（上記の削除と import）
- Test: 既存の `HouseholdForm.test.tsx`・`child-identification.test.tsx`・`child-education-disclosure.test.tsx`・`education-preset.test.tsx`・`spouse-checkbox.test.tsx`・`delete-confirmation.test.tsx`・`low-income-inputs.test.tsx`・`input-validation-errors.test.tsx`

**Interfaces:**
- Consumes: なし（ファイル内の移動だけ）
- Produces: plan/ui 内部の部品 `PersonFields({ person, prefix, errors, onChange })`・`ChildCard({ child, startYear, birthYearError, onChange, onRemove })`。index には公開しない（`HouseholdForm` だけが使う）。

このタスクはファイル分割だけで、振る舞いは既存の DOM テストが押さえている。新しいテストは書かず、分割の前後で既存テストがすべて通ることを確認する。

- [ ] **Step 1: ブランチを作り、分割前のテストが通ることを確認する**

```bash
git switch main && git pull && git switch -c refactor/household-form-split
npx vitest run src/features/plan/ui
```

Expected: すべて PASS。件数を控えておく。

- [ ] **Step 2: `PersonFields.tsx` を作る**

`src/features/plan/ui/PersonFields.tsx` の先頭を次のようにする。

```tsx
"use client";

import {
  BASIC_PENSION_ANNUAL,
  estimateAnnualPension,
  type Person,
} from "@/features/plan/domain";
import { NumberField, PercentField, TextField } from "@/shared/ui";

/** これを超える年収は桁の入力ミスの可能性として注意を出す（円）。 */
const INCOME_DIGIT_WARNING = 100_000_000;

const PILL_CLASS =
  "rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-brand hover:bg-brand-50 hover:text-brand-700";
```

続けて、`HouseholdForm.tsx` の 37〜140 行（`/** 本人・配偶者で共通の個人入力欄。 */` から `PersonFields` の閉じ `}` まで）を一字一句そのまま移し、`function PersonFields(` を `export function PersonFields(` にする。

- [ ] **Step 3: `ChildCard.tsx` を作る**

`src/features/plan/ui/ChildCard.tsx` の先頭を次のようにする。

```tsx
"use client";

import { useId, useState } from "react";
import {
  EDUCATION_PRESETS,
  type Child,
  type SchoolType,
  type UniversityType,
} from "@/features/plan/domain";
import { Button, NumberField, SelectField, TextField } from "@/shared/ui";

const SCHOOL_OPTIONS: readonly SchoolType[] = ["公立", "私立"];
const UNIVERSITY_OPTIONS: readonly UniversityType[] = [
  "なし",
  "国公立",
  "私立文系",
  "私立理系",
];
```

続けて、`HouseholdForm.tsx` の 143〜151 行（`educationSummary` とその JSDoc）をそのまま移す。その次に、142 行の JSDoc `/** 子1人分の入力（基本情報＋進路プラン）。 */` を `ChildCard` の直前に置き直し、153〜278 行（`ChildCard` 本体）をそのまま移す。移した後、`function ChildCard(` を `export function ChildCard(` にする。

- [ ] **Step 4: `HouseholdForm.tsx` から移した部分を消し、import を整理する**

`HouseholdForm.tsx` から 23〜140 行（`SCHOOL_OPTIONS` から `PersonFields` の閉じ `}` まで）と 142〜278 行（`ChildCard` まで）を削除する。`const endAgeValidationSchema = ageField("終了年齢");` は残す。import 部分を次に置き換える。

```tsx
"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "./usePlanStore";
import {
  DEFAULT_END_AGE,
  endAgeToEndYear,
  endYearToEndAge,
} from "@/features/plan/domain";
import { ageField } from "@/features/plan/application";
import { Button, ConfirmDialog, NumberField, Section, type ConfirmDialogHandle } from "@/shared/ui";
import { usePlanErrors } from "./usePlanErrors";
import { PersonFields } from "./PersonFields";
import { ChildCard } from "./ChildCard";

const endAgeValidationSchema = ageField("終了年齢");
```

- [ ] **Step 5: lint と既存テストで確認する**

Run: `npm run lint && npx vitest run src/features/plan/ui src/architecture.test.ts && wc -l src/features/plan/ui/HouseholdForm.tsx src/features/plan/ui/PersonFields.tsx src/features/plan/ui/ChildCard.tsx`
Expected: lint の違反なし（未使用 import・定数の残りがないこと）。テストはすべて PASS し、件数は Step 1 と同じ（architecture テストの分だけ多い）。`HouseholdForm.tsx` は 170 行前後。

- [ ] **Step 6: 全体を確認する**

Run: `npm run test && npm run build`
Expected: テストがすべて PASS、ビルドが成功する。

- [ ] **Step 7: コミットして PR を作る**

```bash
git add src/features/plan/ui/HouseholdForm.tsx src/features/plan/ui/PersonFields.tsx src/features/plan/ui/ChildCard.tsx
git commit -m "$(cat <<'EOF'
refactor: HouseholdForm の個人入力欄と子カードを別ファイルに分ける

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push -u origin refactor/household-form-split
gh pr create --title "refactor: HouseholdForm の個人入力欄と子カードを別ファイルに分ける" --body "$(cat <<'EOF'
## 概要
`HouseholdForm.tsx`（423行）から `PersonFields`・`ChildCard`（`educationSummary` を含む）を同じ plan/ui 内の別ファイルへ移す。コードは一字一句移すだけで、挙動・識別子・公開 API は変えない。

## 確認
- `npm run lint` / `npm run test` / `npm run build`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

CI が通ったらスカッシュマージする。

---

## PR 4: `plan/application/schema.ts` の分割（ブランチ `refactor/plan-schema-split`）

### Task 8: 永続化スキーマと入力バリデーションを別ファイルにする

**Files:**
- Rename: `src/features/plan/application/schema.ts` → `src/features/plan/application/persistedPlanSchema.ts`（1〜126 行を残す）
- Rename: `src/features/plan/application/schema.test.ts` → `src/features/plan/application/persistedPlanSchema.test.ts`
- Create: `src/features/plan/application/planInputValidation.ts`（旧 `schema.ts` の 138〜324 行）
- Modify: `src/features/plan/application/index.ts`
- Test: 既存の `persistedPlanSchema.test.ts`、`src/features/simulation/application/input-validation.test.ts`、`src/features/plan/infrastructure/*.test.ts`、`src/features/scenario/**/*.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `@/features/plan/application` の公開 API は変えない（`INPUT_LIMITS`・`ageField`・各 `*Schema`・`planInputSchema`・`planInputValidationSchema`・`validatePlanInput`・`PlanInputErrors`・`PlanInputValidation`）。内部では `planInputValidation.ts` が `persistedPlanSchema.ts` の `educationSchema` を import する。

このタスクもファイル分割だけで、公開 API は index で変えない。移行や検証の振る舞いは既存テスト（Review Focus 5）が押さえている。

- [ ] **Step 1: ブランチを作り、分割前のテストを確認する**

```bash
git switch main && git pull && git switch -c refactor/plan-schema-split
npx vitest run src/features/plan src/features/simulation/application src/features/scenario
```

Expected: すべて PASS。件数を控えておく。

- [ ] **Step 2: ファイルを改名し、入力バリデーション部分を新しいファイルに切り出す**

```bash
git mv src/features/plan/application/schema.ts src/features/plan/application/persistedPlanSchema.ts
git mv src/features/plan/application/schema.test.ts src/features/plan/application/persistedPlanSchema.test.ts
```

`src/features/plan/application/planInputValidation.ts` の先頭を次のようにする。

```ts
/**
 * 入力バリデーション（lp-005）。
 *
 * persistedPlanSchema.ts の永続化スキーマは「壊れた保存データでクラッシュしない」
 * ための緩い検証で、範囲は見ない（保存済みデータを不用意に捨てないため）。
 * このファイルはフォーム入力を `runSimulation` に渡す前に通す厳格な検証で、
 * 範囲・型・有限性を見る。両者は別物であり、v1 保存データの移行
 * （initialAssets → taxableAssets 等）は永続化スキーマの責務のまま変えない。
 */

import { z } from "zod";
import { educationSchema } from "./persistedPlanSchema";
```

続けて、`persistedPlanSchema.ts` の 138 行（`/** 入力値の許容範囲。各上下限の根拠は下記コメントを参照。 */`）から末尾の 324 行（`validatePlanInput` の閉じ `}`）までを一字一句そのまま移す。128〜136 行の区切りコメントブロック（`/* ----` から `* ---- */` まで）は、上の先頭コメントに内容を移したので移さない。

`persistedPlanSchema.ts` からは 127 行目以降（区切りコメント以降のすべて）を削除し、`planInputSchema` の閉じ `});` でファイルが終わるようにする。

- [ ] **Step 3: テストの import と index を更新する**

`src/features/plan/application/persistedPlanSchema.test.ts` の2行目を置き換える。

```ts
import { planInputSchema } from "./schema";
```

置き換え後:

```ts
import { planInputSchema } from "./persistedPlanSchema";
```

`src/features/plan/application/index.ts` の `} from "./schema";` までの export ブロックを、次の2つに置き換える。

```ts
export {
  assetSchema,
  childSchema,
  educationSchema,
  expenseSchema,
  incomeAdjustmentSchema,
  lifeEventSchema,
  loanSchema,
  personSchema,
  planInputSchema,
  propertySchema,
  recurringExpenseSchema,
} from "./persistedPlanSchema";
export {
  INPUT_LIMITS,
  ageField,
  planInputValidationSchema,
  validatePlanInput,
  type PlanInputErrors,
  type PlanInputValidation,
} from "./planInputValidation";
```

- [ ] **Step 4: 旧ファイル名への参照が残っていないことを確認する**

Run: `grep -rn "application/schema\|\"./schema\"" src docs/superpowers/specs`
Expected: 出力なし（設計書 4 章のファイル対応表に `schema.ts` の記述が出た場合は、Step 6 で表記を更新する）。

- [ ] **Step 5: lint と既存テストで確認する**

Run: `npm run lint && npx vitest run src/features/plan src/features/simulation/application src/features/scenario src/architecture.test.ts`
Expected: lint の違反なし。テストはすべて PASS し、件数は Step 1 と同じ（architecture テストの分だけ多い）。v1 データの移行ケース（`persistedPlanSchema.test.ts`、`input-validation.test.ts` の `planInputSchema.safeParse(v1Base)`）を含む。

- [ ] **Step 6: 設計書の対応表に schema.ts の記述があれば更新する**

Run: `grep -n "schema" docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md`
Expected: `plan/application/schema.ts` を指す行があれば、`plan/application/persistedPlanSchema.ts`（永続化）・`plan/application/planInputValidation.ts`（入力検証）に書き換える。該当行がなければ何もしない。

- [ ] **Step 7: 全体を確認する**

Run: `npm run test && npm run build`
Expected: テストがすべて PASS、ビルドが成功する。

- [ ] **Step 8: コミットして PR を作る**

```bash
git add -A src/features/plan/application docs/superpowers/specs
git commit -m "$(cat <<'EOF'
refactor: plan の永続化スキーマと入力バリデーションを別ファイルに分ける

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push -u origin refactor/plan-schema-split
gh pr create --title "refactor: plan の永続化スキーマと入力バリデーションを別ファイルに分ける" --body "$(cat <<'EOF'
## 概要
`plan/application/schema.ts`（324行）を、永続化スキーマ（`persistedPlanSchema.ts`）と入力バリデーション（`planInputValidation.ts`）に分ける。`@/features/plan/application` の公開 API は変えない。

永続化スキーマは `scenario/application` からも使われるため、infrastructure 層へは移さず application 層に残す（application から上流の infrastructure は import できない）。

## 確認
- `npm run lint` / `npm run test` / `npm run build`
- v1 保存データの移行テストが通ること

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

CI が通ったらスカッシュマージする。

---

## PR 5: 設計書・計画書の進捗表記の更新（ブランチ `docs/refactor-status`）

### Task 9: 移行手順の「済」表記、スコープ外の回収、計画書のチェックボックス

**Files:**
- Modify: `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md`（5 章の表、8 章）
- Modify: `docs/superpowers/plans/2026-09-26-pr1-architecture-test-and-shared.md` 〜 `2026-09-26-pr7-cleanup.md`（8 ファイルのチェックボックス）
- Modify: `docs/superpowers/plans/2026-09-26-post-refactor-improvements.md`（本計画のチェックボックス）

**Interfaces:**
- Consumes: PR 1〜4 のマージ済み PR 番号
- Produces: なし

- [ ] **Step 1: ブランチを作り、PR 番号を確認する**

```bash
git switch main && git pull && git switch -c docs/refactor-status
git log --oneline -15
```

Expected: PR 2a（`79e9292`、PR 番号なし）、2b（#55）、3（#56）、4（#57）、5（#58）、6（#59）、7（#60）と、本計画の PR 1〜4 のマージコミットが見える。

- [ ] **Step 2: 設計書 5 章の表に「済」を付ける**

`docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md` の 5 章の表で、2a〜6 の行の「内容」列の先頭に、PR 1・7 と同じ書式で追記する。

| # | 追記する文字列 |
|---|------|
| 2a | `済（79e9292）。` |
| 2b | `済（#55）。` |
| 3 | `済（#56）。` |
| 4 | `済（#57）。` |
| 5 | `済（#58）。` |
| 6 | `済（#59）。` |

例（2b の行）:

```markdown
| 2b | `refactor/plan-ui` | 済（#55）。ストアとフォーム（`usePlanErrors.ts` を含む）を `plan/ui` へ移動。ストアは形を変えず移動のみ |
```

- [ ] **Step 3: 設計書 8 章の「CI への lint ステップ追加」に回収済みと書く**

8 章の次の行を置き換える。

```markdown
- CI への lint ステップ追加
```

置き換え後（`#NN` は PR 1 `chore/ci-lint` の PR 番号）:

```markdown
- CI への lint ステップ追加（リファクタリング後の改善として別途対応済み: #NN）
```

- [ ] **Step 4: 完了した計画書のチェックボックスを完了にする**

```bash
sed -i '' 's/^\([[:space:]]*\)- \[ \]/\1- [x]/' docs/superpowers/plans/2026-09-26-pr*.md docs/superpowers/plans/2026-09-26-post-refactor-improvements.md
grep -c -- "- \[ \]" docs/superpowers/plans/2026-09-26-pr*.md docs/superpowers/plans/2026-09-26-post-refactor-improvements.md
```

Expected: すべてのファイルで `0`。（macOS の `sed -i ''`。GNU sed では `sed -i`。）

- [ ] **Step 5: 差分がドキュメントだけであることを確認する**

Run: `git diff --stat`
Expected: 変更は `docs/superpowers/` 配下だけ。

- [ ] **Step 6: コミットして PR を作る**

```bash
git add docs/superpowers
git commit -m "$(cat <<'EOF'
docs: リファクタリングの移行手順と計画書の進捗を更新する

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git push -u origin docs/refactor-status
gh pr create --title "docs: リファクタリングの移行手順と計画書の進捗を更新する" --body "$(cat <<'EOF'
## 概要
- 設計書 5 章の移行手順 2a〜6 に「済」と PR 番号を追記
- 8 章のスコープ外「CI への lint ステップ追加」に対応済みの PR を追記
- 完了した計画書（PR 1〜7、リファクタリング後の改善）のチェックボックスを完了に

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

スカッシュマージする。
