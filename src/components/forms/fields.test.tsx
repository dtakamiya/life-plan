// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NumberField, SelectField, TextField } from "./fields";

// react-dom の act(...) を有効化する
(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * lp-ui-ux-audit-fix / FR2.1〜FR2.3 の回帰テスト。
 * `@testing-library/react` は未導入のため react-dom/client + 生 DOM で検証する。
 */

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

describe("NumberField — エラー表示（FR2.1 / FR2.2）", () => {
  it("error を渡すと aria-invalid とエラーメッセージが aria-describedby で関連付く", () => {
    const el = mount(
      <NumberField
        label="金額"
        value={0}
        onChange={() => {}}
        error="0円より大きい値を入力してください"
      />,
    );
    const input = el.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const message = el.querySelector(`#${describedBy}`);
    expect(message?.textContent).toBe("0円より大きい値を入力してください");
  });

  it("error がなければ aria-invalid は付与されない（happy path）", () => {
    const el = mount(<NumberField label="金額" value={100} onChange={() => {}} />);
    const input = el.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("required を渡すとラベルに必須マークが表示される（FR2.3）", () => {
    const el = mount(
      <NumberField label="金額" value={0} onChange={() => {}} required />,
    );
    expect(el.querySelector("label")?.textContent).toContain("*");
  });
});

describe("TextField — エラー表示（FR2.1 / FR2.2）", () => {
  it("error を渡すと aria-invalid とエラーメッセージが関連付く", () => {
    const el = mount(
      <TextField label="内容" value="" onChange={() => {}} error="内容を入力してください" />,
    );
    const input = el.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(el.querySelector(`#${describedBy}`)?.textContent).toBe(
      "内容を入力してください",
    );
  });
});

describe("SelectField — エラー表示（FR2.1 / FR2.2）", () => {
  it("error を渡すと aria-invalid とエラーメッセージが関連付く", () => {
    const el = mount(
      <SelectField
        label="種別"
        value="公立"
        options={["公立", "私立"] as const}
        onChange={() => {}}
        error="選択してください"
      />,
    );
    const select = el.querySelector("select") as HTMLSelectElement;
    expect(select.getAttribute("aria-invalid")).toBe("true");
    const describedBy = select.getAttribute("aria-describedby");
    expect(el.querySelector(`#${describedBy}`)?.textContent).toBe("選択してください");
  });
});
