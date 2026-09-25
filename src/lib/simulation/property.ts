/**
 * 不動産の評価額（子育て共働きペルソナレビュー #2）。
 *
 * 購入年は購入価格、その後は毎年 annualDepreciationRate で減価する。
 * 建物は古くなっても土地の価値は残るため、購入価格の一定割合を下限とする。
 * 相場の変動や売却は扱わない。
 */

import type { Property } from "./types";

/** 評価額の下限（購入価格に対する割合）。土地分の目安。 */
export const PROPERTY_VALUE_FLOOR_RATIO = 0.3;

/** 既定の年間減価率。 */
export const DEFAULT_PROPERTY_DEPRECIATION_RATE = 0.015;

/** 指定年の年末における不動産の評価額の合計（円）。 */
export function propertyValueForYear(properties: Property[], year: number): number {
  return properties.reduce((sum, p) => {
    if (year < p.purchaseYear) return sum;
    const depreciated = p.price * Math.pow(1 - p.annualDepreciationRate, year - p.purchaseYear);
    return sum + Math.max(depreciated, p.price * PROPERTY_VALUE_FLOOR_RATIO);
  }, 0);
}
