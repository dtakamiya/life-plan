/**
 * 世帯構成（配偶者・子の有無）の変更に応じて、基礎生活費・住宅ローン・
 * 住宅購入イベント・自宅（不動産）の「既定値」だけを追従させる純関数（lp-030）。
 *
 * ユーザーが既定値から書き換えた項目は上書きしない。判定方法:
 * 変更直前の世帯構成で computeHouseholdDefaults が返す値と、現在の入力値が
 * 一致している（＝まだ既定値のまま触られていない）場合にのみ、変更後の
 * 世帯構成の既定値へ更新する。値が既定値と食い違っていれば「編集済み」と
 * みなし、その項目には一切触れない。
 *
 * ローン・イベントは「id を除いた中身が直前の既定値と完全一致するか」で
 * 判定する。一致する要素が無い状態で新たに既定値が必要になった場合（例:
 * 子なし→子ありへの変更）だけ新規追加し、既定値が不要になった場合（子あり→
 * 子なし）は一致する要素を削除する。id は呼び出し側（ストア）が採番して渡す。
 */

import type { PlanInput } from "@/lib/simulation/types";
import {
  computeHouseholdDefaults,
  type HouseholdComposition,
} from "@/lib/simulation/householdDefaults";

function omitId<T extends { id: string }>(item: T): Omit<T, "id"> {
  const rest = { ...item } as Partial<T>;
  delete rest.id;
  return rest as Omit<T, "id">;
}

function matchesDefault<T extends { id: string }>(
  item: T,
  target: Omit<T, "id"> | null,
): boolean {
  if (!target) return false;
  return JSON.stringify(omitId(item)) === JSON.stringify(target);
}

/**
 * 既定値の要素（ローン・イベント・不動産）を世帯構成の変更に追従させる。
 * 直前の既定値と中身が一致する要素だけを更新・削除し、追従対象が見当たらず
 * 直前の世帯構成に既定値が無かった場合だけ新規に追加する。
 */
function syncDefaultItem<T extends { id: string }>(
  items: T[],
  prevDefault: Omit<T, "id"> | null,
  nextDefault: Omit<T, "id"> | null,
  newId: string,
): T[] {
  const matchedIndex = prevDefault
    ? items.findIndex((item) => matchesDefault(item, prevDefault))
    : -1;

  if (matchedIndex === -1) {
    // 追従対象の既定値が見当たらない（未作成、またはユーザーが編集/削除済み）。
    // 直前の世帯構成にも既定値が存在しなかった場合のみ、新規に追加する。
    if (!prevDefault && nextDefault) {
      return [...items, { id: newId, ...nextDefault } as T];
    }
    return items;
  }

  if (!nextDefault) {
    return items.filter((_, i) => i !== matchedIndex);
  }

  return items.map((item, i) => (i === matchedIndex ? { ...item, ...nextDefault } : item));
}

/**
 * 世帯構成の変更後の input に対して、既定値への追従（未編集の項目のみ）を適用する。
 * @param input 変更後の入力（spouse / children は既に更新済みであること）
 * @param previousComposition 変更直前の世帯構成
 * @param newIds 新規にローン・イベントを追加する場合に使う id（不要なら無視される）
 */
export function applyHouseholdDefaults(
  input: PlanInput,
  previousComposition: HouseholdComposition,
  newIds: { loan: string; event: string; property: string },
): PlanInput {
  const nextComposition: HouseholdComposition = {
    hasSpouse: input.spouse !== null,
    childCount: input.children.length,
  };

  const prevDefaults = computeHouseholdDefaults(previousComposition, input.startYear);
  const nextDefaults = computeHouseholdDefaults(nextComposition, input.startYear);

  const expenses =
    input.expenses.baseAnnualLivingExpense === prevDefaults.baseAnnualLivingExpense
      ? { ...input.expenses, baseAnnualLivingExpense: nextDefaults.baseAnnualLivingExpense }
      : input.expenses;

  const loans = syncDefaultItem(input.loans, prevDefaults.loan, nextDefaults.loan, newIds.loan);
  const events = syncDefaultItem(input.events, prevDefaults.event, nextDefaults.event, newIds.event);
  const properties = syncDefaultItem(
    input.properties ?? [],
    prevDefaults.property,
    nextDefaults.property,
    newIds.property,
  );

  return { ...input, expenses, loans, events, properties };
}
