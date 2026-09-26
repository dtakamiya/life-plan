/**
 * 世帯（本人・配偶者・子）を編集するユースケース。どれも引数の入力を変更せず
 * 新しい PlanInput を返す。配偶者がいるときの toggleSpouse(true) と配偶者が
 * いないときの updateSpouse だけは変更が無いので引数をそのまま返す。
 */

import {
  DEFAULT_EDUCATION,
  type Child,
  type HouseholdComposition,
  type Person,
  type PlanInput,
} from "@/features/plan/domain";
import { applyHouseholdDefaults } from "./householdDefaultsSync";
import type { IdGenerator } from "./idGenerator";
import { nextChildName } from "./nextChildName";

function compositionOf(input: PlanInput): HouseholdComposition {
  return { hasSpouse: input.spouse !== null, childCount: input.children.length };
}

// lp-030: 世帯構成が変わったので、既定の生活費・ローン・イベント・自宅を
// 新しい世帯構成へ追従させる（編集済みの項目は上書きしない）。
function followHouseholdDefaults(
  next: PlanInput,
  previous: PlanInput,
  idGen: IdGenerator,
): PlanInput {
  return applyHouseholdDefaults(next, compositionOf(previous), {
    loan: idGen("loan"),
    event: idGen("event"),
    property: idGen("property"),
  });
}

// 終了年は西暦で保持するが、UI は「本人が◯歳になる年」（lp-031）で見せる。
// 生年が変わっても終了年齢が保たれるよう、生年の差分だけ終了年をずらす。
// 数値欄は1キーごとに確定するため、差分で追従させて途中の値（1→19→199…）に依存しない。
export function updateSelf(input: PlanInput, patch: Partial<Person>): PlanInput {
  return {
    ...input,
    endYear:
      patch.birthYear === undefined
        ? input.endYear
        : input.endYear + (patch.birthYear - input.self.birthYear),
    self: { ...input.self, ...patch },
  };
}

/** 配偶者の有無を切り替える。enabled=true で未設定なら本人を雛形に作成。 */
export function toggleSpouse(
  input: PlanInput,
  enabled: boolean,
  idGen: IdGenerator,
): PlanInput {
  let next: PlanInput | null = null;
  if (enabled && !input.spouse) {
    const spouse: Person = { ...input.self, name: "配偶者" };
    next = { ...input, spouse };
  } else if (!enabled) {
    next = { ...input, spouse: null };
  }
  if (!next) return input;
  return followHouseholdDefaults(next, input, idGen);
}

export function updateSpouse(input: PlanInput, patch: Partial<Person>): PlanInput {
  if (!input.spouse) return input;
  return { ...input, spouse: { ...input.spouse, ...patch } };
}

export function addChild(input: PlanInput, idGen: IdGenerator): PlanInput {
  const child: Child = {
    id: idGen("child"),
    // lp-021: 既定名を「子1」「子2」…の連番にして判別できるようにする。
    name: nextChildName(input.children),
    birthYear: input.startYear,
    education: DEFAULT_EDUCATION,
  };
  return followHouseholdDefaults(
    { ...input, children: [...input.children, child] },
    input,
    idGen,
  );
}

export function updateChild(input: PlanInput, id: string, patch: Partial<Child>): PlanInput {
  return {
    ...input,
    children: input.children.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
}

export function removeChild(input: PlanInput, id: string, idGen: IdGenerator): PlanInput {
  return followHouseholdDefaults(
    { ...input, children: input.children.filter((c) => c.id !== id) },
    input,
    idGen,
  );
}
