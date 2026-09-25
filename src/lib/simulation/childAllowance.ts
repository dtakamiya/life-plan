/**
 * 児童手当の概算（子育て共働きペルソナレビュー #4）。
 *
 * 2024年10月の制度改正後の支給額に基づく（所得制限なし）。
 * - 0〜2歳: 月1.5万円
 * - 3歳〜高校生年代（年齢は「その年 − 生年」で数え、17歳まで）: 月1万円
 * - 第3子以降: 月3万円
 * 第何子かは、22歳まで（大学生年代）の子を生年順に数える。
 * 年度（4月始まり）と誕生月は考慮せず、年単位で近似する。
 */

import type { Child } from "./types";

/** 0〜2歳の月額（円）。 */
export const ALLOWANCE_UNDER_3 = 15_000;
/** 3歳〜高校生年代の月額（円）。 */
export const ALLOWANCE_3_TO_HIGH_SCHOOL = 10_000;
/** 第3子以降の月額（円）。 */
export const ALLOWANCE_THIRD_CHILD = 30_000;
/** 支給対象の最終年齢（高校生年代）。 */
const MAX_ELIGIBLE_AGE = 17;
/** 多子の数え方に含める最終年齢（大学生年代）。 */
const MAX_COUNTED_AGE = 22;

/** 指定年に受け取る児童手当の合計（年額、円）。 */
export function childAllowanceForYear(children: Child[], year: number): number {
  const counted = children
    .map((child, index) => ({ age: year - child.birthYear, index, birthYear: child.birthYear }))
    .filter((c) => c.age >= 0 && c.age <= MAX_COUNTED_AGE)
    .sort((a, b) => a.birthYear - b.birthYear || a.index - b.index);

  return counted.reduce((sum, c, rank) => {
    if (c.age > MAX_ELIGIBLE_AGE) return sum;
    const monthly =
      rank >= 2
        ? ALLOWANCE_THIRD_CHILD
        : c.age <= 2
          ? ALLOWANCE_UNDER_3
          : ALLOWANCE_3_TO_HIGH_SCHOOL;
    return sum + monthly * 12;
  }, 0);
}
