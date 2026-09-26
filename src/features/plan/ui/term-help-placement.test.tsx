// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "./usePlanStore";
import { AssetForm } from "./AssetForm";
import { HouseholdForm } from "./HouseholdForm";
import { LoanForm } from "./LoanForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * issue #22 の回帰テスト。
 * 初心者がつまずく専門用語の横に「?」ボタンがあり、押すと解説が開くこと。
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

function helpLabels(el: HTMLElement): string[] {
  return [...el.querySelectorAll("button[aria-expanded]")].map(
    (b) => b.getAttribute("aria-label") ?? "",
  );
}

describe("専門用語の解説ボタンの配置", () => {
  it("資産運用: 課税口座・非課税口座・運用利回り・配当利回り・年間積立に解説がある", () => {
    const el = mount(<AssetForm />);
    expect(helpLabels(el)).toEqual([
      "「課税口座」の説明",
      "「非課税口座」の説明",
      "「運用利回り」の説明",
      "「配当利回り」の説明",
      "「非課税口座へ年間積立」の説明",
    ]);
  });

  it("資産運用: 非課税口座の「?」を押すと NISA/iDeCo の解説が開く", () => {
    const el = mount(<AssetForm />);
    const button = [...el.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "「非課税口座」の説明",
    ) as HTMLButtonElement;
    act(() => button.click());
    const note = el.querySelector('[role="note"]');
    expect(note?.textContent).toContain("NISA");
    expect(note?.textContent).toContain("iDeCo");
  });

  it("世帯: 退職一時金に退職所得課税の解説がある", () => {
    const el = mount(<HouseholdForm />);
    expect(helpLabels(el)).toContain("「退職所得課税」の説明");
  });

  it("ローン: 年間返済額の目安に元利均等返済の解説がある", () => {
    // 既定値（defaults.ts）に住宅ローンが 1 件含まれる。ローン行ごとに 1 つ出る
    const el = mount(<LoanForm />);
    const labels = helpLabels(el);
    expect(labels.length).toBe(usePlanStore.getState().input.loans.length);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((l) => l === "「元利均等返済」の説明")).toBe(true);
  });
});
