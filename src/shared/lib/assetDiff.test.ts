import { describe, it, expect } from "vitest";
import { formatAssetDiff } from "./assetDiff";

describe("formatAssetDiff", () => {
  it("board #9: シナリオ最終資産 -¥73.7M・ベース比 -¥14.2M を差額と実額に分けて返す", () => {
    // シナリオ最終資産 -73,700,000円、ベースプラン最終資産 -59,452,593円（差 -14,247,407円）。
    const row = formatAssetDiff(-73_700_000, -73_700_000 + 14_247_407);
    expect(row.diffText).toBe("¥-14,247,407");
    expect(row.direction).toBe("悪化");
    expect(row.actualText).toBe("¥-73,700,000");
    // 差額と実額が別物であることを固定（board #9 の誤読ポイント）。
    expect(row.diffText).not.toBe(row.actualText);
  });

  it("プラス差額（ベースより良い）は + を前置し、向きは改善", () => {
    const row = formatAssetDiff(1_200_000, 1_000_000);
    expect(row.diffText).toBe("+¥200,000");
    expect(row.direction).toBe("改善");
  });

  it("マイナス差額（ベースより悪い）は formatYen の符号のまま、向きは悪化", () => {
    const row = formatAssetDiff(800_000, 1_000_000);
    expect(row.diffText).toBe("¥-200,000");
    expect(row.direction).toBe("悪化");
  });

  it("差額ゼロは符号なし・向きは同額", () => {
    const row = formatAssetDiff(1_000_000, 1_000_000);
    expect(row.diffText).toBe("¥0");
    expect(row.direction).toBe("同額");
  });

  it("極端に大きい差額でも崩れない", () => {
    const row = formatAssetDiff(9_999_999_999, 0);
    expect(row.diffText).toBe("+¥9,999,999,999");
    expect(row.direction).toBe("改善");
  });

  it("極端に小さい（絶対値の大きいマイナス）差額でも崩れない", () => {
    const row = formatAssetDiff(-9_999_999_999, 0);
    expect(row.diffText).toBe("¥-9,999,999,999");
    expect(row.direction).toBe("悪化");
  });
});
