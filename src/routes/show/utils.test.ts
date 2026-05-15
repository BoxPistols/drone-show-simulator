import { describe, expect, it } from 'vitest';
import { fmtSpeed, fmtTime, isSpeedStep, nearestSpeed } from './utils';

describe('fmtTime', () => {
  it('formats seconds as MM:SS', () => {
    expect(fmtTime(0)).toBe('00:00');
    expect(fmtTime(59)).toBe('00:59');
    expect(fmtTime(60)).toBe('01:00');
    expect(fmtTime(605.7)).toBe('10:05');
  });

  it('clamps negative input to 00:00', () => {
    expect(fmtTime(-5)).toBe('00:00');
  });
});

describe('fmtSpeed', () => {
  it('keeps fractions for sub-1× values', () => {
    expect(fmtSpeed(0.25)).toBe('0.25×');
    expect(fmtSpeed(0.5)).toBe('0.5×');
  });
  it('drops trailing zeros for whole multiplier values', () => {
    expect(fmtSpeed(1)).toBe('1×');
    expect(fmtSpeed(10)).toBe('10×');
  });
});

describe('isSpeedStep / nearestSpeed', () => {
  it('isSpeedStep narrows to the canonical set', () => {
    expect(isSpeedStep(2)).toBe(true);
    expect(isSpeedStep(3)).toBe(false);
  });
  it('nearestSpeed snaps to the closest valid step', () => {
    expect(nearestSpeed(0.4)).toBe(0.5);
    expect(nearestSpeed(7)).toBe(5);
    expect(nearestSpeed(20)).toBe(10);
  });
});
