/**
 * 終了年齢 ⇔ 終了年（西暦）の変換（lp-031）。
 *
 * `PlanInput.endYear` は西暦の固定値のまま保持する（保存済みデータの後方互換のため、
 * 型・永続化スキーマは変更しない）。UI の入力・表示だけを「本人が◯歳になる年」という
 * 年齢基準に切り替え、この2関数で相互変換する。
 */

/**
 * 終了年齢の既定値。厚生労働省の簡易生命表で男女とも9割近くが到達する年齢帯の
 * 上限に近く、長寿化を見込んだ資産寿命試算の目安として妥当な水準のため95歳とする。
 */
export const DEFAULT_END_AGE = 95;

/** 本人の生年から「本人が `endAge` 歳になる年」を西暦年に変換する。 */
export function endAgeToEndYear(selfBirthYear: number, endAge: number): number {
  return selfBirthYear + endAge;
}

/** 西暦の終了年から、本人がその年に迎える年齢へ変換する（`endAgeToEndYear` の逆）。 */
export function endYearToEndAge(selfBirthYear: number, endYear: number): number {
  return endYear - selfBirthYear;
}
