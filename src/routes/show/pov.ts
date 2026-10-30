import { CAMERA_MODES, type CameraMode } from './types';

export const CAMERA_META: Readonly<Record<CameraMode, { jp: string; en: string; desc: string }>> = {
  orbit: { jp: '観客', en: 'Orbit', desc: 'ドラッグで回転、ホイール / ピンチで距離' },
  drone: { jp: '機体目線', en: 'Drone cam', desc: '機体のカメラから編隊を見る。ドラッグで見回し' },
  fly: { jp: '360°', en: 'Fly-around', desc: '編隊のまわりを自動で一周する' },
};

export function nextCameraMode(mode: CameraMode): CameraMode {
  const i = CAMERA_MODES.indexOf(mode);
  return CAMERA_MODES[(i + 1) % CAMERA_MODES.length]!;
}

/**
 * 機体目線に乗る機体を選ぶ。編隊の重心から遠い（外側の）3 分の 1 から選ぶと、
 * 編隊全体が視界に入って見応えがある。`exclude` と同じ機体は避ける。
 */
export function pickPovDrone(
  targets: Float32Array,
  exclude = -1,
  rand: () => number = Math.random
): number {
  const n = Math.floor(targets.length / 3);
  if (n === 0) return 0;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    cx += targets[i * 3]!;
    cy += targets[i * 3 + 1]!;
    cz += targets[i * 3 + 2]!;
  }
  cx /= n;
  cy /= n;
  cz /= n;
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const da = Math.hypot(targets[a * 3]! - cx, targets[a * 3 + 1]! - cy, targets[a * 3 + 2]! - cz);
    const db = Math.hypot(targets[b * 3]! - cx, targets[b * 3 + 1]! - cy, targets[b * 3 + 2]! - cz);
    return db - da;
  });
  const pool = order.slice(0, Math.max(1, Math.floor(n / 3))).filter((i) => i !== exclude);
  if (pool.length === 0) return order[0]!;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]!;
}
