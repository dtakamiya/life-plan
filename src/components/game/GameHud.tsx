"use client";

import type { PlanInput } from "@/lib/simulation/types";
import type { Stage } from "@/lib/game/types";
import type { GameStats } from "@/lib/game/stats";
import { Panel } from "@/components/ui/Panel";
import { formatYen } from "@/lib/format";

/** ランダムイベントは演出であり確率の予測ではない旨の常設表示。 */
export const EVENT_DISCLAIMER =
  "イベントはゲーム上の演出です。あなたに起こる確率の予測ではありません。";

/** 満足度が金融的な指標ではない旨の注記。 */
export const SATISFACTION_DISCLAIMER =
  "満足度はゲーム上の演出で、金融的な指標ではありません。";

/** ラベルと値を並べる 1 行。 */
function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2 last:border-b-0">
      <span className="shrink-0 text-xs text-ink-soft">{label}</span>
      <span className="text-right">
        <span className="font-display text-sm font-bold text-ink">{value}</span>
        {note && <span className="ml-1 text-[11px] text-ink-mute">{note}</span>}
      </span>
    </div>
  );
}

/**
 * 満足度のバー。バー自体は aria-hidden にし、数値をテキストで併記する。
 * 状態は色だけでなく記号とテキストでも示す。
 */
function SatisfactionBar({ value }: { value: number }) {
  const level = value >= 60 ? "高い" : value >= 30 ? "ふつう" : "低い";
  const mark = value >= 60 ? "◎" : value >= 30 ? "○" : "△";
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`満足度 ${value}（${level}）`}
      className="mt-1"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-ink-soft">満足度</span>
        <span className="font-display text-sm font-bold text-ink">
          {mark} {value} / 100（{level}）
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full rounded-full bg-paper" aria-hidden>
        <div
          className="h-2 rounded-full bg-brand transition-[width] duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function GameHud({
  input,
  stage,
  stageCount,
  stats,
  satisfaction,
}: {
  input: PlanInput;
  /** 進行中のステージ。finished なら null */
  stage: Stage | null;
  stageCount: number;
  stats: GameStats;
  satisfaction: number;
}) {
  const activeLoans = input.loans.filter(
    (loan) =>
      stage !== null &&
      stage.endYear >= loan.startYear &&
      stage.startYear < loan.startYear + loan.termYears,
  );

  return (
    <div className="space-y-4">
      <Panel eyebrow="Status" title="いまの状況">
        <Row
          label="年齢・ステージ"
          value={stage ? `${stage.label}` : "すべて終えた"}
          note={
            stage ? `（${stage.index + 1} / ${stageCount}）` : `（${stageCount} / ${stageCount}）`
          }
        />
        <Row label="現在の純資産" value={formatYen(stats.finalAssets)} />
        <Row
          label="これまでの最小純資産"
          value={formatYen(stats.minAssets)}
          note={`（${stats.minAssetsAge}歳）`}
        />
        {stats.depletionAge !== null && (
          <Row
            label="資産寿命"
            value={`${stats.assetLifeAge}歳`}
            note="この先で資産が尽きる"
          />
        )}
        <SatisfactionBar value={satisfaction} />
        <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
          {SATISFACTION_DISCLAIMER}
        </p>
      </Panel>

      <Panel eyebrow="Household" title="世帯">
        <Row
          label={input.self.name}
          value={
            stage ? `${stage.startYear - input.self.birthYear}歳` : "—"
          }
        />
        {input.spouse && (
          <Row
            label={input.spouse.name}
            value={
              stage ? `${stage.startYear - input.spouse.birthYear}歳` : "—"
            }
          />
        )}
        {input.children.map((child) => (
          <Row
            key={child.id}
            label={child.name}
            value={stage ? `${stage.startYear - child.birthYear}歳` : "—"}
          />
        ))}
        {activeLoans.map((loan) => (
          <Row
            key={loan.id}
            label={loan.label}
            value={`${loan.startYear}年から${loan.termYears}年`}
            note={`年利${(loan.annualRate * 100).toFixed(1)}%`}
          />
        ))}
        {activeLoans.length > 0 && (
          <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
            元本の返済は純資産に対して中立で、真のコストは利息のぶんだけです。
          </p>
        )}
      </Panel>

      <Panel eyebrow="Notice" title="このモードについて">
        <p className="text-[11px] leading-relaxed text-ink-mute">{EVENT_DISCLAIMER}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
          税・年金・社会保険料・教育費などの計算は本体と同じ概算です。ここでの選択は
          本体の入力・グラフ・年次明細を書き換えません。
        </p>
      </Panel>
    </div>
  );
}
