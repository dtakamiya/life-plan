// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { YearlyResult } from "@/lib/simulation/types";
import { CashFlowChart } from "./CashFlowChart";
import { NetWorthChart } from "./NetWorthChart";
import { ComparisonChart } from "./ComparisonChart";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom は ResizeObserver 未実装。recharts の ResponsiveContainer が要求するため
// 最小限のダミー実装を積む（実際のリサイズ監視は検証対象ではない）。
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;
});

/**
 * lp-ui-ux-audit-fix / FR6.1 の回帰テスト。
 * 各チャートのルート要素が aria-describedby で ResultTable（既定 id:
 * "result-table"）と関連付いていることを確認する（実描画で属性を検証）。
 */

const results: YearlyResult[] = [
  {
    year: 2026,
    selfAge: 40,
    spouseAge: null,
    grossIncome: 6_000_000,
    tax: 800_000,
    socialInsurance: 900_000,
    netIncome: 4_300_000,
    livingExpense: 3_600_000,
    loanPayment: 0,
    eventNet: 0,
    retirementBenefit: 0,
    cashFlow: 700_000,
    assets: 5_700_000,
    taxFreeAssets: 0,
  },
];

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

describe("チャートのテキスト代替（FR6.1）", () => {
  it("CashFlowChart は result-table を aria-describedby で参照する", () => {
    const el = mount(<CashFlowChart results={results} />);
    expect(
      el.querySelector('[aria-describedby="result-table"]'),
    ).not.toBeNull();
  });

  it("NetWorthChart は result-table を aria-describedby で参照する", () => {
    const el = mount(<NetWorthChart results={results} />);
    expect(
      el.querySelector('[aria-describedby="result-table"]'),
    ).not.toBeNull();
  });

  it("ComparisonChart は result-table を aria-describedby で参照する", () => {
    const el = mount(<ComparisonChart current={results} snapshots={[]} />);
    expect(
      el.querySelector('[aria-describedby="result-table"]'),
    ).not.toBeNull();
  });
});
