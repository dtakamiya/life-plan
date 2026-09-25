// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { IncomeAdjustmentForm } from "./IncomeAdjustmentForm";

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

/** 子育て共働きペルソナレビュー #3: 育休・時短による期間付きの収入減を入力できる。 */
describe("IncomeAdjustmentForm（#3）", () => {
  it("0 件のときは空メッセージと入力例を出す", () => {
    const el = mount(<IncomeAdjustmentForm />);
    expect(el.textContent).toContain("収入の調整なし");
  });

  it("＋追加で1行増え、期間と割合を入力できる", () => {
    const el = mount(<IncomeAdjustmentForm />);
    clickByText(el, "button", "＋追加");
    type(inputByLabel(el, "終了年"), String(usePlanStore.getState().input.startYear + 1));
    type(inputByLabel(el, "給与の割合"), "80");

    const [a] = usePlanStore.getState().input.incomeAdjustments ?? [];
    expect(a.endYear).toBe(a.startYear + 1);
    expect(a.ratio).toBeCloseTo(0.8);
  });

  it("「育休」プリセットで割合67%・非課税、「時短」プリセットで割合80%・課税になる", () => {
    const el = mount(<IncomeAdjustmentForm />);
    clickByText(el, "button", "＋追加");
    clickByText(el, "button", "育休（給付金 約67%）");
    expect(usePlanStore.getState().input.incomeAdjustments?.[0]).toMatchObject({
      label: "育休",
      ratio: 0.67,
      nonTaxable: true,
    });
    const checkbox = inputByLabel(el, "非課税の給付として扱う");
    expect(checkbox.checked).toBe(true);

    clickByText(el, "button", "時短（80%）");
    expect(usePlanStore.getState().input.incomeAdjustments?.[0]).toMatchObject({
      label: "時短勤務",
      ratio: 0.8,
      nonTaxable: false,
    });
  });

  it("配偶者がいるときは対象者を選べる", () => {
    const el = mount(<IncomeAdjustmentForm />);
    clickByText(el, "button", "＋追加");
    const select = el.querySelector("select") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["本人", "配偶者"]);
    act(() => {
      select.value = "本人";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(usePlanStore.getState().input.incomeAdjustments?.[0].person).toBe("self");
  });

  it("削除は確認ダイアログを経由する", () => {
    const el = mount(<IncomeAdjustmentForm />);
    clickByText(el, "button", "＋追加");
    clickByText(el, "button", "削除");
    expect(usePlanStore.getState().input.incomeAdjustments).toHaveLength(1);
    const dialog = el.querySelector("dialog[open]") as HTMLElement;
    clickByText(dialog, "button", "削除する");
    expect(usePlanStore.getState().input.incomeAdjustments).toEqual([]);
  });
});
