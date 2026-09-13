import { describe, it, expect } from "vitest";
import { GLOSSARY, type GlossaryTermKey } from "./glossary";

/** issue #22: 専門用語の解説辞書の整合性テスト。 */
describe("GLOSSARY", () => {
  const keys = Object.keys(GLOSSARY) as GlossaryTermKey[];

  it("フォームで使う 6 用語がすべて登録されている", () => {
    expect(keys.sort()).toEqual(
      [
        "annualReturnRate",
        "levelPayment",
        "retirementIncomeTax",
        "taxFreeAccount",
        "taxFreeContribution",
        "taxableAccount",
      ].sort(),
    );
  });

  it("用語名と解説文が空でない", () => {
    for (const key of keys) {
      expect(GLOSSARY[key].term.trim()).not.toBe("");
      expect(GLOSSARY[key].description.trim()).not.toBe("");
    }
  });

  it("非課税口座の解説で NISA と iDeCo の両方に触れている", () => {
    expect(GLOSSARY.taxFreeAccount.description).toContain("NISA");
    expect(GLOSSARY.taxFreeAccount.description).toContain("iDeCo");
  });

  it("課税口座の税率はエンジンの前提（約20%）と一致する", () => {
    expect(GLOSSARY.taxableAccount.description).toContain("約20%");
  });
});
