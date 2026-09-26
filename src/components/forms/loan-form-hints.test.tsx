// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/features/plan/ui";
import { LoanForm } from "./LoanForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** 子育て共働きペルソナレビュー #5: 持ち家の維持費の入力先を案内する。 */

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  usePlanStore.getState().reset();
});

describe("ローン欄の補足（#5）", () => {
  it("固定資産税・修繕費は継続支出へ入力するよう案内する", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(<LoanForm />);
    });

    expect(container.textContent).toContain("固定資産税・修繕費は「継続支出」に期間指定で入力");
  });
});

/** 子育て共働きペルソナレビュー #4: 住宅ローン控除の対象かどうかを選べる。 */
describe("ローン控除のチェック（#4）", () => {
  it("既定のローンは控除の対象で、チェックを外すと対象外になる", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(<LoanForm />);
    });
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.closest("label")?.textContent).toContain("住宅ローン控除を受ける");

    act(() => checkbox.click());
    expect(usePlanStore.getState().input.loans[0].taxCredit).toBe(false);
  });
});
