/**
 * 数値入力欄（NumberField）の「入力文字列 → number」正規化ヘルパ。
 *
 * 方針（lp-012 / QA#1）:
 * - 入力中は空文字（未入力）を許容し、0 を自動補填しない。空のまま確定（blur）
 *   したときにだけ既定値（多くは 0）へ寄せる。必須項目のエラー表示は zod 層
 *   （lp-005）の責務で、ここでは扱わない。
 * - 符号可否はフィールド定義に従う。`signed: true` のフィールドでだけ先頭の
 *   `-` を符号として保持し、以降の桁入力でも符号を落とさない。`signed: false`
 *   のフィールドでは `-` を無視する（打っても値に反映しない）。
 * - 全角数字・カンマ区切り・前後空白は number へ正規化する（既存挙動を壊さない）。
 * - 語中に紛れ込んだ `-` や 2 個目以降の小数点などの区切り文字は捨て、
 *   残った数字を連結する（例: "12-3" → 123、"1.5.2" → 1.52）。
 * - zod スキーマ（lp-005）とは層が別。ここは純粋に「入力中の文字列ハンドリング」
 *   だけを担い、範囲・型の担保はしない。
 */

export type NumberInputOptions = {
  /** true のときだけ先頭 `-` を符号として許可する。 */
  signed: boolean;
};

export type NormalizeResult = {
  /** 正規化後の表示用文字列（そのまま input.value に入れられる）。 */
  text: string;
  /**
   * 数値として確定できるなら number。
   * 未確定（空 / `-` のみ / `.` のみ）のときは null。
   */
  value: number | null;
};

/** 全角英数・全角記号を ASCII へ寄せる。 */
function toHalfWidth(input: string): string {
  return input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．]/g, ".")
    // 全角マイナス・長音・全角ハイフン・マイナス記号を ASCII の `-` に寄せる
    .replace(/[－ー−―‐]/g, "-");
}

/**
 * 入力中の文字列を「そのまま input に表示してよい」形へ軽く整える。
 * キャレット位置を極力乱さないよう、正規化は最小限（不要文字の除去のみ）に留める。
 */
export function sanitizeNumberDraft(
  raw: string,
  { signed }: NumberInputOptions,
): string {
  let s = toHalfWidth(raw);
  // 数字・小数点・マイナス以外（カンマ・空白・英字など）は落とす
  s = s.replace(/[^0-9.\-]/g, "");
  // マイナスは signed のときだけ、かつ先頭の 1 個だけ有効
  const negative = signed && s.startsWith("-");
  s = s.replace(/-/g, "");
  // 小数点は最初の 1 個だけ有効。以降は捨てて数字を連結する
  const dot = s.indexOf(".");
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  }
  return (negative ? "-" : "") + s;
}

/**
 * 入力文字列を number へ正規化する純関数。
 * 未確定（空 / 符号のみ / 小数点のみ）のときは value=null を返す。
 */
export function normalizeNumberInput(
  raw: string,
  options: NumberInputOptions,
): NormalizeResult {
  const text = sanitizeNumberDraft(raw, options);
  if (text === "" || text === "-" || text === "." || text === "-.") {
    return { text: text === "" ? "" : text, value: null };
  }
  // `+ 0` で -0 を +0 に畳む（-0 がストアへ伝播しないように）
  const n = Number(text) + 0;
  return Number.isFinite(n) ? { text, value: n } : { text, value: null };
}
