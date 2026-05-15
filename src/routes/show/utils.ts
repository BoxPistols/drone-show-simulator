import { SPEED_STEPS, type SpeedStep } from './types';

export function fmtTime(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtSpeed(s: SpeedStep): string {
  return (s < 1 ? String(s) : String(Math.round(s))) + '×';
}

export function isSpeedStep(value: number): value is SpeedStep {
  return (SPEED_STEPS as readonly number[]).includes(value);
}

/** Snap an arbitrary speed value to the nearest valid step. */
export function nearestSpeed(v: number): SpeedStep {
  let best: SpeedStep = 1;
  let dist = Infinity;
  for (const step of SPEED_STEPS) {
    const d = Math.abs(step - v);
    if (d < dist) {
      dist = d;
      best = step;
    }
  }
  return best;
}
