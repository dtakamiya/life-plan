// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/features/plan/ui";
import Home from "./page";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom は ResizeObserver 未実装。recharts の ResponsiveContainer が要求するため
// 最小限のダミー実装を積む（chart-aria.test.tsx と同じ方針）。
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;

  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

/**
 * lp-019 / QA#1 の回帰テスト。
 * `results.length === 0` のとき、Summary/ResultTable/各チャートの代わりに
 * 共通メッセージ（EmptyResultsNotice）が表示されることを確認する。
 * FR3 の期間補正により setRange 経由では発生しなくなるケースだが、
 * 念のための防御的分岐（page.tsx）を直接検証するため、ここでは
 * `usePlanStore.setState` でストアの内部状態を直接（setRange を介さず）
 * 無効な期間へ書き換え、結果が空になる状況を再現する。
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

/** persist のハイドレーション完了（マイクロタスク）を待つ。 */
async function waitForHydration() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("Home ページ — 結果が空のときの共通メッセージ（lp-019 / QA#1）", () => {
  it("通常の入力では『表示できる結果がありません』は表示されない", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    expect(el.textContent).not.toContain("表示できる結果がありません");
  });

  it("results が空になる場合、Summary/ResultTable の代わりに共通メッセージを表示する", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    act(() => {
      usePlanStore.setState((s) => ({
        input: { ...s.input, startYear: 2050, endYear: 2000 },
      }));
    });

    expect(el.textContent).toContain("表示できる結果がありません");
    expect(el.querySelector("table")).toBeNull();
  });
});

describe("Home ページ — 「初期値に戻す」は確認ダイアログ経由（issue #15）", () => {
  it("ボタン単体クリックでは戻らず、確認ダイアログの「初期値に戻す」確定操作でのみ戻る", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    act(() => {
      usePlanStore.setState((s) => ({
        input: { ...s.input, startYear: 2025 },
      }));
    });
    expect(usePlanStore.getState().input.startYear).toBe(2025);

    const resetButton = [...el.querySelectorAll("button")].find(
      (b) => b.textContent === "初期値に戻す" && !b.closest("dialog"),
    ) as HTMLButtonElement;
    act(() => resetButton.click());
    expect(usePlanStore.getState().input.startYear).toBe(2025); // まだ戻らない

    const confirmButton = [...el.querySelectorAll("dialog button")].find(
      (b) => b.textContent === "初期値に戻す",
    ) as HTMLButtonElement;
    act(() => confirmButton.click());
    expect(usePlanStore.getState().input.startYear).not.toBe(2025);
  });
});

describe("Home ページ — 「単身・賃貸で始める」プリセット（低収入ペルソナ #8）", () => {
  it("確認ダイアログの確定で配偶者・子・ローン・イベントのない単身世帯になる", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    const openButton = [...el.querySelectorAll("button")].find(
      (b) => b.textContent === "単身・賃貸で始める" && !b.closest("dialog"),
    ) as HTMLButtonElement;
    act(() => openButton.click());
    expect(usePlanStore.getState().input.spouse).not.toBeNull(); // まだ変わらない

    const confirmButton = [...el.querySelectorAll("dialog button")].find(
      (b) => b.textContent === "単身・賃貸で始める",
    ) as HTMLButtonElement;
    act(() => confirmButton.click());
    const { input } = usePlanStore.getState();
    expect(input.spouse).toBeNull();
    expect(input.children).toEqual([]);
    expect(input.loans).toEqual([]);
    expect(input.events).toEqual([]);
  });
});

describe("Home ページ — 試算結果の要約を常時表示する（issue #17）", () => {
  const summaryBar = (el: HTMLElement) =>
    el.querySelector('aside[aria-label="試算結果の要約"]');

  it("ハイドレーション後、入力フォームより前に要約バーを表示する", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    const bar = summaryBar(el);
    expect(bar).not.toBeNull();
    expect(bar?.textContent).toContain("最終純資産");

    const inputs = el.querySelector('[data-column="inputs"]');
    expect(inputs).not.toBeNull();
    expect(
      bar!.compareDocumentPosition(inputs!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("入力を変えると要約バーの値が更新される", async () => {
    const el = mount(<Home />);
    await waitForHydration();
    const before = summaryBar(el)?.textContent;
    expect(before).toBeTruthy();

    act(() => {
      usePlanStore.setState((s) => ({
        input: { ...s.input, endYear: s.input.startYear + 1 },
      }));
    });

    expect(summaryBar(el)?.textContent).not.toBe(before);
  });

  it("結果が空のときは要約バーを表示しない", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    act(() => {
      usePlanStore.setState((s) => ({
        input: { ...s.input, startYear: 2050, endYear: 2000 },
      }));
    });

    expect(summaryBar(el)).toBeNull();
  });

  it("PC 幅ではフォーム列を要約バーの下に固定し、列内で独立スクロールさせる", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    const inputs = el.querySelector('[data-column="inputs"]');
    for (const cls of ["lg:sticky", "lg:top-20", "lg:self-start", "lg:max-h-[calc(100vh-6rem)]", "lg:overflow-y-auto"]) {
      expect(inputs?.classList.contains(cls)).toBe(true);
    }
  });

  it("結果列は min-w-0 を持ち、年次明細テーブルの幅でグリッド列が押し広げられない", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    // `1fr` の最小幅は中身の min-content になるため、横幅の大きい表があると
    // 列ごとビューポート外へはみ出す。min-w-0 で列幅をグリッドに従わせる。
    const results = el.querySelector('[data-column="results"]');
    expect(results).not.toBeNull();
    expect(results?.classList.contains("min-w-0")).toBe(true);
  });
});

describe("Home ページ — 比較の差分数値表（lp-035）", () => {
  const diffTable = (el: HTMLElement) =>
    el.querySelector('table[aria-label="プラン比較の差分数値表"]');

  it("スナップショットが無ければ差分表は出ない", async () => {
    const el = mount(<Home />);
    await waitForHydration();
    expect(diffTable(el)).toBeNull();
  });

  it("同一シナリオのスナップショットを保存すると、差額・枯渇年の差がゼロで表示される", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    act(() => {
      usePlanStore.getState().saveSnapshot("同じ案");
    });

    const table = diffTable(el);
    expect(table).not.toBeNull();
    const rows = table!.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    const cells = [...rows[1].querySelectorAll("td")].map((c) => c.textContent);
    expect(cells[1]).toBe("¥0（同じ）");
    // 枯渇年の差: 両方なし=差なし、両方あり=±0年（どちらでもゼロ差）
    expect(cells[3]).toMatch(/^(差なし（どちらも枯渇なし）|±0年)$/);
    expect(el.textContent).toContain("差は「比較対象 − 現在のプラン」の差額です");
  });
});

describe("Home ページ — ハイドレーション前は入力列を描画しない", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("復元前は入力欄を出さず読み込み表示にし、復元完了後に入力欄を出す", async () => {
    let finish: () => void = () => {};
    vi.spyOn(usePlanStore.persist, "hasHydrated").mockReturnValue(false);
    vi.spyOn(usePlanStore.persist, "onFinishHydration").mockImplementation((cb) => {
      finish = () => cb(usePlanStore.getState());
      return () => {};
    });

    const el = mount(<Home />);
    await waitForHydration();

    const inputs = el.querySelector('[data-column="inputs"]');
    expect(inputs?.querySelector("input")).toBeNull();
    expect(inputs?.textContent).toContain("読み込み中…");

    act(() => finish());
    expect(inputs?.querySelector("input")).not.toBeNull();
    expect(inputs?.textContent).not.toContain("読み込み中…");
  });
});

describe("Home ページ — 基礎生活費が0円のときの注意", () => {
  const notice = "基礎生活費が0円のため";

  it("基礎生活費が0円なら注意を表示する（「まっさらから入力」直後の誤解防止）", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    act(() => usePlanStore.getState().startBlank());

    expect(el.textContent).toContain(notice);
  });

  it("基礎生活費が0円でなければ注意は出ない", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    act(() => {
      usePlanStore.setState((s) => ({
        input: {
          ...s.input,
          expenses: { ...s.input.expenses, baseAnnualLivingExpense: 3_000_000 },
        },
      }));
    });

    expect(el.textContent).not.toContain(notice);
  });
});

describe("Home ページ — 枯渇なしでも純資産がマイナスの期間があるときの補足", () => {
  const depletedCard = (el: HTMLElement) =>
    [...el.querySelectorAll('[data-column="results"] .rounded-2xl')].find((d) =>
      d.textContent?.startsWith("資産が尽きる年"),
    );

  it("金融資産は枯渇しないがローンで純資産がマイナスなら、基準の違いを補足する", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    act(() => {
      usePlanStore.getState().startBlank();
      usePlanStore.setState((s) => ({
        input: {
          ...s.input,
          expenses: { ...s.input.expenses, baseAnnualLivingExpense: 1_000_000 },
          loans: [
            {
              id: "l1",
              label: "住宅ローン",
              startYear: s.input.startYear,
              principal: 100_000_000,
              annualRate: 0,
              termYears: 50,
            },
          ],
        },
      }));
    });

    expect(depletedCard(el)?.textContent).toContain(
      "金融資産は枯渇なし（ローン残高を含む純資産は",
    );
  });

  it("純資産がマイナスにならなければ従来どおり『生涯を通じて枯渇なし』", async () => {
    const el = mount(<Home />);
    await waitForHydration();

    act(() => {
      usePlanStore.getState().startBlank();
      usePlanStore.setState((s) => ({
        input: {
          ...s.input,
          expenses: { ...s.input.expenses, baseAnnualLivingExpense: 1_000_000 },
        },
      }));
    });

    expect(depletedCard(el)?.textContent).toContain("生涯を通じて枯渇なし");
  });
});
