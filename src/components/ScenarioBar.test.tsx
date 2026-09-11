// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { ScenarioBar } from "./ScenarioBar";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-ui-ux-audit-fix / FR4.1 の回帰テスト。
 * 保存済みプランの削除が確認ダイアログ経由になっていることを検証する。
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
  for (const snap of usePlanStore.getState().snapshots) {
    usePlanStore.getState().removeSnapshot(snap.id);
  }
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

describe("ScenarioBar — 保存済みプランの削除は確認ダイアログ経由（FR4.1）", () => {
  it("✕ボタン単体では消えず、確認ダイアログの「削除する」で消える", () => {
    act(() => usePlanStore.getState().saveSnapshot("テストプラン"));
    const el = mount(<ScenarioBar />);
    expect(usePlanStore.getState().snapshots).toHaveLength(1);

    const removeButton = el.querySelector(
      'button[aria-label="テストプランを削除"]',
    ) as HTMLButtonElement;
    act(() => removeButton.click());
    expect(usePlanStore.getState().snapshots).toHaveLength(1); // まだ消えない

    const confirmButton = [...el.querySelectorAll("button")].find(
      (b) => b.textContent === "削除する",
    ) as HTMLButtonElement;
    act(() => confirmButton.click());
    expect(usePlanStore.getState().snapshots).toHaveLength(0);
  });
});
