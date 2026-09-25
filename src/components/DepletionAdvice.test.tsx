// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { defaultPlanInput } from "@/lib/simulation/defaults";
import type { PlanInput } from "@/lib/simulation/types";
import { DepletionAdvice } from "./DepletionAdvice";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** 低収入ペルソナレビュー #12・#14: 資産が尽きる場合の逆算提案と支援窓口の案内。 */

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

const lowIncome: PlanInput = {
  ...defaultPlanInput,
  endYear: 1991 + 95,
  self: {
    ...defaultPlanInput.self,
    birthYear: 1991,
    grossAnnualIncome: 2_400_000,
    incomeGrowthRate: 0,
    annualPension: 800_000,
    retirementBenefit: 0,
  },
  spouse: null,
  children: [],
  expenses: { baseAnnualLivingExpense: 1_500_000, inflationRate: 0.01 },
  assets: { ...defaultPlanInput.assets, taxableAssets: 300_000, taxFreeAssets: 0, annualTaxFreeContribution: 0 },
  events: [],
  recurringExpenses: [],
  loans: [],
};


/** 子育て共働き世帯（子2人・賃貸→住宅購入）で借入が過大なため、現役中に手元資金が尽きる計画。 */
const family: PlanInput = {
  ...defaultPlanInput,
  children: [
    ...defaultPlanInput.children,
    { ...defaultPlanInput.children[0], id: "c2", name: "子2", birthYear: defaultPlanInput.startYear + 2 },
  ],
  loans: defaultPlanInput.loans.map((l) => ({ ...l, principal: 65_000_000 })),
  recurringExpenses: [
    { id: "rent", label: "家賃", startYear: defaultPlanInput.startYear, endYear: defaultPlanInput.startYear + 4, annualAmount: 1_440_000 },
  ],
};

describe("DepletionAdvice", () => {
  it("資産が尽きる計画では生活費の削減額と支援窓口の案内を表示する", () => {
    const el = mount(<DepletionAdvice input={lowIncome} />);
    const section = el.querySelector('section[aria-label="資産を尽きさせないための目安"]');
    expect(section).not.toBeNull();
    const items = [...el.querySelectorAll('[data-testid="depletion-remedies"] li')].map((li) => li.textContent);
    expect(items.some((t) => /^生活費を月[\d,]+円減らす$/.test(t ?? ""))).toBe(true);
    expect(el.querySelector('[data-testid="public-support-note"]')?.textContent).toContain("相談");
  });

  it("資産が尽きない計画では何も表示しない", () => {
    const rich = { ...lowIncome, assets: { ...lowIncome.assets, taxableAssets: 1e9 } };
    const el = mount(<DepletionAdvice input={rich} />);
    expect(el.innerHTML).toBe("");
  });

  it("ローンがあれば借入額の削減案を表示する", () => {
    const el = mount(<DepletionAdvice input={family} />);
    const items = [...el.querySelectorAll('[data-testid="depletion-remedies"] li')].map((li) => li.textContent);
    expect(items.some((t) => /^住宅ローンの借入額を[\d,]+万円減らす$/.test(t ?? ""))).toBe(true);
  });

  it("現役中に一時的に尽きる計画では、生活困窮の相談窓口ではなく一時的な不足として案内する", () => {
    const el = mount(<DepletionAdvice input={family} />);
    expect(el.querySelector('[data-testid="public-support-note"]')).toBeNull();
    expect(el.querySelector('[data-testid="temporary-shortage-note"]')?.textContent).toContain(
      "一時的に手元資金が不足",
    );
  });
});
