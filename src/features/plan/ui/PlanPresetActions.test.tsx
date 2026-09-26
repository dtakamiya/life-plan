// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, beforeEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "./usePlanStore";
import { PlanPresetActions } from "./PlanPresetActions";

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
  usePlanStore.getState().reset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<PlanPresetActions />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function outsideButton(label: string) {
  return [...container.querySelectorAll("button")].find(
    (b) => b.textContent === label && !b.closest("dialog"),
  ) as HTMLButtonElement;
}

function dialogButton(label: string) {
  return [...container.querySelectorAll("dialog button")].find(
    (b) => b.textContent === label,
  ) as HTMLButtonElement;
}

describe("PlanPresetActions", () => {
  it("ボタンは「まっさらから入力」「単身・賃貸で始める」の順に並ぶ", () => {
    const labels = [...container.querySelectorAll("button")]
      .filter((b) => !b.closest("dialog"))
      .map((b) => b.textContent);
    expect(labels).toEqual(["まっさらから入力", "単身・賃貸で始める"]);
  });

  it("「まっさらから入力」は確認ダイアログの確定でだけ生活費・ローン・イベントを空にする", () => {
    act(() => outsideButton("まっさらから入力").click());
    expect(usePlanStore.getState().input.loans.length).toBeGreaterThan(0); // まだ変わらない

    act(() => dialogButton("まっさらにする").click());
    const { input } = usePlanStore.getState();
    expect(input.expenses.baseAnnualLivingExpense).toBe(0);
    expect(input.loans).toEqual([]);
    expect(input.events).toEqual([]);
  });

  it("「単身・賃貸で始める」は確認ダイアログの確定でだけ単身世帯にする", () => {
    act(() => outsideButton("単身・賃貸で始める").click());
    expect(usePlanStore.getState().input.spouse).not.toBeNull(); // まだ変わらない

    act(() => dialogButton("単身・賃貸で始める").click());
    const { input } = usePlanStore.getState();
    expect(input.spouse).toBeNull();
    expect(input.children).toEqual([]);
  });
});
