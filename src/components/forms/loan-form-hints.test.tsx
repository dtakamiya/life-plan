// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
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
