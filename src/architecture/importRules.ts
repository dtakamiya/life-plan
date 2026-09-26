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

/**
 * アーキテクチャテスト自身（src/architecture.test.ts・src/architecture/）の、src からのパスの先頭要素。
 * 検査の対象外とし、他のファイルからの import は違反とする。
 */
const TOOLING_PATHS: readonly string[] = ["architecture", "architecture.test.ts"];

/** アーキテクチャテストが走査するディレクトリ。 */
export const SCAN_ROOTS: readonly string[] = ["features", "shared", "app"];

/** ui 層（shared/ui・src/app を含む）だけが import できる外部パッケージ。 */
const UI_PACKAGES: readonly string[] = ["react", "react-dom", "next", "zustand", "recharts"];

const INDEX_REASON = "層の index 経由で import する（個別ファイルは不可）";
const SELF_INDEX_REASON = "自層の index を import している（バレルの循環参照の原因になる）";
const UPSTREAM_ALIAS_REASON = "他機能の import は @/features/<feature>/<layer> 形式を使う（相対パスは不可）";

export type Location =
  | { area: "feature"; feature: Feature; layer: Layer; rest: string }
  | { area: "shared"; sub: SharedSub; rest: string }
  | { area: "app"; rest: string }
  | { area: "tooling" }
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
  // vi.mock("x") / vi.doMock("x") / vi.importActual<...>("x") / vi.importMock("x")
  /\bvi\.(?:mock|doMock|importActual|importMock)\s*(?:<[^>]*>)?\(\s*["']([^"']+)["']/g,
  // require("x")
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
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
  if (TOOLING_PATHS.includes(top)) return { area: "tooling" };
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

function checkInternal(from: Checked, to: Location, isAlias: boolean): string | null {
  if (to.area === "tooling") return "アーキテクチャテストのファイルは import できない";
  if (to.area === "unknown") return `機能・層として認識できない import 先: ${to.path}`;
  if (to.area === "app") {
    return from.area === "app" ? null : "src/app を import できるのは src/app のみ";
  }
  if (from.area === "app") {
    return isIndex(to.rest) ? null : INDEX_REASON;
  }
  if (from.area === "shared") {
    if (to.area === "feature") return "shared から features は import できない";
    if (to.sub === from.sub) return isIndex(to.rest) ? SELF_INDEX_REASON : null;
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
  if (to.feature === from.feature) {
    return to.layer === from.layer && isIndex(to.rest) ? SELF_INDEX_REASON : null;
  }
  if (!UPSTREAM[from.feature].includes(to.feature)) {
    return `上流でない機能は import できない（${from.feature} → ${to.feature}）`;
  }
  if (!isAlias) return UPSTREAM_ALIAS_REASON;
  return isIndex(to.rest) ? null : INDEX_REASON;
}

/** `srcPath` のファイルの配置の違反理由を返す。許可なら null。 */
export function checkPlacement(srcPath: string): string | null {
  const location = classify(srcPath);
  return location.area === "unknown" ? `機能・層として認識できない配置: ${location.path}` : null;
}

/** `fromSrcPath` のファイルが `specifier` を import することの違反理由を返す。許可なら null。 */
export function checkImport(fromSrcPath: string, specifier: string): string | null {
  const placement = checkPlacement(fromSrcPath);
  if (placement !== null) return placement;
  const from = classify(fromSrcPath);
  if (from.area === "tooling" || from.area === "unknown") return null;
  const isTest = isTestFile(fromSrcPath);
  const target = resolveSpecifier(fromSrcPath, specifier);
  if (target.kind === "package") return checkPackage(from, target.name, isTest);
  if (target.kind === "outside-src") {
    return isTest ? null : `src 外のファイルを import できるのはテストファイルのみ: ${target.path}`;
  }
  return checkInternal(from, classify(target.srcPath), specifier.startsWith("@/"));
}
