// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "./usePlanStore";
import { HouseholdForm } from "./HouseholdForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-ui-ux-audit-fix / FR7.1 の回帰テスト。
 * 配偶者チェックボックスが、StageCard のカード選択・教育プリセットと同様の
 * ピル型（rounded-full + border）の見た目クラスを持つこと、かつ
 * チェック状態がラベルの見た目に反映されることを確認する。
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

describe("HouseholdForm — 配偶者の有無（あり／なしの2択）", () => {
  function options(el: HTMLElement) {
    const radios = Array.from(
      el.querySelectorAll('[role="radiogroup"] input[type="radio"]'),
    ) as HTMLInputElement[];
    return radios.map((r) => ({ radio: r, label: r.closest("label") as HTMLLabelElement }));
  }

  it("ピル型の「あり」「なし」が並び、現在の状態だけがハイライトされる", () => {
    const el = mount(<HouseholdForm />);
    const [yes, no] = options(el);
    expect(yes.label.textContent).toBe("配偶者あり");
    expect(no.label.textContent).toBe("配偶者なし");
    expect(yes.label.className).toContain("rounded-full");
    // デフォルトの seed データは配偶者あり
    expect(yes.radio.checked).toBe(true);
    expect(yes.label.className).toContain("border-brand");
    expect(no.label.className).toContain("border-line");
  });

  it("「なし」を選ぶと配偶者が外れ、「なし」がハイライトされる", () => {
    const el = mount(<HouseholdForm />);
    act(() => options(el)[1].radio.click());
    expect(usePlanStore.getState().input.spouse).toBeNull();
    const [yes, no] = options(el);
    expect(no.radio.checked).toBe(true);
    expect(no.label.className).toContain("bg-brand-50 text-brand-700");
    expect(yes.radio.checked).toBe(false);
  });
});
