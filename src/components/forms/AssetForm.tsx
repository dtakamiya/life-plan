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
          label="初期資産"
          suffix="円"
          step={100_000}
          value={assets.initialAssets}
          onChange={(initialAssets) => updateAssets({ initialAssets })}
        />
        <PercentField
          label="運用利回り"
          value={assets.annualReturnRate}
          onChange={(annualReturnRate) => updateAssets({ annualReturnRate })}
        />
      </div>
    </Section>
  );
}
