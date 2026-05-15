import { describe, expect, it } from 'vitest';
import { EASING_FN, ease } from './easing';

describe('easing', () => {
  it('all curves anchor at f(0)=0 and f(1)=1', () => {
    for (const name of Object.keys(EASING_FN) as (keyof typeof EASING_FN)[]) {
      const fn = EASING_FN[name];
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
    }
  });

  it('Linear is identity', () => {
    expect(EASING_FN.Linear(0.42)).toBe(0.42);
  });

  it('Ease-in is below identity for t in (0,1)', () => {
    expect(EASING_FN['Ease-in'](0.5)).toBeLessThan(0.5);
  });

  it('Ease-out is above identity for t in (0,1)', () => {
    expect(EASING_FN['Ease-out'](0.5)).toBeGreaterThan(0.5);
  });

  it('Ease-both is symmetric around 0.5', () => {
    const fn = EASING_FN['Ease-both'];
    expect(fn(0.5)).toBeCloseTo(0.5, 5);
    expect(fn(0.25) + fn(0.75)).toBeCloseTo(1, 5);
  });

  it('Elastic produces finite values for the full range', () => {
    for (let i = 0; i <= 100; i++) {
      const v = EASING_FN.Elastic(i / 100);
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('ease() dispatches by name', () => {
    expect(ease('Linear', 0.7)).toBe(0.7);
  });
});
