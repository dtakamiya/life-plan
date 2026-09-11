import { describe, expect, it } from "vitest";
import config from "../../tailwind.config";

/**
 * lp-ui-ux-audit-fix / FR1.1・NFR1 の回帰固定。
 * `ink.mute` は背景色（paper / surface）に対し WCAG AA（4.5:1 以上）を
 * 満たすこと。tailwind.config.ts の値そのものを検証する。
 */

function relativeLuminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

describe("ink.mute のコントラスト（FR1.1 / NFR1）", () => {
  const colors = config.theme!.extend!.colors as Record<
    string,
    string | Record<string, string>
  >;
  const inkMute = (colors.ink as Record<string, string>).mute;
  const paper = colors.paper as unknown as { DEFAULT: string };
  const surface = colors.surface as unknown as string;

  it("paper 背景に対して 4.5:1 以上を満たす", () => {
    expect(contrastRatio(inkMute, paper.DEFAULT)).toBeGreaterThanOrEqual(4.5);
  });

  it("surface 背景に対して 4.5:1 以上を満たす", () => {
    expect(contrastRatio(inkMute, surface)).toBeGreaterThanOrEqual(4.5);
  });
});
