/** 表示用の小さなフォーマッタ群。 */

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

/** 円表記（例: ¥1,234,567） */
export function formatYen(value: number): string {
  return yenFormatter.format(Math.round(value));
}

/** 万円単位の簡易表記（グラフ軸など、例: 1,234万） */
export function formatManYen(value: number): string {
  const man = Math.round(value / 10_000);
  return `${man.toLocaleString("ja-JP")}万`;
}

/**
 * 金額を万円単位で読み替えた補助表記（lp-022 / #16）。
 * 桁の読み間違い（300万円と3,000万円の混同）を防ぐための併記用。
 * 万円未満の端数があるときは概算であることを示す「約」を付ける（例: 約123万円）。
 */
export function formatManYenLabel(value: number): string {
  const man = value / 10_000;
  const prefix = Number.isInteger(man) ? "" : "約";
  return `${prefix}${Math.round(man).toLocaleString("ja-JP")}万円`;
}

/** 率（小数）をパーセント文字列にする（例: 0.03 → "3%"） */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
