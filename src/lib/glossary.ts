/**
 * 専門用語の初心者向け解説（issue #22）。
 *
 * UI（`components/ui/TermHelp`）から参照する純データ。解説文は計算エンジンの
 * 前提と矛盾させないこと:
 * - 課税口座の運用益課税率は `CAPITAL_GAINS_RATE`（約20%）
 * - 年間積立は課税口座から非課税口座へ移すだけで、総資産は増えない
 * - 退職所得控除の勤続年数は 22 歳から働き始めた前提で数える
 */
export type GlossaryTermKey =
  | "taxableAccount"
  | "taxFreeAccount"
  | "annualReturnRate"
  | "taxFreeContribution"
  | "levelPayment"
  | "retirementIncomeTax";

export type GlossaryEntry = {
  /** 見出しに出す用語名 */
  term: string;
  /** 2〜3 文程度の平易な解説 */
  description: string;
};

export const GLOSSARY: Record<GlossaryTermKey, GlossaryEntry> = {
  taxableAccount: {
    term: "課税口座",
    description:
      "銀行預金や、証券会社の特定口座・一般口座など、NISA・iDeCo 以外のお金の置き場所です。運用で増えた分（利息・配当・売却益）に約20%の税金がかかります。",
  },
  taxFreeAccount: {
    term: "非課税口座",
    description:
      "NISA（少額投資非課税制度）や iDeCo（個人型確定拠出年金）など、運用で増えた分に税金がかからない口座です。NISA はいつでも引き出せますが、iDeCo は原則60歳まで引き出せません。このアプリでは両者を区別せず「運用益が非課税」として計算します。",
  },
  annualReturnRate: {
    term: "運用利回り",
    description:
      "資産が1年でどれくらいの割合で増えるかの想定です。預金中心なら 0% 前後、投資信託などで運用するならより高い値を想定します。高く見積もるほど将来の資産は大きく出るので、控えめな値も試してみてください。値下がりを想定する場合はマイナスも入力できます。",
  },
  taxFreeContribution: {
    term: "非課税口座へ年間積立",
    description:
      "毎年、課税口座から非課税口座へ移す金額です。新しい収入ではなくお金の置き場所を変えるだけなので総資産は増えませんが、運用益にかかる税金が減ります。",
  },
  levelPayment: {
    term: "元利均等返済",
    description:
      "毎回の返済額（元金と利息の合計）が一定になる返済方法で、住宅ローンで一般的です。返済の初めのうちは利息の割合が大きく、元金はゆっくり減ります。",
  },
  retirementIncomeTax: {
    term: "退職所得課税",
    description:
      "退職一時金にかかる税金です。勤続年数が長いほど大きくなる「退職所得控除」を差し引いた残りの半分にだけ課税されるため、同じ額の給与より税負担が軽くなります。このアプリでは22歳から退職年齢まで勤めた前提で概算し、手取り額を資産に加えます。",
  },
};
