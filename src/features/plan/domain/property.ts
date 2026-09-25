/**
 * 不動産の評価額（子育て共働きペルソナレビュー #2）。
 *
 * 購入年は購入価格、その後は毎年 annualDepreciationRate で減価する。
 * 建物は古くなっても土地の価値は残るため、購入価格の一定割合を下限とする。
 * 相場の変動や売却は扱わない。
 */

/**
 * 住宅などの不動産（子育て共働きペルソナレビュー #2）。
 * 購入年以降、評価額を純資産に加える。評価額は毎年一定率で減価し、
 * 土地分を考えて購入価格の一定割合を下限とする。
 */
export type Property = {
  id: string;
  label: string;
  /** 購入年（西暦） */
  purchaseYear: number;
  /** 購入価格（円） */
  price: number;
  /** 年間の減価率（小数） */
  annualDepreciationRate: number;
};

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
