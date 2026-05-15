import { FLEET } from '~/lib/formations';

export const FLEET_MODELS = ['DS-A1', 'DS-A1', 'DS-A1', 'DS-A2', 'DS-A2 Pro'] as const;
export const FLEET_FIRMWARE = ['v4.2.1', 'v4.2.1', 'v4.2.1', 'v4.2.0', 'v4.1.8'] as const;

export type DroneStatus = 'active' | 'charging' | 'standby' | 'maint';

export interface Drone {
  id: string;
  idx: number;
  status: DroneStatus;
  bat: number;
  flights: number;
  hours: string;
  lastMaint: number;
  gpsLock: boolean;
  slot: number;
  model: string;
  firmware: string;
  temp: string;
  rssi: number;
}

export interface FleetStats {
  active: number;
  charging: number;
  standby: number;
  maint: number;
  lowBat: number;
}

/** LCG-based deterministic PRNG so generateFleet is stable across renders. */
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const STATUS_DIST: readonly { status: DroneStatus; count: number }[] = [
  { status: 'active', count: FLEET.active },
  { status: 'charging', count: FLEET.charging },
  { status: 'standby', count: FLEET.standby },
  { status: 'maint', count: FLEET.maint },
];

/**
 * Generates the canonical 660-drone roster with deterministic-but-realistic
 * battery / flight / firmware data. Same seed (42) used in the legacy build,
 * so the entire fleet is byte-identical to the previous SPA on any cell.
 */
export function generateFleet(): Drone[] {
  const out: Drone[] = [];
  const statusDist: DroneStatus[] = [];
  for (const { status, count } of STATUS_DIST) {
    for (let i = 0; i < count; i++) statusDist.push(status);
  }
  const r = prng(42);
  for (let i = statusDist.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [statusDist[i], statusDist[j]] = [statusDist[j]!, statusDist[i]!];
  }

  for (let i = 0; i < FLEET.total; i++) {
    const rr = prng(i * 7 + 1);
    const id = `AS-${String(i + 1).padStart(3, '0')}`;
    const status = statusDist[i] ?? 'active';
    const bat =
      status === 'maint'
        ? Math.floor(rr() * 30)
        : status === 'charging'
          ? 30 + Math.floor(rr() * 50)
          : status === 'standby'
            ? 60 + Math.floor(rr() * 30)
            : 72 + Math.floor(rr() * 28);
    const flights = 180 + Math.floor(rr() * 420);
    const hours = (flights * 0.32 + rr() * 20).toFixed(1);
    const lastMaint = Math.floor(rr() * 42);
    const gpsLock = status !== 'maint';
    const model = FLEET_MODELS[Math.floor(rr() * FLEET_MODELS.length)] ?? 'DS-A1';
    const firmware = FLEET_FIRMWARE[Math.floor(rr() * FLEET_FIRMWARE.length)] ?? 'v4.2.1';
    const temp = (22 + rr() * 18).toFixed(1);
    const rssi = -(45 + Math.floor(rr() * 25));
    out.push({
      id,
      idx: i,
      status,
      bat,
      flights,
      hours,
      lastMaint,
      gpsLock,
      slot: i,
      model,
      firmware,
      temp,
      rssi,
    });
  }
  return out;
}

export function fleetStats(drones: readonly Drone[]): FleetStats {
  const s: FleetStats = { active: 0, charging: 0, standby: 0, maint: 0, lowBat: 0 };
  for (const d of drones) {
    s[d.status]++;
    if (d.bat < 25) s.lowBat++;
  }
  return s;
}

export const STATUS_META: Readonly<Record<DroneStatus, { jp: string; en: string; chip: string }>> =
  Object.freeze({
    active: { jp: '稼働中', en: 'Active', chip: 'chip-ok' },
    charging: { jp: '充電中', en: 'Charging', chip: 'chip-warn' },
    standby: { jp: '待機', en: 'Standby', chip: 'chip-standby' },
    maint: { jp: '整備', en: 'Maintenance', chip: 'chip-err' },
  });
