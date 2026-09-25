import { buildComparisonDiff, type ComparisonInput, type DiffDirection } from "@/lib/comparisonDiff";

const directionClass: Record<DiffDirection, string> = {
  改善: "text-ink",
  悪化: "text-danger",
  同じ: "text-ink-mute",
};

/**
 * 比較対象ごとの最終資産・枯渇年と、基準（現在のプラン）との差を数値で示す表（lp-035）。
 * 差は「比較対象 − 基準」の差額で、プラスは基準より良い（資産が多い／枯渇が遅い）。
 */
export function ComparisonDiffTable({ items }: { items: ComparisonInput[] }) {
  const rows = buildComparisonDiff(items);

  return (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table
          aria-label="プラン比較の差分数値表"
          className="w-full min-w-[32rem] text-left text-xs tabular-nums"
        >
          <thead>
            <tr className="border-b border-line text-ink-mute">
              <th scope="col" className="py-1.5 pr-3 font-normal">プラン</th>
              <th scope="col" className="py-1.5 pr-3 font-normal">最終資産</th>
              <th scope="col" className="py-1.5 pr-3 font-normal">最終資産の差額（現在比）</th>
              <th scope="col" className="py-1.5 pr-3 font-normal">資産が尽きる年（年齢）</th>
              <th scope="col" className="py-1.5 font-normal">枯渇年の差（現在比）</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} data-compare-row={r.key} className="border-b border-line/60">
                <th scope="row" className="py-1.5 pr-3 font-medium text-ink">
                  {r.name}
                  {i === 0 && <span className="ml-1 text-[10px] text-ink-mute">（基準）</span>}
                </th>
                {r.available ? (
                  <>
                    <td className="py-1.5 pr-3">{r.finalAssetsText}</td>
                    <td className={`py-1.5 pr-3 ${r.assetDirection ? directionClass[r.assetDirection] : ""}`}>
                      {r.assetDiffText === null ? "—" : `${r.assetDiffText}（${r.assetDirection}）`}
                    </td>
                    <td className="py-1.5 pr-3">{r.depletionText}</td>
                    <td className={`py-1.5 ${r.depletionDirection ? directionClass[r.depletionDirection] : ""}`}>
                      {r.depletionDiffText === null ? "—" : r.depletionDiffText}
                    </td>
                  </>
                ) : (
                  <td colSpan={4} className="py-1.5 text-ink-mute">
                    入力に誤りがあるため算出できません
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-mute">
        差は「比較対象 − 現在のプラン」の差額です。プラス（+）は現在より資産が多い／枯渇が遅いこと、マイナスはその逆です。
        枯渇は年末の金融資産（ローン残高を引く前）が初めて0円未満になった年で、サマリー（資産が尽きる年）と同じ基準です。
      </p>
    </div>
  );
}
