// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, beforeEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/features/plan/ui";
import { useScenarioStore } from "./useScenarioStore";
import { ResetAllAction } from "./ResetAllAction";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom は <dialog> の showModal/close を持たないため最小限の代替を積む。
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

beforeEach(() => {
  useScenarioStore.getState().reset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ResetAllAction />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useScenarioStore.getState().reset();
});

describe("ResetAllAction", () => {
  it("「初期値に戻す」は確認ダイアログの確定でだけ入力と比較プランを消す（issue #15）", () => {
    act(() => {
      usePlanStore.setState((s) => ({ input: { ...s.input, startYear: 2025 } }));
      useScenarioStore.getState().saveSnapshot("案A", usePlanStore.getState().input);
    });

    const openButton = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "初期値に戻す" && !b.closest("dialog"),
    ) as HTMLButtonElement;
    act(() => openButton.click());
    expect(usePlanStore.getState().input.startYear).toBe(2025); // まだ戻らない
    expect(useScenarioStore.getState().snapshots).toHaveLength(1);

    const confirmButton = [...container.querySelectorAll("dialog button")].find(
      (b) => b.textContent === "初期値に戻す",
    ) as HTMLButtonElement;
    act(() => confirmButton.click());
    expect(usePlanStore.getState().input.startYear).not.toBe(2025);
    expect(useScenarioStore.getState().snapshots).toEqual([]);
  });
});
