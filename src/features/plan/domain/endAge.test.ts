import { describe, expect, it } from "vitest";
import { DEFAULT_END_AGE, endAgeToEndYear, endYearToEndAge } from "./endAge";

describe("endAgeToEndYear", () => {
  it("生年に終了年齢を足した西暦年を返す", () => {
    expect(endAgeToEndYear(1990, 95)).toBe(2085);
  });

  it("誕生年が世紀を跨ぐ入力でも単純な加算として正しく変換する", () => {
    expect(endAgeToEndYear(1999, 1)).toBe(2000);
    expect(endAgeToEndYear(2000, 0)).toBe(2000);
  });

  it("境界値: 終了年齢 0 歳（本人の生年）を正しく変換する", () => {
    expect(endAgeToEndYear(1985, 0)).toBe(1985);
  });

  it("境界値: 既定の終了年齢 95 歳を正しく変換する", () => {
    expect(endAgeToEndYear(1980, DEFAULT_END_AGE)).toBe(1980 + DEFAULT_END_AGE);
  });

  it("旧固定値 endYear=2076 と同じ結果になる入力を再現できる", () => {
    // 2026年時点で35歳（birthYear=1991）の本人が endYear=2076（=91歳）を
    // 指定していたケースと同じ endYear になることを確認する。
    expect(endAgeToEndYear(1991, 85)).toBe(2076);
  });
});

describe("endYearToEndAge", () => {
  it("endAgeToEndYear の逆変換になる", () => {
    expect(endYearToEndAge(1990, 2085)).toBe(95);
  });

  it("誕生年跨ぎでも西暦年の引き算として正しく年齢へ戻す", () => {
    expect(endYearToEndAge(1999, 2000)).toBe(1);
  });

  it("往復変換で値が保たれる", () => {
    const birthYear = 1988;
    for (const age of [0, 1, 36, 94, 95, 120]) {
      expect(endYearToEndAge(birthYear, endAgeToEndYear(birthYear, age))).toBe(age);
    }
  });
});
