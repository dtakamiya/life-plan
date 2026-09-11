"use client";

import { usePlanStore } from "@/lib/store/usePlanStore";
import { NumberField, PercentField, Section } from "./fields";

export function ExpenseForm() {
  const expenses = usePlanStore((s) => s.input.expenses);
  const updateExpenses = usePlanStore((s) => s.updateExpenses);

  return (
    <Section title="支出">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField
          label="基礎生活費（年額）"
          suffix="円"
          step={100_000}
          value={expenses.baseAnnualLivingExpense}
          onChange={(baseAnnualLivingExpense) =>
            updateExpenses({ baseAnnualLivingExpense })
          }
        />
        <PercentField
          label="物価上昇率"
          signed
          value={expenses.inflationRate}
          onChange={(inflationRate) => updateExpenses({ inflationRate })}
        />
      </div>
    </Section>
  );
}
