import { describe, expect, it } from 'vitest';
import { normalizeShow } from './showSchema';

const KNOWN = ['sphere', 'helix', 'torus', 'wave', 'bear', 'dna', 'cube', 'heart', 'galaxy'];

describe('normalizeShow', () => {
  it('rejects null/undefined', () => {
    expect(normalizeShow(null, KNOWN).ok).toBe(false);
    expect(normalizeShow(undefined, KNOWN).ok).toBe(false);
  });

  it('rejects empty array with a useful error', () => {
    const r = normalizeShow([], KNOWN);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/演目が空/);
  });

  it('rejects unrecognized object format', () => {
    const r = normalizeShow({ foo: 'bar' }, KNOWN);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/認識できる/);
  });

  describe('format A (bare array)', () => {
    it('accepts a minimal formation array', () => {
      const r = normalizeShow([{ id: 'sphere', dur: 42 }], KNOWN);
      expect(r.ok).toBe(true);
      expect(r.formations).toHaveLength(1);
      expect(r.formations?.[0]?.typeId).toBe('sphere');
      expect(r.bpm).toBeNull();
    });
  });

  describe('format B (v1 object)', () => {
    it('captures meta.bpm and audio metadata', () => {
      const r = normalizeShow(
        {
          schema: 'astra-flock-show/1',
          formations: [{ id: 'bear', dur: 54 }],
          meta: { bpm: 140 },
          audio: { name: 'track.mp3', duration: 200 },
        },
        KNOWN
      );
      expect(r.ok).toBe(true);
      expect(r.bpm).toBe(140);
      expect(r.audio?.name).toBe('track.mp3');
      expect(r.audio?.duration).toBe(200);
    });
  });

  describe('format C (named preset)', () => {
    it('accepts savedAt + formations', () => {
      const r = normalizeShow(
        { savedAt: 1700000000000, formations: [{ id: 'helix', dur: 38 }] },
        KNOWN
      );
      expect(r.ok).toBe(true);
      expect(r.formations).toHaveLength(1);
      expect(r.bpm).toBeNull();
    });
  });

  it('fills defaults for missing fields', () => {
    const r = normalizeShow([{ id: 'sphere' }], KNOWN);
    expect(r.ok).toBe(true);
    const f = r.formations![0]!;
    expect(f.easing).toBe('Ease-both');
    expect(f.paletteOverride).toBeNull();
    expect(f.altitude).toBe(60);
    expect(f.spread).toBe(55);
    expect(f.speed).toBe(1.0);
    expect(f.drones).toBe(660);
    expect(f.dur).toBe(30);
  });

  it('falls back unknown typeId to sphere and counts the fallback', () => {
    const r = normalizeShow([{ id: 'sphere' }, { id: 'nonexistent-shape' }, { id: 'bear' }], KNOWN);
    expect(r.ok).toBe(true);
    expect(r.formations?.[0]?.typeId).toBe('sphere');
    expect(r.formations?.[1]?.typeId).toBe('sphere');
    expect(r.formations?.[2]?.typeId).toBe('bear');
    expect(r.fallbackCount).toBe(1);
  });

  it('uses explicit typeId over id for shape lookup', () => {
    const r = normalizeShow([{ id: 'my-custom', typeId: 'sphere' }], KNOWN);
    expect(r.ok).toBe(true);
    expect(r.formations?.[0]?.typeId).toBe('sphere');
    expect(r.fallbackCount).toBe(0);
  });

  it('clamps BPM to 30..300', () => {
    const low = normalizeShow({ formations: [{ id: 'sphere' }], meta: { bpm: 10 } }, KNOWN);
    expect(low.bpm).toBe(30);
    const high = normalizeShow({ formations: [{ id: 'sphere' }], meta: { bpm: 500 } }, KNOWN);
    expect(high.bpm).toBe(300);
  });

  it('throws when a formation lacks an id', () => {
    expect(() => normalizeShow([{ dur: 30 }], KNOWN)).toThrow(/id がありません/);
  });

  it('uses default knownIds (the 9 canonical) when none supplied', () => {
    const r = normalizeShow([{ id: 'totally-unknown' }]);
    expect(r.ok).toBe(true);
    expect(r.formations?.[0]?.typeId).toBe('sphere');
    expect(r.fallbackCount).toBe(1);
  });

  it('accepts arbitrary id strings when knownIds is explicitly empty', () => {
    const r = normalizeShow([{ id: 'anything' }], []);
    expect(r.ok).toBe(true);
    expect(r.formations?.[0]?.typeId).toBe('anything');
    expect(r.fallbackCount).toBe(0);
  });
});
