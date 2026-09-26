// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "./usePlanStore";
import { usePlanHydrated } from "./usePlanHydrated";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function Probe() {
  return <span data-hydrated={String(usePlanHydrated())} />;
}

/** Probe をマウントし、現在の hydrated 値を読む関数を返す。 */
function mountProbe() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Probe />));
  return () => container.querySelector("span")?.getAttribute("data-hydrated");
}

describe("usePlanHydrated", () => {
  it("復元済みならマウント直後から true", () => {
    vi.spyOn(usePlanStore.persist, "hasHydrated").mockReturnValue(true);
    const hydrated = mountProbe();
    expect(hydrated()).toBe("true");
  });

  it("復元前は false で、復元完了の通知を受けて true になる", () => {
    let finish: () => void = () => {};
    vi.spyOn(usePlanStore.persist, "hasHydrated").mockReturnValue(false);
    vi.spyOn(usePlanStore.persist, "onFinishHydration").mockImplementation((cb) => {
      finish = () => cb(usePlanStore.getState());
      return () => {};
    });
    const hydrated = mountProbe();
    expect(hydrated()).toBe("false");

    act(() => finish());
    expect(hydrated()).toBe("true");
  });

  it("アンマウント時に復元完了の購読を解除する", () => {
    const unsubscribe = vi.fn();
    vi.spyOn(usePlanStore.persist, "hasHydrated").mockReturnValue(false);
    vi.spyOn(usePlanStore.persist, "onFinishHydration").mockReturnValue(unsubscribe);
    mountProbe();

    act(() => root.unmount());
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    // afterEach の unmount 用に新しい root を用意する
    root = createRoot(container);
  });
});
