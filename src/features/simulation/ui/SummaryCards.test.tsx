// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { YearlyResult } from "@/features/simulation/domain";
import { SummaryCards } from "./SummaryCards";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** 結果冒頭のサマリーカード（最終純資産・最小純資産・資産が尽きる年）の回帰テスト。 */

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

function row(
  year: number,
  selfAge: number,
  assets: number,
  financialAssets = assets,
): YearlyResult {
  return { year, selfAge, assets, financialAssets, loanBalance: 0 } as YearlyResult;
}

/** ラベルで始まるカードの値の要素と、カード全体の文字列を返す。 */
function card(el: HTMLElement, label: string) {
  const div = [...el.querySelectorAll(".rounded-2xl")].find((d) =>
    d.textContent?.startsWith(label),
  );
  return {
    text: div?.textContent ?? "",
    danger: div?.querySelector(".font-display")?.classList.contains("text-danger"),
  };
}

describe("SummaryCards", () => {
  it("枯渇しない結果では、1行判定と3枚のカードを表示し危険色を使わない", () => {
    const el = mount(
      <SummaryCards results={[row(2030, 40, 5_000_000), row(2031, 41, 6_000_000)]} />,
    );
    expect(el.textContent).toContain("生涯枯渇なし");
    expect(card(el, "最終純資産").text).toContain("¥6,000,000");
    expect(card(el, "最終純資産").text).toContain("2031年（本人41歳）時点");
    expect(card(el, "最終純資産").danger).toBe(false);
    expect(card(el, "最小純資産").text).toContain("2030年（本人40歳）で最小");
    expect(card(el, "資産が尽きる年").text).toContain("なし");
    expect(card(el, "資産が尽きる年").text).toContain("生涯を通じて枯渇なし");
    expect(card(el, "資産が尽きる年").danger).toBe(false);
  });

  it("金融資産がマイナスになる年があれば、その年を危険色で表示する", () => {
    const el = mount(
      <SummaryCards
        results={[row(2030, 40, 1_000_000), row(2031, 41, -500_000), row(2032, 42, -900_000)]}
      />,
    );
    expect(el.textContent).toContain("40歳まで資産が持ちます");
    expect(card(el, "最小純資産").text).toContain("最終年まで減り続けています");
    expect(card(el, "最小純資産").danger).toBe(true);
    expect(card(el, "資産が尽きる年").text).toContain("2031年");
    expect(card(el, "資産が尽きる年").text).toContain("本人41歳で初めて残高マイナス");
    expect(card(el, "資産が尽きる年").danger).toBe(true);
  });

  it("金融資産は枯渇せず純資産だけがマイナスなら、判定基準の違いを補足する", () => {
    const el = mount(
      <SummaryCards
        results={[row(2030, 40, -2_000_000, 1_000_000), row(2031, 41, 500_000, 1_500_000)]}
      />,
    );
    expect(card(el, "資産が尽きる年").text).toContain(
      "金融資産は枯渇なし（ローン残高を含む純資産は2030年に最小）",
    );
  });

  it("結果が空なら何も描画しない", () => {
    const el = mount(<SummaryCards results={[]} />);
    expect(el.innerHTML).toBe("");
  });
});
