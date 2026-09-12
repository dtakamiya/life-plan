/**
 * プラン期間からライフステージ（ターン）を導出し、
 * 各ステージの方針カード（3 択）を組み立てる。
 *
 * 1 年 1 ターンだと大半が「何も起きない年に次へを押すだけ」になるため、
 * 本人の年齢を 10 歳区切りにしたブロックを 1 ターンとする。
 */

import type { PlanInput } from "@/lib/simulation/types";
import type { Stage, StageOption } from "./types";

/**
 * 方針カードの定義。cash は「1 年あたりの生活水準の差額（円）」、
 * satisfaction は「ステージ 1 つあたりの増減」。
 * 金銭一次元にすると常に安い方が最適解になるため、必ず両軸を交差させる。
 */
export const STAGE_OPTION_TABLE: ReadonlyArray<{
  id: string;
  label: string;
  /** 1 年あたりの追加支出（円、マイナス） */
  cashPerYear: number;
  satisfaction: number;
  hint: string;
}> = [
  {
    id: "frugal",
    label: "質素に暮らす",
    cashPerYear: 0,
    satisfaction: -4,
    hint: "支出を抑えるかわりに、日々の充足感は削られる",
  },
  {
    id: "standard",
    label: "標準的に暮らす",
    cashPerYear: -60_000,
    satisfaction: 2,
    hint: "無理のない範囲で暮らしを整える",
  },
  {
    id: "rich",
    label: "暮らしを充実させる",
    cashPerYear: -180_000,
    satisfaction: 8,
    hint: "住まい・食事・余暇に厚く配分する",
  },
];

/** ステージの表示名。ちょうど 1 ディケードなら「40代」、端数なら「35〜39歳」。 */
function stageLabel(startAge: number, endAge: number): string {
  if (startAge % 10 === 0 && endAge === startAge + 9) {
    return `${startAge}代`;
  }
  return `${startAge}〜${endAge}歳`;
}

/**
 * プラン期間を本人の年齢の 10 歳区切りで分割する。
 * 先頭と末尾は端数ブロックになりうる。期間が 10 年未満なら 1 ステージ。
 */
export function deriveStages(input: PlanInput): Stage[] {
  // lp-019 / QA#1: startYear/endYear は usePlanStore.setRange および
  // 永続化復元（mergePersistedPlanState）側で correctDateRange により
  // 常に endYear > startYear（期間1年以上）へ補正済みの値が渡ってくる
  // 前提。ここでの二重ガードは行わない（確認のみ、コード変更なし）。
  const { startYear, endYear, self } = input;
  const stages: Stage[] = [];

  let cursorYear = startYear;
  while (cursorYear <= endYear) {
    const startAge = cursorYear - self.birthYear;
    // このブロックの終端年齢＝次の 10 歳区切りの 1 つ手前
    const blockEndAge = Math.floor(startAge / 10) * 10 + 9;
    const blockEndYear = Math.min(blockEndAge + self.birthYear, endYear);
    const endAge = blockEndYear - self.birthYear;

    stages.push({
      index: stages.length,
      label: stageLabel(startAge, endAge),
      startYear: cursorYear,
      endYear: blockEndYear,
      midYear: Math.floor((cursorYear + blockEndYear) / 2),
      startAge,
      endAge,
    });

    cursorYear = blockEndYear + 1;
  }

  return stages;
}

/** そのステージの方針カード 3 択。cash はステージの年数に比例させる。 */
export function stageOptionsFor(stage: Stage): StageOption[] {
  const years = stage.endYear - stage.startYear + 1;
  return STAGE_OPTION_TABLE.map((row) => ({
    id: row.id,
    label: row.label,
    description: `${stage.label}の${years}年間、${row.hint}。`,
    effect: {
      cash: row.cashPerYear * years,
      satisfaction: row.satisfaction,
    },
  }));
}
