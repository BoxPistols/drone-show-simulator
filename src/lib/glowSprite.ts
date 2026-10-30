/**
 * 発光する点のスプライト。観賞ページ（Three.js の点テクスチャ）と振付エディタのプレビュー（2D canvas）で
 * 同じ減衰カーブを使い、見た目を揃える。
 */

export type Rgb = readonly [number, number, number];

const HEX_RE = /^#([0-9a-f]{3,8})$/i;
const RGB_RE = /^rgba?\(\s*(-?[\d.]+)\s*[, ]\s*(-?[\d.]+)\s*[, ]\s*(-?[\d.]+)/i;

/**
 * CSS の色文字列を [r, g, b] (0..255) に直す。#rgb / #rrggbb / #rrggbbaa / rgb() / rgba() は自前で読み、
 * それ以外（色名など）は 2D canvas に正規化させる。読めなければ null。
 */
export function parseColor(color: string, ctx?: CanvasRenderingContext2D | null): Rgb | null {
  const s = color.trim();
  const hex = HEX_RE.exec(s);
  if (hex) {
    const h = hex[1]!;
    if (h.length === 3 || h.length === 4) {
      return [
        parseInt(h[0]! + h[0]!, 16),
        parseInt(h[1]! + h[1]!, 16),
        parseInt(h[2]! + h[2]!, 16),
      ];
    }
    if (h.length === 6 || h.length === 8) {
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    }
    return null;
  }
  const rgb = RGB_RE.exec(s);
  if (rgb) {
    const c = [rgb[1], rgb[2], rgb[3]].map((v) =>
      Math.max(0, Math.min(255, Math.round(Number(v))))
    );
    return [c[0]!, c[1]!, c[2]!];
  }
  if (ctx) {
    // ブラウザに正規化させる。無効な色なら fillStyle は変わらないので、番兵と比べて判定する
    const sentinel = '#010203';
    ctx.fillStyle = sentinel;
    ctx.fillStyle = s;
    const out = String(ctx.fillStyle);
    if (out !== sentinel) return parseColor(out);
  }
  return null;
}

/** 中心から外へ向かう減衰。観賞ページの点テクスチャと同じ段 */
const STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0.25, 0.85],
  [0.55, 0.3],
  [1, 0],
];

/**
 * size × size の canvas に、色 rgb の発光ディスクを描いて返す。
 * 2D context が取れない環境（テスト用 DOM など）では空の canvas を返す。
 */
export function makeGlowSprite(size: number, rgb: Rgb = [255, 255, 255]): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;
  const h = size / 2;
  const g = ctx.createRadialGradient(h, h, 0, h, h, h);
  const [r, gg, b] = rgb;
  for (const [pos, a] of STOPS) g.addColorStop(pos, `rgba(${r},${gg},${b},${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cv;
}
