// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/features/plan/ui";
import { AssetForm } from "./AssetForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 配当・分配金の受取の回帰テスト。
 * 資産運用フォームで配当利回りを入力でき、store に小数で反映されることを検証する。
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

/** ラベル文言から対応する input を引く（label > span がラベル文字列）。 */
function inputByLabel(el: HTMLElement, label: string): HTMLInputElement {
  const labelEl = [...el.querySelectorAll("label")].find((l) =>
    l.querySelector("span")?.textContent?.startsWith(label),
  );
  const input = labelEl?.querySelector("input");
  if (!input) throw new Error(`input not found for label: ${label}`);
  return input as HTMLInputElement;
}

function type(input: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("AssetForm — 配当利回り", () => {
  it("配当利回りの % 入力が store に小数で反映される", () => {
    const el = mount(<AssetForm />);
    type(inputByLabel(el, "配当利回り"), "2.5");
    expect(usePlanStore.getState().input.assets.annualDividendYield).toBe(0.025);
  });

  it("注記で配当が毎年現金受取・課税口座分は約20%課税であることを伝える", () => {
    const el = mount(<AssetForm />);
    expect(el.textContent).toContain("配当・分配金は毎年現金で受け取り");
  });
});
