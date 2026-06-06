"use client";

import { usePlanStore } from "@/lib/store/usePlanStore";
import { annualLoanPayment } from "@/lib/simulation/loan";
import { formatYen } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { NumberField, PercentField, Section, TextField } from "./fields";

export function LoanForm() {
  const loans = usePlanStore((s) => s.input.loans);
  const addLoan = usePlanStore((s) => s.addLoan);
  const updateLoan = usePlanStore((s) => s.updateLoan);
  const removeLoan = usePlanStore((s) => s.removeLoan);

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
                  onClick={() => removeLoan(loan.id)}
                  className="mb-px"
                >
                  削除
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="返済開始年"
                  value={loan.startYear}
                  onChange={(startYear) => updateLoan(loan.id, { startYear })}
                />
                <NumberField
                  label="返済期間"
                  suffix="年"
                  value={loan.termYears}
                  onChange={(termYears) => updateLoan(loan.id, { termYears })}
                />
                <NumberField
                  label="借入額"
                  suffix="円"
                  step={1_000_000}
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
    </Section>
  );
}
