import { describe, expect, it } from 'vitest';
import { createResolutionController, type ResolutionAction } from './resolution';

const START = 10_000;

/**
 * フレームを n 回流し、返ってきた動作のうち none 以外を集める。
 * dtMs が配列なら順に繰り返す（GPU が重い端末のように、垂直同期 1 回分と 2 回分が混ざる様子を作る）
 */
function feed(
  ctrl: ReturnType<typeof createResolutionController>,
  clock: { now: number },
  frames: number,
  dtMs: number | number[]
): ResolutionAction[] {
  const out: ResolutionAction[] = [];
  const seq = Array.isArray(dtMs) ? dtMs : [dtMs];
  for (let i = 0; i < frames; i++) {
    const dt = seq[i % seq.length]!;
    clock.now += dt;
    const a = ctrl.push(dt, clock.now);
    if (a.type !== 'none') out.push(a);
  }
  return out;
}

/** 60Hz の表示で GPU が追いつかず、5 フレームに 1 回だけ 1 垂直同期で返る（平均 30ms） */
const SLOW = [33.3, 33.3, 33.3, 33.3, 16.7];
const FAST = 16.7;

function make(cap = 1.5) {
  const clock = { now: START };
  const ctrl = createResolutionController({ cap, warmupMs: 2500, windowFrames: 90 }, START);
  // 起動直後の 2.5 秒は測らない
  clock.now += 3000;
  return { ctrl, clock };
}

describe('createResolutionController', () => {
  it('ignores frames during warm-up', () => {
    const clock = { now: START };
    const ctrl = createResolutionController({ cap: 1.5 }, START);
    expect(feed(ctrl, clock, 90, 40)).toEqual([]);
    expect(ctrl.dpr).toBe(1.5);
  });

  it('keeps the cap on a steady 60 Hz display', () => {
    const { ctrl, clock } = make();
    expect(feed(ctrl, clock, 900, FAST)).toEqual([]);
    expect(ctrl.dpr).toBe(1.5);
  });

  it('steps down one notch per slow window until the floor, then asks for lite mode once', () => {
    const { ctrl, clock } = make();
    expect(feed(ctrl, clock, 90, SLOW)).toEqual([{ type: 'dpr', dpr: 1.25 }]);
    expect(feed(ctrl, clock, 90, SLOW)).toEqual([{ type: 'dpr', dpr: 1 }]);
    expect(feed(ctrl, clock, 90, SLOW)).toEqual([{ type: 'dpr', dpr: 0.75 }]);
    // 下限で 1 窓目はまだ待つ、2 窓目で合図
    expect(feed(ctrl, clock, 90, SLOW)).toEqual([]);
    expect(feed(ctrl, clock, 90, SLOW)).toEqual([{ type: 'lite' }]);
    // 以後は何度遅くても二度と出さない
    expect(feed(ctrl, clock, 900, SLOW)).toEqual([]);
    expect(ctrl.dpr).toBe(0.75);
  });

  it('does not treat a steady 30 Hz display (33 ms per frame) as overload', () => {
    const { ctrl, clock } = make();
    expect(feed(ctrl, clock, 900, 33.4)).toEqual([]);
    expect(ctrl.dpr).toBe(1.5);
  });

  it('learns the display rate from idle frames, so a GPU-bound 60 Hz device is not mistaken for 30 Hz', () => {
    const { ctrl, clock } = make();
    // 一時停止中の軽いフレームで 60Hz と分かる
    for (let i = 0; i < 30; i++) ctrl.observe(16.7);
    // その後ずっと 2 垂直同期（33ms）なら、30Hz の表示ではなく重いと判断する
    expect(feed(ctrl, clock, 90, 33.4)).toEqual([{ type: 'dpr', dpr: 1.25 }]);
  });

  it('treats under 25 fps as slow whatever the display', () => {
    const { ctrl, clock } = make();
    expect(feed(ctrl, clock, 90, 45)).toEqual([{ type: 'dpr', dpr: 1.25 }]);
  });

  it('a single fast window between slow ones resets the lite streak (hysteresis)', () => {
    const { ctrl, clock } = make();
    feed(ctrl, clock, 270, SLOW); // → 0.75
    feed(ctrl, clock, 90, SLOW); // 下限で 1 窓目
    feed(ctrl, clock, 90, FAST); // 速い窓が挟まる
    expect(feed(ctrl, clock, 90, SLOW)).toEqual([]); // 数え直し
    expect(feed(ctrl, clock, 90, SLOW)).toEqual([{ type: 'lite' }]);
  });

  it('steps back up after a cooldown, at most twice per mount', () => {
    const { ctrl, clock } = make();
    feed(ctrl, clock, 180, SLOW); // → 1.0
    expect(ctrl.dpr).toBe(1);
    // 直後は戻さない（クールダウン 8 秒）
    expect(feed(ctrl, clock, 90, FAST)).toEqual([]);
    clock.now += 9000;
    expect(feed(ctrl, clock, 90, FAST)).toEqual([{ type: 'dpr', dpr: 1.25 }]);
    clock.now += 9000;
    expect(feed(ctrl, clock, 90, FAST)).toEqual([{ type: 'dpr', dpr: 1.5 }]);
    feed(ctrl, clock, 90, SLOW); // → 1.25
    clock.now += 9000;
    expect(feed(ctrl, clock, 90, FAST)).toEqual([]); // 戻し回数を使い切った
  });

  it('setCap restarts from the new cap (lite off restores full resolution) but never re-asks for lite', () => {
    const { ctrl, clock } = make();
    feed(ctrl, clock, 450, SLOW); // 下限 + lite 合図まで
    expect(ctrl.dpr).toBe(0.75);
    expect(ctrl.setCap(1.5, clock.now)).toBe(1.5);
    expect(ctrl.dpr).toBe(1.5);
    // また遅ければ解像度は下げるが、軽量モードの合図は二度と出さない
    feed(ctrl, clock, 270, SLOW);
    expect(ctrl.dpr).toBe(0.75);
    expect(feed(ctrl, clock, 900, SLOW)).toEqual([]);
  });

  it('setCap with the lite cap lowers the resolution immediately', () => {
    const { ctrl, clock } = make();
    expect(ctrl.setCap(1, clock.now)).toBe(1);
    expect(ctrl.dpr).toBe(1);
  });

  it('ignores huge gaps such as a tab switch', () => {
    const { ctrl, clock } = make();
    expect(feed(ctrl, clock, 90, 1000)).toEqual([]);
    expect(ctrl.dpr).toBe(1.5);
  });
});
