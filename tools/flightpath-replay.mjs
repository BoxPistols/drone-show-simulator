#!/usr/bin/env node
// Astra Flock — flight path replay demo
// 書出した astra-flock-flightpath/1 JSON を読み、実機受信器が受け取る想定で
// 時刻通りにキーフレームを dispatch する流れをテキストで表示。
// Usage:
//   node tools/flightpath-replay.mjs <flightpath.json> [speed]
//   speed: 再生倍率 (default 20x、リアルタイムで追うなら 1)
import { readFileSync } from 'node:fs';

const [, , path, speedArg] = process.argv;
if (!path) {
  console.error('Usage: node tools/flightpath-replay.mjs <flightpath.json> [speed=20]');
  process.exit(1);
}

const data = JSON.parse(readFileSync(path, 'utf8'));
if (data.schema !== 'astra-flock-flightpath/1') {
  console.error(`Error: expected schema "astra-flock-flightpath/1", got "${data.schema}"`);
  process.exit(1);
}

const speed = Math.max(0.1, parseFloat(speedArg) || 20);
const droneCount = data.drones.length;
const kfCount = data.drones[0]?.keyframes.length || 0;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' Astra Flock — Flight Path Replay (mock)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(` Drones:       ${droneCount}`);
console.log(` Keyframes/∞:  ${kfCount}`);
console.log(` Total:        ${data.totalDuration}s @ ${data.bpm} BPM`);
console.log(` Fleet:        ${data.fleet?.available || '?'} / ${data.fleet?.total || '?'}`);
console.log(` Audio:        ${data.audio?.name || '(none)'}`);
console.log(` Speed:        ${speed}x`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const t0 = Date.now();
let emittedKf = -1;

const fmtTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(1).padStart(4, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
};

const tick = () => {
  const elapsed = ((Date.now() - t0) / 1000) * speed;
  if (elapsed >= data.totalDuration) {
    console.log(`\n[${fmtTime(data.totalDuration)}] ✓ Show complete`);
    process.exit(0);
  }

  // Find current keyframe index (last keyframe whose t <= elapsed)
  const sample = data.drones[0].keyframes;
  let kf = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i].t <= elapsed) kf = i;
  }

  if (kf !== emittedKf) {
    emittedKf = kf;
    const formation = sample[kf].formation;
    // Compute centroid + bounds as a summary of what drones are doing
    let cx = 0, cy = 0, cz = 0, minY = Infinity, maxY = -Infinity;
    for (const d of data.drones) {
      const k = d.keyframes[kf];
      cx += k.x; cy += k.y; cz += k.z;
      if (k.y < minY) minY = k.y;
      if (k.y > maxY) maxY = k.y;
    }
    cx /= droneCount; cy /= droneCount; cz /= droneCount;
    console.log(
      `[${fmtTime(elapsed)}] KF ${String(kf+1).padStart(2)}/${kfCount} ` +
      `${formation.padEnd(8)} ` +
      `centroid=(${cx.toFixed(1).padStart(6)}, ${cy.toFixed(1).padStart(6)}, ${cz.toFixed(1).padStart(6)})  ` +
      `altRange=${minY.toFixed(0)}..${maxY.toFixed(0)}m`
    );
  }

  setTimeout(tick, 100);
};
tick();
