import { describe, expect, it } from 'vitest';
import { isPrefs, prefsReducer, withDefaults } from './prefs';
import { DEFAULT_PREFS } from './types';

const legacy = {
  palette: 'sakura',
  sky: 'dawn',
  trails: true,
  rotate: false,
  glow: true,
  droneSize: 1.4,
  speed: 2,
};

describe('isPrefs', () => {
  it('accepts a full prefs object', () => {
    expect(isPrefs(DEFAULT_PREFS)).toBe(true);
  });

  it('accepts prefs saved before `lite` / `music` / `camera` existed (older localStorage)', () => {
    expect(isPrefs(legacy)).toBe(true);
    const filled = withDefaults(legacy as never);
    expect(filled.lite).toBe(false);
    expect(filled.music).toBe(false);
    expect(filled.volume).toBe(0.6);
    expect(filled.camera).toBe('orbit');
    expect(filled.palette).toBe('sakura');
  });

  it('validates the newer fields when present', () => {
    expect(isPrefs({ ...legacy, camera: 'drone', music: true, volume: 0.3 })).toBe(true);
    expect(isPrefs({ ...legacy, camera: 'satellite' })).toBe(false);
    expect(isPrefs({ ...legacy, volume: 1.5 })).toBe(false);
    expect(isPrefs({ ...legacy, music: 'on' })).toBe(false);
  });

  it('rejects unknown palette / sky / speed values and non-objects', () => {
    expect(isPrefs({ ...legacy, palette: 'neon' })).toBe(false);
    expect(isPrefs({ ...legacy, sky: 'noon' })).toBe(false);
    expect(isPrefs({ ...legacy, speed: 3 })).toBe(false);
    expect(isPrefs({ ...legacy, lite: 'yes' })).toBe(false);
    expect(isPrefs(null)).toBe(false);
    expect(isPrefs('{}')).toBe(false);
  });
});

describe('prefsReducer', () => {
  it('toggles boolean keys', () => {
    const next = prefsReducer(DEFAULT_PREFS, { type: 'toggle', key: 'lite' });
    expect(next.lite).toBe(true);
    expect(prefsReducer(next, { type: 'toggle', key: 'lite' }).lite).toBe(false);
  });

  it('`set` returns the same object when nothing changes (no re-render, no re-save)', () => {
    expect(prefsReducer(DEFAULT_PREFS, { type: 'set', key: 'lite', value: false })).toBe(
      DEFAULT_PREFS
    );
    expect(prefsReducer(DEFAULT_PREFS, { type: 'set', key: 'lite', value: true }).lite).toBe(true);
  });

  it('clamps drone size to 0.5–2.5', () => {
    expect(prefsReducer(DEFAULT_PREFS, { type: 'droneSize', value: 9 }).droneSize).toBe(2.5);
    expect(prefsReducer(DEFAULT_PREFS, { type: 'droneSize', value: 0 }).droneSize).toBe(0.5);
  });

  it('sets camera and clamps volume, returning the same object when unchanged', () => {
    const a = prefsReducer(DEFAULT_PREFS, { type: 'camera', value: 'fly' });
    expect(a.camera).toBe('fly');
    expect(prefsReducer(a, { type: 'camera', value: 'fly' })).toBe(a);
    expect(prefsReducer(DEFAULT_PREFS, { type: 'volume', value: 3 }).volume).toBe(1);
    expect(prefsReducer(DEFAULT_PREFS, { type: 'volume', value: -1 }).volume).toBe(0);
    expect(prefsReducer(DEFAULT_PREFS, { type: 'volume', value: Number.NaN })).toBe(DEFAULT_PREFS);
  });

  it('sets palette, sky and speed', () => {
    let s = prefsReducer(DEFAULT_PREFS, { type: 'palette', value: 'mono' });
    s = prefsReducer(s, { type: 'sky', value: 'twilight' });
    s = prefsReducer(s, { type: 'speed', value: 5 });
    expect(s).toMatchObject({ palette: 'mono', sky: 'twilight', speed: 5 });
  });
});
