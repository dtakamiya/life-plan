// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { AssetForm } from "./AssetForm";
import { ExpenseForm } from "./ExpenseForm";
import { EventForm } from "./EventForm";
import { HouseholdForm } from "./HouseholdForm";
import { LoanForm } from "./LoanForm";

// react-dom の act(...) を有効化する
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-ui-ux-audit-fix / FR3.1 の回帰テスト。
 * 固定 `grid-cols-2`/`grid-cols-3` が残っておらず、`AssumptionsPanel.tsx` と
 * 同様のブレークポイント対応（`grid-cols-1 sm:grid-cols-*`）へ揃っていることを
 * レンダリング結果から確認する。
 */

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

function hasFixedGridCols(el: HTMLElement): boolean {
  return [...el.querySelectorAll(".grid")].some((node) => {
    const classes = node.className.split(/\s+/);
    return classes.some((c) => /^grid-cols-(2|3|4)$/.test(c));
  });
}

function hasResponsiveGrid(el: HTMLElement): boolean {
  return [...el.querySelectorAll(".grid")].some((node) => {
    const classes = node.className.split(/\s+/);
    return (
      classes.includes("grid-cols-1") &&
      classes.some((c) => /^sm:grid-cols-/.test(c))
    );
  });
}

describe("フォームのレスポンシブグリッド（FR3.1）", () => {
  it("AssetForm は固定グリッドを持たず、sm: ブレークポイント対応になっている", () => {
    const el = mount(<AssetForm />);
    expect(hasFixedGridCols(el)).toBe(false);
    expect(hasResponsiveGrid(el)).toBe(true);
  });

  it("ExpenseForm は固定グリッドを持たず、sm: ブレークポイント対応になっている", () => {
    const el = mount(<ExpenseForm />);
    expect(hasFixedGridCols(el)).toBe(false);
    expect(hasResponsiveGrid(el)).toBe(true);
  });

  it("EventForm はイベント行を含めて固定グリッドを持たない", () => {
    act(() => usePlanStore.getState().addEvent());
    const el = mount(<EventForm />);
    expect(hasFixedGridCols(el)).toBe(false);
    expect(hasResponsiveGrid(el)).toBe(true);
  });

  it("HouseholdForm は本人・子カードを含めて固定グリッドを持たない", () => {
    act(() => usePlanStore.getState().addChild());
    const el = mount(<HouseholdForm />);
    expect(hasFixedGridCols(el)).toBe(false);
    expect(hasResponsiveGrid(el)).toBe(true);
  });

  it("LoanForm はローン行を含めて固定グリッドを持たない", () => {
    act(() => usePlanStore.getState().addLoan());
    const el = mount(<LoanForm />);
    expect(hasFixedGridCols(el)).toBe(false);
    expect(hasResponsiveGrid(el)).toBe(true);
  });
});
