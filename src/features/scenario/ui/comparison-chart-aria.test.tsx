// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { YearlyResult } from "@/features/simulation/domain";
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
 * lp-ui-ux-audit-fix / FR6.1 の回帰テスト（ComparisonChart 分）。
 * ComparisonChart は scenario の UI のため、simulation/ui へ移した chart-aria.test.tsx から分けた。
 */

const results: YearlyResult[] = [
  {
    year: 2026,
    selfAge: 40,
    spouseAge: null,
    grossIncome: 6_000_000,
    tax: 800_000,
    socialInsurance: 900_000,
    investmentTax: 0,
    pension: 0,
    childAllowance: 0,
    housingLoanCredit: 0,
    netIncome: 4_300_000,
    livingExpense: 3_600_000,
    loanPayment: 0,
    eventNet: 0,
    recurringExpense: 0,
    retirementBenefit: 0,
    dividendIncome: 0,
    dividendTax: 0,
    cashFlow: 700_000,
    assets: 5_700_000,
    propertyValue: 0,
    financialAssets: 5_700_000,
    loanBalance: 0,
    taxableAssets: 5_700_000,
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
  it("ComparisonChart は result-table を aria-describedby で参照する", () => {
    const el = mount(<ComparisonChart current={results} snapshots={[]} />);
    expect(
      el.querySelector('[aria-describedby="result-table"]'),
    ).not.toBeNull();
  });
});
