import { describe, expect, it } from 'vitest';
import { droneIdFromIndex, indexFromDroneId, povHref, stepDroneIndex } from './droneId';
import { generateFleet } from './fleet';
import { DRONE_COUNT, FLEET } from './formations';

describe('droneIdFromIndex / indexFromDroneId', () => {
  it('formats with the AS- prefix and three digits', () => {
    expect(droneIdFromIndex(0)).toBe('AS-001');
    expect(droneIdFromIndex(41)).toBe('AS-042');
    expect(droneIdFromIndex(659)).toBe('AS-660');
  });

  it('round-trips every drone in the show', () => {
    for (let i = 0; i < DRONE_COUNT; i++) {
      expect(indexFromDroneId(droneIdFromIndex(i))).toBe(i);
    }
  });

  it('accepts lower case, missing prefix, extra zeros and spaces', () => {
    expect(indexFromDroneId('as-042')).toBe(41);
    expect(indexFromDroneId('AS042')).toBe(41);
    expect(indexFromDroneId('42')).toBe(41);
    expect(indexFromDroneId('AS-0042')).toBe(41);
    expect(indexFromDroneId('  7 ')).toBe(6);
  });

  it('rejects out-of-range and malformed input', () => {
    for (const bad of ['', 'AS-', 'AS-000', '0', '661', 'AS-661', 'D-0123', 'AS-1a', '-1', '1.5']) {
      expect(indexFromDroneId(bad)).toBeNull();
    }
  });
});

describe('fleet roster ↔ show index', () => {
  it('fleet ids, idx and formation slot all map to the same show index', () => {
    const fleet = generateFleet();
    expect(fleet).toHaveLength(FLEET.total);
    expect(FLEET.total).toBe(DRONE_COUNT);
    for (const d of fleet) {
      expect(indexFromDroneId(d.id)).toBe(d.idx);
      expect(d.slot).toBe(d.idx);
      expect(droneIdFromIndex(d.idx)).toBe(d.id);
    }
  });
});

describe('stepDroneIndex', () => {
  it('moves by one in ID order and wraps', () => {
    expect(stepDroneIndex(5, 1)).toBe(6);
    expect(stepDroneIndex(5, -1)).toBe(4);
    expect(stepDroneIndex(DRONE_COUNT - 1, 1)).toBe(0);
    expect(stepDroneIndex(0, -1)).toBe(DRONE_COUNT - 1);
  });

  it('starts from either end when nothing is selected', () => {
    expect(stepDroneIndex(-1, 1)).toBe(0);
    expect(stepDroneIndex(-1, -1)).toBe(DRONE_COUNT - 1);
  });
});

describe('povHref', () => {
  it('links to the show page in drone view', () => {
    expect(povHref(122)).toBe('/?pov=AS-123');
  });
});
