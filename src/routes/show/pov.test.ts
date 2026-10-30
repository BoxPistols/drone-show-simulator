import { describe, expect, it } from 'vitest';
import { FORMATIONS } from '~/lib/formations';
import { nextCameraMode, pickPovDrone } from './pov';

describe('nextCameraMode', () => {
  it('cycles orbit → drone → fly → orbit', () => {
    expect(nextCameraMode('orbit')).toBe('drone');
    expect(nextCameraMode('drone')).toBe('fly');
    expect(nextCameraMode('fly')).toBe('orbit');
  });
});

describe('pickPovDrone', () => {
  const sphere = FORMATIONS[0]!.targets;

  it('picks a drone from the outer third of the formation', () => {
    const n = sphere.length / 3;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < n; i++) {
      cx += sphere[i * 3]!;
      cy += sphere[i * 3 + 1]!;
      cz += sphere[i * 3 + 2]!;
    }
    cx /= n;
    cy /= n;
    cz /= n;
    const dists = Array.from({ length: n }, (_, i) =>
      Math.hypot(sphere[i * 3]! - cx, sphere[i * 3 + 1]! - cy, sphere[i * 3 + 2]! - cz)
    ).sort((a, b) => b - a);
    const cutoff = dists[Math.floor(n / 3) - 1]!;
    for (const r of [0, 0.37, 0.99]) {
      const i = pickPovDrone(sphere, -1, () => r);
      const d = Math.hypot(sphere[i * 3]! - cx, sphere[i * 3 + 1]! - cy, sphere[i * 3 + 2]! - cz);
      expect(d).toBeGreaterThanOrEqual(cutoff - 1e-9);
    }
  });

  it('never returns the excluded drone', () => {
    const first = pickPovDrone(sphere, -1, () => 0);
    expect(pickPovDrone(sphere, first, () => 0)).not.toBe(first);
  });

  it('is safe on tiny inputs', () => {
    expect(pickPovDrone(new Float32Array(0))).toBe(0);
    expect(pickPovDrone(new Float32Array([1, 2, 3]), 0)).toBe(0);
  });
});
