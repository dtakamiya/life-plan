// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { EventForm } from "./EventForm";
import { LoanForm } from "./LoanForm";
import { HouseholdForm } from "./HouseholdForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-ui-ux-audit-fix / FR4.1 の回帰テスト。
 * `GameResult.tsx` の削除確認ダイアログパターンが EventForm / LoanForm /
 * HouseholdForm（子カード削除）にも展開され、削除ボタン単体クリックでは
 * 削除が実行されず、確認後にだけ実行されることを検証する。
 */

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

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

function clickByText(root: HTMLElement, tag: string, text: string) {
  const el = [...root.querySelectorAll(tag)].find((n) => n.textContent === text);
  if (!el) throw new Error(`not found: ${tag} "${text}"`);
  act(() => (el as HTMLElement).click());
}

describe("EventForm — 削除は確認ダイアログ経由（FR4.1）", () => {
  it("削除ボタン単体では消えず、確認ダイアログの「削除する」で消える", () => {
    const before = usePlanStore.getState().input.events.length;
    act(() => usePlanStore.getState().addEvent());
    const el = mount(<EventForm />);
    expect(usePlanStore.getState().input.events).toHaveLength(before + 1);

    // 追加した最後の1件（削除ボタンは配列の最後尾に対応）を対象に確認する。
    const deleteButtons = [...el.querySelectorAll("button")].filter(
      (b) => b.textContent === "削除",
    );
    act(() => deleteButtons[deleteButtons.length - 1].click());
    expect(usePlanStore.getState().input.events).toHaveLength(before + 1); // まだ消えない

    clickByText(el, "button", "削除する");
    expect(usePlanStore.getState().input.events).toHaveLength(before);
  });
});

describe("LoanForm — 削除は確認ダイアログ経由（FR4.1）", () => {
  it("削除ボタン単体では消えず、確認ダイアログの「削除する」で消える", () => {
    const before = usePlanStore.getState().input.loans.length;
    act(() => usePlanStore.getState().addLoan());
    const el = mount(<LoanForm />);
    expect(usePlanStore.getState().input.loans).toHaveLength(before + 1);

    const deleteButtons = [...el.querySelectorAll("button")].filter(
      (b) => b.textContent === "削除",
    );
    act(() => deleteButtons[deleteButtons.length - 1].click());
    expect(usePlanStore.getState().input.loans).toHaveLength(before + 1);

    clickByText(el, "button", "削除する");
    expect(usePlanStore.getState().input.loans).toHaveLength(before);
  });
});

describe("HouseholdForm — 子カード削除は確認ダイアログ経由（FR4.1）", () => {
  it("削除ボタン単体では消えず、確認ダイアログの「削除する」で消える", () => {
    const before = usePlanStore.getState().input.children.length;
    act(() => usePlanStore.getState().addChild());
    const el = mount(<HouseholdForm />);
    expect(usePlanStore.getState().input.children).toHaveLength(before + 1);

    const deleteButtons = [...el.querySelectorAll("button")].filter(
      (b) => b.textContent === "削除",
    );
    act(() => deleteButtons[deleteButtons.length - 1].click());
    expect(usePlanStore.getState().input.children).toHaveLength(before + 1);

    clickByText(el, "button", "削除する");
    expect(usePlanStore.getState().input.children).toHaveLength(before);
  });
});
