import { describe, expect, it } from 'vitest';
import {
  COMPACT_MAX_WIDTH,
  createPipBudget,
  MAX_PIPS,
  MAX_PIPS_COMPACT,
  maxPipsFor,
  PIP_MAX_INTERVAL,
  pipLayout,
  pipLevel,
  type PipRect,
  shouldUpdatePip,
} from './pip';

const overlaps = (a: PipRect, b: PipRect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('maxPipsFor', () => {
  it('is 0 in lite mode, 2 on phones and 4 otherwise', () => {
    expect(maxPipsFor({ lite: true, width: 1280 })).toBe(0);
    expect(maxPipsFor({ lite: false, width: 375 })).toBe(MAX_PIPS_COMPACT);
    expect(maxPipsFor({ lite: false, width: COMPACT_MAX_WIDTH })).toBe(MAX_PIPS_COMPACT);
    expect(maxPipsFor({ lite: false, width: COMPACT_MAX_WIDTH + 1 })).toBe(MAX_PIPS);
  });
});

describe('pipLayout', () => {
  it('places 4 PiPs on the right at 1280x720 without overlaps or leaving the safe area', () => {
    const rects = pipLayout({ width: 1280, height: 720, count: 4, tweaksOpen: false });
    expect(rects).toHaveLength(4);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(336); // 左の演目カードにかけない
      expect(r.x + r.w).toBeLessThanOrEqual(1280);
      expect(r.y).toBeGreaterThanOrEqual(112); // 上部ナビにかけない
      expect(r.y + r.h).toBeLessThanOrEqual(720 - 310); // 視点の表示・再生操作・演目バーにかけない
      expect(r.w / r.h).toBeCloseTo(16 / 9, 1);
    }
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i]!, rects[j]!)).toBe(false);
    // 読む順: 1 つ目が左上、2 つ目がその右
    expect(rects[0]!.x).toBeLessThan(rects[1]!.x);
    expect(rects[0]!.y).toBe(rects[1]!.y);
    expect(rects[2]!.y).toBeGreaterThan(rects[0]!.y);
  });

  it('uses a single column when there is room', () => {
    const rects = pipLayout({ width: 1920, height: 1080, count: 4, tweaksOpen: false });
    expect(new Set(rects.map((r) => r.x)).size).toBe(1);
  });

  it('moves left of the open settings panel', () => {
    const rects = pipLayout({ width: 1440, height: 900, count: 2, tweaksOpen: true });
    for (const r of rects) expect(r.x + r.w).toBeLessThanOrEqual(1440 - 36 - 280);
  });

  it('lays out a compact row above the transport on phones', () => {
    const rects = pipLayout({ width: 375, height: 667, count: 2, tweaksOpen: false });
    expect(rects).toHaveLength(2);
    expect(rects[0]!.y).toBe(rects[1]!.y);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(16);
      expect(r.x + r.w).toBeLessThanOrEqual(375 - 16);
      expect(r.y + r.h).toBeLessThanOrEqual(667 - 216);
    }
    expect(overlaps(rects[0]!, rects[1]!)).toBe(false);
  });

  it('returns fewer (or no) rects when the screen is too small', () => {
    expect(pipLayout({ width: 667, height: 375, count: 2, tweaksOpen: false })).toEqual([]);
    expect(
      pipLayout({ width: 1280, height: 420, count: 4, tweaksOpen: false }).length
    ).toBeLessThan(4);
    expect(pipLayout({ width: 1280, height: 720, count: 0, tweaksOpen: false })).toEqual([]);
  });
});

describe('pipLevel / shouldUpdatePip', () => {
  it('lowers the update rate before dropping PiPs', () => {
    expect(pipLevel(0, 4)).toEqual({ allowed: 4, interval: 1 });
    expect(pipLevel(1, 4)).toEqual({ allowed: 4, interval: 2 });
    expect(pipLevel(2, 4)).toEqual({ allowed: 4, interval: PIP_MAX_INTERVAL });
    expect(pipLevel(3, 4)).toEqual({ allowed: 3, interval: PIP_MAX_INTERVAL });
    expect(pipLevel(6, 4)).toEqual({ allowed: 0, interval: PIP_MAX_INTERVAL });
    expect(pipLevel(99, 4).allowed).toBe(0);
  });

  it('staggers updates so each PiP refreshes once per interval', () => {
    const interval = 3;
    for (let slot = 0; slot < 4; slot++) {
      let updates = 0;
      for (let f = 0; f < 30; f++) if (shouldUpdatePip(f, slot, interval)) updates++;
      expect(updates).toBe(10);
    }
    // 同じフレームに全部が集中しない
    const same = [0, 1, 2].filter((slot) => shouldUpdatePip(0, slot, interval));
    expect(same).toHaveLength(1);
    expect(shouldUpdatePip(7, 2, 1)).toBe(true);
  });
});

describe('createPipBudget', () => {
  const feed = (
    b: ReturnType<typeof createPipBudget>,
    dt: number,
    frames: number,
    t0: number,
    req = 4
  ) => {
    let t = t0;
    let last = null as ReturnType<typeof b.push>;
    for (let i = 0; i < frames; i++) {
      t += dt;
      last = b.push(dt, t, req) ?? last;
    }
    return { t, last };
  };

  it('ignores the warm-up period', () => {
    const b = createPipBudget({ windowFrames: 10, warmupMs: 1000 }, 0);
    feed(b, 50, 15, 0);
    expect(b.level).toBe(0);
  });

  it('degrades step by step while slow, down to zero PiPs, then stops', () => {
    const b = createPipBudget({ windowFrames: 10, warmupMs: 0 }, 0);
    let t = 0;
    const seen: number[] = [];
    for (let w = 0; w < 10; w++) {
      const r = feed(b, 50, 10, t);
      t = r.t;
      seen.push(b.current(4).allowed);
    }
    expect(b.current(4)).toEqual({ allowed: 0, interval: PIP_MAX_INTERVAL });
    expect(b.canDegrade(4)).toBe(false);
    // 間隔を先に上げ、それから 1 つずつ減らす
    expect(seen.slice(0, 6)).toEqual([4, 4, 3, 2, 1, 0]);
  });

  it('does not degrade at a steady 30Hz display (33ms frames)', () => {
    const b = createPipBudget({ windowFrames: 10, warmupMs: 0 }, 0);
    feed(b, 33.3, 100, 0);
    expect(b.level).toBe(0);
  });

  it('recovers one step after a fast window once the cooldown has passed', () => {
    const b = createPipBudget({ windowFrames: 10, warmupMs: 0, upgradeCooldownMs: 1000 }, 0);
    const { t } = feed(b, 50, 30, 0);
    expect(b.level).toBe(3);
    feed(b, 16.7, 10, t + 2000);
    expect(b.level).toBe(2);
  });

  it('clamps the level when PiPs are closed so recovery is not wasted', () => {
    const b = createPipBudget({ windowFrames: 10, warmupMs: 0, upgradeCooldownMs: 0 }, 0);
    const { t } = feed(b, 50, 80, 0);
    expect(b.current(4).allowed).toBe(0);
    feed(b, 16.7, 10, t, 1);
    // 要求 1 の上限段（3）に収めてから 1 段戻すので、1 つ描ける
    expect(b.current(1).allowed).toBe(1);
  });

  it('does nothing when no PiP is requested', () => {
    const b = createPipBudget({ windowFrames: 10, warmupMs: 0 }, 0);
    feed(b, 80, 50, 0, 0);
    expect(b.level).toBe(0);
  });
});
