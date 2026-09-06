/**
 * 割り込みイベントの定義テーブルと抽選。
 *
 * 効果はすべて cash（LifeEvent）のみ。金額は世間の相場をもとにした概算で、
 * education.ts が文科省調査を出典に置いている水準感に揃えている。
 * これはモンテカルロ試行ではなく演出であり、発生確率に予測的な意味はない。
 */

import type { PlanInput } from "@/lib/simulation/types";
import type { GameEvent, Stage } from "./types";

/** 抽選の文脈。年齢・子・配偶者・ローンはステージ中央年で判定する。 */
export type EventContext = {
  input: PlanInput;
  stage: Stage;
  /** すでに発生済みのイベント id（once の判定に使う） */
  usedEventIds: ReadonlySet<string>;
};

/**
 * イベント定義。
 * 金額の根拠:
 * - 家電の故障 5〜20 万円（冷蔵庫・洗濯機クラスの修理〜買い替え）
 * - 医療費 10〜30 万円（高額療養費の自己負担上限＋差額ベッド代の目安）
 * - 車の買い替え 150〜350 万円（中古〜新車のコンパクトカー）
 * - 住宅の修繕 100〜200 万円（外壁・屋根の一巡の修繕）
 */
export const GAME_EVENTS: GameEvent[] = [
  {
    id: "appliance-breakdown",
    title: "家電が壊れた",
    description: "長く使ってきた冷蔵庫が動かなくなった。",
    weight: 12,
    choices: [
      {
        id: "repair",
        label: "修理してしのぐ",
        effect: { cash: -80_000, satisfaction: -2 },
        resultText: "修理でしのいだ。当面は動くが、また止まるかもしれない。",
      },
      {
        id: "upgrade",
        label: "上位機種に買い替える",
        effect: { cash: -200_000, satisfaction: 3 },
        resultText: "省エネの上位機種にした。台所に立つのが少し楽しくなった。",
      },
    ],
  },
  {
    id: "medical",
    title: "体調を崩して入院した",
    description: "検査入院が必要になった。高額療養費制度で自己負担には上限がある。",
    weight: 10,
    choices: [
      {
        id: "standard-room",
        label: "大部屋で標準的に治療する",
        effect: { cash: -150_000, satisfaction: -3 },
        resultText: "大部屋で過ごした。回復はしたが、落ち着かない日々だった。",
      },
      {
        id: "private-room",
        label: "差額ベッドで個室にする",
        effect: { cash: -300_000, satisfaction: 1 },
        resultText: "個室で静かに療養できた。差額ベッド代はかさんだ。",
      },
    ],
  },
  {
    id: "car-replace",
    title: "車の買い替え時期がきた",
    description: "車検を前に、乗り換えるかどうかを決めることになった。",
    weight: 8,
    condition: { maxSelfAge: 74 },
    choices: [
      {
        id: "used",
        label: "中古で乗り継ぐ",
        effect: { cash: -1_500_000, satisfaction: -2 },
        resultText: "手頃な中古車にした。出費は抑えたが、装備は物足りない。",
      },
      {
        id: "new",
        label: "新車にする",
        effect: { cash: -3_500_000, satisfaction: 5 },
        resultText: "新車を選んだ。運転そのものが楽しみになった。",
      },
    ],
  },
  {
    id: "home-repair",
    title: "住まいの修繕が必要になった",
    description: "外壁と屋根に傷みが出てきた。",
    weight: 8,
    condition: { requiresActiveLoan: true },
    choices: [
      {
        id: "minimum",
        label: "最低限の補修にとどめる",
        effect: { cash: -1_000_000, satisfaction: -2 },
        resultText: "傷んだ箇所だけ直した。数年後にまた見直すことになりそうだ。",
      },
      {
        id: "renovate",
        label: "断熱まで含めて改修する",
        effect: { cash: -2_000_000, satisfaction: 4 },
        resultText: "断熱まで手を入れた。冬の家が見違えるように暖かい。",
      },
    ],
  },
  {
    id: "child-lesson",
    title: "子が習い事をしたいと言い出した",
    description: "続けたいことが見つかったらしい。",
    weight: 10,
    condition: { requiresChildAged: { min: 6, max: 15 } },
    choices: [
      {
        id: "local",
        label: "近所の教室に通わせる",
        effect: { cash: -200_000, satisfaction: 2 },
        resultText: "近所の教室に通い始めた。無理のない範囲で続いている。",
      },
      {
        id: "serious",
        label: "本格的なコースに通わせる",
        effect: { cash: -600_000, satisfaction: 5 },
        resultText: "本格的なコースに進んだ。打ち込む姿を見るのは悪くない。",
      },
    ],
  },
  {
    id: "family-trip",
    title: "家族で旅行に行く話が出た",
    description: "久しぶりにまとまった休みが取れそうだ。",
    weight: 10,
    condition: { requiresSpouse: true },
    choices: [
      {
        id: "domestic",
        label: "国内で数日過ごす",
        effect: { cash: -250_000, satisfaction: 3 },
        resultText: "国内を数日まわった。近場でも十分に休まった。",
      },
      {
        id: "overseas",
        label: "海外へ行く",
        effect: { cash: -800_000, satisfaction: 7 },
        resultText: "海外へ飛んだ。何年たっても話題にのぼる旅になった。",
      },
    ],
  },
  {
    id: "career-course",
    title: "学び直しの機会がある",
    description: "仕事の幅を広げられそうな講座を見つけた。",
    weight: 8,
    condition: { maxSelfAge: 55 },
    choices: [
      {
        id: "online",
        label: "オンライン講座で済ませる",
        effect: { cash: -150_000, satisfaction: 2 },
        resultText: "オンラインで学んだ。手軽だが、身についた実感は薄い。",
      },
      {
        id: "school",
        label: "通学して資格を取る",
        effect: { cash: -700_000, satisfaction: 6 },
        resultText: "通学して資格を取った。時間は削られたが、手応えがあった。",
      },
    ],
  },
  {
    id: "parent-care",
    title: "親の介護が必要になった",
    description: "実家の親の生活に支えが要るようになった。",
    weight: 8,
    condition: { minSelfAge: 50, once: true },
    choices: [
      {
        id: "self",
        label: "自宅で介護する",
        effect: { cash: -400_000, satisfaction: -6 },
        resultText: "自宅で介護した。費用は抑えられたが、消耗する日々だった。",
      },
      {
        id: "facility",
        label: "施設の力を借りる",
        effect: { cash: -1_800_000, satisfaction: -1 },
        resultText: "施設の力を借りた。負担は軽くなったが、費用は重い。",
      },
    ],
  },
];

/** ステージ中央年に、指定の年齢範囲の子がいるか。 */
function hasChildAged(
  input: PlanInput,
  year: number,
  range: { min: number; max: number },
): boolean {
  return input.children.some((child) => {
    const age = year - child.birthYear;
    return age >= range.min && age <= range.max;
  });
}

/** ステージ中央年に返済中のローンがあるか。 */
function hasActiveLoan(input: PlanInput, year: number): boolean {
  return input.loans.some(
    (loan) => year >= loan.startYear && year < loan.startYear + loan.termYears,
  );
}

/** その文脈で発生しうるイベントの候補を返す。 */
export function eligibleEvents(ctx: EventContext): GameEvent[] {
  const { input, stage, usedEventIds } = ctx;
  const year = stage.midYear;
  const selfAge = year - input.self.birthYear;

  return GAME_EVENTS.filter((event) => {
    const c = event.condition;
    if (!c) return true;
    if (c.once && usedEventIds.has(event.id)) return false;
    if (c.minSelfAge !== undefined && selfAge < c.minSelfAge) return false;
    if (c.maxSelfAge !== undefined && selfAge > c.maxSelfAge) return false;
    if (c.requiresSpouse && !input.spouse) return false;
    if (c.requiresActiveLoan && !hasActiveLoan(input, year)) return false;
    if (c.requiresChildAged && !hasChildAged(input, year, c.requiresChildAged)) {
      return false;
    }
    return true;
  });
}

/**
 * 2 段階の抽選。
 * (1) eventRate で発生判定、(2) 候補から weight 比で 1 件。
 * 候補数によって発生率が変わらないよう、順序を入れ替えない。
 * rand は必ず 2 回消費する（消費回数を選択に依存させないため）。
 */
export function pickEvent(
  ctx: EventContext,
  rand: () => number,
  eventRate: number,
): GameEvent | null {
  const occurs = rand() < eventRate;
  const roll = rand();
  if (!occurs) return null;

  const candidates = eligibleEvents(ctx);
  if (candidates.length === 0) return null;

  const total = candidates.reduce((sum, e) => sum + e.weight, 0);
  let threshold = roll * total;
  for (const candidate of candidates) {
    threshold -= candidate.weight;
    if (threshold < 0) return candidate;
  }
  return candidates[candidates.length - 1];
}
