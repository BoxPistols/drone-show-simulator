import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DRONE_COUNT, FORMATIONS, PALETTES, SKIES, TOTAL_TIME } from '~/lib/formations';
import { makeGlowSprite } from '~/lib/glowSprite';
import type { HudInfo, ShowState } from '../types';
import { createResolutionController } from './resolution';

export interface ShowHandle {
  /** 現在の見た目を PNG の data URL で返す。描画できない環境では null */
  capture: () => string | null;
}

interface Options {
  /** 毎フレーム読む生の状態。依存配列には入れない */
  stateRef: React.MutableRefObject<ShowState>;
  /** 再生位置が次の演目に入ったとき */
  onFormationChange: (idx: number) => void;
  /** HUD 用の数値。約 5 回/秒 */
  onHudTick: (info: HudInfo) => void;
  /** 解像度を下げ切っても間に合わないとき。軽量モードへ切り替える合図 */
  onAutoLite: () => void;
  /** WebGL が使えないとき */
  onUnavailable: () => void;
  /** スクリーンショット用の操作口 */
  handleRef: React.MutableRefObject<ShowHandle | null>;
}

const DISC_SIZE = 64;
function makeDiscTexture(): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(makeGlowSprite(DISC_SIZE));
  tex.needsUpdate = true;
  return tex;
}

const STAR_COUNT = 1200;
const TRAIL_SLOTS = 8;

/** 解像度の上限。点スプライトの発光は柔らかいので 1.5 倍以上は見分けがつかず、GPU の負担だけ増える */
const DPR_CAP = 1.5;
const DPR_CAP_LITE = 1;

/**
 * 観賞ページの Three.js シーン。canvasRoot だけを依存にした useEffect の中で動き、
 * 状態は stateRef から毎フレーム読むので React の再レンダリングでは WebGL 資源を作り直さない。
 *
 * 軽さのための方針:
 * - antialias と preserveDrawingBuffer は切る（点スプライトには効かず、モバイル GPU では高くつく）
 * - 解像度は 1.5 倍を上限に、フレーム時間を見て自動で下げる（下限 0.75）。下限でも遅ければ軽量モードを要求
 * - タブが隠れたら止まる。一時停止中はカメラが止まった時点で描画もやめる
 * - 残像を切っているときは残像の描画自体をしない
 */
export function useDroneShow(canvasRoot: HTMLDivElement | null, options: Options): void {
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    if (!canvasRoot) return;

    // WebGL の有無は WebGLRenderer の生成で判定する（下の try/catch）。
    // 以前は別 canvas で探りの context を作っていたが、それは解放されず、
    // ページ内の WebGL context 上限（ブラウザにより 8〜16）を SPA 遷移のたびに 1 つ消費していた。

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

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'default',
      });
    } catch (err) {
      console.warn('useDroneShow: WebGL renderer init failed; chrome-only mode', err);
      optsRef.current.onUnavailable();
      return;
    }
    renderer.setClearColor(0x000000, 0);
    canvasRoot.appendChild(renderer.domElement);

    // ---- 解像度 ----
    const deviceDpr = Math.max(0.5, window.devicePixelRatio || 1);
    const capFor = (lite: boolean) => Math.min(deviceDpr, lite ? DPR_CAP_LITE : DPR_CAP);
    const resolution = createResolutionController(
      { cap: capFor(optsRef.current.stateRef.current.lite) },
      performance.now()
    );
    let dpr = resolution.dpr;
    const applySize = () => {
      renderer.setPixelRatio(dpr);
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    applySize();

    // ---- 背景の星 ----
    const starGeom = new THREE.BufferGeometry();
    {
      const pos = new Float32Array(STAR_COUNT * 3);
      const col = new Float32Array(STAR_COUNT * 3);
      for (let i = 0; i < STAR_COUNT; i++) {
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

    // ---- 機体の点群 ----
    const discTex = makeDiscTexture();
    const droneGeom = new THREE.BufferGeometry();
    const posBuf = new Float32Array(DRONE_COUNT * 3);
    const colBuf = new Float32Array(DRONE_COUNT * 3);
    droneGeom.setAttribute('position', new THREE.BufferAttribute(posBuf, 3));
    droneGeom.setAttribute('color', new THREE.BufferAttribute(colBuf, 3));
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
    dronePoints.frustumCulled = false;
    scene.add(dronePoints);

    // ---- 残像 ----
    const trailGeom = new THREE.BufferGeometry();
    const trailPos = new Float32Array(DRONE_COUNT * 3 * TRAIL_SLOTS);
    const trailCol = new Float32Array(DRONE_COUNT * 3 * TRAIL_SLOTS);
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeom.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    const trailMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const trailPoints = new THREE.Points(trailGeom, trailMat);
    trailPoints.frustumCulled = false;
    trailPoints.visible = false;
    scene.add(trailPoints);
    let trailIdx = 0;
    let trailFilled = false;

    // ---- 機体ごとの物理状態 ----
    const velBuf = new Float32Array(DRONE_COUNT * 3);
    const baseCol = new Float32Array(DRONE_COUNT * 3);

    for (let i = 0; i < DRONE_COUNT; i++) {
      const a = (i / DRONE_COUNT) * Math.PI * 2 * 4;
      const r = 40 + (i % 10) * 4;
      posBuf[i * 3] = Math.cos(a) * r;
      posBuf[i * 3 + 1] = 60 + Math.sin(i * 0.17) * 6;
      posBuf[i * 3 + 2] = Math.sin(a) * r;
    }

    function applyPalette(paletteKey: ShowState['palette']) {
      const pal = PALETTES[paletteKey].colors;
      const cols = pal.map((hex) => new THREE.Color(hex));
      for (let i = 0; i < DRONE_COUNT; i++) {
        const c = cols[i % cols.length]!;
        baseCol[i * 3] = c.r;
        baseCol[i * 3 + 1] = c.g;
        baseCol[i * 3 + 2] = c.b;
        colBuf[i * 3] = c.r;
        colBuf[i * 3 + 1] = c.g;
        colBuf[i * 3 + 2] = c.b;
      }
      droneGeom.attributes.color!.needsUpdate = true;
      // 残像の色も塗り直す（止まっている間に色を変えても古い色が残らないように）
      for (let s = 0; s < TRAIL_SLOTS; s++) {
        for (let i = 0; i < DRONE_COUNT; i++) {
          const o = (s * DRONE_COUNT + i) * 3;
          trailCol[o] = baseCol[i * 3]! * 0.4;
          trailCol[o + 1] = baseCol[i * 3 + 1]! * 0.4;
          trailCol[o + 2] = baseCol[i * 3 + 2]! * 0.4;
        }
      }
      trailGeom.attributes.color!.needsUpdate = true;
    }

    function applySky(skyKey: ShowState['sky']) {
      const s = SKIES[skyKey];
      const bg = document.getElementById('stars-bg');
      if (bg) {
        bg.style.background = `
          radial-gradient(ellipse 80% 40% at 50% 100%, #1e2a4a66, transparent 70%),
          radial-gradient(ellipse at 70% 20%, ${s.bg[2]}88, transparent 55%),
          radial-gradient(ellipse at 20% 80%, ${s.bg[1]}aa, transparent 60%),
          radial-gradient(ellipse at 50% 50%, ${s.bg[1]}, ${s.bg[0]} 80%)
        `;
      }
      scene.fog = new THREE.FogExp2(new THREE.Color(s.bg[0]).getHex(), 0.0012);
    }

    function applyLite(lite: boolean) {
      // 星を半分にし、解像度の上限を 1 倍に落とす。切り替えたら新しい上限から測り直す
      // （軽量モードを切ったときに、下げたままの解像度で居続けないように）
      starGeom.setDrawRange(0, lite ? STAR_COUNT / 2 : STAR_COUNT);
      dpr = resolution.setCap(capFor(lite), performance.now());
      applySize();
    }

    const initial = optsRef.current.stateRef.current;
    let lastPalette = initial.palette;
    let lastSky = initial.sky;
    let lastLite = initial.lite;
    let lastShowTime = initial.showTime;
    applyPalette(lastPalette);
    applySky(lastSky);
    applyLite(lastLite);

    // ---- カメラ操作（ドラッグで回転、ホイール / ピンチで距離） ----
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
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    let needsRender = true;

    const el = renderer.domElement;
    el.style.cursor = 'grab';
    el.style.touchAction = 'none';

    const pinchDistance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        orbit.dragging = true;
        orbit.px = e.clientX;
        orbit.py = e.clientY;
        el.style.cursor = 'grabbing';
      } else if (pointers.size === 2) {
        orbit.dragging = false;
        pinchDist = pinchDistance();
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        orbit.dragging = false;
        el.style.cursor = 'grab';
      } else if (pointers.size === 1) {
        const p = [...pointers.values()][0]!;
        orbit.dragging = true;
        orbit.px = p.x;
        orbit.py = p.y;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size >= 2) {
        const d = pinchDistance();
        if (pinchDist > 0 && d > 0) {
          orbit.dist = Math.max(120, Math.min(480, orbit.dist * (pinchDist / d)));
        }
        pinchDist = d;
        needsRender = true;
        return;
      }
      if (!orbit.dragging) return;
      orbit.lon += (e.clientX - orbit.px) * 0.25;
      orbit.lat = Math.max(-60, Math.min(70, orbit.lat - (e.clientY - orbit.py) * 0.2));
      orbit.px = e.clientX;
      orbit.py = e.clientY;
      needsRender = true;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbit.dist = Math.max(120, Math.min(480, orbit.dist + e.deltaY * 0.3));
      needsRender = true;
    };
    const onResize = () => {
      applySize();
      needsRender = true;
    };
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    let fpsEma = 60;

    // ---- 描画ループ ----
    let lastT = performance.now();
    let lastHud = 0;
    let frameCount = 0;
    /** 前回の HUD 更新から描画したか。止まっているときは HUD も更新しない（React の再レンダリングを起こさない） */
    let renderedSinceHud = true;
    let rafId: number | null = null;
    let stopped = false;
    /** 一時停止中にシークされたら、この回数分だけ物理を進めて機体を新しい形へ動かす */
    let settleFrames = 0;

    function render() {
      renderer.render(scene, camera);
    }

    function animate(now: number) {
      if (stopped) return;
      rafId = requestAnimationFrame(animate);
      const dtMs = now - lastT;
      const dt = Math.min(0.05, dtMs / 1000);
      lastT = now;

      const opts = optsRef.current;
      const state = opts.stateRef.current;

      if (state.palette !== lastPalette) {
        applyPalette(state.palette);
        lastPalette = state.palette;
        needsRender = true;
      }
      if (state.sky !== lastSky) {
        applySky(state.sky);
        lastSky = state.sky;
        needsRender = true;
      }
      if (state.lite !== lastLite) {
        // 利用者が自分で軽量モードを切ったあとは、このマウント中は自動で戻さない（controller が合図を一度しか出さない）。
        // 自動切替が利用者の操作と喧嘩しないようにするため。解像度の自動調整はそのまま続く
        applyLite(state.lite);
        lastLite = state.lite;
        needsRender = true;
      }
      if (state.showTime !== lastShowTime) {
        // 外からのシーク。止まっていても機体は新しい形へ向かわせる
        needsRender = true;
        if (!state.playing) settleFrames = 240;
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

      const showTrails = state.trails && !state.lite;

      const simulate = state.playing || settleFrames > 0;
      if (!state.playing && settleFrames > 0) settleFrames--;

      if (simulate) {
        const targets = curF.targets;
        const nextTargets = nextF.targets;
        const k = 3.2;
        const damping = 0.88;
        const physIters = Math.max(1, Math.min(10, Math.ceil(state.speed)));
        const physDt = (dt * state.speed) / physIters;
        for (let step = 0; step < physIters; step++) {
          for (let i = 0; i < DRONE_COUNT; i++) {
            const o = i * 3;
            const tx = targets[o]! * (1 - blendK) + nextTargets[o]! * blendK;
            const ty = targets[o + 1]! * (1 - blendK) + nextTargets[o + 1]! * blendK;
            const tz = targets[o + 2]! * (1 - blendK) + nextTargets[o + 2]! * blendK;
            velBuf[o] = (velBuf[o]! + (tx - posBuf[o]!) * k * physDt) * damping;
            velBuf[o + 1] = (velBuf[o + 1]! + (ty - posBuf[o + 1]!) * k * physDt) * damping;
            velBuf[o + 2] = (velBuf[o + 2]! + (tz - posBuf[o + 2]!) * k * physDt) * damping;
            posBuf[o] = posBuf[o]! + velBuf[o] * physDt;
            posBuf[o + 1] = posBuf[o + 1]! + velBuf[o + 1]! * physDt;
            posBuf[o + 2] = posBuf[o + 2]! + velBuf[o + 2]! * physDt;
          }
        }
        droneGeom.attributes.position!.needsUpdate = true;

        if (showTrails && state.playing) {
          const base = trailIdx * DRONE_COUNT * 3;
          trailPos.set(posBuf, base);
          trailIdx = (trailIdx + 1) % TRAIL_SLOTS;
          if (trailIdx === 0) trailFilled = true;
          trailGeom.attributes.position!.needsUpdate = true;
        }
        needsRender = true;
      }

      // 残像を切ったら描画自体をやめる（頂点 5280 個分の描画呼び出しを省く）
      const trailVisible = showTrails && (trailFilled || trailIdx > 0);
      if (trailPoints.visible !== trailVisible) {
        trailPoints.visible = trailVisible;
        needsRender = true;
      }
      if (trailVisible && !trailFilled) trailGeom.setDrawRange(0, trailIdx * DRONE_COUNT);
      else if (trailVisible) trailGeom.setDrawRange(0, Infinity);

      const size = 3.0 * state.droneSize * (state.glow ? 1.2 : 0.9);
      if (droneMat.size !== size) {
        droneMat.size = size;
        needsRender = true;
      }

      if (state.rotate && state.playing && !orbit.dragging) orbit.rLon += dt * 6;
      const dLon = orbit.lon - orbit.rLon;
      const dLat = orbit.lat - orbit.rLat;
      const dDist = orbit.dist - orbit.rDist;
      if (Math.abs(dLon) > 0.005 || Math.abs(dLat) > 0.005 || Math.abs(dDist) > 0.05) {
        orbit.rLon += dLon * 0.12;
        orbit.rLat += dLat * 0.12;
        orbit.rDist += dDist * 0.12;
        needsRender = true;
      }

      if (needsRender) {
        const lonR = THREE.MathUtils.degToRad(orbit.rLon);
        const latR = THREE.MathUtils.degToRad(orbit.rLat);
        camera.position.x = Math.cos(latR) * Math.sin(lonR) * orbit.rDist;
        camera.position.z = Math.cos(latR) * Math.cos(lonR) * orbit.rDist;
        camera.position.y = 60 + Math.sin(latR) * orbit.rDist;
        camera.lookAt(0, 60, 0);
        render();
        frameCount++;
        renderedSinceHud = true;
        needsRender = false;
        if (dtMs > 0 && dtMs < 250) fpsEma += (1000 / dtMs - fpsEma) * 0.1;
        if (state.playing) {
          const action = resolution.push(dtMs, now);
          if (action.type === 'dpr') {
            dpr = action.dpr;
            applySize();
          } else if (action.type === 'lite' && !state.lite) {
            opts.onAutoLite();
          }
        }
      } else {
        resolution.observe(dtMs);
      }
      lastShowTime = state.showTime;

      if (renderedSinceHud && now - lastHud >= 200) {
        lastHud = now;
        renderedSinceHud = false;
        const alt = 60 + Math.abs(Math.sin(now * 0.0003)) * 70;
        const wind = 2 + Math.sin(now * 0.0007) * 0.8;
        opts.onHudTick({
          time: state.showTime,
          alt,
          wind,
          frame: frameCount,
          fps: state.playing ? Math.round(fpsEma) : 0,
          dpr,
        });
      }
    }
    rafId = requestAnimationFrame(animate);

    // 隠れたタブでは requestAnimationFrame が止まる。戻ったときに時間が飛ばないよう基準を取り直す
    const onVisibility = () => {
      if (document.hidden) return;
      lastT = performance.now();
      needsRender = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(animate);
    };
    document.addEventListener('visibilitychange', onVisibility);

    optsRef.current.handleRef.current = {
      capture: () => {
        try {
          // preserveDrawingBuffer を切っているので、描いた直後の同じタスク内で読み出す
          render();
          return renderer.domElement.toDataURL('image/png');
        } catch {
          return null;
        }
      },
    };

    return () => {
      stopped = true;
      optsRef.current.handleRef.current = null;
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
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
      droneGeom.dispose();
      droneMat.dispose();
      trailGeom.dispose();
      trailMat.dispose();
      discTex.dispose();
      renderer.dispose();
      // dispose() は context を解放しない。SPA 遷移で何度もマウントされても上限に当たらないよう明示的に失わせる
      renderer.forceContextLoss();
      scene.clear();
    };
  }, [canvasRoot]);
}
