import type { MutableRefObject } from 'react';

/**
 * 振付エディタの再生位置。毎フレーム更新されるので React の state ではなく ref で持ち、
 * 60fps で描きたいもの（プレビュー）はここを直接読む。画面の文字や playhead は
 * 約 15 回/秒だけ state に写して描き直す。
 */
export interface Clock {
  time: number;
}
export type ClockRef = MutableRefObject<Clock>;
