"use client";

import { useRef, useState } from "react";
import type { GameState } from "@/lib/game/types";
import type { GameStats } from "@/lib/game/stats";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { formatYen } from "@/lib/format";
import { EVENT_DISCLAIMER, SATISFACTION_DISCLAIMER } from "./GameHud";
import { STAGE_OPTION_TABLE } from "@/lib/game/stages";

/** 方針カードのログを 1 行に要約する。 */
function summarizeChoices(state: GameState): string {
  const counts = new Map<string, number>();
  for (const applied of state.applied) {
    if (applied.source.kind !== "stage-option") continue;
    const id = applied.source.optionId;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let topId = STAGE_OPTION_TABLE[0].id;
  let topCount = -1;
  for (const row of STAGE_OPTION_TABLE) {
    const count = counts.get(row.id) ?? 0;
    if (count > topCount) {
      topCount = count;
      topId = row.id;
    }
  }
  const phrase: Record<string, string> = {
    frugal: "多くのステージで支出を抑え、蓄えを優先する人生を選びました。",
    standard: "多くのステージで無理のない水準を保ち、均した人生を選びました。",
    rich: "多くのステージで暮らしに厚く配分する人生を選びました。",
  };
  return phrase[topId] ?? phrase.standard;
}

export function GameResult({
  state,
  stats,
  baseStats,
  onSave,
  onRestart,
}: {
  state: GameState;
  /** ゲームの選択を反映した結果の統計 */
  stats: GameStats;
  /** 選択を一切反映しないベースプランの統計 */
  baseStats: GameStats;
  onSave: (name: string) => void;
  onRestart: () => void;
}) {
  const [name, setName] = useState("ゲームの結果");
  const [saved, setSaved] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const satisfactionValues = state.log.map((l) => l.satisfaction);
  const averageSatisfaction =
    satisfactionValues.length === 0
      ? state.satisfaction
      : Math.round(
          satisfactionValues.reduce((a, b) => a + b, 0) / satisfactionValues.length,
        );
  const lowStages = new Set(
    state.log.filter((l) => l.satisfaction < 30).map((l) => l.stageIndex),
  ).size;

  const assetDiff = stats.finalAssets - baseStats.finalAssets;
  // 符号付きの差分であることを示す（正なら + を前置。負は formatYen が - / △ を付ける）。
  const assetDiffText =
    assetDiff > 0 ? `+${formatYen(assetDiff)}` : formatYen(assetDiff);
  const lifeDiff = stats.assetLifeAge - baseStats.assetLifeAge;

  return (
    <div className="space-y-4">
      <Panel eyebrow="Result" title="この人生に起きたこと">
        <ul className="space-y-2 text-sm leading-relaxed text-ink">
          <li>
            資産が最も薄くなったのは <strong>{stats.minAssetsAge}歳</strong>（残{" "}
            {formatYen(stats.minAssets)}）
          </li>
          <li>
            {stats.depletionAge === null
              ? `資産寿命は ${stats.assetLifeAge}歳（期間内では尽きませんでした）`
              : `資産は ${stats.depletionAge}歳で尽きました（資産寿命 ${stats.assetLifeAge}歳）`}
          </li>
          <li>最終的な純資産は {formatYen(stats.finalAssets)}</li>
          <li>
            平均満足度は {averageSatisfaction}
            {lowStages > 0 && `／満足度が 30 を割ったステージ ${lowStages} 回`}
          </li>
        </ul>
      </Panel>

      <Panel eyebrow="Compare" title="基本計画との違い">
        <ul className="space-y-2 text-sm leading-relaxed text-ink">
          <li>最終資産 {assetDiffText}</li>
          {(stats.depletionAge !== null || baseStats.depletionAge !== null) && (
            <li>
              {lifeDiff === 0
                ? "資産寿命は基本計画と同じ年齢です"
                : lifeDiff < 0
                  ? `基本計画より ${Math.abs(lifeDiff)} 年早く資産が尽きました`
                  : `基本計画より ${lifeDiff} 年長く資産が持ちました`}
            </li>
          )}
          <li>{summarizeChoices(state)}</li>
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
          この差にはランダムなイベントの結果も含まれます。運と判断は分けられないため、
          「あなたの判断が生んだ増減」ではなく「基本計画との違い」として示しています。
        </p>
      </Panel>

      <Panel eyebrow="Save" title="この進行をシナリオとして保存">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="保存するプラン名"
            className="min-w-0 flex-1 rounded-lg border border-line bg-paper/50 px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
          <Button
            variant="primary"
            onClick={() => {
              onSave(name.trim() || "ゲームの結果");
              setSaved(true);
            }}
          >
            保存する
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
          保存したプランには「ゲーム」の印が付き、比較グラフでも破線で区別されます。
        </p>
        {saved && (
          <p className="mt-2 text-xs text-brand-700" role="status">
            保存しました。トップページのプラン比較から読み込めます。
          </p>
        )}
      </Panel>

      <Panel eyebrow="Notice" title="読むときの注意">
        <p className="text-[11px] leading-relaxed text-ink-mute">{EVENT_DISCLAIMER}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
          {SATISFACTION_DISCLAIMER}
        </p>
      </Panel>

      <div>
        <Button variant="danger" onClick={() => dialogRef.current?.showModal()}>
          もう一度はじめる
        </Button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="restart-title"
        className="rounded-2xl border border-line bg-surface p-5 text-ink shadow-panel backdrop:bg-ink/30"
      >
        <h2 id="restart-title" className="text-[15px] font-bold text-ink">
          もう一度はじめますか？
        </h2>
        <p className="mt-2 max-w-xs text-xs leading-relaxed text-ink-soft">
          いまの進行は保存されず、失われます。保存済みのシナリオには影響しません。
        </p>
        <div className="mt-4 flex justify-end gap-2">
          {/* 確認ボタンには初期フォーカスを当てない（autofocus は「閉じる」側） */}
          <Button autoFocus onClick={() => dialogRef.current?.close()}>
            閉じる
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              dialogRef.current?.close();
              onRestart();
            }}
          >
            進行を捨ててやり直す
          </Button>
        </div>
      </dialog>
    </div>
  );
}
