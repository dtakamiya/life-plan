// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NumberField, PercentField, SelectField, TextField } from "./fields";

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

describe("NumberField / PercentField — 用語解説（issue #22）", () => {
  it("help を渡すとラベルの後ろに「?」ボタンが出る", () => {
    const el = mount(
      <NumberField
        label="非課税口座 初期資産"
        help="taxFreeAccount"
        value={0}
        onChange={() => {}}
      />,
    );
    const button = el.querySelector("label button") as HTMLButtonElement;
    expect(button.getAttribute("aria-label")).toBe("「非課税口座」の説明");
    // 既存テストが依存する「label 直下の span がラベル文字列で始まる」構造を保つ
    expect(el.querySelector("label > span")?.textContent?.startsWith("非課税口座 初期資産")).toBe(true);
  });

  it("input のアクセシブルネームは aria-labelledby でラベル文字列だけを指す", () => {
    const el = mount(
      <NumberField
        label="非課税口座 初期資産"
        help="taxFreeAccount"
        value={0}
        onChange={() => {}}
      />,
    );
    const input = el.querySelector("input") as HTMLInputElement;
    const labelledBy = input.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent).toBe("非課税口座 初期資産");
  });

  it("help を渡さなければ「?」ボタンは出ない（happy path）", () => {
    const el = mount(<NumberField label="金額" value={0} onChange={() => {}} />);
    expect(el.querySelector("button")).toBeNull();
  });

  it("PercentField も help を NumberField へ引き渡す", () => {
    const el = mount(
      <PercentField
        label="運用利回り"
        help="annualReturnRate"
        value={0.03}
        onChange={() => {}}
      />,
    );
    expect(el.querySelector("label button")?.getAttribute("aria-label")).toBe(
      "「運用利回り」の説明",
    );
  });

  it("「?」ボタンを押すと解説が開き、入力値は変わらない", () => {
    let changed = false;
    const el = mount(
      <NumberField
        label="非課税口座 初期資産"
        help="taxFreeAccount"
        value={100}
        onChange={() => {
          changed = true;
        }}
      />,
    );
    const button = el.querySelector("label button") as HTMLButtonElement;
    act(() => button.click());
    expect(el.querySelector('[role="note"]')?.textContent).toContain("NISA");
    expect(changed).toBe(false);
  });
});

describe("NumberField — サフィックス専用レーン（lp-023）", () => {
  it("サフィックスは入力欄と同じ flex 行の兄弟要素で、絶対配置オーバーレイではない", () => {
    const el = mount(
      <NumberField label="金額" value={1234567} onChange={() => {}} suffix="円" />,
    );
    const input = el.querySelector("input") as HTMLInputElement;
    const lane = input.nextElementSibling as HTMLElement;
    expect(lane.textContent).toBe("円");
    expect(lane.className).not.toContain("absolute");
    expect(lane.className).toContain("border-l");
    expect(input.className).not.toContain("pr-9");
    // 表示のみの変更: 入力値そのものは不変
    expect(input.value).toBe("1234567");
  });

  it("サフィックスなしなら従来どおり単独の input（レーンなし）", () => {
    const el = mount(<NumberField label="金額" value={5} onChange={() => {}} />);
    const input = el.querySelector("input") as HTMLInputElement;
    expect(input.nextElementSibling).toBeNull();
  });

  it("error 時はレーン付き shell 側に danger 枠が付く", () => {
    const el = mount(
      <NumberField label="金額" value={0} onChange={() => {}} suffix="円" error="x" />,
    );
    const shell = (el.querySelector("input") as HTMLInputElement).parentElement as HTMLElement;
    expect(shell.className).toContain("border-danger");
  });
});
