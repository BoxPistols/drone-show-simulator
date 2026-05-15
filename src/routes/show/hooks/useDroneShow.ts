import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DRONE_COUNT, FORMATIONS, PALETTES, SKIES, TOTAL_TIME } from '~/lib/formations';
import type { ShowState } from '../types';

interface Options {
  /** Live ref to the current state — read every frame, not part of dep array. */
  stateRef: React.MutableRefObject<ShowState>;
  /** Called when the playhead crosses into a new formation index. */
  onFormationChange: (idx: number) => void;
  /** Called every ~6 frames with timing/atmospheric numbers for the HUD. */
  onHudTick: (info: { time: number; alt: number; wind: number; frame: number }) => void;
  /** Called when state.playing changes via auto-loop or seek. */
  onPlayChange?: (playing: boolean) => void;
}

const DISC_SIZE = 128;
function makeDiscTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = DISC_SIZE;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(
    DISC_SIZE / 2,
    DISC_SIZE / 2,
    0,
    DISC_SIZE / 2,
    DISC_SIZE / 2,
    DISC_SIZE / 2
  );
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, DISC_SIZE, DISC_SIZE);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Owns the Three.js scene for the immersive drone show. Designed to run
 * inside a useEffect with the canvas root as its only dependency — all
 * mutable state is read live from `stateRef` so React re-renders never
 * recreate WebGL resources.
 *
 * Cleanup disposes geometries, materials, textures, and the renderer.
 */
export function useDroneShow(canvasRoot: HTMLDivElement | null, options: Options): void {
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    if (!canvasRoot) return;

    // ---- Scene ----
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02030a, 0.0012);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(160, 85, 200);
    camera.lookAt(0, 60, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    canvasRoot.appendChild(renderer.domElement);

    // ---- Background starfield ----
    const starGeom = new THREE.BufferGeometry();
    {
      const N = 1200;
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const r = 700 + Math.random() * 400;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.cos(phi);
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        const b = 0.4 + Math.random() * 0.6;
        col[i * 3] = b;
        col[i * 3 + 1] = b;
        col[i * 3 + 2] = b;
      }
      starGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      starGeom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    const starMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: false,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeom, starMat);
    scene.add(stars);

    // ---- Horizon glow plane ----
    const horizonGeom = new THREE.PlaneGeometry(2000, 400);
    const horizonMat = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(0x1e2a4a) },
        color2: { value: new THREE.Color(0x02030a) },
      },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 color1; uniform vec3 color2; varying vec2 vUv;
        void main(){ float g = smoothstep(0.0, 0.6, vUv.y); gl_FragColor = vec4(mix(color1, color2, g), 1.0);}`,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const horizon = new THREE.Mesh(horizonGeom, horizonMat);
    horizon.position.y = 100;
    horizon.position.z = -800;
    scene.add(horizon);

    // ---- Drone cloud ----
    const discTex = makeDiscTexture();
    const droneGeom = new THREE.BufferGeometry();
    const posBuf = new Float32Array(DRONE_COUNT * 3);
    const colBuf = new Float32Array(DRONE_COUNT * 3);
    const sizeBuf = new Float32Array(DRONE_COUNT);
    droneGeom.setAttribute('position', new THREE.BufferAttribute(posBuf, 3));
    droneGeom.setAttribute('color', new THREE.BufferAttribute(colBuf, 3));
    droneGeom.setAttribute('aSize', new THREE.BufferAttribute(sizeBuf, 1));
    const droneMat = new THREE.PointsMaterial({
      size: 3.0,
      map: discTex,
      alphaMap: discTex,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const dronePoints = new THREE.Points(droneGeom, droneMat);
    scene.add(dronePoints);

    // ---- Trails ----
    const trailGeom = new THREE.BufferGeometry();
    const trailPos = new Float32Array(DRONE_COUNT * 3 * 8);
    const trailCol = new Float32Array(DRONE_COUNT * 3 * 8);
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeom.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    const trailMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const trailPoints = new THREE.Points(trailGeom, trailMat);
    scene.add(trailPoints);
    let trailIdx = 0;

    // ---- Per-drone simulation state ----
    const velBuf = new Float32Array(DRONE_COUNT * 3);
    const baseCol = new Float32Array(DRONE_COUNT * 3);
    const phase = new Float32Array(DRONE_COUNT);
    for (let i = 0; i < DRONE_COUNT; i++) phase[i] = Math.random() * Math.PI * 2;

    // Initial pre-show scatter
    for (let i = 0; i < DRONE_COUNT; i++) {
      const a = (i / DRONE_COUNT) * Math.PI * 2 * 4;
      const r = 40 + (i % 10) * 4;
      posBuf[i * 3] = Math.cos(a) * r;
      posBuf[i * 3 + 1] = 60 + Math.sin(i * 0.17) * 6;
      posBuf[i * 3 + 2] = Math.sin(a) * r;
      sizeBuf[i] = 1.2;
    }

    function applyPalette(paletteKey: ShowState['palette']) {
      const pal = PALETTES[paletteKey].colors;
      for (let i = 0; i < DRONE_COUNT; i++) {
        const c = new THREE.Color(pal[i % pal.length]);
        baseCol[i * 3] = c.r;
        baseCol[i * 3 + 1] = c.g;
        baseCol[i * 3 + 2] = c.b;
        colBuf[i * 3] = c.r;
        colBuf[i * 3 + 1] = c.g;
        colBuf[i * 3 + 2] = c.b;
      }
      droneGeom.attributes.color!.needsUpdate = true;
    }

    function applySky(skyKey: ShowState['sky']) {
      const s = SKIES[skyKey];
      const bg = document.getElementById('stars-bg');
      if (bg) {
        bg.style.background = `
          radial-gradient(ellipse at 70% 20%, ${s.bg[2]}88, transparent 55%),
          radial-gradient(ellipse at 20% 80%, ${s.bg[1]}aa, transparent 60%),
          radial-gradient(ellipse at 50% 50%, ${s.bg[1]}, ${s.bg[0]} 80%)
        `;
      }
      scene.fog = new THREE.FogExp2(new THREE.Color(s.bg[0]).getHex(), 0.0012);
    }

    let lastPalette = optsRef.current.stateRef.current.palette;
    let lastSky = optsRef.current.stateRef.current.sky;
    applyPalette(lastPalette);
    applySky(lastSky);

    // ---- Mouse orbit ----
    const orbit = {
      lon: 25,
      lat: -12,
      rLon: 25,
      rLat: -12,
      dist: 260,
      rDist: 260,
      dragging: false,
      px: 0,
      py: 0,
    };
    const el = renderer.domElement;
    el.style.cursor = 'grab';
    const onPointerDown = (e: PointerEvent) => {
      orbit.dragging = true;
      orbit.px = e.clientX;
      orbit.py = e.clientY;
      el.style.cursor = 'grabbing';
    };
    const onPointerUp = () => {
      orbit.dragging = false;
      el.style.cursor = 'grab';
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!orbit.dragging) return;
      orbit.lon += (e.clientX - orbit.px) * 0.25;
      orbit.lat = Math.max(-60, Math.min(70, orbit.lat - (e.clientY - orbit.py) * 0.2));
      orbit.px = e.clientX;
      orbit.py = e.clientY;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbit.dist = Math.max(120, Math.min(480, orbit.dist + e.deltaY * 0.3));
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    // ---- Animation loop ----
    let lastT = performance.now();
    let frameCount = 0;
    let rafId: number | null = null;
    let stopped = false;

    function animate(now: number) {
      if (stopped) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      frameCount++;

      const opts = optsRef.current;
      const state = opts.stateRef.current;

      // React to palette/sky changes from outside (one comparison per frame is cheap)
      if (state.palette !== lastPalette) {
        applyPalette(state.palette);
        lastPalette = state.palette;
      }
      if (state.sky !== lastSky) {
        applySky(state.sky);
        lastSky = state.sky;
      }

      let formationIdx = state.formationIndex;
      if (state.playing) {
        state.showTime += dt * state.speed;
        if (state.showTime >= TOTAL_TIME) state.showTime = 0;
        let idx = 0;
        for (let i = 0; i < FORMATIONS.length; i++) {
          if (state.showTime >= FORMATIONS[i]!.start) idx = i;
        }
        if (idx !== formationIdx) {
          formationIdx = idx;
          state.formationIndex = idx;
          opts.onFormationChange(idx);
        }
      }

      const curF = FORMATIONS[formationIdx]!;
      const nextF = FORMATIONS[(formationIdx + 1) % FORMATIONS.length]!;
      const localT = state.showTime - curF.start;
      const blendWindow = 2.0;
      let blendK = 0;
      if (localT > curF.dur - blendWindow) {
        blendK = Math.min(1, (localT - (curF.dur - blendWindow)) / blendWindow);
        blendK = blendK * blendK * (3 - 2 * blendK);
      }

      if (state.playing) {
        const targets = curF.targets;
        const nextTargets = nextF.targets;
        const k = 3.2;
        const damping = 0.88;
        const physIters = Math.max(1, Math.min(10, Math.ceil(state.speed)));
        const physDt = (dt * state.speed) / physIters;
        for (let step = 0; step < physIters; step++) {
          for (let i = 0; i < DRONE_COUNT; i++) {
            const tx = targets[i * 3]! * (1 - blendK) + nextTargets[i * 3]! * blendK;
            const ty = targets[i * 3 + 1]! * (1 - blendK) + nextTargets[i * 3 + 1]! * blendK;
            const tz = targets[i * 3 + 2]! * (1 - blendK) + nextTargets[i * 3 + 2]! * blendK;
            const ax = (tx - posBuf[i * 3]!) * k;
            const ay = (ty - posBuf[i * 3 + 1]!) * k;
            const az = (tz - posBuf[i * 3 + 2]!) * k;
            velBuf[i * 3] = (velBuf[i * 3]! + ax * physDt) * damping;
            velBuf[i * 3 + 1] = (velBuf[i * 3 + 1]! + ay * physDt) * damping;
            velBuf[i * 3 + 2] = (velBuf[i * 3 + 2]! + az * physDt) * damping;
            posBuf[i * 3]! += velBuf[i * 3]! * physDt;
            posBuf[i * 3 + 1]! += velBuf[i * 3 + 1]! * physDt;
            posBuf[i * 3 + 2]! += velBuf[i * 3 + 2]! * physDt;
          }
        }
        for (let i = 0; i < DRONE_COUNT; i++) {
          const ph = phase[i]! + now * 0.002;
          const breath = 0.85 + Math.sin(ph) * 0.25;
          sizeBuf[i] = 7.0 * state.droneSize * breath;
        }
        droneGeom.attributes.position!.needsUpdate = true;

        if (state.trails) {
          trailMat.opacity = 0.45;
          for (let i = 0; i < DRONE_COUNT; i++) {
            const slotOff = (trailIdx * DRONE_COUNT + i) * 3;
            trailPos[slotOff] = posBuf[i * 3]!;
            trailPos[slotOff + 1] = posBuf[i * 3 + 1]!;
            trailPos[slotOff + 2] = posBuf[i * 3 + 2]!;
            trailCol[slotOff] = baseCol[i * 3]! * 0.4;
            trailCol[slotOff + 1] = baseCol[i * 3 + 1]! * 0.4;
            trailCol[slotOff + 2] = baseCol[i * 3 + 2]! * 0.4;
          }
          trailIdx = (trailIdx + 1) % 8;
          trailGeom.attributes.position!.needsUpdate = true;
          trailGeom.attributes.color!.needsUpdate = true;
        } else {
          trailMat.opacity = 0;
        }
      }

      droneMat.size = 3.0 * state.droneSize * (state.glow ? 1.2 : 0.9);

      if (state.rotate && state.playing && !orbit.dragging) orbit.rLon += dt * 6;
      orbit.rLon += (orbit.lon - orbit.rLon) * 0.12;
      orbit.rLat += (orbit.lat - orbit.rLat) * 0.12;
      orbit.rDist += (orbit.dist - orbit.rDist) * 0.12;
      const lonR = THREE.MathUtils.degToRad(orbit.rLon);
      const latR = THREE.MathUtils.degToRad(orbit.rLat);
      camera.position.x = Math.cos(latR) * Math.sin(lonR) * orbit.rDist;
      camera.position.z = Math.cos(latR) * Math.cos(lonR) * orbit.rDist;
      camera.position.y = 60 + Math.sin(latR) * orbit.rDist;
      camera.lookAt(0, 60, 0);

      renderer.render(scene, camera);

      if (frameCount % 6 === 0) {
        const alt = 60 + Math.abs(Math.sin(now * 0.0003)) * 70;
        const wind = 2 + Math.sin(now * 0.0007) * 0.8;
        opts.onHudTick({ time: state.showTime, alt, wind, frame: frameCount });
      }

      rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);

    // Watchdog: kick the loop if it stalls (hidden iframe, throttled tab)
    const watchdog = window.setInterval(() => {
      // If frameCount hasn't changed since last tick, force a render
      const before = frameCount;
      window.setTimeout(() => {
        if (!stopped && frameCount === before) {
          try {
            animate(performance.now());
          } catch (err) {
            console.error('drone-show watchdog render failed', err);
          }
        }
      }, 0);
    }, 200);
    const onVisibility = () => {
      if (!document.hidden) {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopped = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.clearInterval(watchdog);
      document.removeEventListener('visibilitychange', onVisibility);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      try {
        canvasRoot.removeChild(renderer.domElement);
      } catch {
        /* node may have been removed already */
      }
      starGeom.dispose();
      starMat.dispose();
      horizonGeom.dispose();
      horizonMat.dispose();
      droneGeom.dispose();
      droneMat.dispose();
      trailGeom.dispose();
      trailMat.dispose();
      discTex.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [canvasRoot]);
}
