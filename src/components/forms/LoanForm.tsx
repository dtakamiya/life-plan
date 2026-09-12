"use client";

import { useRef, useState } from "react";
import { usePlanStore } from "@/lib/store/usePlanStore";
import { annualLoanPayment } from "@/lib/simulation/loan";
import { formatYen } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { NumberField, PercentField, Section, TextField } from "./fields";

export function LoanForm() {
  const loans = usePlanStore((s) => s.input.loans);
  const addLoan = usePlanStore((s) => s.addLoan);
  const updateLoan = usePlanStore((s) => s.updateLoan);
  const removeLoan = usePlanStore((s) => s.removeLoan);

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
      {loans.length === 0 ? (
        <p className="text-xs text-ink-mute">ローンなし</p>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => (
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
              {/*
                新規追加直後のローン行は借入額・金利・返済期間がすべて 0 で、
                返済には寄与しない（ユーザーが値を入力するまで）。返済期間が 0 の
                間はシミュレーションの年次系列に負債が混入しない。
              */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <NumberField
                  label="返済開始年"
                  value={loan.startYear}
                  onChange={(startYear) => updateLoan(loan.id, { startYear })}
                />
                <NumberField
                  label="返済期間"
                  suffix="年"
                  hint="未入力（0）の間は返済に計上されません"
                  value={loan.termYears}
                  onChange={(termYears) => updateLoan(loan.id, { termYears })}
                />
                <NumberField
                  label="借入額"
                  suffix="円"
                  grouped
                  step={1_000_000}
                  hint="0 円のうちは返済額に寄与しません"
                  value={loan.principal}
                  onChange={(principal) => updateLoan(loan.id, { principal })}
                />
                <PercentField
                  label="金利"
                  value={loan.annualRate}
                  onChange={(annualRate) => updateLoan(loan.id, { annualRate })}
                />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-mute">
                <span className="h-1 w-1 rounded-full bg-gold/70" aria-hidden />
                年間返済額の目安:{" "}
                <span className="font-medium tabular-nums text-ink-soft">
                  {formatYen(annualLoanPayment(loan))}
                </span>
                （元利均等）
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
