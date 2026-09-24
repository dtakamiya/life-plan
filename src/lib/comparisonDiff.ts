/**
 * 比較画面の差分数値表（lp-035）用の純関数。
 *
 * 最終資産・枯渇年の判定は lp-003 の `summarizeResults`（summary.ts）を再利用し、
 * ここでは「基準（現在のプラン）との差」の組み立てだけを行う（判定ロジックの重複実装禁止）。
 * 差はすべて「比較対象 − 基準」。プラスは基準より良い（資産が多い／枯渇が遅い）。
 */

import { formatAssetDiff } from "@/lib/game/assetDiff";
import { formatYen } from "@/lib/format";
import { summarizeResults } from "@/lib/simulation/summary";
import type { YearlyResult } from "@/lib/simulation/types";

export type ComparisonInput = {
  key: string;
  name: string;
  /** 不正入力などで算出できないときは空配列 */
  results: YearlyResult[];
};

export type DiffDirection = "改善" | "悪化" | "同じ";

export type ComparisonDiffRow = {
  key: string;
  name: string;
  /** 結果が空（算出不可）のとき false。他の値は空文字 */
  available: boolean;
  /** 最終資産の実額 */
  finalAssetsText: string;
  /** 枯渇年（年齢）。枯渇なしは「なし」 */
  depletionText: string;
  /** 基準行なら null。最終資産の差額（符号付き） */
  assetDiffText: string | null;
  assetDirection: DiffDirection | null;
  /** 基準行なら null。枯渇年の差（符号付き年数、または片方のみ枯渇の文言） */
  depletionDiffText: string | null;
  depletionDirection: DiffDirection | null;
};

const UNAVAILABLE: Omit<ComparisonDiffRow, "key" | "name"> = {
  available: false,
  finalAssetsText: "",
  depletionText: "",
  assetDiffText: null,
  assetDirection: null,
  depletionDiffText: null,
  depletionDirection: null,
};

/** 枯渇年（年齢）の表示。枯渇なしは「なし」。 */
export function describeDepletion(depleted: YearlyResult | null): string {
  return depleted ? `${depleted.year}年（${depleted.selfAge}歳）` : "なし";
}

function toDirection(d: "悪化" | "改善" | "同額"): DiffDirection {
  return d === "同額" ? "同じ" : d;
}

/**
 * 枯渇年の差（比較対象 − 基準）。
 * - 両方なし: 差なし（同じ）
 * - 両方あり: 枯渇年の差（年）。プラス＝枯渇が遅い＝改善
 * - 片方のみ: 年数の差は定義できないため文言で示す（枯渇なしの側が改善）
 */
export function diffDepletion(
  base: YearlyResult | null,
  target: YearlyResult | null,
): { text: string; direction: DiffDirection } {
  if (base === null && target === null) return { text: "差なし（どちらも枯渇なし）", direction: "同じ" };
  if (base !== null && target === null) return { text: "枯渇を回避（基準は枯渇あり）", direction: "改善" };
  if (base === null && target !== null) return { text: "枯渇あり（基準は枯渇なし）", direction: "悪化" };
  const years = target!.year - base!.year;
  if (years === 0) return { text: "±0年", direction: "同じ" };
  return years > 0
    ? { text: `+${years}年（枯渇が遅い）`, direction: "改善" }
    : { text: `−${Math.abs(years)}年（枯渇が早い）`, direction: "悪化" };
}

/**
 * 先頭要素を基準として、各比較対象の最終資産・枯渇年と基準との差を返す。
 * 基準が算出不可のときは、差はすべて null（比較できない）。
 */
export function buildComparisonDiff(inputs: ComparisonInput[]): ComparisonDiffRow[] {
  const summaries = inputs.map((i) => summarizeResults(i.results));
  const base = summaries[0] ?? null;

  return inputs.map((input, idx) => {
    const s = summaries[idx];
    if (!s) return { key: input.key, name: input.name, ...UNAVAILABLE };

    const row: ComparisonDiffRow = {
      key: input.key,
      name: input.name,
      available: true,
      finalAssetsText: formatYen(s.last.assets),
      depletionText: describeDepletion(s.depleted),
      assetDiffText: null,
      assetDirection: null,
      depletionDiffText: null,
      depletionDirection: null,
    };
    if (idx === 0 || !base) return row;

    const asset = formatAssetDiff(s.last.assets, base.last.assets);
    const dep = diffDepletion(base.depleted, s.depleted);
    return {
      ...row,
      assetDiffText: asset.diffText,
      assetDirection: toDirection(asset.direction),
      depletionDiffText: dep.text,
      depletionDirection: dep.direction,
    };
  });
}
