/** チャート共通のテーマ（配色・軸・ツールチップ）。各チャートで再利用する。 */

export const chartColors = {
  grid: "#ece5d9",
  axis: "#8493a5",
  brand: "#0f766e",
  gold: "#a9712a",
  ink: "#17283b",
  income: "#0f766e",
  expense: "#b3322c",
  net: "#17283b",
  zeroLine: "#c7b9a3",
};

/** 比較チャートの上品なカテゴリ配色（先頭=現在の青緑）。 */
export const seriesPalette = [
  "#0f766e",
  "#a9712a",
  "#8a3d52",
  "#3b5b7a",
  "#6b7d52",
  "#b3624a",
];

export const axisTick = { fontSize: 12, fill: chartColors.axis } as const;

export const tooltipStyle = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #e7e0d6",
    borderRadius: 12,
    boxShadow: "0 10px 30px -16px rgba(23,40,59,0.35)",
    fontSize: 12,
    padding: "8px 12px",
  },
  labelStyle: { color: "#17283b", fontWeight: 700, marginBottom: 4 },
  itemStyle: { color: "#45566b", padding: "1px 0" },
} as const;

export const legendStyle = { fontSize: 12, color: "#45566b" } as const;
