import { describe, expect, it } from 'vitest';
import { advanceClock, createClock, seekClock } from './clock';

describe('clock', () => {
  it('advances and wraps at the total duration without bumping the version', () => {
    const c = createClock(0);
    advanceClock(c, 0.5, 10);
    advanceClock(c, 9.7, 10);
    expect(c.time).toBeCloseTo(0.2);
    expect(c.version).toBe(0);
  });

  it('seeking bumps the version so paused readers know to redraw', () => {
    const c = createClock(5);
    seekClock(c, 1.5);
    expect(c.time).toBe(1.5);
    expect(c.version).toBe(1);
    seekClock(c, 1.5);
    expect(c.version).toBe(2);
  });

  it('never divides by zero when the programme is empty', () => {
    const c = createClock(0);
    advanceClock(c, 0.3, 0);
    expect(c.time).toBeCloseTo(0.3);
  });
});
