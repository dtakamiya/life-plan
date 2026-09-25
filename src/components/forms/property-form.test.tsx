// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { PropertyForm } from "./PropertyForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

function clickByText(el: HTMLElement, tag: string, text: string) {
  const node = [...el.querySelectorAll(tag)].find((n) => n.textContent === text);
  if (!node) throw new Error(`not found: ${tag} "${text}"`);
  act(() => (node as HTMLElement).click());
}

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
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** 子育て共働きペルソナレビュー #2: 住宅（不動産）の評価額を純資産に入れるための入力。 */
describe("PropertyForm（#2）", () => {
  it("既定の自宅を表示し、購入価格を変更できる", () => {
    const el = mount(<PropertyForm />);
    expect(inputByLabel(el, "名称").value).toBe("自宅");
    type(inputByLabel(el, "購入価格"), "40000000");
    expect(usePlanStore.getState().input.properties?.[0].price).toBe(40_000_000);
  });

  it("減価率を%で入力できる", () => {
    const el = mount(<PropertyForm />);
    type(inputByLabel(el, "年間の減価率"), "2");
    expect(usePlanStore.getState().input.properties?.[0].annualDepreciationRate).toBeCloseTo(0.02);
  });

  it("＋追加で行が増え、削除は確認ダイアログを経由する", () => {
    const el = mount(<PropertyForm />);
    clickByText(el, "button", "＋追加");
    expect(usePlanStore.getState().input.properties).toHaveLength(2);
    clickByText(el, "button", "削除");
    const dialog = el.querySelector("dialog[open]") as HTMLElement;
    clickByText(dialog, "button", "削除する");
    expect(usePlanStore.getState().input.properties).toHaveLength(1);
  });

  it("不動産がないときは空メッセージを出す", () => {
    act(() => usePlanStore.getState().removeProperty(usePlanStore.getState().input.properties![0].id));
    const el = mount(<PropertyForm />);
    expect(el.textContent).toContain("不動産なし");
  });
});
