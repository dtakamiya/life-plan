// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PersonFields } from "./PersonFields";
import { DEFAULT_RETIREMENT_BENEFIT, type Person } from "@/features/plan/domain";
import { formatYen } from "@/shared/lib";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-042: 本人の退職一時金の既定値説明の回帰テスト。
 * 既定値定数から生成され、配偶者側には出ないことを検証する。
 */

const person: Person = {
  name: "本人",
  birthYear: 1990,
  grossAnnualIncome: 5_000_000,
  incomeGrowthRate: 0.01,
  retirementAge: 65,
  pensionStartAge: 65,
  annualPension: 1_000_000,
  retirementBenefit: 20_000_000,
};

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

describe("PersonFields — 退職一時金の既定値説明", () => {
  it("本人には既定値定数から生成した説明を表示する", () => {
    const el = mount(
      <PersonFields person={person} prefix="self" errors={{}} onChange={() => {}} />,
    );
    expect(el.textContent).toContain(`初期値は${formatYen(DEFAULT_RETIREMENT_BENEFIT)}`);
  });

  it("配偶者には既定値の説明を表示しない", () => {
    const el = mount(
      <PersonFields person={person} prefix="spouse" errors={{}} onChange={() => {}} />,
    );
    expect(el.textContent).not.toContain("初期値は");
  });
});
