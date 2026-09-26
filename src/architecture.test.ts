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
    const files = listSourceFiles();
    expect(files).toContain("app/page.tsx");
    expect(files).toContain("shared/lib/index.ts");
    expect(files).toContain("shared/ui/index.ts");
    expect(files).toContain("features/plan/domain/index.ts");
    expect(files).toContain("features/plan/application/index.ts");
    expect(files).toContain("features/plan/infrastructure/index.ts");
    expect(files).toContain("features/plan/ui/index.ts");
    expect(files).toContain("features/simulation/domain/index.ts");
  });

  it("features・shared・app に import ルール違反がない", () => {
    expect(collectViolations()).toEqual([]);
  });
});
