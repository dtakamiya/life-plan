import { formatManYen } from "@/shared/lib";
import { summarizeResults } from "@/lib/simulation/summary";
import type { YearlyResult } from "@/lib/simulation/types";

/**
 * 画面上部に固定表示する試算結果の要約バー（issue #17）。
 *
 * - 入力フォームを編集しながら結果を確認できるよう、全幅で `sticky top-0` にする。
 * - スマホ幅でも 1 行に収まるよう、金額は万円単位に丸めて表示する。
 * - 数値入力の打鍵ごとに読み上げが連発しないよう `aria-live` は付けない。
 * - `ResultTable` の固定列（最大 z-30）や `TermHelp`（z-20）より上に重ねる。
 */
export function SummaryBar({ results }: { results: YearlyResult[] }) {
  const summary = summarizeResults(results);
  if (!summary) return null;
  const { last, min, depleted } = summary;

  const items = [
    {
      key: "last",
      label: "最終純資産",
      value: `${formatManYen(last.assets)}円`,
      danger: last.assets < 0,
    },
    {
      key: "min",
      label: "最小純資産",
      value: `${formatManYen(min.assets)}円`,
      danger: min.assets < 0,
    },
    {
      key: "depleted",
      label: "資産が尽きる年",
      value: depleted ? `${depleted.year}年` : "なし",
      danger: depleted !== null,
    },
  ];

  return (
    <aside
      aria-label="試算結果の要約"
      className="sticky top-0 z-40 -mx-4 mb-6 border-b border-line bg-paper/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <dl className="grid grid-cols-3 gap-3 sm:flex sm:gap-10">
        {items.map((i) => (
          <div key={i.key} data-summary-item={i.key} className="min-w-0">
            <dt className="truncate text-[10px] text-ink-mute">{i.label}</dt>
            <dd
              className={`truncate font-display text-sm font-semibold tabular-nums sm:text-base ${
                i.danger ? "text-danger" : "text-ink"
              }`}
            >
              {i.value}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
