/**
 * 子を追加するときの既定名ファクトリ。
 *
 * lp-021 / issue #21: 既定名が常に「子」だったため、2人以上追加すると
 * フォーム上で名前欄が重複し、どのカードがどの子か判別できなかった。
 * ここでは既存の子の名前のうち「子N」形式のものを走査し、未使用の最小の N を
 * 採って「子N」を返す。途中の子を削除してから追加しても番号が重複しない。
 *
 * ユーザーが自分で付けた名前（「太郎」など）や、番号なしの「子」、前置ゼロ付きの
 * 「子01」のような表記は「子N」形式とみなさないため、番号を消費しない。
 */

/** 「子N」形式の名前から番号を取り出すためのパターン（前置ゼロは対象外）。 */
const NUMBERED_NAME = /^子([1-9]\d*)$/;

export function nextChildName(children: readonly { name: string }[]): string {
  const used = new Set(
    children
      .map((c) => NUMBERED_NAME.exec(c.name))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Number(m[1])),
  );
  let n = 1;
  while (used.has(n)) n += 1;
  return `子${n}`;
}
