import { describe, it, expect } from "vitest";
import {
  formatGroupedNumber,
  normalizeNumberInput,
  sanitizeNumberDraft,
} from "./number-input";

/**
 * lp-012 / QA#1: 入力文字列 → 正規化後 number の対応表を純関数として固定する。
 */
describe("normalizeNumberInput — 対応表（AC#5）", () => {
  // 符号あり（ライフイベント金額など）の対応表
  const signedTable: Array<[string, number | null]> = [
    ["", null], // 空 = 未入力。0 を自動補填しない
    ["0", 0],
    ["-", null], // 符号のみ = 未確定
    ["-3000000", -3000000], // 先頭 `-` を保持
    ["3,000,000", 3000000], // カンマ区切り
    ["１２３", 123], // 全角数字
    ["12-3", 123], // 語中の `-` は捨てて数字を連結
    ["--5", -5], // 先頭 `-` は 1 個に畳む
    ["1.5.2", 1.52], // 2 個目の小数点は捨てて数字を連結
  ];

  it.each(signedTable)("signed: %j → %j", (input, expected) => {
    expect(normalizeNumberInput(input, { signed: true }).value).toBe(expected);
  });

  // 符号なし（年収・資産残高など 0 以上）: `-` は無視される（AC#3）
  const unsignedTable: Array<[string, number | null]> = [
    ["", null],
    ["0", 0],
    ["-", null],
    ["-3000000", 3000000], // 先頭 `-` を無視 → 正の値
    ["3,000,000", 3000000],
    ["１２３", 123],
    ["12-3", 123],
    ["--5", 5],
    ["1.5.2", 1.52],
  ];

  it.each(unsignedTable)("unsigned: %j → %j", (input, expected) => {
    expect(normalizeNumberInput(input, { signed: false }).value).toBe(expected);
  });
});

describe("normalizeNumberInput — 境界値（AC#7）", () => {
  it("0 / -0 / 1桁 / 7桁以上 / 上限 1e12 でオーバーフローしない", () => {
    expect(normalizeNumberInput("0", { signed: true }).value).toBe(0);
    // -0 は 0 と等価に扱える
    expect(normalizeNumberInput("-0", { signed: true }).value).toBe(0);
    expect(normalizeNumberInput("7", { signed: true }).value).toBe(7);
    expect(normalizeNumberInput("-9999999", { signed: true }).value).toBe(
      -9999999,
    );
    expect(normalizeNumberInput("1000000000000", { signed: true }).value).toBe(
      1e12,
    );
    expect(normalizeNumberInput("-1000000000000", { signed: true }).value).toBe(
      -1e12,
    );
    // 1e12 は安全整数域に収まる
    expect(1e12).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});

/**
 * lp-022 / #16: 金額欄の 3 桁区切り表示。
 * 表示専用の整形で、入力の正規化（sanitize/normalize）とは往復できることが条件。
 */
describe("formatGroupedNumber — 3桁区切りの表示整形（#16）", () => {
  const table: Array<[number, string]> = [
    [0, "0"],
    [100, "100"],
    [1000, "1,000"],
    [30_000_000, "30,000,000"],
    [-3_000_000, "-3,000,000"],
    [1234.56, "1,234.56"], // 小数部は区切らない
    [1e12, "1,000,000,000,000"],
  ];

  it.each(table)("%j → %j", (input, expected) => {
    expect(formatGroupedNumber(input)).toBe(expected);
  });

  it("整形後の文字列は normalizeNumberInput で元の数値へ戻せる", () => {
    for (const [value] of table) {
      const text = formatGroupedNumber(value);
      expect(normalizeNumberInput(text, { signed: true }).value).toBe(value);
    }
  });

  it("有限でない値は空文字を返す（0 を捏造しない）", () => {
    expect(formatGroupedNumber(Number.NaN)).toBe("");
    expect(formatGroupedNumber(Number.POSITIVE_INFINITY)).toBe("");
  });
});

describe("sanitizeNumberDraft — 入力中の表示文字列", () => {
  it("空入力は空のまま（0 を補填しない / AC#1）", () => {
    expect(sanitizeNumberDraft("", { signed: true })).toBe("");
    expect(normalizeNumberInput("", { signed: true }).text).toBe("");
  });

  it("先頭 `-` を後付けできる（キャレット退行の回帰 / AC#5）", () => {
    // "3000000" の先頭に `-` を差し込んだ生入力
    const res = normalizeNumberInput("-3000000", { signed: true });
    expect(res.text).toBe("-3000000"); // 符号が食われない
    expect(res.value).toBe(-3000000);
  });

  it("前後空白・全角空白を除去して正規化する（AC#4）", () => {
    expect(normalizeNumberInput("  1234 ", { signed: false }).value).toBe(1234);
    expect(normalizeNumberInput("１，２３４", { signed: false }).value).toBe(1234);
  });

  it("符号のみ入力は未確定（value=null, text='-'）", () => {
    const res = normalizeNumberInput("-", { signed: true });
    expect(res.value).toBeNull();
    expect(res.text).toBe("-");
  });
});
