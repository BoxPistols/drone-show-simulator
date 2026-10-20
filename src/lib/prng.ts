/** 種を固定した線形合同法の乱数。同じ種なら毎回同じ並びを返す（描画のたびに機体の配置や機体の一覧が変わらないように） */
export function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
