"use client";

import { ASSUMPTION_PRESETS, matchAssumptionPreset } from "@/features/plan/domain";
import { Button, Section } from "@/shared/ui";
import { usePlanStore } from "./usePlanStore";

/**
 * lp-032: 運用利回り・物価上昇率・年収上昇率を「楽観・標準・悲観」から
 * ワンクリックで切り替えるプリセット選択。個別編集も可能で、その場合は
 * 現在値がどのプリセットとも一致しなくなるため「カスタム」と表示する。
 * 選ばれた値と根拠は結果側の「計算の前提」パネルにも表示される。
 */
export function AssumptionPresetSelector() {
  const input = usePlanStore((s) => s.input);
  const applyAssumptionPreset = usePlanStore((s) => s.applyAssumptionPreset);

  const activeKey = matchAssumptionPreset({
    annualReturnRate: input.assets.annualReturnRate,
    inflationRate: input.expenses.inflationRate,
    selfIncomeGrowthRate: input.self.incomeGrowthRate,
    spouseIncomeGrowthRate: input.spouse ? input.spouse.incomeGrowthRate : null,
  });

  return (
    <Section title="前提プリセット">
      <div className="flex flex-wrap gap-2">
        {ASSUMPTION_PRESETS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            variant={activeKey === preset.key ? "primary" : "ghost"}
            size="sm"
            aria-pressed={activeKey === preset.key}
            onClick={() => applyAssumptionPreset(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
        {activeKey === null && (
          <Button variant="ghost" size="sm" disabled aria-pressed="true">
            カスタム
          </Button>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
        運用利回り・物価上昇率・年収上昇率をまとめて切り替えます（調査済みの予測値ではなく、置いた仮定です）。個別に編集すると「カスタム」になります。値と根拠は下の「計算の前提」でも確認できます。
      </p>
    </Section>
  );
}
