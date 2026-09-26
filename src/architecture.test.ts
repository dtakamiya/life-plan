import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { checkImport, checkPlacement, extractSpecifiers } from "./architecture/importRules";

/**
 * 機能・層の配置と import 境界の検査。
 * ルールは docs/superpowers/specs/2026-09-26-feature-based-clean-architecture-design.md の 2.2 節。
 */

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));

/** src 配下の .ts/.tsx を src からの POSIX 相対パスで返す。 */
function listSourceFiles(): string[] {
  return readdirSync(SRC_DIR, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file) && !file.endsWith(".d.ts"))
    .map((file) => file.split(path.sep).join("/"));
}

/** 配置違反のファイルは import を検査せず、配置違反だけを報告する。 */
function collectViolations(): string[] {
  return listSourceFiles().flatMap((file) => {
    const placement = checkPlacement(file);
    if (placement !== null) return [`${file}: ${placement}`];
    return extractSpecifiers(readFileSync(path.join(SRC_DIR, file), "utf8")).flatMap((specifier) => {
      const reason = checkImport(file, specifier);
      return reason === null ? [] : [`${file} → ${specifier}: ${reason}`];
    });
  });
}

describe("アーキテクチャ（import 境界）", () => {
  it("検査対象のファイルを走査できている", () => {
    const files = listSourceFiles();
    expect(files).toContain("architecture.test.ts");
    expect(files).toContain("architecture/importRules.ts");
    expect(files).toContain("app/page.tsx");
    expect(files).toContain("shared/lib/index.ts");
    expect(files).toContain("shared/ui/index.ts");
    expect(files).toContain("features/plan/domain/index.ts");
    expect(files).toContain("features/plan/application/index.ts");
    expect(files).toContain("features/plan/infrastructure/index.ts");
    expect(files).toContain("features/plan/ui/index.ts");
    expect(files).toContain("features/simulation/domain/index.ts");
    expect(files).toContain("features/simulation/application/index.ts");
    expect(files).toContain("features/simulation/ui/index.ts");
    expect(files).toContain("features/game/domain/index.ts");
    expect(files).toContain("features/game/application/index.ts");
    expect(files).toContain("features/game/ui/index.ts");
    expect(files).toContain("features/scenario/domain/index.ts");
    expect(files).toContain("features/scenario/application/index.ts");
    expect(files).toContain("features/scenario/infrastructure/index.ts");
    expect(files).toContain("features/scenario/ui/index.ts");
  });

  it("src 全体に配置・import ルール違反がない", () => {
    expect(collectViolations()).toEqual([]);
  });
});
