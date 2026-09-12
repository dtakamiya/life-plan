"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { NumberField, Section, TextField } from "./fields";

/**
 * issue #18: 家賃など「一定期間だけ続く支出」を 1 件で登録するフォーム。
 *
 * 期間の整合（終了年 >= 開始年）は例外を投げず、`error` 文言を該当フィールドへ
 * 渡すだけにとどめる。不正な期間はエンジン側で 0 件扱いになる
 * （`recurringExpenseForYear` の仕様）。
 */
export function RecurringExpenseForm() {
  const items = usePlanStore((s) => s.input.recurringExpenses);
  const addRecurringExpense = usePlanStore((s) => s.addRecurringExpense);
  const updateRecurringExpense = usePlanStore((s) => s.updateRecurringExpense);
  const removeRecurringExpense = usePlanStore((s) => s.removeRecurringExpense);

  // 削除は確認ダイアログを経由する（lp-ui-ux-audit-fix / FR4.1 と同じ形）
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  return (
    <Section
      title="継続支出（期間指定）"
      action={
        <Button variant="primary" size="sm" onClick={addRecurringExpense}>
          ＋追加
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className="text-xs text-ink-mute">
          継続支出なし（例: 住宅購入までの賃貸家賃）
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const rangeError =
              item.endYear < item.startYear
                ? "終了年は開始年以降にしてください"
                : undefined;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-line bg-paper/40 p-3"
              >
                <div className="mb-2 flex items-end justify-between gap-2">
                  <div className="flex-1">
                    <TextField
                      label="名称"
                      value={item.label}
                      onChange={(label) =>
                        updateRecurringExpense(item.id, { label })
                      }
                    />
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setPendingDeleteId(item.id);
                      confirmRef.current?.open();
                    }}
                    className="mb-px"
                  >
                    削除
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <NumberField
                    label="開始年"
                    value={item.startYear}
                    onChange={(startYear) =>
                      updateRecurringExpense(item.id, { startYear })
                    }
                  />
                  <NumberField
                    label="終了年"
                    hint="この年まで計上します"
                    error={rangeError}
                    value={item.endYear}
                    onChange={(endYear) =>
                      updateRecurringExpense(item.id, { endYear })
                    }
                  />
                </div>
                <div className="mt-2">
                  <NumberField
                    label="年額"
                    suffix="円"
                    grouped
                    step={100_000}
                    hint="0 円のうちは収支に寄与しません"
                    value={item.annualAmount}
                    onChange={(annualAmount) =>
                      updateRecurringExpense(item.id, { annualAmount })
                    }
                  />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-mute">
                  <span className="h-1 w-1 rounded-full bg-gold/70" aria-hidden />
                  物価上昇率による調整はしません（名目固定）
                </p>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        ref={confirmRef}
        title="この継続支出を削除しますか？"
        description="削除すると元に戻せません。"
        onConfirm={() => {
          if (pendingDeleteId) removeRecurringExpense(pendingDeleteId);
        }}
      />
    </Section>
  );
}
