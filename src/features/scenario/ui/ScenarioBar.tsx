"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "@/features/plan/ui";
import { useScenarioStore } from "./useScenarioStore";
import { Button, ConfirmDialog, Panel, type ConfirmDialogHandle } from "@/shared/ui";
import {
  PLAN_FILE_MAX_BYTES,
  parsePlanFile,
  planFileName,
  serializePlan,
} from "@/features/plan/infrastructure";

/**
 * 現在の入力をスナップショットとして保存し、保存済みプランの読込・削除を行うバー。
 * 保存したプランは比較グラフに重ねて表示される。
 */
export function ScenarioBar() {
  const snapshots = useScenarioStore((s) => s.snapshots);
  const saveSnapshot = useScenarioStore((s) => s.saveSnapshot);
  const removeSnapshot = useScenarioStore((s) => s.removeSnapshot);
  const loadSnapshot = useScenarioStore((s) => s.loadSnapshot);
  const replaceInput = usePlanStore((s) => s.replaceInput);
  const [name, setName] = useState("");
  // lp-033: ファイル読み込みの結果表示。失敗時は現在のプランを変更しない。
  const [fileMessage, setFileMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // lp-ui-ux-audit-fix / FR4.1: 保存済みプランの削除は確認ダイアログを経由する
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  const handleSave = () => {
    saveSnapshot(name.trim() || `プラン${snapshots.length + 1}`);
    setName("");
  };

  const handleExport = () => {
    const json = serializePlan(usePlanStore.getState().input);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = planFileName();
    a.click();
    URL.revokeObjectURL(url);
    setFileMessage({ ok: true, text: `${a.download} を書き出しました。` });
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > PLAN_FILE_MAX_BYTES) {
      setFileMessage({ ok: false, text: "ファイルが大きすぎます（上限 1MB）。現在のプランは変更されていません。" });
      return;
    }
    const result = parsePlanFile(await file.text());
    if (!result.ok) {
      setFileMessage({ ok: false, text: `${result.error}${result.error.endsWith("。") ? "" : "。"} 現在のプランは変更されていません。` });
      return;
    }
    replaceInput(result.input);
    setFileMessage({ ok: true, text: `${file.name} を読み込み、現在の入力を置き換えました。` });
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
                onClick={() => {
                  setPendingDelete({ id: snap.id, name: snap.name });
                  confirmRef.current?.open();
                }}
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

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Button variant="ghost" size="sm" onClick={handleExport}>
          JSONで書き出し
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
          JSONを読み込み
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="プランのJSONファイルを選択"
          data-testid="plan-file-input"
          onChange={(e) => {
            void handleImportFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className="text-[11px] text-ink-mute">端末移行・バックアップ用。読み込むと現在の入力が置き換わります。</span>
      </div>
      {fileMessage && (
        <p
          role={fileMessage.ok ? "status" : "alert"}
          className={`mt-2 text-xs ${fileMessage.ok ? "text-brand-700" : "text-danger"}`}
        >
          {fileMessage.text}
        </p>
      )}

      <ConfirmDialog
        ref={confirmRef}
        title="このプランを削除しますか？"
        description={
          pendingDelete
            ? `「${pendingDelete.name}」を削除すると元に戻せません。`
            : "削除すると元に戻せません。"
        }
        onConfirm={() => {
          if (pendingDelete) removeSnapshot(pendingDelete.id);
        }}
      />
    </Panel>
  );
}
