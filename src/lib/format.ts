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

/** 率（小数）をパーセント文字列にする（例: 0.03 → "3%"） */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
