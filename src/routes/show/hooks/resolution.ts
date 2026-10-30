/**
 * 描画解像度の自動調整。フレーム時間を窓ごとに平均し、遅ければ一段下げ、速く安定していれば一段戻す。
 * 下限まで下げても遅いままなら「軽量モードへ」の合図を出す。
 *
 * 純粋なロジックとして切り出してあり、`push()` に経過時間を渡すと取るべき動作を返す。
 */

export interface ResolutionOptions {
  /** 通常時の上限（devicePixelRatio 換算） */
  cap: number;
  /** 下限 */
  floor?: number;
  /** 一段の幅 */
  step?: number;
  /** 判定に使うフレーム数 */
  windowFrames?: number;
  /** 起動直後に測らない時間（ms） */
  warmupMs?: number;
  /** 一段戻してから次に戻すまでの間隔（ms） */
  upgradeCooldownMs?: number;
  /** マウント中に戻せる回数 */
  maxUpgrades?: number;
  /** 下限で何窓連続して遅ければ軽量モードを求めるか */
  liteAfterSlowWindows?: number;
}

export type ResolutionAction = { type: 'none' } | { type: 'dpr'; dpr: number } | { type: 'lite' };

export interface ResolutionController {
  readonly dpr: number;
  readonly cap: number;
  /** 描画したフレームの経過時間を渡す。測定を始めてよいかは `now` と `startedAt` で判断する */
  push(dtMs: number, now: number): ResolutionAction;
  /** 描画しなかったフレーム（一時停止中など）。負荷がないので、表示装置のリフレッシュ間隔を知る手がかりにする */
  observe(dtMs: number): void;
  /**
   * 上限を変える（軽量モードの切替）。解像度は新しい上限に合わせ、戻し回数もやり直す。
   * 軽量モードの合図は据え置く（一度出したら、このコントローラの寿命の間は二度と出さない）。
   * 利用者が自分で軽量モードを切ったあとに、また自動で戻して操作と喧嘩しないため
   */
  setCap(cap: number, now: number): number;
}

/**
 * 「遅い」の基準は、この表示装置のリフレッシュ間隔の推定値から決める。
 * 30Hz の表示や rAF が間引かれる環境では 33ms が普通なので、固定の 28ms と比べると過負荷と誤判定してしまう。
 *
 * 推定は「窓の中で速いほうから 10% の位置のフレーム時間」の、これまでの最小値。
 * GPU が重い端末でもフレーム時間はばらつき、軽いフレームが垂直同期 1 回分（60Hz なら 16.7ms）で返ってくるので、
 * 下位 10% を見れば本来の間隔が分かる。一方で安定して 33ms なら 30Hz の表示と判断する。
 * 一時停止中など描画していないフレームも `observe()` で手がかりにする。
 * 25fps（40ms）を切れば装置に関わらず遅いとみなす。
 */
const ABSOLUTE_SLOW_MS = 40;
const MIN_SLOW_MS = 24;
const MIN_FAST_MS = 18;
const REFRESH_PERCENTILE = 0.1;

export function createResolutionController(
  opts: ResolutionOptions,
  startedAt: number
): ResolutionController {
  const floor = opts.floor ?? 0.75;
  const step = opts.step ?? 0.25;
  const windowFrames = opts.windowFrames ?? 90;
  const warmupMs = opts.warmupMs ?? 2500;
  const cooldown = opts.upgradeCooldownMs ?? 8000;
  const maxUpgrades = opts.maxUpgrades ?? 2;
  const liteAfter = opts.liteAfterSlowWindows ?? 2;

  let cap = opts.cap;
  let dpr = cap;
  let acc = 0;
  let n = 0;
  const samples = new Float64Array(windowFrames);
  let refreshMs = Infinity;
  const learnRefresh = (ms: number) => {
    if (ms < refreshMs) refreshMs = ms;
  };
  let slowStreak = 0;
  let lastChange = startedAt;
  let upgradesLeft = maxUpgrades;
  let liteSent = false;

  const round = (v: number) => +v.toFixed(2);

  return {
    get dpr() {
      return dpr;
    },
    get cap() {
      return cap;
    },
    push(dtMs, now) {
      if (now - startedAt < warmupMs) return { type: 'none' };
      if (dtMs <= 0 || dtMs > 250) return { type: 'none' }; // タブ切替などの飛びは無視
      samples[n] = dtMs;
      acc += dtMs;
      n++;
      if (n < windowFrames) return { type: 'none' };
      const avg = acc / n;
      const sorted = Array.from(samples.subarray(0, n)).sort((a, b) => a - b);
      const p10 = sorted[Math.floor(n * REFRESH_PERCENTILE)]!;
      if (p10 >= 4) learnRefresh(p10);
      acc = 0;
      n = 0;
      const base = Number.isFinite(refreshMs) ? refreshMs : 1000 / 60;
      const slowMs = Math.max(base * 1.5, MIN_SLOW_MS);
      const fastMs = Math.max(base * 1.15, MIN_FAST_MS);

      if (avg > ABSOLUTE_SLOW_MS || avg > slowMs) {
        if (dpr > floor) {
          dpr = round(Math.max(floor, dpr - step));
          lastChange = now;
          slowStreak = 0;
          return { type: 'dpr', dpr };
        }
        slowStreak++;
        if (slowStreak >= liteAfter && !liteSent) {
          liteSent = true;
          return { type: 'lite' };
        }
        return { type: 'none' };
      }
      slowStreak = 0;
      if (avg < fastMs && dpr < cap && upgradesLeft > 0 && now - lastChange > cooldown) {
        dpr = round(Math.min(cap, dpr + step));
        lastChange = now;
        upgradesLeft--;
        return { type: 'dpr', dpr };
      }
      return { type: 'none' };
    },
    observe(dtMs) {
      if (dtMs >= 4 && dtMs <= 250) learnRefresh(dtMs);
    },
    setCap(nextCap, now) {
      cap = nextCap;
      // 利用者の切替は「ここからやり直し」。新しい上限から測り直す
      dpr = cap;
      acc = 0;
      n = 0;
      slowStreak = 0;
      upgradesLeft = maxUpgrades;
      lastChange = now;
      return dpr;
    },
  };
}
