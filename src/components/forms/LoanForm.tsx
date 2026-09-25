"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { annualLoanPayment } from "@/features/plan/domain";
import { formatYen } from "@/shared/lib";
import { Button, CheckboxField, ConfirmDialog, NumberField, PercentField, Section, TermHelp, TextField, type ConfirmDialogHandle } from "@/shared/ui";
import { usePlanErrors } from "./usePlanErrors";

export function LoanForm() {
  const loans = usePlanStore((s) => s.input.loans);
  const addLoan = usePlanStore((s) => s.addLoan);
  const updateLoan = usePlanStore((s) => s.updateLoan);
  const removeLoan = usePlanStore((s) => s.removeLoan);
  const errors = usePlanErrors();

  // lp-ui-ux-audit-fix / FR4.1: 削除は確認ダイアログを経由する
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  return (
    <Section
      title="ローン・借入"
      action={
        <Button variant="primary" size="sm" onClick={addLoan}>
          ＋追加
        </Button>
      }
    >
      {/* 子育て共働きペルソナレビュー #5: 持ち家の維持費の入力先を案内する */}
      <p className="mb-2 text-[11px] text-ink-mute">
        固定資産税・修繕費は「継続支出」に期間指定で入力
      </p>
      {loans.length === 0 ? (
        <p className="text-xs text-ink-mute">ローンなし</p>
      ) : (
        <div className="space-y-3">
          {loans.map((loan, index) => (
            <div
              key={loan.id}
              className="rounded-xl border border-line bg-paper/40 p-3"
            >
              <div className="mb-2 flex items-end justify-between gap-2">
                <div className="flex-1">
                  <TextField
                    label="名称"
                    value={loan.label}
                    onChange={(label) => updateLoan(loan.id, { label })}
                  />
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setPendingDeleteId(loan.id);
                    confirmRef.current?.open();
                  }}
                  className="mb-px"
                >
                  削除
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <NumberField
                  label="返済開始年"
                  error={errors[`loans.${index}.startYear`]}
                  value={loan.startYear}
                  onChange={(startYear) => updateLoan(loan.id, { startYear })}
                />
                <NumberField
                  label="返済期間"
                  suffix="年"
                  hint="1〜50年で入力してください"
                  error={errors[`loans.${index}.termYears`]}
                  value={loan.termYears}
                  onChange={(termYears) => updateLoan(loan.id, { termYears })}
                />
                <NumberField
                  label="借入額"
                  suffix="円"
                  grouped
                  step={1_000_000}
                  // 入力済みの行にまで注意が残らないよう、0 円のときだけ出す
                  hint={
                    loan.principal === 0
                      ? "0 円のうちは返済額に寄与しません"
                      : undefined
                  }
                  error={errors[`loans.${index}.principal`]}
                  value={loan.principal}
                  onChange={(principal) => updateLoan(loan.id, { principal })}
                />
                <PercentField
                  label="金利"
                  error={errors[`loans.${index}.annualRate`]}
                  value={loan.annualRate}
                  onChange={(annualRate) => updateLoan(loan.id, { annualRate })}
                />
              </div>
              <div className="mt-2">
                {/* 子育て共働きペルソナレビュー #4 */}
                <CheckboxField
                  label="住宅ローン控除を受ける"
                  hint="年末残高の0.7%を13年間、本人の税から差し引きます（概算）"
                  checked={loan.taxCredit === true}
                  onChange={(taxCredit) => updateLoan(loan.id, { taxCredit })}
                />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-mute">
                <span className="h-1 w-1 rounded-full bg-gold/70" aria-hidden />
                年間返済額の目安:{" "}
                <span className="font-medium tabular-nums text-ink-soft">
                  {formatYen(annualLoanPayment(loan))}
                </span>
                （元利均等）
                <TermHelp term="levelPayment" />
              </p>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        ref={confirmRef}
        title="このローンを削除しますか？"
        description="削除すると元に戻せません。"
        onConfirm={() => {
          if (pendingDeleteId) removeLoan(pendingDeleteId);
        }}
      />
    </Section>
  );
}
