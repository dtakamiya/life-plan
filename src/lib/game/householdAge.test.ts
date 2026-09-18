import { describe, it, expect } from "vitest";
import { formatMemberAge } from "./householdAge";

describe("formatMemberAge", () => {
  it("生年と対象年から年齢を算出する", () => {
    expect(formatMemberAge(1990, 2026)).toBe("36歳");
  });

  it("対象年が null なら「—」を返す（対象年が定まらない状態のフォールバック）", () => {
    expect(formatMemberAge(1990, null)).toBe("—");
  });

  it("対象年が undefined なら「—」を返す", () => {
    expect(formatMemberAge(1990, undefined)).toBe("—");
  });

  it("board #8: ゲーム終了直後（対象年=シミュレーション最終年）でも『—』にならず数値を返す", () => {
    // 田中太郎(35歳,1991生)が85歳まで進めたケース。
    expect(formatMemberAge(1991, 2076)).toBe("85歳");
  });

  it("高齢域でも数値を返す（境界値: 死亡年相当まで進んだ子・配偶者）", () => {
    expect(formatMemberAge(1958, 2076)).toBe("118歳");
  });
});
