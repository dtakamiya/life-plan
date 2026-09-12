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
 * lp-021 / issue #21 の回帰テスト。
 * 子カードの見出しに「名前（年齢）」が出て、追加した子の既定名が連番になり、
 * 名前欄の編集に見出しが追従することを確認する。
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

/** 子カードの見出し（h3）の要素一覧。 */
function childHeadings(el: HTMLElement): HTMLHeadingElement[] {
  return [...el.querySelectorAll("h3")];
}

/** 子カード（見出し h3 を持つカード）の要素一覧。 */
function childCards(el: HTMLElement): HTMLElement[] {
  return childHeadings(el).map((h) => h.parentElement as HTMLElement);
}

function nameInput(card: HTMLElement): HTMLInputElement {
  const label = [...card.querySelectorAll("label")].find((l) =>
    l.textContent?.startsWith("名前"),
  );
  if (!label) throw new Error("名前ラベルが見つからない");
  return label.querySelector("input") as HTMLInputElement;
}

function addChildButton(el: HTMLElement): HTMLButtonElement {
  const button = [...el.querySelectorAll("button")].find(
    (b) => b.textContent === "＋追加",
  );
  if (!button) throw new Error("子の追加ボタンが見つからない");
  return button as HTMLButtonElement;
}

const nativeValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
)!.set!;

function type(input: HTMLInputElement, value: string) {
  act(() => {
    nativeValueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function click(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("子カードの識別（lp-021 / issue #21）", () => {
  it("見出しに名前と開始年時点の年齢を表示する", () => {
    const el = mount(<HouseholdForm />);
    const { startYear, children } = usePlanStore.getState().input;
    const age = startYear - children[0].birthYear;

    expect(childCards(el)[0].textContent).toContain(`子1（${age}歳）`);
  });

  it("追加した子の既定名が連番になり、見出しで区別できる", () => {
    const el = mount(<HouseholdForm />);

    click(addChildButton(el));
    click(addChildButton(container));

    const headings = childCards(container).map(
      (card) => card.querySelector("h3")?.textContent ?? "",
    );
    expect(headings).toHaveLength(3);
    expect(headings[0]).toContain("子1");
    expect(headings[1]).toContain("子2");
    expect(headings[2]).toContain("子3");
  });

  it("名前欄を書き換えると見出しも追従する", () => {
    const el = mount(<HouseholdForm />);
    type(nameInput(childCards(el)[0]), "太郎");

    expect(childCards(container)[0].textContent).toContain("太郎");
    expect(childCards(container)[0].textContent).not.toContain("子1");
  });

  it("生年が開始年より後（未出生）の場合は年齢を表示しない", () => {
    const el = mount(<HouseholdForm />);
    const { startYear, children } = usePlanStore.getState().input;
    act(() => {
      usePlanStore
        .getState()
        .updateChild(children[0].id, { birthYear: startYear + 3 });
    });

    const heading = childCards(el)[0].querySelector("h3")?.textContent ?? "";
    expect(heading).toBe("子1");
    expect(heading).not.toContain("歳");
  });
});
