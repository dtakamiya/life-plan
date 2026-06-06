"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { runSimulation } from "@/lib/simulation/engine";
import { formatYen } from "@/lib/format";
import { HouseholdForm } from "@/components/forms/HouseholdForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { AssetForm } from "@/components/forms/AssetForm";
import { EventForm } from "@/components/forms/EventForm";
import { LoanForm } from "@/components/forms/LoanForm";
import { NetWorthChart } from "@/components/charts/NetWorthChart";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { ComparisonChart } from "@/components/charts/ComparisonChart";
import { ResultTable } from "@/components/ResultTable";
import { ScenarioBar } from "@/components/ScenarioBar";
import type { YearlyResult } from "@/lib/simulation/types";

/** サマリーカード（最終純資産・最小純資産・赤字転落年）。 */
function Summary({ results }: { results: YearlyResult[] }) {
  if (results.length === 0) return null;
  const last = results[results.length - 1];
  const min = results.reduce((m, r) => (r.assets < m.assets ? r : m), results[0]);
  const depleted = results.find((r) => r.assets < 0);

  const cards = [
    { label: "最終純資産", value: formatYen(last.assets), accent: last.assets < 0 },
    { label: "最小純資産", value: formatYen(min.assets), accent: min.assets < 0 },
    {
      label: "資産が尽きる年",
      value: depleted ? `${depleted.year}年（${depleted.selfAge}歳）` : "なし",
      accent: Boolean(depleted),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="text-xs text-slate-500">{c.label}</div>
          <div
            className={`mt-1 text-lg font-semibold tabular-nums ${
              c.accent ? "text-red-600" : "text-slate-800"
            }`}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const input = usePlanStore((s) => s.input);
  const snapshots = usePlanStore((s) => s.snapshots);
  const reset = usePlanStore((s) => s.reset);

  // localStorage からの復元（ハイドレーション）後にのみ結果を描画し、
  // サーバー描画とのミスマッチを避ける。
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(usePlanStore.persist.hasHydrated());
    const unsub = usePlanStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  const results = useMemo(() => runSimulation(input), [input]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            ライフプラン・シミュレーター
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            世帯の収支・ライフイベント・資産運用条件から年次キャッシュフローと純資産推移を試算します。
            ※税・年金・社会保険料は簡易な概算です。
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
        >
          初期値に戻す
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <HouseholdForm />
          <ExpenseForm />
          <AssetForm />
          <LoanForm />
          <EventForm />
        </div>

        <div className="space-y-6">
          {hydrated ? (
            <>
              <Summary results={results} />
              <ScenarioBar />
              {snapshots.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="mb-2 text-sm font-semibold text-slate-800">
                    プラン比較（純資産推移）
                  </h2>
                  <ComparisonChart current={results} snapshots={snapshots} />
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">
                  純資産推移
                </h2>
                <NetWorthChart results={results} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">
                  年次キャッシュフロー
                </h2>
                <CashFlowChart results={results} />
              </div>
              <div>
                <h2 className="mb-2 text-sm font-semibold text-slate-800">
                  年次明細
                </h2>
                <ResultTable results={results} />
              </div>
            </>
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-slate-400">
              読み込み中…
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
