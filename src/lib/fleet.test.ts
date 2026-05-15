import { describe, expect, it } from 'vitest';
import { FLEET } from '~/lib/formations';
import { fleetStats, generateFleet, STATUS_META } from './fleet';

describe('generateFleet', () => {
  const fleet = generateFleet();

  it('produces exactly FLEET.total drones', () => {
    expect(fleet).toHaveLength(FLEET.total);
  });

  it('assigns sequential AS-### ids starting at 001', () => {
    expect(fleet[0]?.id).toBe('AS-001');
    expect(fleet[fleet.length - 1]?.id).toBe(`AS-${String(FLEET.total).padStart(3, '0')}`);
  });

  it('status counts match FLEET snapshot exactly', () => {
    const stats = fleetStats(fleet);
    expect(stats.active).toBe(FLEET.active);
    expect(stats.charging).toBe(FLEET.charging);
    expect(stats.standby).toBe(FLEET.standby);
    expect(stats.maint).toBe(FLEET.maint);
  });

  it('every battery is 0..100', () => {
    for (const d of fleet) {
      expect(d.bat).toBeGreaterThanOrEqual(0);
      expect(d.bat).toBeLessThanOrEqual(100);
    }
  });

  it('maint drones have GPS lock false', () => {
    for (const d of fleet) {
      if (d.status === 'maint') expect(d.gpsLock).toBe(false);
    }
  });

  it('is deterministic across calls (seed 42)', () => {
    const second = generateFleet();
    expect(second.map((d) => d.id)).toEqual(fleet.map((d) => d.id));
    expect(second.map((d) => d.bat)).toEqual(fleet.map((d) => d.bat));
  });
});

describe('STATUS_META', () => {
  it('covers all status values', () => {
    expect(Object.keys(STATUS_META)).toEqual(['active', 'charging', 'standby', 'maint']);
  });
});
