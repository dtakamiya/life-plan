/**
 * seed 付きの決定論的乱数（mulberry32）。
 * 同じ seed・同じ呼び出し回数なら常に同じ列を返すため、
 * ゲームの進行がプレイをまたいで再現できる。Math.random は使わない。
 */

/** seed から [0,1) の擬似乱数を返す関数を作る。 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * ステージごとに独立した乱数列を派生させる。
 * ステージ単位で列を切ることで、あるステージの消費回数が
 * 後続ステージの抽選に影響しない（＝選択列だけで結果が決まる）。
 */
export function stageRng(seed: number, stageIndex: number): () => number {
  return createRng((seed ^ Math.imul(stageIndex + 1, 0x9e3779b1)) >>> 0);
}
