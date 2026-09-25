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
 * 子育て共働きペルソナレビュー #12 の回帰テスト。
 * 子カードの進路セレクトを開閉式にし、スマホ幅でカードが縦に長くなりすぎないようにする。
 */

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  usePlanStore.getState().reset();
});

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<HouseholdForm />);
  });
  return container;
}

function childCard(el: HTMLElement): HTMLElement {
  return el.querySelector("h3")!.parentElement as HTMLElement;
}

function toggleButton(card: HTMLElement): HTMLButtonElement {
  const button = card.querySelector<HTMLButtonElement>("button[aria-expanded]");
  if (!button) throw new Error("進路の開閉ボタンが見つからない");
  return button;
}

function click(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("子カードの進路の開閉（#12）", () => {
  it("プリセットと一致する進路は既定で閉じ、要約を1行で表示する", () => {
    const card = childCard(mount());
    const button = toggleButton(card);

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(card.querySelectorAll("select")).toHaveLength(0);
    expect(card.textContent).toContain("幼〜高: 公立 / 大学: 国公立");
  });

  it("開閉ボタンで進路セレクトを表示し、aria-controls が領域を指す", () => {
    const card = childCard(mount());
    click(toggleButton(card));

    const button = toggleButton(childCard(container));
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const region = document.getElementById(button.getAttribute("aria-controls")!);
    expect(region?.querySelectorAll("select")).toHaveLength(5);
  });

  it("どのプリセットとも一致しない進路は既定で開いている", () => {
    const { children } = usePlanStore.getState().input;
    act(() => {
      usePlanStore.getState().updateChild(children[0].id, {
        education: { ...children[0].education, juniorHigh: "私立", university: "なし" },
      });
    });
    const card = childCard(mount());

    expect(toggleButton(card).getAttribute("aria-expanded")).toBe("true");
    expect(card.querySelectorAll("select")).toHaveLength(5);
  });
});
