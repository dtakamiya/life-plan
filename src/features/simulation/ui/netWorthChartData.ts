import { findDepletion, type YearlyResult } from "@/features/simulation/domain";

/** 資産推移グラフの1年分の描画用データ。 */
export type NetWorthChartDatum = YearlyResult & {
  /** 主系列（金融資産）。尽きた後の負の値は0円で止める */
  financial: number;
  /** 重ねる純資産（金融資産＋不動産−ローン残高）。ローンも不動産もない年と尽きた後は null（線を描かない） */
  netWorth: number | null;
};

/**
 * 年次結果を資産推移グラフの描画用データへ変換する。
 *
 * 子育て共働きペルソナレビュー #11: 主系列を純資産にすると、住宅ローンを組んだ年に
 * 大きく落ち込み、尽きた後は0円に張り付いて明細の純資産と食い違う。そこで主系列は
 * 手元資金（金融資産）とし、ローンや不動産がある期間だけ純資産を重ねて示す。
 * 低収入ペルソナレビュー #13 の方針どおり、尽きた後は線を0円で止め、実額は明細で確認する。
 */
export function netWorthChartData(results: YearlyResult[]): NetWorthChartDatum[] {
  const depleted = findDepletion(results);
  return results.map((r) => {
    const afterDepletion = depleted !== null && r.year >= depleted.year;
    return {
      ...r,
      financial: afterDepletion ? Math.max(r.financialAssets, 0) : r.financialAssets,
      netWorth:
        (r.loanBalance > 0 || r.propertyValue > 0) && !afterDepletion ? r.assets : null,
    };
  });
}
