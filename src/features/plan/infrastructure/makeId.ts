import type { IdGenerator } from "@/features/plan/application";

/** ランダムな id を生成する（crypto があれば利用）。 */
export const makeId: IdGenerator = (prefix) => {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
};
