/**
 * 3D 画面の点を指で選ぶための純粋な計算。three に依存させず、投影行列（列優先 16 要素）と
 * 座標の配列だけで決めるので、単体テストで確かめられる。
 */

/** 選べる距離（CSS ピクセル）。指は狙いがずれやすいので広めに取る */
export const PICK_RADIUS_MOUSE = 14;
export const PICK_RADIUS_TOUCH = 26;

/** これ以上動いたらドラッグ（見回し・回転）とみなし、選択はしない */
export const TAP_SLOP_MOUSE = 6;
export const TAP_SLOP_TOUCH = 12;
/** 長押しは選択にしない（見回すつもりで止まっていることがあるため） */
export const TAP_MAX_MS = 600;

export interface TapCandidate {
  /** 押してから離すまでの最大移動量（CSS ピクセル） */
  maxMove: number;
  durationMs: number;
  pointerType: string;
  /** 途中で 2 本指になったか（ピンチ） */
  multiTouch: boolean;
}

export function isTap(t: TapCandidate): boolean {
  if (t.multiTouch) return false;
  const slop = t.pointerType === 'mouse' ? TAP_SLOP_MOUSE : TAP_SLOP_TOUCH;
  return t.maxMove <= slop && t.durationMs <= TAP_MAX_MS;
}

export function pickRadiusFor(pointerType: string): number {
  return pointerType === 'mouse' ? PICK_RADIUS_MOUSE : PICK_RADIUS_TOUCH;
}

export interface ScreenPoint {
  x: number;
  y: number;
  /** 正規化デバイス座標の深さ（-1 が手前、1 が奥） */
  depth: number;
}

/**
 * 1 点を画面座標（左上原点の CSS ピクセル）に投影する。カメラの後ろや描画範囲の外なら null。
 * `viewProj` は projectionMatrix × matrixWorldInverse（列優先）。
 */
export function projectPoint(
  viewProj: ArrayLike<number>,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number
): ScreenPoint | null {
  const e = viewProj;
  const cx = e[0]! * x + e[4]! * y + e[8]! * z + e[12]!;
  const cy = e[1]! * x + e[5]! * y + e[9]! * z + e[13]!;
  const cz = e[2]! * x + e[6]! * y + e[10]! * z + e[14]!;
  const cw = e[3]! * x + e[7]! * y + e[11]! * z + e[15]!;
  if (cw <= 1e-6) return null;
  const nz = cz / cw;
  if (nz < -1 || nz > 1) return null;
  return {
    x: ((cx / cw + 1) / 2) * width,
    y: ((1 - cy / cw) / 2) * height,
    depth: nz,
  };
}

/**
 * 画面上の (px, py) に最も近い点の番号。半径 `radius` 以内に無ければ -1。
 * 同じくらい近い点が重なっているときは手前の点を選ぶ（奥の点はたいてい隠れて見えにくいため）。
 */
export function pickNearestPoint(
  positions: ArrayLike<number>,
  viewProj: ArrayLike<number>,
  width: number,
  height: number,
  px: number,
  py: number,
  radius: number,
  exclude = -1
): number {
  const n = Math.floor(positions.length / 3);
  let best = -1;
  let bestScore = Infinity;
  const r2 = radius * radius;
  for (let i = 0; i < n; i++) {
    if (i === exclude) continue;
    const p = projectPoint(
      viewProj,
      positions[i * 3]!,
      positions[i * 3 + 1]!,
      positions[i * 3 + 2]!,
      width,
      height
    );
    if (!p) continue;
    const dx = p.x - px;
    const dy = p.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    // 距離を主に、深さを少しだけ足す（2px 以内の差なら手前を優先する程度）
    const score = Math.sqrt(d2) + (p.depth + 1) * 2;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}
