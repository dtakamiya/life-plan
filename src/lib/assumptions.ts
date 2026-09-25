/**
 * 結果画面の「計算の前提」パネル用に、シミュレーションで実際に使われた
 * 前提値を表示用の行へ組み立てる純関数。
 *
 * ここでは計算を一切行わない。エンジンの公開定数と PlanInput の値を
 * 読んで文字列へ整形するだけ（表示は結果に影響しない）。
 */

import type { PlanInput } from "@/lib/simulation/types";
import { formatPercent, formatYen } from "@/lib/format";
import { DEFAULT_END_AGE, endYearToEndAge } from "@/lib/simulation/endAge";
import { HOUSEHOLD_DEFAULT_CONSTANTS } from "@/lib/simulation/householdDefaults";
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
  const endAge = endYearToEndAge(input.self.birthYear, input.endYear);

  const pensionStartAgeValue = input.spouse
    ? `本人 ${input.self.pensionStartAge}歳／配偶者 ${input.spouse.pensionStartAge}歳`
    : `本人 ${input.self.pensionStartAge}歳`;

  const incomeGrowthValue = input.spouse
    ? `本人 ${formatPercent(input.self.incomeGrowthRate)}／配偶者 ${formatPercent(input.spouse.incomeGrowthRate)}`
    : `本人 ${formatPercent(input.self.incomeGrowthRate)}`;

  return [
    {
      // lp-031: 終了年は西暦固定値ではなく「本人が◯歳になる年」で指定する。
      label: "試算の終了年齢",
      value: `${endAge}歳（${input.endYear}年）`,
      note: `既定は${DEFAULT_END_AGE}歳。厚生労働省の簡易生命表で男女とも9割近くが到達する年齢帯の上限に近く、長寿化を見込んだ資産寿命試算の目安として採用（変更可）。`,
    },
    {
      label: "物価上昇率（インフレ）",
      value: formatPercent(expenses.inflationRate),
      note: "入力値。生活費を開始年から複利で調整するのに使用。",
    },
    {
      label: "年収上昇率",
      value: incomeGrowthValue,
      note: "入力値。給与収入を開始年から複利で増やすのに使用（退職年齢で給与は停止）。",
    },
    {
      label: "資産運用の年間リターン",
      value: formatPercent(assets.annualReturnRate),
      note: "入力値。課税口座・非課税口座の両方に同率で適用。課税口座は預金を含む全額に掛かるため、運用せず預金で持つ分が多い場合は利回りを低め（預金なら0〜0.3%程度）にすると実態に近づく。資金不足（残高マイナス）の年は利回りを掛けない。",
    },
    {
      label: "配当・分配金の利回り",
      value: formatPercent(assets.annualDividendYield),
      note: "入力値。両口座に同率で適用し毎年現金で受取。課税口座分は運用益と同率で課税。",
    },
    {
      label: "所得税の税率区分",
      value: summarizeBrackets(),
      note: "概算。課税所得へ簡易累進ブラケットを適用（tax.ts の INCOME_TAX_BRACKETS）。各種控除・復興特別所得税は簡略化。",
    },
    {
      label: "住民税率",
      value: formatPercent(RESIDENCE_TAX_RATE),
      note: "概算。課税所得に一律で適用（tax.ts の RESIDENCE_TAX_RATE）。給与所得が45万円（単身の非課税の目安、tax.ts の RESIDENCE_TAX_EXEMPT_INCOME）以下なら非課税。均等割・扶養による非課税ラインの違いは未反映。",
    },
    {
      label: "基礎控除",
      value: formatYen(BASIC_DEDUCTION),
      note: "概算。表示の額は住民税の基礎控除。所得税は2025年改正後の段階式（給与所得132万円以下は95万円〜655万円超は58万円、tax.ts の INCOME_TAX_BASIC_DEDUCTION_TIERS）を使う。給与所得控除は『年収×20%＋44万円、下限65万円・上限195万円』で近似。",
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
      )}、socialInsurance.ts の SOCIAL_INSURANCE_RATE）。年金収入には別途、国民健康保険料＋介護保険料として（年金 − 公的年金等控除110万円）× 15%、最低3万円を概算する（estimatePensionSocialInsurance）。`,
    },
    {
      label: "年金の概算方式",
      value: `基礎年金 ${formatYen(BASIC_PENSION_ANNUAL)}（定額）＋ 現役年収 × ${formatPercent(
        EARNINGS_RELATED_FACTOR,
      )}（上限 ${formatYen(EARNINGS_RELATED_CAP)}）`,
      note: "概算（pension.ts の estimateAnnualPension）。フォーム初期値の算定に使用。入力欄で年額を上書きした場合はその値が優先される。国民年金のみ（自営・未加入の非正規等）の場合は基礎年金の定額のみが目安。",
    },
    {
      label: "年金受給開始年齢",
      value: pensionStartAgeValue,
      note: "入力値（60〜75歳）。年額（annualPension）は開始年齢によらず一定で、繰上げ/繰下げ受給による減額・増額は未反映（lp-008 で対応予定）。開始年齢は年金が発生し始める年のみを動かす。年金額は物価上昇に連動させず、受給開始後も同額のまま（生活費は物価上昇率で増える）ため、長期では収支がやや厳しめに出る。",
    },
    {
      label: "世帯構成連動の既定値（生活費・住宅ローン）",
      value: `単身 ${formatYen(HOUSEHOLD_DEFAULT_CONSTANTS.singleBaseLivingExpense)}／夫婦 ${formatYen(
        HOUSEHOLD_DEFAULT_CONSTANTS.coupleBaseLivingExpense,
      )}／子1人ごと +${formatYen(HOUSEHOLD_DEFAULT_CONSTANTS.perChildLivingExpense)}`,
      note: `lp-030: 配偶者の有無・子の人数（householdDefaults.ts）から基礎生活費を機械的に決定し、編集していない項目のみ世帯構成の変更に追従させる。子が1人以上いる世帯には住宅ローン（借入${formatYen(
        HOUSEHOLD_DEFAULT_CONSTANTS.housingLoanPrincipal,
      )}・金利${formatPercent(HOUSEHOLD_DEFAULT_CONSTANTS.housingLoanAnnualRate)}・${HOUSEHOLD_DEFAULT_CONSTANTS.housingLoanTermYears}年）と住宅購入イベント（頭金${formatYen(
        HOUSEHOLD_DEFAULT_CONSTANTS.housingDownPayment,
      )}）も既定で付与し、子なし世帯には付与しない。ヘッダーの「まっさらから入力」で生活費・ローン・イベントを0/空から始めることもできる。`,
    },
    {
      label: "純資産と資産枯渇の定義",
      value: "純資産 ＝ 金融資産 − ローン残高",
      note: "金融資産は課税口座（預金含む）＋非課税口座。不動産など実物資産の価値は含まないため、ローンを組んだ年は残高ぶん純資産が下がる。「資産が尽きる年」は金融資産（手元資金）が初めてマイナスになった年で判定する。課税口座が不足した年は非課税口座から自動で取り崩し、非課税口座への積立は課税口座の残高を上限とする。",
    },
  ];
}
