// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { EmptyResultsNotice } from "./EmptyResultsNotice";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("EmptyResultsNotice", () => {
  it("結果が空のときの共通メッセージを表示する（lp-019 / QA#1）", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<EmptyResultsNotice />));

    expect(container.textContent).toBe(
      "表示できる結果がありません。シミュレーション期間や入力内容をご確認ください。",
    );
  });
});
