"use client";

import { usePlanStore } from "./usePlanStore";
import { NumberField, PercentField, Section } from "@/shared/ui";
import { usePlanErrors } from "./usePlanErrors";
import {
  DEFAULT_ANNUAL_RETURN_RATE,
  DEFAULT_ANNUAL_TAX_FREE_CONTRIBUTION,
} from "@/features/plan/domain";
import { formatPercent, formatYen } from "@/shared/lib";

/** lp-042: 既定値の根拠を伝えるヘルプ文言。既定値定数から生成し、二重管理を避ける。 */
const ANNUAL_RETURN_RATE_HINT = `既定値は${formatPercent(
  DEFAULT_ANNUAL_RETURN_RATE,
)}（預金と投資信託などを組み合わせた場合の目安）。実際の運用方針に合わせて変更してください。`;
const TAX_FREE_CONTRIBUTION_HINT = `既定値は${formatYen(
  DEFAULT_ANNUAL_TAX_FREE_CONTRIBUTION,
)}（NISAつみたて投資枠の年間上限が目安）。課税口座から移すため総資産は増えません。`;

export function AssetForm() {
  const assets = usePlanStore((s) => s.input.assets);
  const updateAssets = usePlanStore((s) => s.updateAssets);
  const errors = usePlanErrors();

  return (
    <Section title="資産運用">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField
          label="課税口座 初期資産"
          help="taxableAccount"
          suffix="円"
          grouped
          step={100_000}
          error={errors["assets.taxableAssets"]}
          value={assets.taxableAssets}
          onChange={(taxableAssets) => updateAssets({ taxableAssets })}
        />
        <NumberField
          label="非課税口座 初期資産"
          hint="NISA/iDeCo 等"
          help="taxFreeAccount"
          suffix="円"
          grouped
          step={100_000}
          error={errors["assets.taxFreeAssets"]}
          value={assets.taxFreeAssets}
          onChange={(taxFreeAssets) => updateAssets({ taxFreeAssets })}
        />
        <PercentField
          label="運用利回り"
          help="annualReturnRate"
          hint={ANNUAL_RETURN_RATE_HINT}
          signed
          error={errors["assets.annualReturnRate"]}
          value={assets.annualReturnRate}
          onChange={(annualReturnRate) => updateAssets({ annualReturnRate })}
        />
        <PercentField
          label="配当利回り"
          hint="運用利回りとは別に受取"
          help="dividendYield"
          error={errors["assets.annualDividendYield"]}
          value={assets.annualDividendYield}
          onChange={(annualDividendYield) => updateAssets({ annualDividendYield })}
        />
        <NumberField
          label="非課税口座へ年間積立"
          hint={TAX_FREE_CONTRIBUTION_HINT}
          help="taxFreeContribution"
          suffix="円"
          grouped
          step={100_000}
          error={errors["assets.annualTaxFreeContribution"]}
          value={assets.annualTaxFreeContribution}
          onChange={(annualTaxFreeContribution) =>
            updateAssets({ annualTaxFreeContribution })
          }
        />
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-mute">
        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" aria-hidden />
        課税口座の運用益には約20%課税。非課税口座（NISA/iDeCo）は運用益非課税です。配当・分配金は毎年現金で受け取り、課税口座分は約20%課税されます。
      </p>
    </Section>
  );
}
