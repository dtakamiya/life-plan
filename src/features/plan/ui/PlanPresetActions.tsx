"use client";

import { useRef } from "react";
import { Button, ConfirmDialog, type ConfirmDialogHandle } from "@/shared/ui";
import { usePlanStore } from "./usePlanStore";

/**
 * ヘッダーに置く、入力の作り直し用のプリセット操作。
 * どちらも入力を消す破壊的操作のため、確認ダイアログを経由する。
 * 閉じた <dialog> は表示されないため、呼び出し側の flex 行にボタンだけが並ぶ。
 */
export function PlanPresetActions() {
  const startBlank = usePlanStore((s) => s.startBlank);
  const resetSingle = usePlanStore((s) => s.resetSingle);

  // lp-030: 「まっさらから入力」も生活費・ローン・イベントを消去する破壊的
  // 操作のため、同様に確認ダイアログを経由する
  const blankConfirmRef = useRef<ConfirmDialogHandle>(null);
  // 低収入ペルソナレビュー #8: 単身・賃貸にするための削除操作を1回で済ませる
  const singleConfirmRef = useRef<ConfirmDialogHandle>(null);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => blankConfirmRef.current?.open()}
      >
        まっさらから入力
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => singleConfirmRef.current?.open()}
      >
        単身・賃貸で始める
      </Button>

      <ConfirmDialog
        ref={singleConfirmRef}
        title="単身・賃貸の例で始めますか？"
        description="配偶者・子・住宅ローン・住宅購入イベントのない単身世帯の例に置き換わります。年収・生活費・資産は目安の値になるので、ご自身の数字に書き換えてください。この操作は元に戻せません（保存済みプランは削除されません）。"
        confirmLabel="単身・賃貸で始める"
        onConfirm={resetSingle}
      />

      <ConfirmDialog
        ref={blankConfirmRef}
        title="生活費・ローン・イベントをまっさらにしますか？"
        description="基礎生活費・住宅ローンなどの借入・単発イベントがすべて0/空になります。本人・配偶者・子・資産の入力はそのまま残ります。この操作は元に戻せません。"
        confirmLabel="まっさらにする"
        onConfirm={startBlank}
      />
    </>
  );
}
