// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NetWorthChart } from "./NetWorthChart";
import { runSimulation } from "@/lib/simulation/engine";
import { singleRenterPlanInput } from "@/lib/simulation/defaults";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;
});

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
  act(() => root.render(ui));
  return container;
}

describe("NetWorthChart — 資産が尽きた後の表示（低収入ペルソナ #13）", () => {
  it("枯渇するプランでは、0円で止めて網掛けで示すことをラベルで伝える", () => {
    const results = runSimulation({
      ...singleRenterPlanInput,
      expenses: { ...singleRenterPlanInput.expenses, baseAnnualLivingExpense: 3_500_000 },
    });
    const el = mount(<NetWorthChart results={results} />);
    expect(el.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain(
      "資産が尽きた後は0円で止め",
    );
  });

  it("枯渇しないプランでは通常のラベルのまま", () => {
    const results = runSimulation({
      ...singleRenterPlanInput,
      expenses: { ...singleRenterPlanInput.expenses, baseAnnualLivingExpense: 1_000_000 },
    });
    const el = mount(<NetWorthChart results={results} />);
    expect(el.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(
      "純資産推移の面グラフ",
    );
  });
});
