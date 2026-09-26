"use client";

import { useRef } from "react";
import { Button, ConfirmDialog, type ConfirmDialogHandle } from "@/shared/ui";
import { useScenarioStore } from "./useScenarioStore";

/**
 * ヘッダーの「初期値に戻す」。入力と保存済み比較プランの全消去
 * （scenario ストアの reset）のため、plan ではなく scenario に置く。
 */
export function ResetAllAction() {
  const reset = useScenarioStore((s) => s.reset);
  // issue #15: 「初期値に戻す」は破壊的操作のため確認ダイアログを経由する
  const resetConfirmRef = useRef<ConfirmDialogHandle>(null);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => resetConfirmRef.current?.open()}
      >
        初期値に戻す
      </Button>

      <ConfirmDialog
        ref={resetConfirmRef}
        title="入力内容を初期値に戻しますか？"
        description="世帯構成・支出・資産・イベントなどすべての入力が初期値に戻ります。この操作は元に戻せません（保存済みプランは削除されません）。"
        confirmLabel="初期値に戻す"
        onConfirm={reset}
      />
    </>
  );
}
