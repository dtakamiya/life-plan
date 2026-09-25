/**
 * TermHelp のパネル位置計算（issue #22 最終レビュー I-1）。
 *
 * スマホ幅で「?」ボタンが右寄りにあるとパネルがビューポート右端から
 * はみ出し、ページが横スクロールしてしまう問題への対応。パネルを
 * `position: fixed` にして、ビューポート左右 VIEWPORT_GUTTER のガター内に
 * 収まるよう left / width を補正する純関数。
 */

/** パネルの最大幅（px）。 */
export const PANEL_MAX_WIDTH = 256;
/** ビューポート左右に確保するガター幅（px）。 */
export const VIEWPORT_GUTTER = 16;
/** ボタン下端からパネル上端までの間隔（px）。 */
export const PANEL_OFFSET = 4;

export function computePanelPosition(args: {
  buttonLeft: number;
  buttonBottom: number;
  viewportWidth: number;
}): { top: number; left: number; width: number } {
  const { buttonLeft, buttonBottom, viewportWidth } = args;

  // 左右ガターを確保した上でのパネル幅。ビューポートが極端に狭い場合に
  // 負の幅にならないよう 0 で下限を切る。
  const width = Math.max(
    0,
    Math.min(PANEL_MAX_WIDTH, viewportWidth - VIEWPORT_GUTTER * 2),
  );
  // パネル右端がガターより内側に収まる left の最大値。
  const maxLeft = viewportWidth - VIEWPORT_GUTTER - width;
  // ボタン位置を基準にしつつ、左右ガター内に収まるようクランプする。
  // ビューポートが極小で maxLeft がガター未満になっても left はガターを保つ。
  const left = Math.max(VIEWPORT_GUTTER, Math.min(buttonLeft, maxLeft));
  const top = buttonBottom + PANEL_OFFSET;

  return { top, left, width };
}
