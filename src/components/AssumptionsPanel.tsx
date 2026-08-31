"use client";

import type { PlanInput } from "@/lib/simulation/types";
import { buildAssumptionRows } from "@/lib/assumptions";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * 結果セクションの「計算の前提」パネル。
 * デフォルトで折りたたみ（<details> の open を付けない）。
 * 表示する値はすべて buildAssumptionRows が input から組み立てた
 * 「実際に使われた前提値」で、計算には一切影響しない。
 */
export function AssumptionsPanel({ input }: { input: PlanInput }) {
  const rows = buildAssumptionRows(input);

  return (
    <details className="group rounded-2xl border border-line bg-surface shadow-panel transition-shadow duration-200 open:shadow-panel-lift">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-5 [&::-webkit-details-marker]:hidden">
        <div>
          <Eyebrow className="mb-1.5 flex">Assumptions</Eyebrow>
          <h2 className="text-[15px] font-bold tracking-tight text-ink">
            計算の前提
          </h2>
        </div>
        <span
          className="shrink-0 text-ink-mute transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>

      <div className="border-t border-line-soft px-5 pb-5 pt-4">
        <p className="mb-3 text-[11px] leading-relaxed text-ink-mute">
          この試算で実際に使われた前提値です。表示は結果に影響しません。
          税・年金・社会保険料は厳密な制度計算ではなく概算です。
        </p>
        <dl className="divide-y divide-line-soft">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[200px_1fr] sm:gap-3"
            >
              <dt className="text-[12px] font-semibold text-ink-soft">
                {row.label}
              </dt>
              <dd className="space-y-0.5">
                <div className="font-display text-[13px] font-semibold tabular-nums text-ink">
                  {row.value}
                </div>
                <div className="text-[11px] leading-relaxed text-ink-mute">
                  {row.note}
                </div>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
