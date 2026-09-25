// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { YearlyResult } from "@/lib/simulation/types";
import { ResultTable } from "./ResultTable";
import { formatYen } from "@/lib/format";

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
  act(() => root?.unmount());
  container?.remove();
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
    childAllowance: 0,
    housingLoanCredit: 0,
    netIncome: 4_300_000,
    livingExpense: 3_000_000,
    eventNet: 0,
    recurringExpense: 0,
    loanPayment: 0,
    retirementBenefit: 0,
    dividendIncome: 0,
    dividendTax: 0,
    cashFlow: 1_300_000,
    assets: 10_000_000,
    propertyValue: 0,
    financialAssets: 10_000_000,
    loanBalance: 0,
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
  const index = ths.findIndex((node) => node.textContent === label);
  if (index < 0) throw new Error(`column not found: ${label}`);
  return index;
}

/** class 文字列から `z-<n>` を抽出する。見つからなければ null。 */
function getZIndexClassValue(className: string): number | null {
  const match = className.match(/\bz-(\d+)\b/);
  return match ? Number(match[1]) : null;
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

  it("「本人年齢」列の th と全 td が sticky left-16 クラスを持つ", () => {
    const el = mount(<ResultTable results={results} />);
    const th = getHeaderCell(el, "本人年齢");
    expect(th.className).toMatch(/\bsticky\b/);
    expect(th.className).toMatch(/\bleft-16\b/);

    const colIndex = getColumnIndex(el, "本人年齢");
    const tds = getBodyCellsByColumn(el, colIndex);
    for (const td of tds) {
      expect(td.className).toMatch(/\bsticky\b/);
      expect(td.className).toMatch(/\bleft-16\b/);
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

  it("z-index の重なり順が不変条件を満たす（固定 td < thead < 固定 th）", () => {
    const el = mount(<ResultTable results={results} />);
    const thead = el.querySelector("thead") as HTMLElement;
    const theadZ = getZIndexClassValue(thead.className);

    const yearColIndex = getColumnIndex(el, "年");
    const stickyTh = getHeaderCell(el, "年");
    const stickyThZ = getZIndexClassValue(stickyTh.className);
    const stickyTds = getBodyCellsByColumn(el, yearColIndex);

    expect(theadZ).not.toBeNull();
    expect(stickyThZ).not.toBeNull();

    for (const td of stickyTds) {
      const tdZ = getZIndexClassValue(td.className);
      expect(tdZ).not.toBeNull();
      // 固定 td は縦スクロール時に thead の見出しを覆ってはならない。
      expect(tdZ as number).toBeLessThan(theadZ as number);
      // 角セル（縦横とも固定される th）は固定 td より必ず前面に出る。
      expect(stickyThZ as number).toBeGreaterThan(tdZ as number);
    }
  });
});

describe("ResultTable — 継続支出の列（#18）", () => {
  it("「継続支出」列の見出しと値を表示する", () => {
    const el = mount(<ResultTable results={[makeRow({ recurringExpense: 1_200_000 })]} />);
    const headers = [...el.querySelectorAll("th")].map((th) => th.textContent);
    expect(headers).toContain("継続支出");

    const index = headers.indexOf("継続支出");
    const cells = [...el.querySelectorAll("tbody tr td")].map(
      (td) => td.textContent,
    );
    expect(cells[index]).toBe(formatYen(1_200_000));
  });

  it("「継続支出」列は「生活費」の直後に並ぶ", () => {
    const el = mount(<ResultTable results={[makeRow()]} />);
    const headers = [...el.querySelectorAll("th")].map((th) => th.textContent);
    expect(headers.indexOf("継続支出")).toBe(headers.indexOf("生活費") + 1);
  });

  it("配当(手取)列を退職金列の直後に円表示する", () => {
    const el = mount(
      <ResultTable results={[makeRow({ dividendIncome: 123_456 })]} />,
    );
    const index = getColumnIndex(el, "配当(手取)");
    expect(index).toBe(getColumnIndex(el, "退職金") + 1);
    const cell = el.querySelectorAll("tbody tr")[0].children[index];
    expect(cell.textContent).toBe(formatYen(123_456));
  });
});

describe("ResultTable — モバイルカード表示（lp-025）", () => {
  const originalWidth = window.innerWidth;

  function setViewport(width: number) {
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: width,
      });
      window.dispatchEvent(new Event("resize"));
    });
  }

  afterEach(() => setViewport(originalWidth));

  const rows = [
    makeRow({ year: 2025, assets: 10_000_000, tax: 111_111, taxFreeAssets: 2_222_222 }),
    makeRow({ year: 2026, assets: -500_000, retirementBenefit: 3_333_333 }),
  ];

  it("640px 以上はテーブル、639px 以下はカードに切り替わる（境界）", () => {
    setViewport(640);
    const el = mount(<ResultTable results={rows} />);
    expect(el.querySelector("table")).not.toBeNull();
    expect(el.querySelector("li")).toBeNull();

    setViewport(639);
    expect(el.querySelector("table")).toBeNull();
    expect(el.querySelectorAll("li").length).toBe(rows.length);

    setViewport(640);
    expect(el.querySelector("table")).not.toBeNull();
  });

  it("id はどちらの表示でも維持される（aria-describedby 参照用）", () => {
    setViewport(390);
    const el = mount(<ResultTable results={rows} id="custom-id" />);
    expect(el.querySelector("#custom-id")).not.toBeNull();
  });

  it("年・年齢・純資産を常時表示し、手取り/生活費/収支/イベントを表示する", () => {
    setViewport(390);
    const el = mount(<ResultTable results={rows} />);
    const first = el.querySelectorAll("li")[0];
    const text = first.querySelector("button")!.textContent!;
    expect(text).toContain("2025");
    expect(text).toContain("40歳");
    expect(text).toContain(formatYen(10_000_000));
    for (const v of [4_300_000, 3_000_000, 1_300_000, 0]) {
      expect(text).toContain(formatYen(v));
    }
  });

  it("タップで展開/折りたたみでき、aria-expanded が連動する", () => {
    setViewport(390);
    const el = mount(<ResultTable results={rows} />);
    const li = el.querySelectorAll("li")[0];
    const button = li.querySelector("button")!;
    const detail = li.querySelector("dl") as HTMLElement;

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(detail.hidden).toBe(true);
    // `grid` などの display クラスは hidden 属性に勝つため、非表示は `hidden` クラスで担保する
    expect(detail.classList.contains("hidden")).toBe(true);
    expect(detail.classList.contains("grid")).toBe(false);

    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(detail.hidden).toBe(false);
    expect(detail.classList.contains("grid")).toBe(true);
    expect(detail.classList.contains("hidden")).toBe(false);
    // 他のカードは展開されない
    expect(el.querySelectorAll("li")[1].querySelector("dl")!.hidden).toBe(true);

    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(detail.hidden).toBe(true);
  });

  it("展開項目の値が YearlyResult と完全一致する（税・社保・ローン・退職金・非課税ほか）", () => {
    setViewport(390);
    const el = mount(<ResultTable results={rows} />);
    const li = el.querySelectorAll("li")[1];
    const pairs = new Map(
      [...li.querySelectorAll("dl > div")].map((d) => [
        d.querySelector("dt")!.textContent,
        d.querySelector("dd")!.textContent,
      ]),
    );
    const r = rows[1];
    expect(pairs.get("税")).toBe(formatYen(r.tax));
    expect(pairs.get("社会保険")).toBe(formatYen(r.socialInsurance));
    expect(pairs.get("ローン返済")).toBe(formatYen(r.loanPayment));
    expect(pairs.get("退職金")).toBe(formatYen(3_333_333));
    expect(pairs.get("うち非課税")).toBe(formatYen(r.taxFreeAssets));
    expect(pairs.get("世帯収入(税込)")).toBe(formatYen(r.grossIncome));
    expect(pairs.get("継続支出")).toBe(formatYen(r.recurringExpense));
    expect(pairs.get("配当(手取)")).toBe(formatYen(r.dividendIncome));
  });

  it("純資産がマイナスの年は text-danger で表示する", () => {
    setViewport(390);
    const el = mount(<ResultTable results={rows} />);
    const negative = el.querySelectorAll("li")[1].querySelector("button .text-danger");
    expect(negative?.textContent).toBe(formatYen(-500_000));
    expect(el.querySelectorAll("li")[0].querySelector("button .text-danger")).toBeNull();
  });
});

describe("ResultTable — 金融資産・ローン残高の列", () => {
  it("純資産の直後に 金融資産 / うち非課税 / ローン残高 を並べて円表示する", () => {
    const el = mount(
      <ResultTable
        results={[
          makeRow({
            assets: -26_000_000,
            propertyValue: 0,
            financialAssets: 10_000_000,
            loanBalance: 36_000_000,
          }),
        ]}
      />,
    );
    const netIndex = getColumnIndex(el, "純資産");
    expect(getColumnIndex(el, "金融資産")).toBe(netIndex + 1);
    expect(getColumnIndex(el, "うち非課税")).toBe(netIndex + 2);
    expect(getColumnIndex(el, "ローン残高")).toBe(netIndex + 3);
    const cells = el.querySelectorAll("tbody tr")[0].children;
    expect(cells[getColumnIndex(el, "ローン残高")].textContent).toBe(formatYen(36_000_000));
    expect(cells[getColumnIndex(el, "金融資産")].textContent).toBe(formatYen(10_000_000));
  });
});

/** 子育て共働きペルソナレビュー #2・#4: 追加した内訳の列。 */
describe("ResultTable — 家族向けの内訳列", () => {
  it("児童手当・ローン控除・不動産評価額の列を表示する", () => {
    const el = mount(<ResultTable results={[makeRow({ childAllowance: 120_000, housingLoanCredit: 150_000, propertyValue: 30_000_000 })]} />);
    for (const label of ["児童手当", "うちローン控除", "不動産評価額"]) {
      expect(getHeaderCell(el, label)).toBeTruthy();
    }
    expect(el.textContent).toContain("¥30,000,000");
  });
});
