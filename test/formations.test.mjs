// Astra Flock — formations.js smoke tests
// Node's built-in test runner + vm to sandbox formations.js (runs as browser script).
// Run: `npm test` or `node --test test/`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(__dirname, '../formations.js'), 'utf8');

const sandbox = { window: {}, console, Math, Float32Array, Object };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const af = sandbox.window.AstraFlock;

test('AstraFlock global exposes expected shape', () => {
  assert.ok(af, 'window.AstraFlock should be set');
  assert.equal(typeof af.DRONE_COUNT, 'number');
  assert.ok(Array.isArray(af.FORMATIONS));
  assert.ok(af.PALETTES);
  assert.ok(af.SKIES);
  assert.ok(af.FLEET);
  assert.equal(typeof af.TOTAL_TIME, 'number');
});

test('DRONE_COUNT is 660 (Astra Flock signature)', () => {
  assert.equal(af.DRONE_COUNT, 660);
});

test('FORMATIONS contains 9 演目 with unique ids', () => {
  assert.equal(af.FORMATIONS.length, 9);
  const ids = af.FORMATIONS.map(f => f.id);
  assert.equal(new Set(ids).size, 9, 'all ids must be unique');
});

test('bear is at index 4 (middle) and galaxy is last (finale)', () => {
  assert.equal(af.FORMATIONS[4].id, 'bear', 'bear should be at middle position');
  assert.equal(af.FORMATIONS[af.FORMATIONS.length - 1].id, 'galaxy', 'galaxy should be the finale');
});

test('each formation has pre-computed targets with DRONE_COUNT*3 floats', () => {
  for (const f of af.FORMATIONS) {
    assert.ok(f.targets instanceof Float32Array, `${f.id}.targets should be Float32Array`);
    assert.equal(f.targets.length, af.DRONE_COUNT * 3, `${f.id}.targets should have ${af.DRONE_COUNT * 3} entries`);
  }
});

test('TOTAL_TIME equals sum of formation durations', () => {
  const sum = af.FORMATIONS.reduce((s, f) => s + f.dur, 0);
  assert.equal(af.TOTAL_TIME, sum);
});

test('formation start times are cumulative and monotonic', () => {
  let prevEnd = 0;
  for (const f of af.FORMATIONS) {
    assert.equal(f.start, prevEnd, `${f.id}.start should equal previous cumulative end`);
    prevEnd += f.dur;
  }
});

test('FLEET distribution sums to total', () => {
  const { total, active, charging, standby, maint } = af.FLEET;
  assert.equal(active + charging + standby + maint, total, 'fleet status counts must sum to total');
  assert.equal(total, 660);
  assert.equal(af.FLEET.available, active);
  assert.equal(af.FLEET.nonFlyable, maint);
  assert.equal(af.FLEET.reservable, charging + standby);
});

test('bear formation produces valid positions (no NaN)', () => {
  const bear = af.FORMATIONS.find(f => f.id === 'bear');
  assert.ok(bear, 'bear formation must exist');
  for (let i = 0; i < bear.targets.length; i++) {
    assert.ok(Number.isFinite(bear.targets[i]), `bear.targets[${i}] should be finite`);
  }
});

test('all formations produce positions within reasonable world bounds', () => {
  // World: y≈0..120 (altitude), x/z roughly ±80 (spread)
  for (const f of af.FORMATIONS) {
    for (let i = 0; i < f.targets.length; i += 3) {
      const x = f.targets[i], y = f.targets[i+1], z = f.targets[i+2];
      assert.ok(Math.abs(x) < 200, `${f.id}.x[${i/3}] out of bounds: ${x}`);
      assert.ok(y >= -20 && y < 250, `${f.id}.y[${i/3}] out of bounds: ${y}`);
      assert.ok(Math.abs(z) < 200, `${f.id}.z[${i/3}] out of bounds: ${z}`);
    }
  }
});

test('PALETTES has 5 entries with 4-color arrays', () => {
  const keys = Object.keys(af.PALETTES);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    assert.equal(af.PALETTES[k].colors.length, 4, `${k} should have 4 colors`);
  }
});
