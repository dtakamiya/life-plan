// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { HouseholdForm } from "./HouseholdForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-019 / QA#1 の回帰テスト。
 * 終了年の NumberField が `usePlanStore` の `rangeAutoCorrected` を購読し、
 * 期間の自動補正が起きたときだけ既存の error 表示機構（aria-invalid /
 * aria-describedby）で注意文言を出すことを確認する。
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

function endYearInput(el: HTMLElement): HTMLInputElement {
  const labels = [...el.querySelectorAll("label")];
  const label = labels.find((l) => l.textContent?.startsWith("終了年"));
  if (!label) throw new Error("終了年ラベルが見つからない");
  return label.querySelector("input") as HTMLInputElement;
}

const nativeValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
)!.set!;

function type(input: HTMLInputElement, value: string) {
  act(() => {
    nativeValueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("HouseholdForm — 終了年の自動補正通知（lp-019 / QA#1）", () => {
  it("正常な期間のときは注意文言を表示しない", () => {
    const el = mount(<HouseholdForm />);
    const input = endYearInput(el);
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(el.textContent).not.toContain("終了年を自動調整しました");
  });

  it("開始年より前の終了年を入力すると自動補正され、注意文言が表示される", () => {
    const el = mount(<HouseholdForm />);
    const input = endYearInput(el);

    const startYear = usePlanStore.getState().input.startYear;
    type(input, String(startYear - 5));

    const state = usePlanStore.getState();
    expect(state.rangeAutoCorrected).toBe(true);
    expect(state.input.endYear).toBe(startYear + 1);

    const updatedInput = endYearInput(container);
    expect(updatedInput.getAttribute("aria-invalid")).toBe("true");
    expect(container.textContent).toContain("終了年を自動調整しました");
  });

  it("補正後に正常な終了年を入力し直すと注意文言が消える", () => {
    const el = mount(<HouseholdForm />);
    const input = endYearInput(el);
    const startYear = usePlanStore.getState().input.startYear;

    type(input, String(startYear - 5));
    expect(usePlanStore.getState().rangeAutoCorrected).toBe(true);

    const updatedInput = endYearInput(container);
    type(updatedInput, String(startYear + 30));

    expect(usePlanStore.getState().rangeAutoCorrected).toBe(false);
    expect(container.textContent).not.toContain("終了年を自動調整しました");
  });
});
