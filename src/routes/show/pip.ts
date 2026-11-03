/**
 * 小窓（ピクチャー・イン・ピクチャー）で他の機体の目線を同時に見るための純粋なロジック。
 * 配置・上限・負荷に応じた間引きをここで決め、描画側（useDroneShow）と画面側（ShowPage）が同じ答えを使う。
 */

export const MAX_PIPS = 4;
/** 狭い画面（スマートフォン縦持ち）では 2 つまで */
export const MAX_PIPS_COMPACT = 2;
export const COMPACT_MAX_WIDTH = 480;
/** show.css の 860px の切り替えと揃える（これ以下は下部に横並び） */
export const MOBILE_MAX_WIDTH = 860;

export interface PipRect {
  /** 左上原点の CSS ピクセル */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 軽量モードでは小窓を使わない。追加の描画そのものが負荷になるため */
export function maxPipsFor({ lite, width }: { lite: boolean; width: number }): number {
  if (lite) return 0;
  return width <= COMPACT_MAX_WIDTH ? MAX_PIPS_COMPACT : MAX_PIPS;
}

const ASPECT = 16 / 9;
const GAP = 10;

interface LayoutInput {
  width: number;
  height: number;
  count: number;
  /** 設定パネルが開いているか（広い画面ではパネルの左へ逃がす） */
  tweaksOpen: boolean;
}

/**
 * 小窓の位置。主要な操作（上部のナビ、左の演目カード、下部の再生操作・演目バー、視点の表示、設定パネル）に
 * 重ならない範囲に置き、入りきらなければ数を減らす（返す配列が要求より短くなる）。
 *
 * - 広い画面: 右側に縦 1 列、入らなければ 2 列
 * - 狭い画面: 再生操作の上に横 1 列
 */
export function pipLayout({ width, height, count, tweaksOpen }: LayoutInput): PipRect[] {
  if (count <= 0) return [];
  return width > MOBILE_MAX_WIDTH
    ? desktopLayout(width, height, count, tweaksOpen)
    : mobileLayout(width, height, count);
}

/** 広い画面の余白。上部ナビの下から、視点の表示（下から約 300px。再生操作・演目バーはその下）の上まで */
const DESKTOP_TOP = 112;
const DESKTOP_BOTTOM = 310;
const DESKTOP_MAX_H = 135;
const DESKTOP_MIN_H = 72;
/** 左の演目カード（left 40 + width 280）の右端 + 余白 */
const DESKTOP_LEFT_LIMIT = 336;
const DESKTOP_RIGHT = 24;
/** 設定パネル（right 36 + width 280）の左へ */
const DESKTOP_RIGHT_TWEAKS = 36 + 280 + 16;

function desktopLayout(width: number, height: number, count: number, tweaksOpen: boolean) {
  const right = tweaksOpen ? DESKTOP_RIGHT_TWEAKS : DESKTOP_RIGHT;
  const avail = height - DESKTOP_TOP - DESKTOP_BOTTOM;
  for (let n = count; n >= 1; n--) {
    for (const cols of n === 1 ? [1] : [1, 2]) {
      const rows = Math.ceil(n / cols);
      const h = Math.floor(Math.min(DESKTOP_MAX_H, (avail - (rows - 1) * GAP) / rows));
      // 1 列で窮屈なら 2 列を試す（縦長の 1 列より、少し大きい 2 列のほうが見やすい）
      if (cols === 1 && n > 1 && h < 100) continue;
      if (h < DESKTOP_MIN_H) continue;
      const w = Math.round(h * ASPECT);
      const left = width - right - cols * w - (cols - 1) * GAP;
      if (left < DESKTOP_LEFT_LIMIT) continue;
      // 読む順（左上から右へ、次の行へ）に 1 つ目、2 つ目…と並べる
      const rects: PipRect[] = [];
      for (let k = 0; k < n; k++) {
        const col = k % cols;
        const row = Math.floor(k / cols);
        rects.push({ x: left + col * (w + GAP), y: DESKTOP_TOP + row * (h + GAP), w, h });
      }
      return rects;
    }
  }
  return [];
}

/** 狭い画面。視点の表示（下から約 206px）の上に横並び。上部ナビと演目カードの見出しにはかけない */
const MOBILE_BOTTOM = 216;
const MOBILE_TOP_LIMIT = 236;
const MOBILE_SIDE = 16;
const MOBILE_MAX_W = 180;
const MOBILE_MIN_W = 120;

function mobileLayout(width: number, height: number, count: number) {
  for (let n = count; n >= 1; n--) {
    const w = Math.floor(Math.min(MOBILE_MAX_W, (width - MOBILE_SIDE * 2 - (n - 1) * GAP) / n));
    if (w < MOBILE_MIN_W) continue;
    const h = Math.round(w / ASPECT);
    const y = height - MOBILE_BOTTOM - h;
    if (y < MOBILE_TOP_LIMIT) return [];
    const total = n * w + (n - 1) * GAP;
    const x0 = Math.round((width - total) / 2);
    return Array.from({ length: n }, (_, k) => ({ x: x0 + k * (w + GAP), y, w, h }));
  }
  return [];
}

// ---------------------------------------------------------------------------
// 負荷に応じた間引き
// ---------------------------------------------------------------------------

/**
 * 小窓は本体より先に落とす。重いと判定するたびに一段ずつ:
 *   1. 小窓の更新を 2 フレームに 1 回 → 3 フレームに 1 回（本体は毎フレーム）
 *   2. 小窓を 1 つずつ減らす
 * 小窓が 0 になってから初めて、本体の解像度（resolution.ts）が下がり始める。
 */
export const PIP_MAX_INTERVAL = 3;

export interface PipLevel {
  /** 描画する小窓の数（要求数を超えない） */
  allowed: number;
  /** 何フレームに 1 回、各小窓を描き直すか */
  interval: number;
}

export function pipLevel(level: number, requested: number): PipLevel {
  const l = Math.max(0, Math.floor(level));
  const interval = Math.min(1 + l, PIP_MAX_INTERVAL);
  const drops = Math.max(0, l - (PIP_MAX_INTERVAL - 1));
  return { allowed: Math.max(0, requested - drops), interval };
}

/**
 * このフレームで描き直す小窓か。間引くときは小窓ごとにずらし、同じフレームに更新が集中しないようにする
 */
export function shouldUpdatePip(frame: number, slot: number, interval: number): boolean {
  if (interval <= 1) return true;
  return (frame + slot) % interval === 0;
}

export interface PipBudgetOptions {
  windowFrames?: number;
  warmupMs?: number;
  upgradeCooldownMs?: number;
  maxUpgrades?: number;
}

export interface PipBudget {
  readonly level: number;
  current(requested: number): PipLevel;
  /** 小窓をまだ減らせるか（0 になっていないか）。減らせない間は本体の解像度調整に任せる */
  canDegrade(requested: number): boolean;
  /** 描画したフレームの経過時間を渡す。段が変わったら新しい段を返す */
  push(dtMs: number, now: number, requested: number): PipLevel | null;
}

/** resolution.ts と同じ基準: 25fps を切れば常に遅い。それ以外は表示装置の間隔の 1.5 倍を超えたら遅い */
const ABSOLUTE_SLOW_MS = 40;
const MIN_SLOW_MS = 24;
const MIN_FAST_MS = 18;

export function createPipBudget(opts: PipBudgetOptions, startedAt: number): PipBudget {
  const windowFrames = opts.windowFrames ?? 60;
  const warmupMs = opts.warmupMs ?? 1500;
  const cooldown = opts.upgradeCooldownMs ?? 8000;
  const maxUpgrades = opts.maxUpgrades ?? 3;

  let level = 0;
  let acc = 0;
  let n = 0;
  const samples = new Float64Array(windowFrames);
  // 表示装置のリフレッシュ間隔の推定（窓の速いほうから 10% の位置の最小値）。resolution.ts と同じ考え方
  let refreshMs = Infinity;
  let lastChange = startedAt;
  let upgradesLeft = maxUpgrades;

  const maxLevel = (requested: number) => PIP_MAX_INTERVAL - 1 + requested;

  return {
    get level() {
      return level;
    },
    current(requested) {
      return pipLevel(level, requested);
    },
    canDegrade(requested) {
      return requested > 0 && pipLevel(level, requested).allowed > 0;
    },
    push(dtMs, now, requested) {
      if (requested <= 0) return null;
      if (now - startedAt < warmupMs) return null;
      if (dtMs <= 0 || dtMs > 250) return null;
      samples[n] = dtMs;
      acc += dtMs;
      n++;
      if (n < windowFrames) return null;
      const avg = acc / n;
      const sorted = Array.from(samples.subarray(0, n)).sort((a, b) => a - b);
      const p10 = sorted[Math.floor(n * 0.1)]!;
      if (p10 >= 4 && p10 < refreshMs) refreshMs = p10;
      acc = 0;
      n = 0;
      const base = Number.isFinite(refreshMs) ? refreshMs : 1000 / 60;
      const slowMs = Math.max(base * 1.5, MIN_SLOW_MS);
      const fastMs = Math.max(base * 1.15, MIN_FAST_MS);

      // 小窓を閉じて要求が減ったら、段もその範囲に収める（戻すときに空振りの段を踏まないように）
      if (level > maxLevel(requested)) level = maxLevel(requested);

      if (avg > ABSOLUTE_SLOW_MS || avg > slowMs) {
        if (level >= maxLevel(requested)) return null;
        level = Math.min(maxLevel(requested), level + 1);
        lastChange = now;
        return pipLevel(level, requested);
      }
      if (avg < fastMs && level > 0 && upgradesLeft > 0 && now - lastChange > cooldown) {
        level--;
        upgradesLeft--;
        lastChange = now;
        return pipLevel(level, requested);
      }
      return null;
    },
  };
}
