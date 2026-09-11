"use client";

import { forwardRef, useId, useImperativeHandle, useRef } from "react";
import { Button } from "./Button";

export type ConfirmDialogHandle = {
  open: () => void;
  close: () => void;
};

/**
 * 破壊的操作（削除）の確認ダイアログ（lp-ui-ux-audit-fix / FR4.1）。
 * `GameResult.tsx` の `<dialog>` による確認パターンを共通化したもの。
 * `open()` を呼ぶまで DOM 上は非表示（native <dialog> の showModal/close）で、
 * 「閉じる」側にだけ autoFocus を当てて誤操作を防ぐ。
 */
export const ConfirmDialog = forwardRef<
  ConfirmDialogHandle,
  {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  }
>(function ConfirmDialog(
  { title, description, confirmLabel = "削除する", cancelLabel = "閉じる", onConfirm },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.showModal(),
    close: () => dialogRef.current?.close(),
  }));

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="rounded-2xl border border-line bg-surface p-5 text-ink shadow-panel backdrop:bg-ink/30"
    >
      <h2 id={titleId} className="text-[15px] font-bold text-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-ink-soft">
        {description}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        {/* 確認ボタンには初期フォーカスを当てない（autofocus は「閉じる」側） */}
        <Button autoFocus onClick={() => dialogRef.current?.close()}>
          {cancelLabel}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            dialogRef.current?.close();
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
});
