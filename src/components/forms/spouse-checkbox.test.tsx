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

describe("HouseholdForm — 配偶者チェックボックスの見た目統一（FR7.1）", () => {
  it("ピル型（rounded-full + border）のラベルスタイルを持ち、状態に応じて配色が変わる", () => {
    const el = mount(<HouseholdForm />);
    const checkbox = el.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    const label = checkbox.closest("label") as HTMLLabelElement;

    expect(label.className).toContain("rounded-full");
    expect(label.className).toContain("border");
    // デフォルトの seed データは配偶者ありなので選択状態のハイライトを持つ
    expect(checkbox.checked).toBe(true);
    expect(label.className).toContain("border-brand");
  });
});
