/**
 * 結果画面の「計算の前提」パネル用に、シミュレーションで実際に使われた
 * 前提値を表示用の行へ組み立てる純関数。
 *
 * ここでは計算を一切行わない。エンジンの公開定数と PlanInput の値を
 * 読んで文字列へ整形するだけ（表示は結果に影響しない）。
 */

import type { PlanInput } from "@/lib/simulation/types";
import { formatPercent, formatYen } from "@/lib/format";
import {
  CAPITAL_GAINS_RATE,
  INCOME_TAX_BRACKETS,
  RESIDENCE_TAX_RATE,
  BASIC_DEDUCTION,
} from "@/lib/simulation/tax";
import {
  SOCIAL_INSURANCE_RATE,
  SOCIAL_INSURANCE_INCOME_CAP,
} from "@/lib/simulation/socialInsurance";
import {
  BASIC_PENSION_ANNUAL,
  EARNINGS_RELATED_FACTOR,
  EARNINGS_RELATED_CAP,
} from "@/lib/simulation/pension";

/** 「計算の前提」パネルに表示する1行。 */
export type AssumptionRow = {
  /** 項目名 */
  label: string;
  /** 実際に使われた値の表示文字列 */
  value: string;
  /** 出典または概算である旨の注記 */
  note: string;
};

/** 所得税ブラケットを「5%〜45%（7区分）」のような要約文字列にする。 */
function summarizeBrackets(): string {
  const rates = INCOME_TAX_BRACKETS.map((b) => formatPercent(b.rate));
  const first = rates[0];
  const last = rates[rates.length - 1];
  return `${first}〜${last}（${INCOME_TAX_BRACKETS.length}区分の簡易累進）`;
}

/**
 * シミュレーションで実際に使われた前提値の一覧を返す。
 * @param input 現在の計画入力（エンジンに渡しているものと同じ）
 */
export function buildAssumptionRows(input: PlanInput): AssumptionRow[] {
  const { expenses, assets } = input;

  return [
    {
      label: "物価上昇率（インフレ）",
      value: formatPercent(expenses.inflationRate),
      note: "入力値。生活費を開始年から複利で調整するのに使用。",
    },
    {
      label: "資産運用の年間リターン",
      value: formatPercent(assets.annualReturnRate),
      note: "入力値。課税口座・非課税口座の両方に同率で適用。",
    },
    {
      label: "所得税の税率区分",
      value: summarizeBrackets(),
      note: "概算。課税所得へ簡易累進ブラケットを適用（tax.ts の INCOME_TAX_BRACKETS）。各種控除・復興特別所得税は簡略化。",
    },
    {
      label: "住民税率",
      value: formatPercent(RESIDENCE_TAX_RATE),
      note: "概算。課税所得に一律で適用（tax.ts の RESIDENCE_TAX_RATE）。",
    },
    {
      label: "基礎控除",
      value: formatYen(BASIC_DEDUCTION),
      note: "概算。課税所得の算定で給与所得控除・社会保険料控除と合わせて差し引く（tax.ts）。給与所得控除は別途『年収×20%＋44万円、上限195万円』で近似。",
    },
    {
      label: "運用益への課税率",
      value: formatPercent(CAPITAL_GAINS_RATE),
      note: "概算。課税口座の運用益のみに課税（所得税15.315%＋住民税5%、tax.ts の CAPITAL_GAINS_RATE）。非課税口座（NISA/iDeCo 等）には課さない。",
    },
    {
      label: "社会保険料率",
      value: formatPercent(SOCIAL_INSURANCE_RATE),
      note: `概算。給与の税込年収に適用（対象年収の上限 ${formatYen(
        SOCIAL_INSURANCE_INCOME_CAP,
      )}、socialInsurance.ts の SOCIAL_INSURANCE_RATE）。年金収入には掛けない。`,
    },
    {
      label: "年金の概算方式",
      value: `基礎年金 ${formatYen(BASIC_PENSION_ANNUAL)}（定額）＋ 現役年収 × ${formatPercent(
        EARNINGS_RELATED_FACTOR,
      )}（上限 ${formatYen(EARNINGS_RELATED_CAP)}）`,
      note: "概算（pension.ts の estimateAnnualPension）。フォーム初期値の算定に使用。入力欄で年額を上書きした場合はその値が優先される。",
    },
  ];
}
