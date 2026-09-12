// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
import Home from "./page";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom は ResizeObserver 未実装。recharts の ResponsiveContainer が要求するため
// 最小限のダミー実装を積む（chart-aria.test.tsx と同じ方針）。
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;

  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

/**
 * lp-019 / QA#1 の回帰テスト。
 * `results.length === 0` のとき、Summary/ResultTable/各チャートの代わりに
 * 共通メッセージ（EmptyResultsNotice）が表示されることを確認する。
 * FR3 の期間補正により setRange 経由では発生しなくなるケースだが、
 * 念のための防御的分岐（page.tsx）を直接検証するため、ここでは
 * `usePlanStore.setState` でストアの内部状態を直接（setRange を介さず）
 * 無効な期間へ書き換え、結果が空になる状況を再現する。
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

/** persist のハイドレーション完了（マイクロタスク）を待つ。 */
async function waitForHydration() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("Home ページ — 結果が空のときの共通メッセージ（lp-019 / QA#1）", () => {
  it("通常の入力では『表示できる結果がありません』は表示されない", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    expect(el.textContent).not.toContain("表示できる結果がありません");
  });

  it("results が空になる場合、Summary/ResultTable の代わりに共通メッセージを表示する", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    act(() => {
      usePlanStore.setState((s) => ({
        input: { ...s.input, startYear: 2050, endYear: 2000 },
      }));
    });

    expect(el.textContent).toContain("表示できる結果がありません");
    expect(el.querySelector("table")).toBeNull();
  });
});

describe("Home ページ — 「初期値に戻す」は確認ダイアログ経由（issue #15）", () => {
  it("ボタン単体クリックでは戻らず、確認ダイアログの「初期値に戻す」確定操作でのみ戻る", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    act(() => {
      usePlanStore.setState((s) => ({
        input: { ...s.input, startYear: 2025 },
      }));
    });
    expect(usePlanStore.getState().input.startYear).toBe(2025);

    const resetButton = [...el.querySelectorAll("button")].find(
      (b) => b.textContent === "初期値に戻す" && !b.closest("dialog"),
    ) as HTMLButtonElement;
    act(() => resetButton.click());
    expect(usePlanStore.getState().input.startYear).toBe(2025); // まだ戻らない

    const confirmButton = [...el.querySelectorAll("dialog button")].find(
      (b) => b.textContent === "初期値に戻す",
    ) as HTMLButtonElement;
    act(() => confirmButton.click());
    expect(usePlanStore.getState().input.startYear).not.toBe(2025);
  });
});
