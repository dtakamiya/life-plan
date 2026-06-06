"use client";

import { usePlanStore } from "@/lib/store/usePlanStore";
import { annualLoanPayment } from "@/lib/simulation/loan";
import { formatYen } from "@/lib/format";
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
        <button
          type="button"
          onClick={addLoan}
          className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          ＋追加
        </button>
      }
    >
      {loans.length === 0 ? (
        <p className="text-xs text-slate-400">ローンなし</p>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className="rounded-lg border border-slate-200 p-2"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex-1 pr-2">
                  <TextField
                    label="名称"
                    value={loan.label}
                    onChange={(label) => updateLoan(loan.id, { label })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLoan(loan.id)}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                >
                  削除
                </button>
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
              <p className="mt-1.5 text-[10px] text-slate-400">
                年間返済額の目安: {formatYen(annualLoanPayment(loan))}（元利均等）
              </p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
