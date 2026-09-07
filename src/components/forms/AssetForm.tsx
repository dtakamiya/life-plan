"use client";

import { usePlanStore } from "@/lib/store/usePlanStore";
import { NumberField, PercentField, Section } from "./fields";

export function AssetForm() {
  const assets = usePlanStore((s) => s.input.assets);
  const updateAssets = usePlanStore((s) => s.updateAssets);

  return (
    <Section title="資産運用">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="課税口座 初期資産"
          suffix="円"
          step={100_000}
          value={assets.taxableAssets}
          onChange={(taxableAssets) => updateAssets({ taxableAssets })}
        />
        <NumberField
          label="非課税口座 初期資産"
          hint="NISA/iDeCo 等"
          suffix="円"
          step={100_000}
          value={assets.taxFreeAssets}
          onChange={(taxFreeAssets) => updateAssets({ taxFreeAssets })}
        />
        <PercentField
          label="運用利回り"
          signed
          value={assets.annualReturnRate}
          onChange={(annualReturnRate) => updateAssets({ annualReturnRate })}
        />
        <NumberField
          label="非課税口座へ年間積立"
          hint="課税口座から移す"
          suffix="円"
          step={100_000}
          value={assets.annualTaxFreeContribution}
          onChange={(annualTaxFreeContribution) =>
            updateAssets({ annualTaxFreeContribution })
          }
        />
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-mute">
        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" aria-hidden />
        課税口座の運用益には約20%課税。非課税口座（NISA/iDeCo）は運用益非課税です。
      </p>
    </Section>
  );
}
