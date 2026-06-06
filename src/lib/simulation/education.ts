/**
 * 子の養育費・教育費の概算。
 *
 * 注意: これは大まかな概算であり、厳密な金額ではない。年額は文部科学省
 * 「子供の学習費調査」や大学の標準的な学費を参考にした概算で、ユーザーが
 * 進路を選ぶことで切り替わる。授業料・入学金・学校外活動費などを年額に
 * ならして含む想定。
 */

import type { Child, Education, SchoolType, UniversityType } from "./types";

/** 教育費とは別に発生する基礎養育費（食費・衣類・医療など）の年額（円）。 */
export const BASE_CHILD_ANNUAL_COST = 600_000;

/** 基礎養育費の対象とみなす上限年齢（0〜この年齢）。 */
export const CHILD_DEPENDENT_MAX_AGE = 22;

/** 幼稚園〜高校の年額（円）。 */
const SCHOOL_ANNUAL_COST: Record<
  "kindergarten" | "elementary" | "juniorHigh" | "highSchool",
  Record<SchoolType, number>
> = {
  kindergarten: { 公立: 165_000, 私立: 308_000 },
  elementary: { 公立: 353_000, 私立: 1_667_000 },
  juniorHigh: { 公立: 539_000, 私立: 1_436_000 },
  highSchool: { 公立: 513_000, 私立: 1_054_000 },
};

/** 大学の年額（円）。 */
const UNIVERSITY_ANNUAL_COST: Record<UniversityType, number> = {
  なし: 0,
  国公立: 670_000,
  私立文系: 1_180_000,
  私立理系: 1_540_000,
};

/** 新規の子に与える既定の進路（すべて公立・大学は国公立）。 */
export const DEFAULT_EDUCATION: Education = {
  kindergarten: "公立",
  elementary: "公立",
  juniorHigh: "公立",
  highSchool: "公立",
  university: "国公立",
};

/** 進路プリセット（ワンクリックで Education 全体を設定する）。 */
export const EDUCATION_PRESETS: { key: string; label: string; value: Education }[] =
  [
    {
      key: "all-public",
      label: "すべて公立",
      value: {
        kindergarten: "公立",
        elementary: "公立",
        juniorHigh: "公立",
        highSchool: "公立",
        university: "国公立",
      },
    },
    {
      key: "high-private",
      label: "高校から私立",
      value: {
        kindergarten: "公立",
        elementary: "公立",
        juniorHigh: "公立",
        highSchool: "私立",
        university: "私立文系",
      },
    },
    {
      key: "all-private",
      label: "すべて私立",
      value: {
        kindergarten: "私立",
        elementary: "私立",
        juniorHigh: "私立",
        highSchool: "私立",
        university: "私立理系",
      },
    },
    {
      key: "no-university",
      label: "大学なし",
      value: {
        kindergarten: "公立",
        elementary: "公立",
        juniorHigh: "公立",
        highSchool: "公立",
        university: "なし",
      },
    },
  ];

/** 指定年齢における教育費の年額（円）。学齢に該当しなければ0。 */
export function educationCostAtAge(education: Education, age: number): number {
  if (age >= 3 && age <= 5) return SCHOOL_ANNUAL_COST.kindergarten[education.kindergarten];
  if (age >= 6 && age <= 11) return SCHOOL_ANNUAL_COST.elementary[education.elementary];
  if (age >= 12 && age <= 14) return SCHOOL_ANNUAL_COST.juniorHigh[education.juniorHigh];
  if (age >= 15 && age <= 17) return SCHOOL_ANNUAL_COST.highSchool[education.highSchool];
  if (age >= 18 && age <= 21) return UNIVERSITY_ANNUAL_COST[education.university];
  return 0;
}

/**
 * 指定年齢における子1人あたりの年間費用（円）。
 * 基礎養育費（扶養年齢内）＋進路別の教育費。
 */
export function childAnnualCost(child: Child, age: number): number {
  if (age < 0) return 0;
  const base = age <= CHILD_DEPENDENT_MAX_AGE ? BASE_CHILD_ANNUAL_COST : 0;
  return base + educationCostAtAge(child.education, age);
}
