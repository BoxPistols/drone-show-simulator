import type { MutableRefObject } from 'react';

/**
 * 振付エディタの再生位置。毎フレーム更新されるので React の state ではなく ref で持ち、
 * 60fps で描きたいもの（プレビュー）はここを直接読む。画面の文字や playhead は
 * 約 15 回/秒だけ state に写して描き直す。
 *
 * `version` はシークのたびに増える。一時停止中でも、読み手はこれを見れば描き直すべきか分かる。
 */
export interface Clock {
  time: number;
  version: number;
}
export type ClockRef = MutableRefObject<Clock>;

export function createClock(time = 0): Clock {
  return { time, version: 0 };
}

/** 再生で進める（version は変えない。毎フレーム呼ばれる） */
export function advanceClock(clock: Clock, dt: number, total: number): void {
  clock.time = (clock.time + dt) % Math.max(1, total);
}

/** シーク。読み手が気づけるよう version を上げる */
export function seekClock(clock: Clock, time: number): void {
  clock.time = time;
  clock.version++;
}
