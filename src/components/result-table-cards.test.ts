import { describe, it, expect } from "vitest";
import {
  CARD_BREAKPOINT_PX,
  CARD_DETAIL_FIELDS,
  CARD_SUMMARY_FIELDS,
  isCardLayout,
  toggleExpanded,
} from "./result-table-cards";

describe("isCardLayout — ブレークポイント判定", () => {
  it("境界は 640px: 639 はカード、640 はテーブル", () => {
    expect(CARD_BREAKPOINT_PX).toBe(640);
    expect(isCardLayout(639)).toBe(true);
    expect(isCardLayout(640)).toBe(false);
  });

  it("390px（モバイル）はカード、1280px（デスクトップ）はテーブル", () => {
    expect(isCardLayout(390)).toBe(true);
    expect(isCardLayout(1280)).toBe(false);
  });
});

describe("toggleExpanded — 展開状態の管理", () => {
  it("未展開の年を展開する", () => {
    expect([...toggleExpanded(new Set(), 2030)]).toEqual([2030]);
  });

  it("展開済みの年を折りたたむ", () => {
    expect(toggleExpanded(new Set([2030]), 2030).size).toBe(0);
  });

  it("他の年の状態を保持し、入力の集合を変更しない", () => {
    const before = new Set([2030]);
    const after = toggleExpanded(before, 2031);
    expect([...after].sort()).toEqual([2030, 2031]);
    expect([...before]).toEqual([2030]);
  });
});

describe("カード項目定義", () => {
  it("2x2 は 手取り/生活費/収支/イベント の4項目", () => {
    expect(CARD_SUMMARY_FIELDS.map((f) => f.label)).toEqual([
      "手取り",
      "生活費",
      "収支",
      "イベント",
    ]);
  });

  it("展開項目は AC の5列を先頭に含み、常時表示項目と重複しない", () => {
    expect(CARD_DETAIL_FIELDS.slice(0, 5).map((f) => f.label)).toEqual([
      "税",
      "社会保険",
      "ローン返済",
      "退職金",
      "うち非課税",
    ]);
    const shown = new Set<string>([
      "year",
      "selfAge",
      "assets",
      ...CARD_SUMMARY_FIELDS.map((f) => f.key),
    ]);
    for (const f of CARD_DETAIL_FIELDS) expect(shown.has(f.key)).toBe(false);
  });
});
