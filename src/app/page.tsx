"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { runSimulation } from "@/lib/simulation/engine";
import { formatYen } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
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

type Tone = "brand" | "ink" | "danger";

const toneAccent: Record<Tone, string> = {
  brand: "bg-brand",
  ink: "bg-ink/30",
  danger: "bg-danger",
};
const toneText: Record<Tone, string> = {
  brand: "text-brand-700",
  ink: "text-ink",
  danger: "text-danger",
};

/** サマリーカード（最終純資産・最小純資産・赤字転落年）。 */
function Summary({ results }: { results: YearlyResult[] }) {
  if (results.length === 0) return null;
  const last = results[results.length - 1];
  const min = results.reduce((m, r) => (r.assets < m.assets ? r : m), results[0]);
  const depleted = results.find((r) => r.assets < 0);

  const cards: {
    label: string;
    value: string;
    caption: string;
    tone: Tone;
  }[] = [
    {
      label: "最終純資産",
      value: formatYen(last.assets),
      caption: `${last.year}年（本人${last.selfAge}歳）時点`,
      tone: last.assets < 0 ? "danger" : "brand",
    },
    {
      label: "最小純資産",
      value: formatYen(min.assets),
      caption: `${min.year}年（本人${min.selfAge}歳）で最小`,
      tone: min.assets < 0 ? "danger" : "ink",
    },
    {
      label: "資産が尽きる年",
      value: depleted ? `${depleted.year}年` : "なし",
      caption: depleted ? `本人${depleted.selfAge}歳で残高マイナス` : "計画期間中は枯渇しません",
      tone: depleted ? "danger" : "ink",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className="animate-fade-up relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-panel"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <span
            className={`absolute inset-y-0 left-0 w-1 ${toneAccent[c.tone]}`}
            aria-hidden
          />
          <div className="eyebrow">
            <span className="h-px w-4 bg-gold/70" aria-hidden />
            {c.label}
          </div>
          <div
            className={`mt-2 font-display text-[28px] font-semibold leading-tight tabular-nums ${toneText[c.tone]}`}
          >
            {c.value}
          </div>
          <div className="mt-1.5 text-[11px] text-ink-mute">{c.caption}</div>
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
            <span className="eyebrow">
              <span className="h-px w-4 bg-gold/70" aria-hidden />
              Life Plan Simulator
            </span>
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
        <Button variant="ghost" size="sm" onClick={reset} className="self-start sm:self-auto">
          初期値に戻す
        </Button>
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
                <Panel eyebrow="Net worth" title="純資産推移">
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
          ) : (
            <div className="flex h-72 items-center justify-center gap-2 text-sm text-ink-mute">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              読み込み中…
            </div>
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
