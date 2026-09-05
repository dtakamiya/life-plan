"use client";

import type { LogEntry, Stage } from "@/lib/game/types";
import { Panel } from "@/components/ui/Panel";
import { formatYen } from "@/lib/format";

/** 選択の履歴。新しい行は aria-live で読み上げる。 */
export function AdventureLog({
  log,
  stages,
}: {
  log: LogEntry[];
  stages: Stage[];
}) {
  return (
    <Panel eyebrow="Chronicle" title="これまでの記録">
      {log.length === 0 ? (
        <p className="text-xs text-ink-mute">
          まだ何も起きていません。最初のステージの方針を選んでください。
        </p>
      ) : (
        <ol className="space-y-2" aria-live="polite">
          {log.map((entry, i) => (
            <li
              key={`${entry.stageIndex}-${i}`}
              className="border-b border-line/60 pb-2 last:border-b-0 last:pb-0"
            >
              <p className="text-[11px] text-ink-mute">
                {stages[entry.stageIndex]?.label ?? ""}
              </p>
              <p className="text-sm leading-relaxed text-ink">{entry.text}</p>
              <p className="text-[11px] text-ink-mute">
                お金 {formatYen(entry.cash)} ／ 満足度 {entry.satisfaction} ／
                ステージ末の純資産 {formatYen(entry.assetsAtStageEnd)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
