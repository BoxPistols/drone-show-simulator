// Unit tests for show-schema.js (normalizeShow)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, 'show-schema.js'), 'utf8');
const sandbox = { window: {}, module: { exports: {} } };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const { normalizeShow } = sandbox.window.AstraFlockSchema;

const KNOWN = ['sphere','helix','torus','wave','bear','dna','cube','heart','galaxy'];

test('null/undefined input returns not ok', () => {
  assert.equal(normalizeShow(null, KNOWN).ok, false);
  assert.equal(normalizeShow(undefined, KNOWN).ok, false);
});

test('empty array returns not ok with message', () => {
  const r = normalizeShow([], KNOWN);
  assert.equal(r.ok, false);
  assert.match(r.error, /演目が空/);
});

test('unrecognized object format returns not ok', () => {
  const r = normalizeShow({ foo: 'bar' }, KNOWN);
  assert.equal(r.ok, false);
  assert.match(r.error, /認識できる/);
});

test('format A: bare array of formations', () => {
  const r = normalizeShow([{ id: 'sphere', dur: 42 }], KNOWN);
  assert.equal(r.ok, true);
  assert.equal(r.formations.length, 1);
  assert.equal(r.formations[0].typeId, 'sphere');
  assert.equal(r.bpm, null);
});

test('format B: v1 object with meta.bpm', () => {
  const r = normalizeShow({
    schema: 'astra-flock-show/1',
    formations: [{ id: 'bear', dur: 54 }],
    meta: { bpm: 140 },
    audio: { name: 'track.mp3', duration: 200 },
  }, KNOWN);
  assert.equal(r.ok, true);
  assert.equal(r.bpm, 140);
  assert.equal(r.audio.name, 'track.mp3');
});

test('format C: preset single { savedAt, formations }', () => {
  const r = normalizeShow({
    savedAt: 1700000000000,
    formations: [{ id: 'helix', dur: 38 }],
  }, KNOWN);
  assert.equal(r.ok, true);
  assert.equal(r.formations.length, 1);
  assert.equal(r.bpm, null);
});

test('defaults: missing fields filled in sensibly', () => {
  const r = normalizeShow([{ id: 'sphere' }], KNOWN);
  assert.equal(r.ok, true);
  const f = r.formations[0];
  assert.equal(f.easing, 'Ease-both');
  assert.equal(f.paletteOverride, null);
  assert.equal(f.altitude, 60);
  assert.equal(f.spread, 55);
  assert.equal(f.speed, 1.0);
  assert.equal(f.drones, 660);
  assert.equal(f.dur, 30);
});

test('unknown typeId falls back to sphere and increments fallbackCount', () => {
  const r = normalizeShow([
    { id: 'sphere' },
    { id: 'nonexistent-shape' },
    { id: 'bear' },
  ], KNOWN);
  assert.equal(r.ok, true);
  assert.equal(r.formations[0].typeId, 'sphere');
  assert.equal(r.formations[1].typeId, 'sphere'); // fell back
  assert.equal(r.formations[2].typeId, 'bear');
  assert.equal(r.fallbackCount, 1);
});

test('typeId explicit overrides id for lookup', () => {
  // Imagine a renamed formation: id="my-custom", typeId="sphere"
  const r = normalizeShow([{ id: 'my-custom', typeId: 'sphere' }], KNOWN);
  assert.equal(r.ok, true);
  assert.equal(r.formations[0].typeId, 'sphere');
  assert.equal(r.fallbackCount, 0);
});

test('bpm clamped to 30-300', () => {
  const low = normalizeShow({ formations: [{ id: 'sphere' }], meta: { bpm: 10 } }, KNOWN);
  assert.equal(low.bpm, 30);
  const high = normalizeShow({ formations: [{ id: 'sphere' }], meta: { bpm: 500 } }, KNOWN);
  assert.equal(high.bpm, 300);
});

test('throws when formation lacks id', () => {
  assert.throws(
    () => normalizeShow([{ dur: 30 }], KNOWN),
    /id がありません/
  );
});

test('empty knownIds means no fallback (any id accepted as-is)', () => {
  const r = normalizeShow([{ id: 'anything' }], []);
  assert.equal(r.ok, true);
  assert.equal(r.formations[0].typeId, 'anything');
  assert.equal(r.fallbackCount, 0);
});
