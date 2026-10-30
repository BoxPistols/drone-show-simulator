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

  it('accepts prefs saved before `lite` existed (older localStorage)', () => {
    expect(isPrefs(legacy)).toBe(true);
    expect(withDefaults(legacy as never).lite).toBe(false);
    expect(withDefaults(legacy as never).palette).toBe('sakura');
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

  it('sets palette, sky and speed', () => {
    let s = prefsReducer(DEFAULT_PREFS, { type: 'palette', value: 'mono' });
    s = prefsReducer(s, { type: 'sky', value: 'twilight' });
    s = prefsReducer(s, { type: 'speed', value: 5 });
    expect(s).toMatchObject({ palette: 'mono', sky: 'twilight', speed: 5 });
  });
});
