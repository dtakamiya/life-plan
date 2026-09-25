// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NumberField, PercentField } from "./fields";

// react-dom の act(...) を有効化する
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-012 / QA#1 の回帰固定（コンポーネントレベル）。
 * @testing-library/react は未導入のため、react-dom/client + 生 DOM イベントで検証する。
 */

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function Harness({
  initial,
  signed,
  grouped,
}: {
  initial: number;
  signed?: boolean;
  grouped?: boolean;
}) {
  const [v, setV] = useState(initial);
  return (
    <>
      <NumberField
        label="金額"
        value={v}
        onChange={setV}
        signed={signed}
        grouped={grouped}
      />
      <output data-testid="val">{String(v)}</output>
    </>
  );
}

function mount(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  const input = container.querySelector("input") as HTMLInputElement;
  const out = container.querySelector(
    '[data-testid="val"]',
  ) as HTMLOutputElement;
  return { input, out };
}

const nativeValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
)!.set!;

/** React の onChange（= DOM input イベント）を発火させる。 */
function type(input: HTMLInputElement, value: string) {
  act(() => {
    nativeValueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** React の onBlur（= 委譲された focusout）を発火させる。 */
function blur(input: HTMLInputElement) {
  act(() => {
    input.dispatchEvent(new Event("focusout", { bubbles: true }));
  });
}

describe("NumberField — クリア時の挙動（AC#1）", () => {
  it("全消去しても 0 に固定されず、内部状態は空を保つ", () => {
    const { input, out } = mount(<Harness initial={3_000_000} />);
    type(input, "");
    expect(input.value).toBe(""); // "0" にならない
    expect(out.textContent).toBe("3000000"); // 空の間は直前の確定値を維持
  });

  it("空のままフォーカスアウトすると既定値 0 に確定する", () => {
    const { input, out } = mount(<Harness initial={3_000_000} />);
    type(input, "");
    blur(input);
    expect(out.textContent).toBe("0");
    expect(input.value).toBe("0");
  });
});

describe("NumberField — 負値の符号保持（AC#2 / AC#5 / AC#6）", () => {
  it("board #1 再現手順: 金額欄クリア → -3000000 入力で符号付き負値が入る（Home キー回避策なし）", () => {
    const { input, out } = mount(<Harness initial={0} signed />);
    type(input, ""); // クリア
    type(input, "-3000000"); // 先頭 `-` から素直に入力
    expect(input.value).toBe("-3000000");
    expect(out.textContent).toBe("-3000000");
  });

  it("先頭 `-` を打ってから桁を打ち進めても符号が食われない", () => {
    const { input, out } = mount(<Harness initial={0} signed />);
    type(input, "-");
    expect(input.value).toBe("-"); // 符号のみは表示に保持
    expect(out.textContent).toBe("0"); // まだ未確定（0 のまま）
    type(input, "-3");
    expect(out.textContent).toBe("-3");
    type(input, "-3000000");
    expect(out.textContent).toBe("-3000000");
  });
});

describe("NumberField — 符号なしフィールド（AC#3）", () => {
  it("signed 未指定なら `-` を無視して正の値になる", () => {
    const { input, out } = mount(<Harness initial={0} />);
    type(input, "-3000000");
    expect(out.textContent).toBe("3000000");
  });
});

/**
 * lp-022 / #16: 金額欄の 3 桁区切り表示と万円換算の補助表示。
 * 区切りは「非編集時の表示」だけに効かせ、編集中の生入力・キャレットには触れない。
 */
describe("NumberField — 金額の3桁区切り表示（#16）", () => {
  it("grouped 指定時、非編集の表示は3桁区切りになる", () => {
    const { input } = mount(<Harness initial={30_000_000} grouped />);
    expect(input.value).toBe("30,000,000");
  });

  it("grouped 未指定（年・年齢など）はカンマを付けない", () => {
    const { input } = mount(<Harness initial={2031} />);
    expect(input.value).toBe("2031");
    expect(container.textContent).not.toContain("万円");
  });

  it("編集中は生の数字を表示し、フォーカスアウトで3桁区切りへ戻る", () => {
    const { input, out } = mount(<Harness initial={30_000_000} grouped />);
    type(input, "3000000");
    expect(input.value).toBe("3000000"); // 入力途中にカンマを差し込まない
    expect(out.textContent).toBe("3000000");
    blur(input);
    expect(input.value).toBe("3,000,000");
  });

  it("カンマ付きの文字列を貼り付けても値が正しく取り込まれる", () => {
    const { input, out } = mount(<Harness initial={0} grouped />);
    type(input, "3,000,000");
    expect(out.textContent).toBe("3000000");
    blur(input);
    expect(input.value).toBe("3,000,000");
  });

  it("1万円以上のとき万円換算を併記し、入力欄から aria-describedby で参照する", () => {
    const { input } = mount(<Harness initial={30_000_000} grouped />);
    expect(container.textContent).toContain("3,000万円");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    const referenced = describedBy
      .split(" ")
      .filter(Boolean)
      // useId の値には `:` が含まれ querySelector では扱えないので getElementById を使う
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    expect(referenced).toContain("3,000万円");
  });

  it("端数があるときは「約」を付けて概算であることを示す", () => {
    mount(<Harness initial={1_234_567} grouped />);
    expect(container.textContent).toContain("約123万円");
  });

  it("1万円未満では万円換算を表示しない", () => {
    mount(<Harness initial={9_999} grouped />);
    expect(container.textContent).not.toContain("万円");
  });
});

/**
 * PercentField の符号可否は呼び出し側が `signed` で指定する。
 * 率系で負値を許すのは運用利回り・物価上昇率のみ。金利は既定（符号なし）で使う。
 */
function PercentHarness({
  initial,
  signed,
}: {
  initial: number;
  signed?: boolean;
}) {
  const [v, setV] = useState(initial);
  return (
    <>
      <PercentField label="率" value={v} onChange={setV} signed={signed} />
      <output data-testid="val">{String(v)}</output>
    </>
  );
}

describe("PercentField — 符号可否はフィールドごと（金利の回帰 / AC#3）", () => {
  it("金利（signed なし）は `-` を無視して正の率になる", () => {
    const { input, out } = mount(<PercentHarness initial={0} />);
    type(input, "-1.5"); // 「-1.5%」のつもりでも符号は落ちる
    blur(input);
    // 1.5% = 0.015。マイナスにはならない
    expect(Number(out.textContent)).toBeCloseTo(0.015, 10);
    expect(Number(out.textContent)).toBeGreaterThanOrEqual(0);
  });

  it("運用利回り・物価上昇率（signed）は負の率を許可する", () => {
    const { input, out } = mount(<PercentHarness initial={0} signed />);
    type(input, "-2");
    blur(input);
    // -2% = -0.02
    expect(Number(out.textContent)).toBeCloseTo(-0.02, 10);
  });
});
