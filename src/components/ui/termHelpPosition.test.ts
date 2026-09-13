import { describe, it, expect } from "vitest";
import {
  computePanelPosition,
  PANEL_MAX_WIDTH,
  VIEWPORT_GUTTER,
  PANEL_OFFSET,
} from "./termHelpPosition";

/**
 * issue #22 最終レビュー I-1: スマホ幅でポップオーバーが右にはみ出す問題の
 * 位置計算（ビューポート左右 16px ガター内に収める）の境界テスト。
 */
describe("computePanelPosition", () => {
  it("左寄りボタンではそのままの左位置になる", () => {
    const result = computePanelPosition({
      buttonLeft: 50,
      buttonBottom: 100,
      viewportWidth: 400,
    });
    expect(result.width).toBe(PANEL_MAX_WIDTH);
    expect(result.left).toBe(50);
    expect(result.top).toBe(100 + PANEL_OFFSET);
  });

  it("右寄りボタンでは右端がガター内に収まるよう左へ補正される（400px幅、buttonLeft=300）", () => {
    const result = computePanelPosition({
      buttonLeft: 300,
      buttonBottom: 20,
      viewportWidth: 400,
    });
    expect(result.width).toBe(PANEL_MAX_WIDTH);
    expect(result.left).toBe(400 - VIEWPORT_GUTTER - PANEL_MAX_WIDTH);
    expect(result.left).toBe(128);
  });

  it("狭いビューポート（200px）ではパネル幅がガター内に収まるよう縮む", () => {
    const result = computePanelPosition({
      buttonLeft: 100,
      buttonBottom: 0,
      viewportWidth: 200,
    });
    expect(result.width).toBe(200 - VIEWPORT_GUTTER * 2);
    expect(result.width).toBe(168);
    // 幅が縮んだ分、右端に置ける最大 left もガター内に収まる。
    expect(result.left).toBe(200 - VIEWPORT_GUTTER - result.width);
    expect(result.left).toBe(16);
  });

  it("極小ビューポート（20px）では幅が負にならず0になり、leftは最低ガター幅を保つ", () => {
    const result = computePanelPosition({
      buttonLeft: 5,
      buttonBottom: 0,
      viewportWidth: 20,
    });
    expect(result.width).toBe(0);
    expect(result.left).toBe(VIEWPORT_GUTTER);
    expect(Number.isNaN(result.width)).toBe(false);
    expect(Number.isNaN(result.left)).toBe(false);
  });
});
