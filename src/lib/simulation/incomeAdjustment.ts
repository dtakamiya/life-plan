/**
 * 期間付きの収入調整（子育て共働きペルソナレビュー #3）。
 * 育休・時短勤務など、一定期間だけ給与が下がる状況を表す。
 */

import type { IncomeAdjustment } from "@/features/plan/domain";

export type IncomeAdjustmentEffect = {
  /** 給与に掛ける割合 */
  ratio: number;
  /** 調整後の収入を非課税の給付として扱うか */
  nonTaxable: boolean;
};

/**
 * 指定年・対象者に掛かる収入調整。重なる調整は割合を掛け合わせ、
 * どれか1つでも非課税なら非課税とする。終了年が開始年より前の調整は無視する。
 */
export function incomeAdjustmentForYear(
  adjustments: IncomeAdjustment[],
  person: IncomeAdjustment["person"],
  year: number,
): IncomeAdjustmentEffect {
  return adjustments
    .filter((a) => a.person === person && a.startYear <= year && year <= a.endYear)
    .reduce<IncomeAdjustmentEffect>(
      (acc, a) => ({ ratio: acc.ratio * a.ratio, nonTaxable: acc.nonTaxable || a.nonTaxable }),
      { ratio: 1, nonTaxable: false },
    );
}
