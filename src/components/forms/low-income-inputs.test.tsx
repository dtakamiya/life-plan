// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { BASIC_PENSION_ANNUAL, estimateAnnualPension } from "@/features/plan/domain";
import { HouseholdForm } from "./HouseholdForm";
import { ExpenseForm } from "./ExpenseForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** 低収入ペルソナレビュー（#1, #4, #10, #11）の回帰テスト。 */

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  usePlanStore.getState().reset();
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

function buttonByText(el: HTMLElement, text: string) {
  return Array.from(el.querySelectorAll("button")).find(
    (b) => b.textContent === text,
  ) as HTMLButtonElement;
}

describe("HouseholdForm — 低収入向けの入力", () => {
  it("本人の年収上昇率を入力欄として表示する", () => {
    const el = mount(<HouseholdForm />);
    const labels = Array.from(el.querySelectorAll("label")).map((l) => l.textContent);
    expect(labels.some((t) => t?.includes("年収上昇率"))).toBe(true);
  });

  it("「国民年金のみ」で年金年額を基礎年金の定額に、「厚生年金あり」で概算に戻す", () => {
    const el = mount(<HouseholdForm />);
    act(() => buttonByText(el, "国民年金のみ").click());
    expect(usePlanStore.getState().input.self.annualPension).toBe(BASIC_PENSION_ANNUAL);

    act(() => buttonByText(el, "厚生年金あり（概算）").click());
    const { self } = usePlanStore.getState().input;
    expect(self.annualPension).toBe(estimateAnnualPension(self.grossAnnualIncome));
  });

  it("年収が1億円を超えると桁の確認を促す注意を出す", () => {
    const el = mount(<HouseholdForm />);
    expect(el.textContent).not.toContain("桁は合っていますか");
    act(() => usePlanStore.getState().updateSelf({ grossAnnualIncome: 500_000_000 }));
    expect(el.textContent).toContain("桁は合っていますか");
  });
});

describe("ExpenseForm — 家賃の入力先の案内", () => {
  it("基礎生活費の補足に継続支出への案内を出す", () => {
    const el = mount(<ExpenseForm />);
    expect(el.textContent).toContain("家賃は「継続支出」に期間指定で入力");
  });
});
