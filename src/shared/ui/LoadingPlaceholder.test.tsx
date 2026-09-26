// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LoadingPlaceholder } from "./LoadingPlaceholder";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("LoadingPlaceholder", () => {
  it("「読み込み中…」を表示し、呼び出し側の className で高さを決める", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<LoadingPlaceholder className="h-40" />));

    const box = container.firstElementChild as HTMLElement;
    expect(box.textContent).toBe("読み込み中…");
    expect(box.classList.contains("h-40")).toBe(true);
    expect(box.querySelector(".animate-pulse")).not.toBeNull();
  });
});
