# PR 1: アーキテクチャテスト追加と shared 抽出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** import 境界を機械的に検査するアーキテクチャテストを導入し、機能横断の汎用コード（書式・用語集・共通 UI 部品）を `src/shared/{lib,ui}` へ移す。挙動・見た目は一切変えない。

**Architecture:** 判定ロジックを純粋関数モジュール `src/architecture/importRules.ts` に切り出して単体テストし、`src/architecture.test.ts` がファイル走査して違反ゼロを assert する。移行期間中は `src/lib`・`src/components`（旧ディレクトリ）を検査対象にも判定対象にも含めない。shared の各サブディレクトリは `index.ts` を公開 API とし、外からは `@/shared/lib`・`@/shared/ui` の形でのみ import する。

**Tech Stack:** TypeScript 5.7, Next.js 15, vitest 3（`environment: "node"`）, Node 22（`fs.readdirSync` の `recursive` を使用）

**Spec:** `docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md`（本計画は 5 章の移行手順 #1 を実装する。#2 以降の計画は、前の PR のマージ後のコード状態を前提に PR ごとに別途作成する）

## Global Constraints

- 各 PR は挙動を変えず、既存テストがすべて通ることを条件とする。
- ファイル移動は `git mv` で行う。識別子の改名は移動と同じ PR で行わない。
- 例外を投げない。`try`/`catch` を使わない。
- 新規の npm 依存を追加しない。
- テストは対象ファイルと同一ディレクトリに `<対象名>.test.ts(x)` として置く（コロケーション）。既定 `environment: "node"`。
- コミットメッセージ・コード内コメントは日本語、識別子は英語。
- ブランチは `refactor/architecture-test`。PR はスカッシュマージ。
- 各 PR の確認は `npm run test` と `npm run build`。
- 空の層・サブディレクトリはフォルダを作らない（本 PR では `src/shared/domain` と `src/features` を作らない）。

## 仕様からの補足・判断

仕様が明示していない点を次のとおり決める。

1. **shared も index 経由**: 仕様 2.1「各層の `index.ts` がその層の公開 API」を shared にも適用する。`shared` の外（features・app）からは `@/shared/<sub>`（index）でのみ import し、同一サブディレクトリ内は相対パスで個別ファイルを import してよい。
2. **shared 内の向き**: `shared/domain` → なし、`shared/lib` → `shared/domain`、`shared/ui` → `shared/domain`・`shared/lib`。
3. **src 外への相対 import**（`theme-contrast.test.ts` の `tailwind.config`）: テストファイルのみ許可する。
4. **`src/app` の外部パッケージ**: `src/app` は ui 層と同じ扱い（react, react-dom, next, zustand, recharts を許可）。
5. **`number-input.integration.test.ts` は `src/components/forms/` に残す**: 仕様 4 章では `shared/ui` へ移すが、このテストは `@/lib/simulation/engine` を import しており、PR 4 で simulation が移行した時点で「shared → features」違反になる。本 PR では移動せず import 先だけ `@/shared/ui` に直し、PR 4 で `src/features/simulation/ui/` へ移す。
6. **判定ロジックの置き場所**: `src/architecture/importRules.ts`（+ `importRules.test.ts`）。`src/architecture/` は走査対象外。PR 8 で走査対象を `src` 全体に広げる際は `architecture/` と `architecture.test.ts` を除外する。

## File Structure

| 操作 | パス | 責務 |
|------|------|------|
| Create | `src/architecture/importRules.ts` | import 指定子の抽出・解決・配置分類・ルール判定（純粋関数） |
| Create | `src/architecture/importRules.test.ts` | 上記の許可・違反パターンの単体テスト |
| Create | `src/architecture.test.ts` | `src/{features,shared,app}` を走査し違反ゼロを assert |
| Move | `src/lib/{format,glossary}.ts`（+ `.test.ts`） → `src/shared/lib/` | 書式・用語集 |
| Create | `src/shared/lib/index.ts` | shared/lib の公開 API |
| Move | `src/components/ui/*` → `src/shared/ui/` | Button, ConfirmDialog, Eyebrow, Panel, TermHelp, termHelpPosition（+ テスト） |
| Move | `src/components/forms/{fields.tsx,fields.test.tsx,NumberField.test.tsx,number-input.ts,number-input.test.ts}` → `src/shared/ui/` | 入力欄部品 |
| Move | `src/components/charts/chartTheme.ts` → `src/shared/ui/` | チャートテーマ |
| Move | `src/lib/theme-contrast.test.ts` → `src/shared/ui/` | テーマ配色のコントラスト検証 |
| Create | `src/shared/ui/index.ts` | shared/ui の公開 API |
| Modify | shared を import している全ファイル（Task 4・5 に一覧） | import 先を `@/shared/lib`・`@/shared/ui` に変更 |

---

### Task 0: ブランチ作成とベースライン記録

**Files:** なし

- [ ] **Step 1: ブランチを作成する**

仕様書のブランチ（`refactor/architecture-spec`）が `main` にマージ済みなら `main` から、未マージなら `refactor/architecture-spec` の先端から切る。

```bash
git switch main && git pull   # 仕様がマージ済みの場合
git switch -c refactor/architecture-test
```

- [ ] **Step 2: テスト件数のベースラインを記録する**

Run: `npx vitest run 2>&1 | tail -6`
Expected: すべて PASS。`Test Files  N passed` と `Tests  M passed` の N・M を控える（移動後に件数が減っていないことの確認に使う）。

---

### Task 1: import 判定ロジック（`importRules.ts`）

**Files:**
- Create: `src/architecture/importRules.ts`
- Test: `src/architecture/importRules.test.ts`

**Interfaces:**
- Produces:
  - `extractSpecifiers(source: string): string[]` — ソース文字列から import 指定子を重複なしで抽出
  - `resolveSpecifier(fromSrcPath: string, specifier: string): Target`
  - `classify(srcPath: string): Location`
  - `checkImport(fromSrcPath: string, specifier: string): string | null` — 違反なら理由文字列、許可なら `null`
  - `SCAN_ROOTS: readonly string[]` = `["features", "shared", "app"]`
  - パスはすべて `src` からの POSIX 相対パス（例: `"features/plan/ui/LoanForm.tsx"`）

- [ ] **Step 1: 失敗するテストを書く**

`src/architecture/importRules.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { checkImport, classify, extractSpecifiers, resolveSpecifier } from "./importRules";

describe("extractSpecifiers", () => {
  it("静的 import・export from・副作用 import・動的 import・vi.mock を抽出する", () => {
    const source = [
      `import { a,`,
      `  b } from "./multi";`,
      `import type { T } from "@/shared/lib";`,
      `export { c } from "../re-export";`,
      `import "./globals.css";`,
      `const m = await import("./dynamic");`,
      `vi.mock("./mocked", () => ({}));`,
      `const x = await vi.importActual<typeof import("./typed")>("./actual");`,
      `import { d } from "./multi";`,
    ].join("\n");
    expect(extractSpecifiers(source).sort()).toEqual(
      [
        "./multi",
        "@/shared/lib",
        "../re-export",
        "./globals.css",
        "./dynamic",
        "./mocked",
        "./typed",
        "./actual",
      ].sort(),
    );
  });
});

describe("resolveSpecifier", () => {
  it("@/ を src からのパスに解決する", () => {
    expect(resolveSpecifier("app/page.tsx", "@/shared/ui")).toEqual({
      kind: "internal",
      srcPath: "shared/ui",
    });
  });
  it("相対パスを src からのパスに解決する", () => {
    expect(resolveSpecifier("features/plan/ui/LoanForm.tsx", "../domain")).toEqual({
      kind: "internal",
      srcPath: "features/plan/domain",
    });
  });
  it("src の外を指す相対パスを outside-src とする", () => {
    expect(resolveSpecifier("shared/ui/theme-contrast.test.ts", "../../../tailwind.config")).toEqual({
      kind: "outside-src",
      path: "../tailwind.config",
    });
  });
  it("外部パッケージはパッケージ名に正規化する", () => {
    expect(resolveSpecifier("app/page.tsx", "react-dom/client")).toEqual({ kind: "package", name: "react-dom" });
    expect(resolveSpecifier("app/page.tsx", "@scope/pkg/sub")).toEqual({ kind: "package", name: "@scope/pkg" });
    expect(resolveSpecifier("app/page.tsx", "node:fs")).toEqual({ kind: "package", name: "fs" });
  });
});

describe("classify", () => {
  it("機能・層・残りのパスに分類する", () => {
    expect(classify("features/plan/domain/loan.ts")).toEqual({
      area: "feature",
      feature: "plan",
      layer: "domain",
      rest: "loan.ts",
    });
    expect(classify("shared/ui")).toEqual({ area: "shared", sub: "ui", rest: "" });
    expect(classify("app/game/page.tsx")).toEqual({ area: "app", rest: "game/page.tsx" });
    expect(classify("lib/simulation/engine")).toEqual({ area: "legacy" });
    expect(classify("components/forms/fields")).toEqual({ area: "legacy" });
    expect(classify("features/plan/helpers/x.ts")).toEqual({ area: "unknown", path: "features/plan/helpers/x.ts" });
  });
});

describe("checkImport: 許可されるパターン", () => {
  it.each([
    ["features/plan/ui/LoanForm.tsx", "../domain"],
    ["features/plan/application/schema.ts", "./helper"],
    ["features/plan/ui/LoanForm.tsx", "@/features/plan/application/schema"],
    ["features/simulation/domain/engine.ts", "@/features/plan/domain"],
    ["features/scenario/application/load.ts", "@/features/plan/application"],
    ["features/game/domain/project.ts", "@/features/plan/domain/index"],
    ["features/plan/ui/LoanForm.tsx", "@/shared/ui"],
    ["features/plan/domain/loan.ts", "@/shared/lib"],
    ["features/plan/domain/loan.ts", "@/shared/domain"],
    ["features/plan/ui/LoanForm.tsx", "react"],
    ["features/plan/ui/usePlanStore.ts", "zustand/middleware"],
    ["features/simulation/ui/NetWorthChart.tsx", "recharts"],
    ["features/plan/application/schema.ts", "zod"],
    ["features/plan/infrastructure/planFile.ts", "zod"],
    ["features/plan/domain/loan.test.ts", "vitest"],
    ["features/plan/ui/LoanForm.test.tsx", "react-dom/client"],
    ["shared/ui/TermHelp.tsx", "@/shared/lib"],
    ["shared/ui/Panel.tsx", "./Eyebrow"],
    ["shared/lib/format.ts", "@/shared/domain"],
    ["shared/ui/theme-contrast.test.ts", "../../../tailwind.config"],
    ["app/page.tsx", "@/features/plan/ui"],
    ["app/page.tsx", "@/shared/lib"],
    ["app/page.tsx", "next/link"],
    ["app/layout.tsx", "./globals.css"],
    ["app/page.test.tsx", "./page"],
    ["shared/ui/Button.tsx", "@/components/forms/fields"],
    ["app/page.tsx", "@/lib/store/usePlanStore"],
    ["lib/anything.ts", "react"],
  ])("%s → %s", (from, specifier) => {
    expect(checkImport(from, specifier)).toBeNull();
  });
});

describe("checkImport: 違反となるパターン", () => {
  it.each([
    ["features/plan/domain/loan.ts", "react", "ui 層"],
    ["features/plan/application/x.ts", "zustand", "ui 層"],
    ["features/plan/domain/loan.ts", "zod", "application・infrastructure"],
    ["features/plan/ui/LoanForm.tsx", "zod", "application・infrastructure"],
    ["features/plan/domain/loan.ts", "vitest", "テストファイルのみ"],
    ["features/plan/domain/loan.ts", "lodash", "未許可の外部パッケージ"],
    ["features/plan/domain/loan.ts", "../ui", "外側の層"],
    ["features/plan/domain/loan.ts", "@/features/simulation/domain", "上流でない機能"],
    ["features/scenario/domain/x.ts", "@/features/game/domain", "上流でない機能"],
    ["features/simulation/domain/engine.ts", "@/features/plan/ui", "外側の層"],
    ["features/simulation/domain/engine.ts", "@/features/plan/domain/loan", "index 経由"],
    ["features/plan/domain/loan.ts", "@/shared/ui", "ui 層のみ"],
    ["features/plan/ui/LoanForm.tsx", "@/shared/lib/format", "index 経由"],
    ["features/plan/domain/loan.ts", "@/app/page", "src/app"],
    ["features/plan/helpers/x.ts", "./y", "認識できない配置"],
    ["features/plan/domain/x.ts", "@/features/plan/helpers/y", "認識できない import 先"],
    ["shared/lib/format.ts", "@/features/plan/domain", "shared から features"],
    ["shared/lib/format.ts", "@/shared/ui", "shared/lib から shared/ui"],
    ["shared/domain/yen.ts", "@/shared/lib", "shared/domain から shared/lib"],
    ["shared/lib/format.ts", "react", "ui 層"],
    ["shared/ui/fields.tsx", "@/shared/lib/format", "index 経由"],
    ["shared/lib/format.ts", "../../../foo", "src 外"],
    ["app/page.tsx", "@/features/plan/ui/LoanForm", "index 経由"],
    ["app/page.tsx", "@/shared/ui/Button", "index 経由"],
  ])("%s → %s（%s）", (from, specifier, reason) => {
    expect(checkImport(from, specifier)).toContain(reason);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run src/architecture/importRules.test.ts`
Expected: FAIL（`Failed to resolve import "./importRules"` 等）

- [ ] **Step 3: 実装を書く**

`src/architecture/importRules.ts`:

```ts
/**
 * アーキテクチャテストの import 判定（純粋関数）。
 * ルールは docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md の 2.2 節。
 * パスはすべて `src` からの POSIX 形式の相対パスで扱う。
 */
import path from "node:path";

export const LAYERS = ["domain", "application", "infrastructure", "ui"] as const;
export type Layer = (typeof LAYERS)[number];

export const FEATURES = ["plan", "simulation", "scenario", "game"] as const;
export type Feature = (typeof FEATURES)[number];

/** 各機能が import してよい上流機能（shared ← plan ← simulation ← scenario / game）。 */
export const UPSTREAM: Record<Feature, readonly Feature[]> = {
  plan: [],
  simulation: ["plan"],
  scenario: ["simulation", "plan"],
  game: ["simulation", "plan"],
};

export const SHARED_SUBS = ["domain", "lib", "ui"] as const;
export type SharedSub = (typeof SHARED_SUBS)[number];

/** shared 内で各サブディレクトリが import してよい他のサブディレクトリ。 */
const SHARED_ALLOWED: Record<SharedSub, readonly SharedSub[]> = {
  domain: [],
  lib: ["domain"],
  ui: ["domain", "lib"],
};

/** 移行期間中は検査せず、import 先としても判定から除外する旧ディレクトリ。 */
export const LEGACY_DIRS: readonly string[] = ["lib", "components"];

/** アーキテクチャテストが走査するディレクトリ。 */
export const SCAN_ROOTS: readonly string[] = ["features", "shared", "app"];

/** ui 層（shared/ui・src/app を含む）だけが import できる外部パッケージ。 */
const UI_PACKAGES: readonly string[] = ["react", "react-dom", "next", "zustand", "recharts"];

const INDEX_REASON = "層の index 経由で import する（個別ファイルは不可）";

export type Location =
  | { area: "feature"; feature: Feature; layer: Layer; rest: string }
  | { area: "shared"; sub: SharedSub; rest: string }
  | { area: "app"; rest: string }
  | { area: "legacy" }
  | { area: "unknown"; path: string };

type Checked = Extract<Location, { area: "feature" | "shared" | "app" }>;

export type Target =
  | { kind: "package"; name: string }
  | { kind: "internal"; srcPath: string }
  | { kind: "outside-src"; path: string };

const SPECIFIER_PATTERNS: readonly RegExp[] = [
  // import ... from "x" / export ... from "x"
  /\bfrom\s*["']([^"']+)["']/g,
  // 副作用 import（import "x"）
  /\bimport\s*["']([^"']+)["']/g,
  // 動的 import・import 型（import("x")）
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  // vi.mock("x") / vi.importActual<...>("x")
  /\bvi\.(?:mock|importActual)\s*(?:<[^>]*>)?\(\s*["']([^"']+)["']/g,
];

export function extractSpecifiers(source: string): string[] {
  const found = SPECIFIER_PATTERNS.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1]),
  );
  return [...new Set(found)];
}

export function resolveSpecifier(fromSrcPath: string, specifier: string): Target {
  if (specifier.startsWith("@/")) {
    return { kind: "internal", srcPath: path.posix.normalize(specifier.slice(2)) };
  }
  if (specifier.startsWith(".")) {
    const joined = path.posix.join(path.posix.dirname(fromSrcPath), specifier);
    return joined === ".." || joined.startsWith("../")
      ? { kind: "outside-src", path: joined }
      : { kind: "internal", srcPath: joined };
  }
  const bare = specifier.replace(/^node:/, "");
  const segments = bare.split("/");
  const name = bare.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
  return { kind: "package", name };
}

function isOneOf<T extends string>(list: readonly T[], value: string | undefined): value is T {
  return value !== undefined && (list as readonly string[]).includes(value);
}

export function classify(srcPath: string): Location {
  const parts = srcPath.replace(/\/$/, "").split("/");
  const [top, second, third] = parts;
  if (LEGACY_DIRS.includes(top)) return { area: "legacy" };
  if (top === "app") return { area: "app", rest: parts.slice(1).join("/") };
  if (top === "shared" && isOneOf(SHARED_SUBS, second)) {
    return { area: "shared", sub: second, rest: parts.slice(2).join("/") };
  }
  if (top === "features" && isOneOf(FEATURES, second) && isOneOf(LAYERS, third)) {
    return { area: "feature", feature: second, layer: third, rest: parts.slice(3).join("/") };
  }
  return { area: "unknown", path: srcPath };
}

function isIndex(rest: string): boolean {
  return rest === "" || /^index(\.tsx?)?$/.test(rest);
}

function isTestFile(srcPath: string): boolean {
  return /\.test\.tsx?$/.test(srcPath);
}

function isUiLevel(location: Checked): boolean {
  return (
    location.area === "app" ||
    (location.area === "shared" && location.sub === "ui") ||
    (location.area === "feature" && location.layer === "ui")
  );
}

function checkPackage(from: Checked, name: string, isTest: boolean): string | null {
  if (name === "vitest") {
    return isTest ? null : "vitest を import できるのはテストファイルのみ";
  }
  if (UI_PACKAGES.includes(name)) {
    return isUiLevel(from) ? null : `${name} を import できるのは ui 層（shared/ui・src/app を含む）のみ`;
  }
  if (name === "zod") {
    return from.area === "feature" && (from.layer === "application" || from.layer === "infrastructure")
      ? null
      : "zod を import できるのは application・infrastructure 層のみ";
  }
  return `未許可の外部パッケージ: ${name}`;
}

function checkInternal(from: Checked, to: Location): string | null {
  if (to.area === "legacy") return null;
  if (to.area === "unknown") return `機能・層として認識できない import 先: ${to.path}`;
  if (to.area === "app") {
    return from.area === "app" ? null : "src/app を import できるのは src/app のみ";
  }
  if (from.area === "app") {
    return isIndex(to.rest) ? null : INDEX_REASON;
  }
  if (from.area === "shared") {
    if (to.area === "feature") return "shared から features は import できない";
    if (to.sub === from.sub) return null;
    if (!SHARED_ALLOWED[from.sub].includes(to.sub)) {
      return `shared/${from.sub} から shared/${to.sub} は import できない`;
    }
    return isIndex(to.rest) ? null : INDEX_REASON;
  }
  if (to.area === "shared") {
    if (to.sub === "ui" && from.layer !== "ui") return "shared/ui を import できるのは ui 層のみ";
    return isIndex(to.rest) ? null : INDEX_REASON;
  }
  if (LAYERS.indexOf(to.layer) > LAYERS.indexOf(from.layer)) {
    return `外側の層は import できない（${from.layer} → ${to.layer}）`;
  }
  if (to.feature === from.feature) return null;
  if (!UPSTREAM[from.feature].includes(to.feature)) {
    return `上流でない機能は import できない（${from.feature} → ${to.feature}）`;
  }
  return isIndex(to.rest) ? null : INDEX_REASON;
}

/** `fromSrcPath` のファイルが `specifier` を import することの違反理由を返す。許可なら null。 */
export function checkImport(fromSrcPath: string, specifier: string): string | null {
  const from = classify(fromSrcPath);
  if (from.area === "legacy") return null;
  if (from.area === "unknown") return `機能・層として認識できない配置: ${from.path}`;
  const isTest = isTestFile(fromSrcPath);
  const target = resolveSpecifier(fromSrcPath, specifier);
  if (target.kind === "package") return checkPackage(from, target.name, isTest);
  if (target.kind === "outside-src") {
    return isTest ? null : `src 外のファイルを import できるのはテストファイルのみ: ${target.path}`;
  }
  return checkInternal(from, classify(target.srcPath));
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run src/architecture/importRules.test.ts`
Expected: PASS（全ケース）

- [ ] **Step 5: 型チェック**

Run: `npx tsc --noEmit -p .`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/architecture/importRules.ts src/architecture/importRules.test.ts
git commit -m "test: アーキテクチャテストの import 判定ロジックを追加"
```

---

### Task 2: アーキテクチャテスト本体（ファイル走査）

**Files:**
- Create: `src/architecture.test.ts`

**Interfaces:**
- Consumes: `SCAN_ROOTS`, `checkImport`, `extractSpecifiers`（Task 1）

- [ ] **Step 1: テストを書く**

`src/architecture.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { SCAN_ROOTS, checkImport, extractSpecifiers } from "./architecture/importRules";

/**
 * 機能・層の import 境界の検査。
 * ルールは docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md の 2.2 節。
 */

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));

/** 走査対象の .ts/.tsx を src からの POSIX 相対パスで返す。 */
function listSourceFiles(): string[] {
  return SCAN_ROOTS.filter((root) => existsSync(path.join(SRC_DIR, root))).flatMap((root) =>
    readdirSync(path.join(SRC_DIR, root), { recursive: true, encoding: "utf8" })
      .filter((file) => /\.tsx?$/.test(file) && !file.endsWith(".d.ts"))
      .map((file) => path.posix.join(root, file.split(path.sep).join("/"))),
  );
}

function collectViolations(): string[] {
  return listSourceFiles().flatMap((file) =>
    extractSpecifiers(readFileSync(path.join(SRC_DIR, file), "utf8")).flatMap((specifier) => {
      const reason = checkImport(file, specifier);
      return reason === null ? [] : [`${file} → ${specifier}: ${reason}`];
    }),
  );
}

describe("アーキテクチャ（import 境界）", () => {
  it("検査対象のファイルを走査できている", () => {
    expect(listSourceFiles()).toContain("app/page.tsx");
  });

  it("features・shared・app に import ルール違反がない", () => {
    expect(collectViolations()).toEqual([]);
  });
});
```

- [ ] **Step 2: 現状で通ることを確認する**

Run: `npx vitest run src/architecture.test.ts`
Expected: PASS（`src/app` の import は next・react・vitest・`./page`・`./globals.css` と旧ディレクトリのみなので違反なし）

- [ ] **Step 3: 違反を検出できることを確認する（一時ファイル）**

```bash
mkdir -p src/shared/lib && printf 'import { useState } from "react";\nexport const probe = useState;\n' > src/shared/lib/probe.ts
npx vitest run src/architecture.test.ts
```

Expected: FAIL。差分に `shared/lib/probe.ts → react: react を import できるのは ui 層（shared/ui・src/app を含む）のみ` が表示される。

確認後に削除する:

```bash
rm -r src/shared
```

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit -p .`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/architecture.test.ts
git commit -m "test: 機能・層の import 境界を検査するアーキテクチャテストを追加"
```

---

### Task 3: `shared/lib` の抽出（format・glossary）

**Files:**
- Move: `src/lib/format.ts` → `src/shared/lib/format.ts`
- Move: `src/lib/format.test.ts` → `src/shared/lib/format.test.ts`
- Move: `src/lib/glossary.ts` → `src/shared/lib/glossary.ts`
- Move: `src/lib/glossary.test.ts` → `src/shared/lib/glossary.test.ts`
- Create: `src/shared/lib/index.ts`
- Modify: `@/lib/format`・`@/lib/glossary`・`./format` を import している全ファイル（Step 3 の一覧）

**Interfaces:**
- Produces: `@/shared/lib` から `formatManYen`, `formatManYenLabel`, `formatPercent`, `formatYen`, `GLOSSARY`, `GlossaryEntry`（型）, `GlossaryTermKey`（型）

- [ ] **Step 1: ファイルを移動する**

```bash
mkdir -p src/shared/lib
git mv src/lib/format.ts src/lib/format.test.ts src/lib/glossary.ts src/lib/glossary.test.ts src/shared/lib/
```

テスト内の import（`./format`・`./glossary`）は同一ディレクトリのままなので変更不要。

- [ ] **Step 2: 公開 API を作る**

`src/shared/lib/index.ts`:

```ts
/** shared/lib の公開 API。機能・app からはこの index 経由で import する。 */
export { formatManYen, formatManYenLabel, formatPercent, formatYen } from "./format";
export { GLOSSARY, type GlossaryEntry, type GlossaryTermKey } from "./glossary";
```

- [ ] **Step 3: import 先を書き換える**

```bash
perl -pi -e 's#"\@/lib/(format|glossary)"#"\@/shared/lib"#g' $(grep -rlE '"@/lib/(format|glossary)"' src)
perl -pi -e 's#"\./format"#"\@/shared/lib"#g' src/lib/assumptions.test.ts
```

対象になるファイル（書き換え後に確認する）: `src/app/page.tsx`, `src/components/{DepletionAdvice,SummaryBar,ResultTable,ResultTable.test}.tsx`, `src/components/forms/{LoanForm,fields}.tsx`, `src/components/charts/{ComparisonChart,NetWorthChart,CashFlowChart}.tsx`, `src/components/game/{GameResult,AdventureLog,GameHud,StageCard}.tsx`, `src/components/ui/{TermHelp,TermHelp.test}.tsx`, `src/lib/assumptions.ts`, `src/lib/assumptions.test.ts`, `src/lib/simulation/longevitySummary.ts`, `src/lib/comparisonDiff.ts`, `src/lib/game/assetDiff.ts`

- [ ] **Step 4: 同一モジュールからの重複 import を1行にまとめる**

`src/components/forms/fields.tsx` の次の2行:

```ts
import { formatManYenLabel } from "@/shared/lib";
import type { GlossaryTermKey } from "@/shared/lib";
```

を1行にする:

```ts
import { formatManYenLabel, type GlossaryTermKey } from "@/shared/lib";
```

確認: `grep -rc 'from "@/shared/lib"' src | grep -v ':0$' | grep -v ':1$'`
Expected: 出力なし

- [ ] **Step 5: 旧パスの参照が残っていないことを確認する**

Run: `grep -rnE '@/lib/(format|glossary)|"\./(format|glossary)"' src | grep -v '^src/shared/lib/'`
Expected: 出力なし

- [ ] **Step 6: テスト・型チェック**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: 型エラーなし。全テスト PASS、`Tests` の件数が Task 0 の M + Task 1・2 で追加した件数と一致する。

- [ ] **Step 7: コミット**

```bash
git add -A src
git commit -m "refactor: format・glossary を shared/lib へ移動"
```

---

### Task 4: `shared/ui` の抽出（共通 UI 部品・入力欄・チャートテーマ）

**Files:**
- Move: `src/components/ui/{Button,ConfirmDialog,ConfirmDialog.test,Eyebrow,Panel,TermHelp,TermHelp.test}.tsx`, `src/components/ui/{termHelpPosition,termHelpPosition.test}.ts` → `src/shared/ui/`
- Move: `src/components/forms/{fields.tsx,fields.test.tsx,NumberField.test.tsx,number-input.ts,number-input.test.ts}` → `src/shared/ui/`
- Move: `src/components/charts/chartTheme.ts` → `src/shared/ui/chartTheme.ts`
- Move: `src/lib/theme-contrast.test.ts` → `src/shared/ui/theme-contrast.test.ts`
- Create: `src/shared/ui/index.ts`
- Modify: `src/shared/ui/fields.tsx`, `src/shared/ui/theme-contrast.test.ts`, `src/components/forms/number-input.integration.test.ts`、および Step 4 の一覧のファイル

**Interfaces:**
- Consumes: `@/shared/lib`（Task 3）
- Produces: `@/shared/ui` から `Button`, `ConfirmDialog`, `ConfirmDialogHandle`（型）, `Eyebrow`, `Panel`, `TermHelp`, `CheckboxField`, `NumberField`, `PercentField`, `Section`, `SelectField`, `TextField`, `formatGroupedNumber`, `normalizeNumberInput`, `sanitizeNumberDraft`, `NormalizeResult`（型）, `NumberInputOptions`（型）, `axisTick`, `chartColors`, `legendStyle`, `seriesPalette`, `tooltipStyle`

- [ ] **Step 1: ファイルを移動する**

```bash
mkdir -p src/shared/ui
git mv src/components/ui/* src/shared/ui/
git mv src/components/forms/fields.tsx src/components/forms/fields.test.tsx \
  src/components/forms/NumberField.test.tsx src/components/forms/number-input.ts \
  src/components/forms/number-input.test.ts src/shared/ui/
git mv src/components/charts/chartTheme.ts src/shared/ui/chartTheme.ts
git mv src/lib/theme-contrast.test.ts src/shared/ui/theme-contrast.test.ts
```

`src/components/forms/number-input.integration.test.ts` は移動しない（「仕様からの補足・判断」5）。

- [ ] **Step 2: 移動したファイル内の import を直す**

`src/shared/ui/fields.tsx`（`shared/ui` 内は相対パスで参照する。index を経由すると自己循環になる）:

```ts
// 変更前
import { Panel } from "@/components/ui/Panel";
import { TermHelp } from "@/components/ui/TermHelp";
// 変更後
import { Panel } from "./Panel";
import { TermHelp } from "./TermHelp";
```

`src/shared/ui/theme-contrast.test.ts`（1階層深くなった）:

```ts
// 変更前
import config from "../../tailwind.config";
// 変更後
import config from "../../../tailwind.config";
```

`src/components/forms/number-input.integration.test.ts`:

```ts
// 変更前
import { normalizeNumberInput } from "./number-input";
// 変更後
import { normalizeNumberInput } from "@/shared/ui";
```

- [ ] **Step 3: 公開 API を作る**

`src/shared/ui/index.ts`:

```ts
/** shared/ui の公開 API。機能・app からはこの index 経由で import する。 */
export { Button } from "./Button";
export { ConfirmDialog, type ConfirmDialogHandle } from "./ConfirmDialog";
export { Eyebrow } from "./Eyebrow";
export { Panel } from "./Panel";
export { TermHelp } from "./TermHelp";
export { CheckboxField, NumberField, PercentField, Section, SelectField, TextField } from "./fields";
export {
  formatGroupedNumber,
  normalizeNumberInput,
  sanitizeNumberDraft,
  type NormalizeResult,
  type NumberInputOptions,
} from "./number-input";
export { axisTick, chartColors, legendStyle, seriesPalette, tooltipStyle } from "./chartTheme";
```

- [ ] **Step 4: 利用側の import 先を書き換える**

`src/shared` 以外を対象に一括置換する:

```bash
perl -pi -e 's#"\@/components/ui/(Button|ConfirmDialog|Eyebrow|Panel|TermHelp)"#"\@/shared/ui"#g' \
  $(grep -rlE '"@/components/ui/' src --exclude-dir=shared)
perl -pi -e 's#"\./fields"#"\@/shared/ui"#g' $(grep -rl '"./fields"' src/components/forms)
perl -pi -e 's#"\./chartTheme"#"\@/shared/ui"#g' $(grep -rl '"./chartTheme"' src/components/charts)
```

- [ ] **Step 5: 同一モジュールからの重複 import を1行にまとめる**

次のファイルでは `from "@/shared/ui"` が複数行になる。各ファイルで最初の `@/shared/ui` の import 行を下表の1行に置き換え、残りの `@/shared/ui` の import 行を削除する（他の import 行の順序は変えない）。

| ファイル | まとめた後の1行 |
|------|------|
| `src/app/page.tsx` | `import { Button, ConfirmDialog, Eyebrow, Panel, type ConfirmDialogHandle } from "@/shared/ui";` |
| `src/app/game/page.tsx` | `import { Button, Eyebrow, Panel } from "@/shared/ui";` |
| `src/components/ScenarioBar.tsx` | `import { Button, ConfirmDialog, Panel, type ConfirmDialogHandle } from "@/shared/ui";` |
| `src/components/forms/IncomeAdjustmentForm.tsx` | `import { Button, CheckboxField, ConfirmDialog, NumberField, PercentField, Section, SelectField, TextField, type ConfirmDialogHandle } from "@/shared/ui";` |
| `src/components/forms/EventForm.tsx` | `import { Button, ConfirmDialog, NumberField, Section, TextField, type ConfirmDialogHandle } from "@/shared/ui";` |
| `src/components/forms/HouseholdForm.tsx` | `import { Button, ConfirmDialog, NumberField, PercentField, Section, SelectField, TextField, type ConfirmDialogHandle } from "@/shared/ui";` |
| `src/components/forms/LoanForm.tsx` | `import { Button, CheckboxField, ConfirmDialog, NumberField, PercentField, Section, TermHelp, TextField, type ConfirmDialogHandle } from "@/shared/ui";` |
| `src/components/forms/PropertyForm.tsx` | `import { Button, ConfirmDialog, NumberField, PercentField, Section, TextField, type ConfirmDialogHandle } from "@/shared/ui";` |
| `src/components/forms/RecurringExpenseForm.tsx` | `import { Button, ConfirmDialog, NumberField, Section, TextField, type ConfirmDialogHandle } from "@/shared/ui";` |
| `src/components/game/GameResult.tsx` | `import { Button, ConfirmDialog, Panel, type ConfirmDialogHandle } from "@/shared/ui";` |
| `src/components/game/StageCard.tsx` | `import { Button, Panel } from "@/shared/ui";` |

`ComparisonChart.tsx` の複数行 import（`axisTick` 〜 `tooltipStyle`）は1文なのでそのままでよい。

確認: `grep -rc 'from "@/shared/ui"' src | grep -v ':0$' | grep -v ':1$'`
Expected: 出力なし

- [ ] **Step 6: 旧パスの参照が残っていないことを確認する**

Run: `grep -rnE '@/components/ui/|"\./(fields|number-input|chartTheme)"|@/components/(forms/(fields|number-input)|charts/chartTheme)' src | grep -v '^src/shared/ui/'`
Expected: 出力なし

Run: `ls src/components/ui 2>/dev/null; echo "exit=$?"`
Expected: `exit=1` 以外なら空ディレクトリを `rmdir src/components/ui` で削除する（git は空ディレクトリを追跡しない）

- [ ] **Step 7: テスト・型チェック**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: 型エラーなし。全テスト PASS（`architecture.test.ts` を含む）。`Tests` の件数が Task 3 Step 6 と同じ。

- [ ] **Step 8: コミット**

```bash
git add -A src
git commit -m "refactor: 共通 UI 部品・入力欄・チャートテーマを shared/ui へ移動"
```

---

### Task 5: ビルド確認と PR 作成

**Files:** なし

- [ ] **Step 1: 本番ビルド**

Run: `npm run build`
Expected: 成功。`"use client"` 境界や barrel（`index.ts`）の re-export に関するエラーがないこと。

- [ ] **Step 2: 見た目の確認**

Run: `npm run dev` を起動し、`/` と `/game` を開いて、ボタン・パネル・用語ヘルプ（？アイコン）・数値入力・チャートの配色が移動前と変わらないことを目視確認する（Tailwind の `content` は `./src/**/*.{ts,tsx}` なので `src/shared` のクラスも拾われる）。

- [ ] **Step 3: 最終テスト**

Run: `npm run test`
Expected: 全 PASS

- [ ] **Step 4: PR を作成する**

```bash
git push -u origin refactor/architecture-test
gh pr create --base main --title "refactor: アーキテクチャテスト追加と shared の抽出" --body "$(cat <<'EOF'
## 概要
設計書（docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md）の移行手順 #1。

- `src/architecture.test.ts`: `src/{features,shared,app}` の import 境界を検査（移行期間中は `src/lib`・`src/components` を除外）
- `src/architecture/importRules.ts`: 判定ロジック（純粋関数）と単体テスト
- `src/shared/lib`: format・glossary
- `src/shared/ui`: 共通 UI 部品・入力欄・チャートテーマ・テーマのコントラストテスト

挙動・見た目の変更なし。

## 設計からの補足
- `number-input.integration.test.ts` は simulation に依存するため `src/components/forms/` に残し、PR 4 で `features/simulation/ui/` へ移す。

## 確認
- [x] npm run test
- [x] npm run build
- [x] `/`・`/game` の目視確認

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
