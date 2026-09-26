/**
 * 世帯メンバー（本人・配偶者・子）の表示用年齢を組み立てる純関数。
 * 最終年齢＝シミュレーション最終年における各メンバーの年齢、算出は既存関数に一本化。
 * targetYear が null/undefined のとき（対象年が定まらない状態）は「—」を返す。
 */
export function formatMemberAge(
  birthYear: number,
  targetYear: number | null | undefined,
): string {
  if (targetYear === null || targetYear === undefined) return "—";
  return `${targetYear - birthYear}歳`;
}
