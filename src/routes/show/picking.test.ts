import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  isTap,
  PICK_RADIUS_MOUSE,
  PICK_RADIUS_TOUCH,
  pickNearestPoint,
  pickRadiusFor,
  projectPoint,
} from './picking';

const W = 800;
const H = 600;

function viewProjOf(camera: THREE.PerspectiveCamera): Float32Array {
  camera.updateMatrixWorld();
  const m = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  return new Float32Array(m.elements);
}

function makeCamera() {
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000);
  camera.position.set(0, 0, 100);
  camera.lookAt(0, 0, 0);
  return camera;
}

describe('projectPoint', () => {
  it('matches three.js Vector3.project in CSS pixels', () => {
    const camera = makeCamera();
    const vp = viewProjOf(camera);
    for (const [x, y, z] of [
      [0, 0, 0],
      [10, -5, 3],
      [-20, 12, -40],
    ] as const) {
      const v = new THREE.Vector3(x, y, z).project(camera);
      const p = projectPoint(vp, x, y, z, W, H)!;
      expect(p.x).toBeCloseTo(((v.x + 1) / 2) * W, 3);
      expect(p.y).toBeCloseTo(((1 - v.y) / 2) * H, 3);
    }
  });

  it('returns null for points behind the camera', () => {
    const vp = viewProjOf(makeCamera());
    expect(projectPoint(vp, 0, 0, 150, W, H)).toBeNull();
  });
});

describe('pickNearestPoint', () => {
  const camera = makeCamera();
  const vp = viewProjOf(camera);

  it('picks the point under the cursor', () => {
    const pos = new Float32Array([0, 0, 0, 20, 0, 0, -20, 0, 0]);
    const target = projectPoint(vp, 20, 0, 0, W, H)!;
    expect(pickNearestPoint(pos, vp, W, H, target.x + 3, target.y - 2, 14)).toBe(1);
  });

  it('returns -1 when nothing is within the radius', () => {
    const pos = new Float32Array([0, 0, 0]);
    expect(pickNearestPoint(pos, vp, W, H, 10, 10, 14)).toBe(-1);
  });

  it('skips the excluded index (the drone the camera rides)', () => {
    const pos = new Float32Array([0, 0, 0, 0.5, 0, 0]);
    const c = projectPoint(vp, 0, 0, 0, W, H)!;
    expect(pickNearestPoint(pos, vp, W, H, c.x, c.y, 14)).toBe(0);
    expect(pickNearestPoint(pos, vp, W, H, c.x, c.y, 14, 0)).toBe(1);
  });

  it('prefers the nearer point when two overlap on screen', () => {
    // 同じ視線上に手前と奥の 2 点
    const pos = new Float32Array([0, 0, -50, 0, 0, 50]);
    const c = projectPoint(vp, 0, 0, 0, W, H)!;
    expect(pickNearestPoint(pos, vp, W, H, c.x, c.y, 14)).toBe(1);
  });
});

describe('isTap', () => {
  it('treats small, short presses as taps', () => {
    expect(isTap({ maxMove: 2, durationMs: 120, pointerType: 'mouse', multiTouch: false })).toBe(
      true
    );
    expect(isTap({ maxMove: 10, durationMs: 200, pointerType: 'touch', multiTouch: false })).toBe(
      true
    );
  });

  it('treats drags, long presses and pinches as non-taps', () => {
    expect(isTap({ maxMove: 10, durationMs: 120, pointerType: 'mouse', multiTouch: false })).toBe(
      false
    );
    expect(isTap({ maxMove: 0, durationMs: 900, pointerType: 'mouse', multiTouch: false })).toBe(
      false
    );
    expect(isTap({ maxMove: 0, durationMs: 100, pointerType: 'touch', multiTouch: true })).toBe(
      false
    );
  });

  it('uses a larger pick radius for touch', () => {
    expect(pickRadiusFor('touch')).toBe(PICK_RADIUS_TOUCH);
    expect(pickRadiusFor('pen')).toBe(PICK_RADIUS_TOUCH);
    expect(pickRadiusFor('mouse')).toBe(PICK_RADIUS_MOUSE);
    expect(PICK_RADIUS_TOUCH).toBeGreaterThan(PICK_RADIUS_MOUSE);
  });
});
