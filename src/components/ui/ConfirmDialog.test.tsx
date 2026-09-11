// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ConfirmDialog, type ConfirmDialogHandle } from "./ConfirmDialog";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-ui-ux-audit-fix / FR4.1 の回帰テスト。
 * `GameResult.tsx` の削除確認ダイアログを共通化した `ConfirmDialog` が、
 * open() で表示され、確認クリックで onConfirm が呼ばれることを検証する。
 * jsdom は HTMLDialogElement.showModal/close を未実装なので no-op を積む。
 */

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

describe("ConfirmDialog", () => {
  it("open() で表示され、確認ボタンで onConfirm が呼ばれる", () => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    };

    const onConfirm = vi.fn();
    const ref = createRef<ConfirmDialogHandle>();
    const el = mount(
      <ConfirmDialog
        ref={ref}
        title="削除しますか？"
        description="元に戻せません。"
        onConfirm={onConfirm}
      />,
    );

    const dialog = el.querySelector("dialog") as HTMLDialogElement;
    expect(dialog.hasAttribute("open")).toBe(false);

    act(() => ref.current?.open());
    expect(dialog.hasAttribute("open")).toBe(true);

    const buttons = [...dialog.querySelectorAll("button")];
    const confirmButton = buttons.find((b) => b.textContent === "削除する")!;
    act(() => confirmButton.click());

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(dialog.hasAttribute("open")).toBe(false);
  });
});
