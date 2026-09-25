import { describe, it, expect } from "vitest";
import { childAllowanceForYear } from "./childAllowance";
import { DEFAULT_EDUCATION } from "./education";
import type { Child } from "./types";

/** 子育て共働きペルソナレビュー #4: 児童手当（2024年10月改正後）の概算。 */

function child(id: string, birthYear: number): Child {
  return { id, name: id, birthYear, education: DEFAULT_EDUCATION };
}

describe("childAllowanceForYear", () => {
  it("0〜2歳は月1.5万円（年18万円）", () => {
    expect(childAllowanceForYear([child("a", 2026)], 2026)).toBe(180_000);
    expect(childAllowanceForYear([child("a", 2026)], 2028)).toBe(180_000);
  });

  it("3歳〜高校生年代（17歳）は月1万円（年12万円）、18歳以降と生まれる前は0円", () => {
    expect(childAllowanceForYear([child("a", 2020)], 2023)).toBe(120_000);
    expect(childAllowanceForYear([child("a", 2020)], 2037)).toBe(120_000);
    expect(childAllowanceForYear([child("a", 2020)], 2038)).toBe(0);
    expect(childAllowanceForYear([child("a", 2030)], 2029)).toBe(0);
  });

  it("第3子以降は月3万円（年36万円）", () => {
    const kids = [child("a", 2020), child("b", 2022), child("c", 2025)];
    // 2026年: a=6歳 12万 / b=4歳 12万 / c=1歳・第3子 36万
    expect(childAllowanceForYear(kids, 2026)).toBe(120_000 + 120_000 + 360_000);
  });

  it("上の子が22歳を過ぎると多子の数え方から外れる", () => {
    const kids = [child("a", 2000), child("b", 2010), child("c", 2020)];
    // 2022年: a=22歳（数える）→ c は第3子
    expect(childAllowanceForYear(kids, 2022)).toBe(0 + 120_000 + 360_000);
    // 2023年: a=23歳（数えない）→ c は第2子扱い
    expect(childAllowanceForYear(kids, 2023)).toBe(0 + 120_000 + 120_000);
  });

  it("入力順ではなく生年順に数える", () => {
    const kids = [child("c", 2025), child("a", 2020), child("b", 2022)];
    expect(childAllowanceForYear(kids, 2026)).toBe(600_000);
  });
});
