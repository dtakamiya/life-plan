// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { GLOSSARY } from "@/lib/glossary";
import { TermHelp } from "./TermHelp";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** issue #22: 専門用語の解説ポップオーバーの回帰テスト。 */

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
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

function helpButton(el: HTMLElement) {
  return el.querySelector("button") as HTMLButtonElement;
}

/**
 * M-2: 外側判定は pointerdown で行う。jsdom に PointerEvent が無い環境でも
 * 動くよう、無ければ通常の Event にフォールバックする。
 */
function pointerDownEvent() {
  if (typeof PointerEvent === "function") {
    return new PointerEvent("pointerdown", { bubbles: true });
  }
  return new Event("pointerdown", { bubbles: true });
}

describe("TermHelp", () => {
  it("初期状態は閉じていて、ボタンに用語名入りの aria-label が付く", () => {
    const el = mount(<TermHelp term="taxFreeAccount" />);
    const button = helpButton(el);
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("「非課税口座」の説明");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(el.querySelector('[role="note"]')).toBeNull();
  });

  it("クリックで解説が開き、aria-controls がパネルを指す。もう一度押すと閉じる", () => {
    const el = mount(<TermHelp term="taxFreeAccount" />);
    const button = helpButton(el);

    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const panelId = button.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId!);
    expect(panel?.getAttribute("role")).toBe("note");
    expect(panel?.textContent).toContain(GLOSSARY.taxFreeAccount.description);

    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(el.querySelector('[role="note"]')).toBeNull();
  });

  it("Escape で閉じ、フォーカスがボタンへ戻る", () => {
    const el = mount(<TermHelp term="levelPayment" />);
    const button = helpButton(el);
    act(() => button.click());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
  });

  it("パネル外をポインタ操作すると閉じ、パネル内の操作では閉じない（M-2: pointerdown）", () => {
    const el = mount(
      <div>
        <TermHelp term="levelPayment" />
        <p id="outside">外側</p>
      </div>,
    );
    const button = helpButton(el);
    act(() => button.click());

    const panel = el.querySelector('[role="note"]') as HTMLElement;
    act(() => {
      panel.dispatchEvent(pointerDownEvent());
    });
    expect(button.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      el.querySelector("#outside")!.dispatchEvent(pointerDownEvent());
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("label の中に置いても、ボタンを押したとき入力欄へフォーカスが移らない", () => {
    const el = mount(
      <label>
        <span>
          非課税口座 <TermHelp term="taxFreeAccount" />
        </span>
        <input />
      </label>,
    );
    const input = el.querySelector("input") as HTMLInputElement;
    act(() => helpButton(el).click());
    expect(document.activeElement).not.toBe(input);
    expect(helpButton(el).getAttribute("aria-expanded")).toBe("true");
  });

  it("label の中でパネル本文をクリックしても入力欄へフォーカスが移らず、パネルは開いたままになる（I-2）", () => {
    const el = mount(
      <label>
        <span>
          非課税口座 <TermHelp term="taxFreeAccount" />
        </span>
        <input />
      </label>,
    );
    const input = el.querySelector("input") as HTMLInputElement;
    act(() => helpButton(el).click());

    const panel = el.querySelector('[role="note"]') as HTMLElement;
    act(() => {
      panel.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).not.toBe(input);
    expect(helpButton(el).getAttribute("aria-expanded")).toBe("true");
  });

  it("ラッパー外へフォーカスが移ると、開いていたパネルが閉じる（M-1）", () => {
    const el = mount(
      <div>
        <TermHelp term="levelPayment" />
        <input id="outside-input" />
      </div>,
    );
    const button = helpButton(el);
    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("true");

    const outsideInput = el.querySelector(
      "#outside-input",
    ) as HTMLInputElement;
    act(() => {
      // React は blur を focusout（bubbles）に正規化して処理するため、
      // focusout を dispatch してラッパー外への フォーカス移動を再現する。
      button.dispatchEvent(
        new FocusEvent("focusout", {
          bubbles: true,
          relatedTarget: outsideInput,
        }),
      );
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});
