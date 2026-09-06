"use client";

import { useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

/**
 * 現在の入力をスナップショットとして保存し、保存済みプランの読込・削除を行うバー。
 * 保存したプランは比較グラフに重ねて表示される。
 */
export function ScenarioBar() {
  const snapshots = usePlanStore((s) => s.snapshots);
  const saveSnapshot = usePlanStore((s) => s.saveSnapshot);
  const removeSnapshot = usePlanStore((s) => s.removeSnapshot);
  const loadSnapshot = usePlanStore((s) => s.loadSnapshot);
  const [name, setName] = useState("");

  const handleSave = () => {
    saveSnapshot(name.trim() || `プラン${snapshots.length + 1}`);
    setName("");
  };

  return (
    <Panel eyebrow="Scenarios" title="プラン比較">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="プラン名（任意）"
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper/50 px-3 py-2 text-sm text-ink shadow-[inset_0_1px_2px_rgba(23,40,59,0.04)] transition-colors placeholder:text-ink-mute focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
        <Button variant="primary" size="md" onClick={handleSave}>
          現在のプランを保存
        </Button>
      </div>

      {snapshots.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {snapshots.map((snap) => (
            <li
              key={snap.id}
              className="flex items-center gap-1 rounded-full border border-line bg-paper/60 py-1 pl-3 pr-1 text-xs text-ink-soft"
            >
              <span className="font-medium text-ink">{snap.name}</span>
              {snap.origin === "game" && (
                <span
                  className="rounded-full border border-gold/40 bg-gold/10 px-1.5 py-px text-[10px] font-medium text-gold"
                  title="ゲームモードの進行から保存されたプランです"
                >
                  ゲーム
                </span>
              )}
              <button
                type="button"
                onClick={() => loadSnapshot(snap.id)}
                className="rounded-full px-2 py-0.5 font-medium text-brand-700 transition-colors hover:bg-brand-50"
              >
                読込
              </button>
              <button
                type="button"
                onClick={() => removeSnapshot(snap.id)}
                className="grid h-5 w-5 place-items-center rounded-full text-ink-mute transition-colors hover:bg-danger-50 hover:text-danger"
                aria-label={`${snap.name}を削除`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] text-ink-mute">
          現在の入力を保存すると、純資産推移を重ねて比較できます。
        </p>
      )}
    </Panel>
  );
}
