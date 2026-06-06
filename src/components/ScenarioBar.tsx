"use client";

import { useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";

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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-1 text-sm font-semibold text-slate-800">
          プラン比較
        </h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="プラン名（任意）"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          現在のプランを保存
        </button>
      </div>

      {snapshots.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {snapshots.map((snap) => (
            <li
              key={snap.id}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-xs text-slate-700"
            >
              <span className="font-medium">{snap.name}</span>
              <button
                type="button"
                onClick={() => loadSnapshot(snap.id)}
                className="rounded-full px-2 py-0.5 text-blue-600 hover:bg-blue-50"
              >
                読込
              </button>
              <button
                type="button"
                onClick={() => removeSnapshot(snap.id)}
                className="rounded-full px-2 py-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                aria-label={`${snap.name}を削除`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
