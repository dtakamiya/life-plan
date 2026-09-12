// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { RecurringExpenseForm } from "./RecurringExpenseForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * issue #18 の回帰テスト。
 * 期間指定の継続支出を 1 件で登録でき、削除は確認ダイアログ（FR4.1 の
 * 既存パターン）を経由することを検証する。
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

function clickByText(el: HTMLElement, tag: string, text: string) {
  const node = [...el.querySelectorAll(tag)].find((n) => n.textContent === text);
  if (!node) throw new Error(`not found: ${tag} "${text}"`);
  act(() => (node as HTMLElement).click());
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

describe("RecurringExpenseForm（#18）", () => {
  it("継続支出が 0 件のときは空メッセージを出す", () => {
    const el = mount(<RecurringExpenseForm />);
    expect(el.textContent).toContain("継続支出なし");
  });

  it("＋追加で 1 行増え、開始年・終了年・年額を 1 件で登録できる", () => {
    const el = mount(<RecurringExpenseForm />);
    clickByText(el, "button", "＋追加");
    expect(usePlanStore.getState().input.recurringExpenses).toHaveLength(1);

    type(inputByLabel(el, "名称"), "賃貸家賃");
    type(inputByLabel(el, "開始年"), "2026");
    type(inputByLabel(el, "終了年"), "2030");
    type(inputByLabel(el, "年額"), "1200000");

    const item = usePlanStore.getState().input.recurringExpenses[0];
    expect(item.label).toBe("賃貸家賃");
    expect(item.startYear).toBe(2026);
    expect(item.endYear).toBe(2030);
    expect(item.annualAmount).toBe(1_200_000);
  });

  it("終了年が開始年より前なら注意文言を出す", () => {
    const el = mount(<RecurringExpenseForm />);
    clickByText(el, "button", "＋追加");
    type(inputByLabel(el, "開始年"), "2030");
    type(inputByLabel(el, "終了年"), "2026");
    expect(el.textContent).toContain("終了年は開始年以降にしてください");

    // アクセシビリティ回帰（NumberField は error prop 指定時に aria-invalid /
    // aria-describedby を付与する。src/components/forms/fields.tsx 参照）。
    const endYearInput = inputByLabel(el, "終了年");
    expect(endYearInput.getAttribute("aria-invalid")).toBe("true");
    const describedBy = endYearInput.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const errorEl = el.querySelector(`#${describedBy}`);
    expect(errorEl?.textContent).toBe("終了年は開始年以降にしてください");
  });

  it("削除ボタン単体では消えず、確認ダイアログの「削除する」で消える", () => {
    const el = mount(<RecurringExpenseForm />);
    clickByText(el, "button", "＋追加");
    expect(usePlanStore.getState().input.recurringExpenses).toHaveLength(1);

    clickByText(el, "button", "削除");
    expect(usePlanStore.getState().input.recurringExpenses).toHaveLength(1);

    clickByText(el, "button", "削除する");
    expect(usePlanStore.getState().input.recurringExpenses).toHaveLength(0);
  });
});
