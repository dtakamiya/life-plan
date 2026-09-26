// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { YearlyResult } from "@/features/simulation/domain";
import { SummaryBar } from "./SummaryBar";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** issue #17: 画面上部に固定する要約バーの回帰テスト。 */

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

function row(year: number, selfAge: number, assets: number): YearlyResult {
  return { year, selfAge, assets, financialAssets: assets, loanBalance: 0 } as YearlyResult;
}

function item(el: HTMLElement, key: "last" | "min" | "depleted") {
  const div = el.querySelector(`[data-summary-item="${key}"]`);
  return {
    label: div?.querySelector("dt")?.textContent,
    value: div?.querySelector("dd")?.textContent,
    danger: div?.querySelector("dd")?.classList.contains("text-danger"),
  };
}

describe("SummaryBar", () => {
  it("最終・最小純資産を万円表記、枯渇年を年表記で表示し、マイナス項目だけ危険色にする", () => {
    const el = mount(
      <SummaryBar
        results={[row(2030, 40, 5_000_000), row(2040, 50, -1_200_000), row(2060, 70, 3_000_000)]}
      />,
    );
    expect(item(el, "last")).toEqual({ label: "最終純資産", value: "300万円", danger: false });
    expect(item(el, "min")).toEqual({ label: "最小純資産", value: "-120万円", danger: true });
    expect(item(el, "depleted")).toEqual({ label: "資産が尽きる年", value: "2040年", danger: true });
  });

  it("枯渇しなければ「なし」を危険色なしで表示する", () => {
    const el = mount(<SummaryBar results={[row(2030, 40, 100), row(2031, 41, 200)]} />);
    expect(item(el, "depleted")).toEqual({ label: "資産が尽きる年", value: "なし", danger: false });
  });

  it("画面上部に固定される aside ランドマークで、読み上げを連発する aria-live は持たない", () => {
    const el = mount(<SummaryBar results={[row(2030, 40, 100)]} />);
    const aside = el.querySelector('aside[aria-label="試算結果の要約"]');
    expect(aside).not.toBeNull();
    expect(aside?.classList.contains("sticky")).toBe(true);
    expect(aside?.classList.contains("top-0")).toBe(true);
    expect(aside?.classList.contains("z-40")).toBe(true);
    expect(aside?.hasAttribute("aria-live")).toBe(false);
  });

  it("結果が空なら何も描画しない", () => {
    const el = mount(<SummaryBar results={[]} />);
    expect(el.innerHTML).toBe("");
  });
});
