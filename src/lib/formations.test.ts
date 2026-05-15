import { describe, expect, it } from 'vitest';
import {
  DRONE_COUNT,
  FLEET,
  FORMATIONS,
  PALETTES,
  SKIES,
  TOTAL_TIME,
  findFormation,
  isFormationId,
} from './formations';

describe('FORMATIONS', () => {
  it('exposes the canonical 660-drone count', () => {
    expect(DRONE_COUNT).toBe(660);
  });

  it('contains 9 演目 with unique ids', () => {
    expect(FORMATIONS).toHaveLength(9);
    const ids = FORMATIONS.map((f) => f.id);
    expect(new Set(ids).size).toBe(9);
  });

  it('places bear at index 4 (middle) and galaxy as finale', () => {
    expect(FORMATIONS[4]?.id).toBe('bear');
    expect(FORMATIONS[FORMATIONS.length - 1]?.id).toBe('galaxy');
  });

  it('pre-computes Float32Array targets of length DRONE_COUNT*3', () => {
    for (const f of FORMATIONS) {
      expect(f.targets).toBeInstanceOf(Float32Array);
      expect(f.targets.length).toBe(DRONE_COUNT * 3);
    }
  });

  it('has TOTAL_TIME equal to sum of formation durations', () => {
    const sum = FORMATIONS.reduce((s, f) => s + f.dur, 0);
    expect(TOTAL_TIME).toBe(sum);
  });

  it('has cumulative monotonic start times', () => {
    let prevEnd = 0;
    for (const f of FORMATIONS) {
      expect(f.start).toBe(prevEnd);
      prevEnd += f.dur;
    }
  });

  it('produces finite positions for every drone (no NaN)', () => {
    for (const f of FORMATIONS) {
      for (let i = 0; i < f.targets.length; i++) {
        expect(Number.isFinite(f.targets[i])).toBe(true);
      }
    }
  });

  it('keeps positions within plausible world bounds (x/z ±200, y -20..250)', () => {
    for (const f of FORMATIONS) {
      for (let i = 0; i < f.targets.length; i += 3) {
        const x = f.targets[i]!;
        const y = f.targets[i + 1]!;
        const z = f.targets[i + 2]!;
        expect(Math.abs(x)).toBeLessThan(200);
        expect(y).toBeGreaterThanOrEqual(-20);
        expect(y).toBeLessThan(250);
        expect(Math.abs(z)).toBeLessThan(200);
      }
    }
  });
});

describe('FLEET snapshot', () => {
  it('sums status counts to total', () => {
    const { total, active, charging, standby, maint } = FLEET;
    expect(active + charging + standby + maint).toBe(total);
    expect(total).toBe(660);
  });

  it('exposes derived availability counters', () => {
    expect(FLEET.available).toBe(FLEET.active);
    expect(FLEET.nonFlyable).toBe(FLEET.maint);
    expect(FLEET.reservable).toBe(FLEET.charging + FLEET.standby);
  });
});

describe('PALETTES', () => {
  it('has 5 entries with 4-color arrays each', () => {
    const keys = Object.keys(PALETTES);
    expect(keys).toHaveLength(5);
    for (const k of keys) {
      expect(PALETTES[k as keyof typeof PALETTES].colors).toHaveLength(4);
    }
  });
});

describe('SKIES', () => {
  it('has 3 entries with 3-color background gradients', () => {
    const keys = Object.keys(SKIES);
    expect(keys).toHaveLength(3);
    for (const k of keys) {
      expect(SKIES[k as keyof typeof SKIES].bg).toHaveLength(3);
    }
  });
});

describe('helpers', () => {
  it('findFormation returns the matching formation', () => {
    expect(findFormation('bear')?.jp).toBe('熊');
    expect(findFormation('does-not-exist')).toBeUndefined();
  });

  it('isFormationId narrows correctly', () => {
    expect(isFormationId('sphere')).toBe(true);
    expect(isFormationId('foo')).toBe(false);
  });
});
