import { describe, expect, it } from 'vitest';
import { PENTATONIC, ROOT_HZ, bellSemitone, chordForFormation, semitoneToHz } from './scale';

describe('scale', () => {
  it('converts semitones to Hz from A2', () => {
    expect(semitoneToHz(0)).toBe(ROOT_HZ);
    expect(semitoneToHz(12)).toBeCloseTo(220);
    expect(semitoneToHz(-12)).toBeCloseTo(55);
  });

  it('builds a five-note sus/add9 chord on a pentatonic root per formation', () => {
    expect(chordForFormation(0)).toEqual([0, 7, 12, 14, 19]);
    expect(chordForFormation(1)).toEqual([2, 9, 14, 16, 21]);
    // 9 演目目はペンタトニックの 5 音を一周して 5 音目へ
    expect(chordForFormation(4)[0]).toBe(PENTATONIC[4]);
    expect(chordForFormation(5)[0]).toBe(PENTATONIC[0]);
    expect(chordForFormation(-1)[0]).toBe(PENTATONIC[4]);
  });

  it('bell notes stay on the pentatonic scale two or three octaves up', () => {
    for (const r of [0, 0.2, 0.49, 0.5, 0.8, 0.999]) {
      const semi = bellSemitone(2, r);
      const rel = ((semi - chordForFormation(2)[0]!) % 12) + 12;
      expect((PENTATONIC as readonly number[]).includes(rel % 12)).toBe(true);
      expect(semi - chordForFormation(2)[0]!).toBeGreaterThanOrEqual(24);
      expect(semi - chordForFormation(2)[0]!).toBeLessThan(48);
    }
  });
});
