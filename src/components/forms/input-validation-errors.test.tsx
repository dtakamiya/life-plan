// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePlanStore } from "@/features/plan/ui";
import { HouseholdForm } from "./HouseholdForm";
import { LoanForm } from "./LoanForm";
import { AssetForm } from "./AssetForm";
import { ExpenseForm } from "./ExpenseForm";
import { EventForm } from "./EventForm";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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
  act(() => root.render(ui));
  return container;
}

/** ラベル文字列を持つ入力欄の直下（同じ <label> 内）のエラー文言。 */
function errorUnder(el: HTMLElement, labelText: string): string | undefined {
  const label = [...el.querySelectorAll("label")].find((l) =>
    l.textContent?.includes(labelText),
  );
  return label?.querySelector('[role="alert"]')?.textContent ?? undefined;
}

describe("入力バリデーションのエラー表示（lp-005）", () => {
  it("正常な既定入力ではどの欄にもエラーを出さない", () => {
    const el = mount(
      <>
        <HouseholdForm />
        <ExpenseForm />
        <AssetForm />
        <LoanForm />
        <EventForm />
      </>,
    );
    expect(el.querySelectorAll('[role="alert"]').length).toBe(0);
  });

  it("ローンを追加した直後の行はエラーにならない（ペルソナ操作で結果が消えた回帰）", () => {
    const el = mount(<LoanForm />);
    act(() => usePlanStore.getState().addLoan());
    expect(el.querySelectorAll('[role="alert"]').length).toBe(0);
  });

  it("ローンの借入額が 0 のときだけ「0 円のうちは…」の注意を出す", () => {
    const el = mount(<LoanForm />);
    act(() => usePlanStore.getState().addLoan());
    const loans = usePlanStore.getState().input.loans;
    const added = loans[loans.length - 1];
    const card = () =>
      [...el.querySelectorAll("input")].find(
        (i) => (i as HTMLInputElement).value === added.label,
      )!.closest(".rounded-xl")!;
    expect(card().textContent).toContain("0 円のうちは返済額に寄与しません");

    act(() => usePlanStore.getState().updateLoan(added.id, { principal: 36_000_000 }));
    expect(card().textContent).not.toContain("0 円のうちは返済額に寄与しません");
  });

  it("本人の年金開始年齢が範囲外だと、その欄の直下に日本語エラーを出す", () => {
    const el = mount(<HouseholdForm />);
    act(() =>
      usePlanStore.getState().updateSelf({ pensionStartAge: 50 }),
    );
    expect(errorUnder(el, "年金開始年齢")).toBe(
      "年金開始年齢は60歳〜75歳の範囲で入力してください",
    );
    const input = [...el.querySelectorAll("label")]
      .find((l) => l.textContent?.includes("年金開始年齢"))
      ?.querySelector("input");
    expect(input?.getAttribute("aria-invalid")).toBe("true");
  });

  it("ローンの返済期間 0 は範囲エラー、率・金額の範囲外も欄ごとに出る", () => {
    const el = mount(
      <>
        <LoanForm />
        <AssetForm />
        <ExpenseForm />
      </>,
    );
    act(() => {
      const s = usePlanStore.getState();
      s.updateLoan(s.input.loans[0].id, { termYears: 0 });
      s.updateAssets({ annualReturnRate: 2 });
      s.updateExpenses({ baseAnnualLivingExpense: 2e12 });
    });
    expect(errorUnder(el, "返済期間")).toBe("返済期間は1年〜50年の範囲で入力してください");
    expect(errorUnder(el, "運用利回り")).toBe("運用利回りは-100%〜100%の範囲で入力してください");
    expect(errorUnder(el, "基礎生活費")).toContain("0円〜1,000,000,000,000円");
  });

  it("ライフイベントの年が範囲外なら該当行にだけエラーを出す", () => {
    const el = mount(<EventForm />);
    act(() => {
      const s = usePlanStore.getState();
      s.updateEvent(s.input.events[0].id, { year: 3000 });
    });
    expect(errorUnder(el, "年")).toBe("年は1900〜2100の範囲で入力してください");
  });
});
