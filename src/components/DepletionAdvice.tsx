import { useMemo } from "react";
import { findDepletionRemedies } from "@/lib/simulation/depletionRemedies";
import type { PlanInput } from "@/lib/simulation/types";

/**
 * 資産が尽きる計画のときだけ、尽きなくするための逆算の目安（#12）と、
 * 公的な支援・相談窓口についての一文（#14）を表示する。
 */
export function DepletionAdvice({ input }: { input: PlanInput }) {
  const remedies = useMemo(() => findDepletionRemedies(input), [input]);
  if (!remedies) return null;
  const { monthlyExpenseCut, retirementAge } = remedies;

  const items: string[] = [];
  if (monthlyExpenseCut !== null) {
    items.push(`生活費を月${monthlyExpenseCut.toLocaleString("ja-JP")}円減らす`);
  }
  if (retirementAge !== null) {
    items.push(`本人が${retirementAge}歳まで働く`);
  }

  return (
    <section
      aria-label="資産を尽きさせないための目安"
      className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink"
    >
      {items.length > 0 ? (
        <>
          <p className="font-semibold">次のどれか1つで、資産が最後まで尽きなくなります（目安）</p>
          <ul className="mt-2 list-disc space-y-1 pl-5" data-testid="depletion-remedies">
            {items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="font-semibold">生活費の削減や就労の延長だけでは、資産が尽きるのを避けられない試算です。</p>
      )}
      <p className="mt-3 text-xs text-ink-mute" data-testid="public-support-note">
        この試算は生活保護・高齢者向けの給付などの公的な支えを含みません。生活が苦しくなりそうなときは、
        お住まいの市区町村の生活困窮者自立相談支援窓口や福祉事務所に相談できます。
      </p>
    </section>
  );
}
