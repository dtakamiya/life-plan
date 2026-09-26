"use client";

import { useMemo } from "react";
import {
  AssetForm,
  EventForm,
  ExpenseForm,
  HouseholdForm,
  IncomeAdjustmentForm,
  LoanForm,
  PlanPresetActions,
  PropertyForm,
  RecurringExpenseForm,
  usePlanHydrated,
  usePlanStore,
} from "@/features/plan/ui";
import { GameModeIntro } from "./GameModeIntro";
import { ComparisonChart, ResetAllAction, ScenarioBar, useScenarioStore } from "@/features/scenario/ui";
import { runValidatedSimulation } from "@/features/simulation/application";
import type { YearlyResult } from "@/features/simulation/domain";
import { Eyebrow, LoadingPlaceholder, Panel } from "@/shared/ui";
import {
  AssumptionsPanel,
  CashFlowChart,
  DepletionAdvice,
  EmptyResultsNotice,
  NetWorthChart,
  ResultTable,
  SummaryBar,
  SummaryCards,
} from "@/features/simulation/ui";

export default function Home() {
  const input = usePlanStore((s) => s.input);
  const snapshots = useScenarioStore((s) => s.snapshots);
  // localStorage からの復元（ハイドレーション）後にのみ結果を描画し、
  // サーバー描画とのミスマッチを避ける。
  const hydrated = usePlanHydrated();

  // lp-005: バリデーション通過時のみ runSimulation を呼ぶ。エラー中は結果を
  // 空にして共通メッセージ（EmptyResultsNotice）へフォールバックする。
  const validated = useMemo(() => runValidatedSimulation(input), [input]);
  const inputInvalid = validated === null;
  const results: YearlyResult[] = validated ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span
            className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-700 shadow-panel"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path
                d="M4 16.5 9 11l3.5 3.5L20 6"
                stroke="#f4d9a3"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 20h16"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.55"
              />
            </svg>
          </span>
          <div>
            <Eyebrow>Life Plan Simulator</Eyebrow>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-[34px]">
              ライフプラン・シミュレーター
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-soft">
              世帯の収支・ライフイベント・資産運用条件から、年次キャッシュフローと純資産推移を試算します。
              <span className="text-ink-mute">
                {" "}
                ※税・年金・社会保険料は簡易な概算です。
              </span>
            </p>
          </div>
        </div>
        {/* lp-030: サンプル世帯からではなく自分の数字だけで組み立てたい
            ユーザー向けの導線。初回表示から常に見える位置に置く。 */}
        <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-auto">
          <PlanPresetActions />
          <ResetAllAction />
        </div>
      </header>

      {/* issue #17: 入力を編集しながら結果を確認できるよう要約を上部に固定する */}
      {hydrated && <SummaryBar results={results} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        {/*
          issue #17: PC 幅ではフォーム列を要約バー（高さ約 4rem）の下に固定し、
          列内で独立スクロールさせる。結果列をスクロールしてもフォームが見え続ける。
        */}
        <div
          data-column="inputs"
          className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1"
        >
          {/* 復元前に既定値を描画すると、保存済みの内容と食い違った状態で
              入力できてしまうため、結果列と同じくハイドレーション後に描画する。 */}
          {hydrated ? (
            <>
              <HouseholdForm />
              <IncomeAdjustmentForm />
              <ExpenseForm />
              <RecurringExpenseForm />
              <AssetForm />
              <LoanForm />
              <PropertyForm />
              <EventForm />
            </>
          ) : (
            <LoadingPlaceholder className="h-40" />
          )}
        </div>

        {/*
          `1fr` 列の最小幅は中身の min-content になり、年次明細テーブル
          （whitespace-nowrap）の幅で列ごとはみ出すため min-w-0 で抑える。
        */}
        <div data-column="results" className="min-w-0 space-y-6">
          {hydrated ? (
            <>
              {inputInvalid && (
                <p
                  role="alert"
                  className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger"
                >
                  入力に誤りがあるため、シミュレーションを実行していません。赤字の項目を修正してください。
                </p>
              )}
              {results.length === 0 ? (
                // lp-019 / QA#1: FR3 の期間補正で開始年>終了年自体は
                // 発生しなくなるが、念のため空結果でも例外を出さず
                // 共通メッセージへフォールバックする。
                <div className="animate-fade-up" style={{ animationDelay: "210ms" }}>
                  <EmptyResultsNotice />
                </div>
              ) : (
                <>
                  {input.expenses.baseAnnualLivingExpense === 0 && (
                    <p
                      role="status"
                      className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-soft"
                    >
                      基礎生活費が0円のため、結果には生活費が含まれていません。実際より資産が多く見えます。
                    </p>
                  )}
                  <SummaryCards results={results} />
                  {validated && <DepletionAdvice input={input} />}

                  <div className="animate-fade-up" style={{ animationDelay: "210ms" }}>
                    <ScenarioBar />
                  </div>

                  {snapshots.length > 0 && (
                    <div className="animate-fade-up" style={{ animationDelay: "260ms" }}>
                      <Panel eyebrow="Compare" title="プラン比較（純資産推移）">
                        <ComparisonChart current={results} snapshots={snapshots} />
                      </Panel>
                    </div>
                  )}

                  <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
                    <Panel eyebrow="Net worth" title="資産推移">
                      <NetWorthChart results={results} />
                    </Panel>
                  </div>

                  <div className="animate-fade-up" style={{ animationDelay: "350ms" }}>
                    <Panel eyebrow="Cash flow" title="年次キャッシュフロー">
                      <CashFlowChart results={results} />
                    </Panel>
                  </div>

                  <div className="animate-fade-up" style={{ animationDelay: "400ms" }}>
                    <Panel eyebrow="Detail" title="年次明細">
                      <ResultTable results={results} />
                    </Panel>
                  </div>
                </>
              )}

              <div className="animate-fade-up" style={{ animationDelay: "450ms" }}>
                <AssumptionsPanel input={input} />
              </div>

              <div className="animate-fade-up" style={{ animationDelay: "500ms" }}>
                <GameModeIntro />
              </div>
            </>
          ) : (
            <LoadingPlaceholder className="h-72" />
          )}
        </div>
      </div>

      <footer className="mt-10 border-t border-line pt-5 text-[11px] leading-relaxed text-ink-mute">
        税・年金・社会保険料・教育費・退職所得課税などは厳密な制度計算ではなく、大まかな概算です。
        入力内容はブラウザ内（localStorage）にのみ保存されます。
      </footer>
    </main>
  );
}
