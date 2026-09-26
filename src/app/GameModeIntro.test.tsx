// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { GameModeIntro } from "./GameModeIntro";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("GameModeIntro", () => {
  it("ゲームモードの説明と /game への導線を表示する", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<GameModeIntro />));

    expect(container.textContent).toContain("人生の選択を進めてみる");
    expect(container.textContent).toContain("イベントはゲーム上の演出です");
    const link = container.querySelector("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/game");
    expect(link.textContent).toBe("人生の選択をはじめる");
  });
});
