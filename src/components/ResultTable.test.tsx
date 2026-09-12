// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { YearlyResult } from "@/lib/simulation/types";
import { ResultTable } from "./ResultTable";

// react-dom の act(...) を有効化する
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-023-sticky-table-columns / issue #20 の回帰テスト。
 * 「年」「本人年齢」列が横スクロール時にも左端へ固定表示されることを検証する。
 */

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function mount(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return container;
}

/** ダミーの YearlyResult 行を作る（ゼブラ確認のため奇数・偶数行を両方用意できる）。 */
function makeRow(overrides: Partial<YearlyResult> = {}): YearlyResult {
  return {
    year: 2025,
    selfAge: 40,
    spouseAge: 38,
    grossIncome: 6_000_000,
    tax: 800_000,
    socialInsurance: 900_000,
    investmentTax: 0,
    pension: 0,
    netIncome: 4_300_000,
    livingExpense: 3_000_000,
    eventNet: 0,
    loanPayment: 0,
    retirementBenefit: 0,
    cashFlow: 1_300_000,
    assets: 10_000_000,
    taxableAssets: 8_000_000,
    taxFreeAssets: 2_000_000,
    ...overrides,
  };
}

const results: YearlyResult[] = [
  makeRow({ year: 2025, selfAge: 40 }),
  makeRow({ year: 2026, selfAge: 41 }),
  makeRow({ year: 2027, selfAge: 42 }),
];

/** ヘッダーの列インデックス（0始まり）からラベルで th を取得する。 */
function getHeaderCell(el: HTMLElement, label: string): HTMLElement {
  const th = [...el.querySelectorAll("thead th")].find(
    (node) => node.textContent === label,
  );
  if (!th) throw new Error(`th not found: ${label}`);
  return th as HTMLElement;
}

function getColumnIndex(el: HTMLElement, label: string): number {
  const ths = [...el.querySelectorAll("thead th")];
  return ths.findIndex((node) => node.textContent === label);
}

function getBodyCellsByColumn(el: HTMLElement, colIndex: number): HTMLElement[] {
  return [...el.querySelectorAll("tbody tr")].map(
    (tr) => tr.children[colIndex] as HTMLElement,
  );
}

describe("ResultTable の sticky 列（issue #20）", () => {
  it("「年」列の th と全 td が sticky left-0 クラスを持つ", () => {
    const el = mount(<ResultTable results={results} />);
    const th = getHeaderCell(el, "年");
    expect(th.className).toMatch(/\bsticky\b/);
    expect(th.className).toMatch(/\bleft-0\b/);

    const colIndex = getColumnIndex(el, "年");
    const tds = getBodyCellsByColumn(el, colIndex);
    expect(tds).toHaveLength(results.length);
    for (const td of tds) {
      expect(td.className).toMatch(/\bsticky\b/);
      expect(td.className).toMatch(/\bleft-0\b/);
    }
  });

  it("「本人年齢」列の th と全 td が sticky left-14 クラスを持つ", () => {
    const el = mount(<ResultTable results={results} />);
    const th = getHeaderCell(el, "本人年齢");
    expect(th.className).toMatch(/\bsticky\b/);
    expect(th.className).toMatch(/\bleft-14\b/);

    const colIndex = getColumnIndex(el, "本人年齢");
    const tds = getBodyCellsByColumn(el, colIndex);
    for (const td of tds) {
      expect(td.className).toMatch(/\bsticky\b/);
      expect(td.className).toMatch(/\bleft-14\b/);
    }
  });

  it("3列目以降（世帯収入(税込)）の th/td は sticky クラスを持たない", () => {
    const el = mount(<ResultTable results={results} />);
    const th = getHeaderCell(el, "世帯収入(税込)");
    expect(th.className).not.toMatch(/\bsticky\b/);

    const colIndex = getColumnIndex(el, "世帯収入(税込)");
    const tds = getBodyCellsByColumn(el, colIndex);
    for (const td of tds) {
      expect(td.className).not.toMatch(/\bsticky\b/);
    }
  });

  it("固定 td は不透明な背景クラス（bg-surface）を持ち、半透明指定を含まない", () => {
    const el = mount(<ResultTable results={results} />);
    const yearColIndex = getColumnIndex(el, "年");
    const selfAgeColIndex = getColumnIndex(el, "本人年齢");

    for (const colIndex of [yearColIndex, selfAgeColIndex]) {
      const tds = getBodyCellsByColumn(el, colIndex);
      for (const td of tds) {
        expect(td.className).toMatch(/\bbg-surface\b/);
        // アルファ付き（半透明）クラスを含まないこと（例: bg-paper/40, bg-brand-50/60）
        expect(td.className).not.toMatch(/\/\d+\b/);
      }
    }
  });

  it("year 列の幅クラスと selfAge 列の left オフセットの数値が整合している", () => {
    const el = mount(<ResultTable results={results} />);
    const yearTh = getHeaderCell(el, "年");
    const selfAgeTh = getHeaderCell(el, "本人年齢");

    const yearWidthMatch = yearTh.className.match(/\bw-(\d+)\b/);
    const selfAgeLeftMatch = selfAgeTh.className.match(/\bleft-(\d+)\b/);

    expect(yearWidthMatch).not.toBeNull();
    expect(selfAgeLeftMatch).not.toBeNull();
    expect(yearWidthMatch?.[1]).toBe(selfAgeLeftMatch?.[1]);
  });
});
