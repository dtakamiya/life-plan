// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { EDUCATION_PRESETS } from "@/lib/simulation/education";
import { HouseholdForm } from "./HouseholdForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-ui-ux-audit-fix / FR5.1 の回帰テスト。
 * 教育プリセットボタンは、現在の子の進路と一致するものだけ
 * aria-pressed="true" になる。
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

describe("HouseholdForm — 教育プリセットの選択フィードバック（FR5.1）", () => {
  it("プリセットをクリックすると、そのボタンだけ aria-pressed=true になる", () => {
    const el = mount(<HouseholdForm />);
    const preset = EDUCATION_PRESETS[1];
    const button = [...el.querySelectorAll("button")].find(
      (b) => b.textContent === preset.label,
    ) as HTMLButtonElement;

    act(() => button.click());

    const buttons = [...el.querySelectorAll("button")].filter((b) =>
      EDUCATION_PRESETS.some((p) => p.label === b.textContent),
    );
    const pressed = buttons.filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toBe(preset.label);
  });
});
