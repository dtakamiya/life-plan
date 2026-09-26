import { formatYen } from "@/shared/lib";
import { Eyebrow } from "@/shared/ui";
import {
  describeAssetLongevity,
  summarizeResults,
  type YearlyResult,
} from "@/features/simulation/domain";

type Tone = "brand" | "ink" | "danger";

const toneAccent: Record<Tone, string> = {
  brand: "bg-brand",
  ink: "bg-ink/30",
  danger: "bg-danger",
};
const toneText: Record<Tone, string> = {
  brand: "text-brand-700",
  ink: "text-ink",
  danger: "text-danger",
};

/** サマリーカード（最終純資産・最小純資産・赤字転落年）。 */
export function SummaryCards({ results }: { results: YearlyResult[] }) {
  const summary = summarizeResults(results);
  if (!summary) return null;
  const { last, min, depleted } = summary;
  // lp-031: 結果冒頭の1行判定。判定は lp-003 の summarizeResults を再利用し、
  // ここでは文言の描画のみ行う。
  const longevityText = describeAssetLongevity(results);

  const cards: {
    label: string;
    value: string;
    caption: string;
    tone: Tone;
  }[] = [
    {
      label: "最終純資産",
      value: formatYen(last.assets),
      caption: `${last.year}年（本人${last.selfAge}歳）時点`,
      tone: last.assets < 0 ? "danger" : "brand",
    },
    {
      label: "最小純資産",
      value: formatYen(min.assets),
      caption:
        min.year === last.year
          ? "最終年まで減り続けています"
          : `${min.year}年（本人${min.selfAge}歳）で最小`,
      tone: min.assets < 0 ? "danger" : "ink",
    },
    {
      label: "資産が尽きる年",
      value: depleted ? `${depleted.year}年` : "なし",
      // 枯渇判定は金融資産（ローン残高を引く前）。純資産がマイナスの期間があると
      // 「枯渇なし」と赤字表示が食い違って見えるため、基準の違いを補足する。
      caption: depleted
        ? `本人${depleted.selfAge}歳で初めて残高マイナス`
        : min.assets < 0
          ? `金融資産は枯渇なし（ローン残高を含む純資産は${min.year}年に最小）`
          : "生涯を通じて枯渇なし",
      tone: depleted ? "danger" : "ink",
    },
  ];

  return (
    <div className="space-y-3">
      {longevityText && (
        <p className="font-display text-[15px] font-semibold text-ink">
          {longevityText}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c, i) => (
          <div
            key={c.label}
            className="animate-fade-up relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-panel"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span
              className={`absolute inset-y-0 left-0 w-1 ${toneAccent[c.tone]}`}
              aria-hidden
            />
            <Eyebrow>{c.label}</Eyebrow>
            <div
              className={`mt-2 font-display text-[28px] font-semibold leading-tight tabular-nums ${toneText[c.tone]}`}
            >
              {c.value}
            </div>
            <div className="mt-1.5 text-[11px] text-ink-mute">{c.caption}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
