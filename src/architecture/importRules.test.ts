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
      `const r = require("./required");`,
      `vi.doMock("./do-mocked", () => ({}));`,
      `const y = await vi.importMock("./import-mocked");`,
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
        "./required",
        "./do-mocked",
        "./import-mocked",
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
    ["shared/ui/Foo.tsx", "@/shared/ui", "自層の index"],
    ["shared/ui/Foo.tsx", "./index", "自層の index"],
    ["features/plan/ui/Foo.tsx", "@/features/plan/ui", "自層の index"],
    ["features/plan/domain/loan.ts", ".", "自層の index"],
    ["features/simulation/domain/x.ts", "../../plan/domain", "@/features"],
  ])("%s → %s（%s）", (from, specifier, reason) => {
    expect(checkImport(from, specifier)).toContain(reason);
  });
});
