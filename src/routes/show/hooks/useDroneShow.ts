import { useEffect } from 'react';
import { useLatestRef } from '~/hooks/useLatestRef';
import * as THREE from 'three';
import { droneIdFromIndex } from '~/lib/droneId';
import { diagnoseWebglFailure, type WebglFailure } from '../browser';
import { DRONE_COUNT, FORMATIONS, PALETTES, SKIES, TOTAL_TIME } from '~/lib/formations';
import { makeGlowSprite } from '~/lib/glowSprite';
import { isTap, pickNearestPoint, pickRadiusFor, projectPoint } from '../picking';
import { createPipBudget, type PipRect, shouldUpdatePip } from '../pip';
import type { DroneCoord, HudInfo, ShowState } from '../types';
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
  /** WebGL が使えないとき。理由の見立てを添える */
  onUnavailable: (failure: WebglFailure) => void;
  /** スクリーンショット用の操作口 */
  handleRef: React.MutableRefObject<ShowHandle | null>;
  /** 3D 画面の点をクリック / タップしたとき。`add` は Shift を押していたか（小窓に追加） */
  onPickDrone: (index: number, opts: { add: boolean }) => void;
  /** 負荷に応じて小窓の間引きの段が変わったとき（数と更新間隔は pipLevel() で求める） */
  onPipLevel: (level: number) => void;
  /** 小窓の機体の現在位置。HUD と同じ約 5 回/秒、小窓があるときだけ */
  onPipCoords: (coords: DroneCoord[]) => void;
}

/** 1 つの小窓の描画資源。小窓は本体と同じ renderer で、別の render target に描いてから貼り付ける */
interface PipSlot {
  index: number;
  rect: PipRect;
  cam: THREE.PerspectiveCamera;
  target: THREE.WebGLRenderTarget;
  /** 次のフレームで必ず描き直す（追加直後・大きさが変わった直後） */
  dirty: boolean;
}

const DISC_SIZE = 64;
function makeDiscTexture(): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(makeGlowSprite(DISC_SIZE));
  tex.needsUpdate = true;
  return tex;
}

const STAR_COUNT = 1200;
const TRAIL_SLOTS = 8;
/** 360° モードで一周にかける速さ（度/秒）。20 秒で一周 */
const FLY_DEG_PER_SEC = 18;
/** 観客視点の画角と、機体目線の画角（機体目線は広めにして臨場感を出す） */
const FOV_ORBIT = 45;
const FOV_DRONE = 75;
/** 点の大きさの上限（デバイスピクセル）。機体目線では隣の機体がカメラのすぐそばに来るため */
const MAX_POINT_PX = 56;

/**
 * three の PointsMaterial は距離に反比例して点を大きくする。機体目線でカメラの 1〜2m 隣にいる機体は
 * 画面いっぱいの光の塊になるので、頂点シェーダに上限を足す。
 * 上限は uniform にして、小さな小窓へ描くときだけ縮める（小窓では同じ 56px が画面の大半を覆うため）
 */
function clampPointSize(mat: THREE.PointsMaterial, maxPointPx: { value: number }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.maxPointPx = maxPointPx;
    shader.vertexShader =
      'uniform float maxPointPx;\n' +
      shader.vertexShader.replace(
        'if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );',
        'if ( isPerspective ) gl_PointSize = min( gl_PointSize * ( scale / - mvPosition.z ), maxPointPx );'
      );
  };
}

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
  const optsRef = useLatestRef(options);

  useEffect(() => {
    if (!canvasRoot) return;
    // handleRef は親の useRef なので同じオブジェクトのまま。cleanup でも安全に触れるよう先に取っておく
    const handleRef = optsRef.current.handleRef;

    // WebGL の有無は WebGLRenderer の生成で判定する（下の try/catch）。
    // 以前は別 canvas で探りの context を作っていたが、それは解放されず、
    // ページ内の WebGL context 上限（ブラウザにより 8〜16）を SPA 遷移のたびに 1 つ消費していた。

    // ---- Scene ----
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02030a, 0.0012);

    const camera = new THREE.PerspectiveCamera(
      FOV_ORBIT,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(160, 85, 200);
    camera.lookAt(0, 60, 0);

    // canvas は自前で作って渡す。context 生成前に webglcontextcreationerror を聞いておけば、
    // ブラウザが返す「なぜ作れなかったか」を案内に使える
    const canvas = document.createElement('canvas');
    let creationError = '';
    const onCreationError = (e: Event) => {
      creationError = (e as WebGLContextEvent).statusMessage ?? '';
    };
    canvas.addEventListener('webglcontextcreationerror', onCreationError);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: false,
        powerPreference: 'default',
      });
    } catch (err) {
      const failure = diagnoseWebglFailure(
        typeof WebGLRenderingContext !== 'undefined',
        creationError
      );
      console.warn('useDroneShow: WebGL renderer init failed; chrome-only mode', failure, err);
      optsRef.current.onUnavailable(failure);
      return;
    } finally {
      canvas.removeEventListener('webglcontextcreationerror', onCreationError);
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
    /** 描画領域の CSS ピクセル。小窓の位置（左上原点）を WebGL の座標（左下原点）に直すのに使う */
    let viewW = window.innerWidth;
    let viewH = window.innerHeight;
    const applySize = () => {
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      renderer.setPixelRatio(dpr);
      renderer.setSize(viewW, viewH);
      camera.aspect = viewW / viewH;
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
    const pointClamp = { value: MAX_POINT_PX };
    clampPointSize(droneMat, pointClamp);
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
    clampPointSize(trailMat, pointClamp);
    const trailPoints = new THREE.Points(trailGeom, trailMat);
    trailPoints.frustumCulled = false;
    trailPoints.visible = false;
    scene.add(trailPoints);
    let trailIdx = 0;
    let trailFilled = false;

    // ---- 機体 ID の札（マウスを乗せた機体と、小窓で見ている機体） ----
    // 点群の上に DOM で重ねる。位置は描画のたびに投影し直す。同じ情報は画面の操作部品にもあるので読み上げからは外す
    const labelLayer = document.createElement('div');
    labelLayer.className = 'drone-labels';
    labelLayer.setAttribute('aria-hidden', 'true');
    canvasRoot.appendChild(labelLayer);
    const labelPool: HTMLDivElement[] = [];
    const viewProj = new THREE.Matrix4();

    // ---- 小窓 ----
    const pipSlots: PipSlot[] = [];
    const pipBudget = createPipBudget({}, performance.now());
    let pipFrame = 0;
    let lastPipViews: ShowState['pips'] | null = null;
    let lastPipAllowed = -1;
    let lastPipDpr = dpr;
    const pipLook = new THREE.Vector3();
    const pipHost = new THREE.Vector3();
    // render target を画面に貼るための板。正射影で全面に 1 枚だけ描く
    const blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const blitMat = new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false });
    const blitQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat);
    const blitScene = new THREE.Scene();
    blitScene.add(blitQuad);

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

    /** 機体目線で乗っている機体。カメラの位置にある点は消す（加算合成なので黒 = 見えない） */
    let hiddenIdx = -1;
    function setHidden(i: number) {
      if (hiddenIdx === i) return;
      if (hiddenIdx >= 0) {
        colBuf[hiddenIdx * 3] = baseCol[hiddenIdx * 3]!;
        colBuf[hiddenIdx * 3 + 1] = baseCol[hiddenIdx * 3 + 1]!;
        colBuf[hiddenIdx * 3 + 2] = baseCol[hiddenIdx * 3 + 2]!;
      }
      hiddenIdx = i;
      if (i >= 0) {
        colBuf[i * 3] = 0;
        colBuf[i * 3 + 1] = 0;
        colBuf[i * 3 + 2] = 0;
      }
      droneGeom.attributes.color!.needsUpdate = true;
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
      if (hiddenIdx >= 0) {
        colBuf[hiddenIdx * 3] = 0;
        colBuf[hiddenIdx * 3 + 1] = 0;
        colBuf[hiddenIdx * 3 + 2] = 0;
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
    /** 機体目線の見回し（ヨー / ピッチ）と画角 */
    const pov = { yaw: 0, pitch: 0, fov: FOV_DRONE, rFov: FOV_DRONE, idx: -1 };
    /** クリック / タップの判定。canvas の上で押されたときだけ作る */
    let tap: {
      x: number;
      y: number;
      t: number;
      maxMove: number;
      type: string;
      multi: boolean;
    } | null = null;
    /** ボタンを押していないマウスの位置。描画のついでに近い機体を探して札を出す */
    let hoverPt: { x: number; y: number } | null = null;
    let hoverIdx = -1;
    let hoverDirty = false;
    let labelsDirty = false;
    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3(0, 60, 0);
    const centroid = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    let flyT = 0;
    let lastCamera = initial.camera;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    let needsRender = true;
    const isDroneCam = () => optsRef.current.stateRef.current.camera === 'drone';

    const el = renderer.domElement;
    el.style.cursor = 'grab';
    el.style.touchAction = 'none';

    const pinchDistance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    /** 画面上の (x, y) に近い機体。機体目線のときは乗っている機体を除く */
    const pickAt = (x: number, y: number, pointerType: string) => {
      camera.updateMatrixWorld();
      viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const r = el.getBoundingClientRect();
      return pickNearestPoint(
        posBuf,
        viewProj.elements,
        r.width,
        r.height,
        x - r.left,
        y - r.top,
        pickRadiusFor(pointerType),
        isDroneCam() ? hiddenIdx : -1
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        tap = {
          x: e.clientX,
          y: e.clientY,
          t: performance.now(),
          maxMove: 0,
          type: e.pointerType,
          multi: false,
        };
        hoverPt = null;
        hoverDirty = true;
      } else if (tap) {
        tap.multi = true;
      }
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
      const t = tap;
      const tapped =
        t !== null &&
        e.type === 'pointerup' &&
        pointers.size === 1 &&
        pointers.has(e.pointerId) &&
        isTap({
          maxMove: t.maxMove,
          durationMs: performance.now() - t.t,
          pointerType: t.type,
          multiTouch: t.multi,
        });
      pointers.delete(e.pointerId);
      if (pointers.size === 0) tap = null;
      if (tapped) {
        const idx = pickAt(e.clientX, e.clientY, t.type);
        if (idx >= 0) optsRef.current.onPickDrone(idx, { add: e.shiftKey });
      }
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
      if (tap)
        tap.maxMove = Math.max(tap.maxMove, Math.hypot(e.clientX - tap.x, e.clientY - tap.y));
      if (pointers.size >= 2) {
        const d = pinchDistance();
        if (pinchDist > 0 && d > 0) {
          if (isDroneCam()) pov.fov = Math.max(35, Math.min(110, pov.fov * (pinchDist / d)));
          else orbit.dist = Math.max(120, Math.min(480, orbit.dist * (pinchDist / d)));
        }
        pinchDist = d;
        needsRender = true;
        return;
      }
      if (!orbit.dragging) return;
      const dx = e.clientX - orbit.px;
      const dy = e.clientY - orbit.py;
      orbit.px = e.clientX;
      orbit.py = e.clientY;
      if (isDroneCam()) {
        // 機体目線では見回す
        pov.yaw -= dx * 0.004;
        pov.pitch = Math.max(-1.2, Math.min(1.2, pov.pitch - dy * 0.004));
      } else {
        orbit.lon += dx * 0.25;
        orbit.lat = Math.max(-60, Math.min(70, orbit.lat - dy * 0.2));
      }
      needsRender = true;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isDroneCam()) pov.fov = Math.max(35, Math.min(110, pov.fov + e.deltaY * 0.05));
      else orbit.dist = Math.max(120, Math.min(480, orbit.dist + e.deltaY * 0.3));
      needsRender = true;
    };
    const onHoverMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || pointers.size > 0) return;
      hoverPt = { x: e.clientX, y: e.clientY };
      hoverDirty = true;
    };
    const onHoverLeave = () => {
      hoverPt = null;
      hoverDirty = true;
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
    el.addEventListener('pointermove', onHoverMove);
    el.addEventListener('pointerleave', onHoverLeave);
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

    function computeCentroid(out: THREE.Vector3) {
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (let i = 0; i < DRONE_COUNT; i++) {
        cx += posBuf[i * 3]!;
        cy += posBuf[i * 3 + 1]!;
        cz += posBuf[i * 3 + 2]!;
      }
      return out.set(cx / DRONE_COUNT, cy / DRONE_COUNT, cz / DRONE_COUNT);
    }

    function pipTargetSize(rect: PipRect) {
      return {
        w: Math.max(1, Math.round(rect.w * dpr)),
        h: Math.max(1, Math.round(rect.h * dpr)),
      };
    }

    /** 画面側が決めた小窓の一覧を、負荷で許された数まで描画資源に反映する。変わったら true */
    function syncPips(views: ShowState['pips'], allowed: number): boolean {
      const want = views.slice(0, allowed);
      let changed = false;
      while (pipSlots.length > want.length) {
        pipSlots.pop()!.target.dispose();
        changed = true;
      }
      want.forEach((v, k) => {
        const size = pipTargetSize(v.rect);
        let slot = pipSlots[k];
        if (!slot) {
          slot = {
            index: v.index,
            rect: v.rect,
            cam: new THREE.PerspectiveCamera(FOV_DRONE, v.rect.w / v.rect.h, 0.1, 2000),
            target: new THREE.WebGLRenderTarget(size.w, size.h),
            dirty: true,
          };
          pipSlots.push(slot);
          changed = true;
          return;
        }
        if (slot.index !== v.index) {
          slot.index = v.index;
          slot.dirty = true;
          changed = true;
        }
        const r = slot.rect;
        if (r.x !== v.rect.x || r.y !== v.rect.y || r.w !== v.rect.w || r.h !== v.rect.h) {
          slot.rect = v.rect;
          slot.cam.aspect = v.rect.w / v.rect.h;
          slot.cam.updateProjectionMatrix();
          slot.dirty = true;
          changed = true;
        }
        if (slot.target.width !== size.w || slot.target.height !== size.h) {
          slot.target.setSize(size.w, size.h);
          slot.dirty = true;
          changed = true;
        }
      });
      return changed;
    }

    /** 乗っている機体の点を一時的に戻す / 消す（本体のカメラ位置の点は消すが、小窓からは見えてほしい） */
    function setHostColor(visible: boolean) {
      if (hiddenIdx < 0) return;
      const o = hiddenIdx * 3;
      colBuf[o] = visible ? baseCol[o]! : 0;
      colBuf[o + 1] = visible ? baseCol[o + 1]! : 0;
      colBuf[o + 2] = visible ? baseCol[o + 2]! : 0;
      // 部分更新（addUpdateRange）は他の全体更新と取り合うので使わない。660 点ぶん 8KB の転送で済む
      droneGeom.attributes.color!.needsUpdate = true;
    }

    /**
     * 本体と小窓を 1 つの WebGL context で描く。小窓は各自の render target に（間引くときは数フレームに 1 回）描き、
     * 毎フレーム scissor / viewport で画面の決まった位置へ貼る。preserveDrawingBuffer を切っているので、
     * 本体を描いたフレームでは小窓も必ず貼り直す必要がある
     */
    function render(updateAllPips = false) {
      renderer.setRenderTarget(null);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, viewW, viewH);
      renderer.render(scene, camera);
      if (pipSlots.length === 0) return;

      const { interval } = pipBudget.current(pipSlots.length);
      const updates = pipSlots.filter(
        (slot, k) => updateAllPips || slot.dirty || shouldUpdatePip(pipFrame, k, interval)
      );
      pipFrame++;
      if (updates.length > 0) {
        computeCentroid(centroid);
        const mainSize = droneMat.size;
        const mainTrail = trailMat.size;
        const prevClear = renderer.getClearColor(new THREE.Color());
        const prevAlpha = renderer.getClearAlpha();
        setHostColor(true);
        // 小窓は不透明な空の色で塗る（本体は透明にして CSS の空のグラデーションを見せている）
        renderer.setClearColor(scene.fog instanceof THREE.FogExp2 ? scene.fog.color : 0x02030a, 1);
        for (const slot of updates) {
          const i = slot.index;
          pipHost.set(posBuf[i * 3]!, posBuf[i * 3 + 1]!, posBuf[i * 3 + 2]!);
          pipLook.subVectors(centroid, pipHost);
          if (pipLook.lengthSq() < 1) pipLook.set(0, 0, -1);
          pipLook.normalize().add(pipHost);
          slot.cam.position.copy(pipHost);
          slot.cam.lookAt(pipLook);
          // 点の大きさは描画先の高さではなく canvas の高さで決まるので、小窓の縮尺に合わせて縮める
          const k = slot.target.height / (viewH * dpr);
          droneMat.size = mainSize * k;
          trailMat.size = mainTrail * k;
          pointClamp.value = Math.max(4, MAX_POINT_PX * k);
          renderer.setRenderTarget(slot.target);
          renderer.render(scene, slot.cam);
          slot.dirty = false;
        }
        droneMat.size = mainSize;
        trailMat.size = mainTrail;
        pointClamp.value = MAX_POINT_PX;
        renderer.setRenderTarget(null);
        renderer.setClearColor(prevClear, prevAlpha);
        setHostColor(false);
      }

      renderer.setScissorTest(true);
      for (const slot of pipSlots) {
        const { x, y, w, h } = slot.rect;
        const glY = viewH - y - h;
        renderer.setViewport(x, glY, w, h);
        renderer.setScissor(x, glY, w, h);
        if (blitMat.map !== slot.target.texture) {
          const first = blitMat.map === null;
          blitMat.map = slot.target.texture;
          if (first) blitMat.needsUpdate = true;
        }
        renderer.render(blitScene, blitCam);
      }
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, viewW, viewH);
    }

    function updateLabels() {
      const items: { index: number; kind: 'hover' | 'pip' }[] = [];
      if (hoverIdx >= 0) items.push({ index: hoverIdx, kind: 'hover' });
      for (const slot of pipSlots) {
        if (slot.index !== hoverIdx) items.push({ index: slot.index, kind: 'pip' });
      }
      if (items.length > 0) {
        camera.updateMatrixWorld();
        viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      }
      items.forEach((item, k) => {
        let node = labelPool[k];
        if (!node) {
          node = document.createElement('div');
          labelPool.push(node);
          labelLayer.appendChild(node);
        }
        const i = item.index;
        const p =
          isDroneCam() && i === hiddenIdx
            ? null
            : projectPoint(
                viewProj.elements,
                posBuf[i * 3]!,
                posBuf[i * 3 + 1]!,
                posBuf[i * 3 + 2]!,
                viewW,
                viewH
              );
        if (!p || p.x < 0 || p.y < 0 || p.x > viewW || p.y > viewH) {
          node.style.display = 'none';
          return;
        }
        // 文字は CSS の attr(data-id) で出す（点の位置に置いた幅 0 の要素から、札だけをずらして描くため）
        const text = droneIdFromIndex(i);
        const cls = `drone-label ${item.kind}`;
        if (node.dataset.id !== text) node.dataset.id = text;
        if (node.className !== cls) node.className = cls;
        node.style.display = '';
        node.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      });
      for (let k = items.length; k < labelPool.length; k++) labelPool[k]!.style.display = 'none';
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

      // ---- カメラ ----
      if (state.camera !== lastCamera) {
        lastCamera = state.camera;
        pov.yaw = 0;
        pov.pitch = 0;
        pov.fov = FOV_DRONE;
        camPos.copy(camera.position);
        if (state.camera !== 'drone') setHidden(-1);
        needsRender = true;
      }
      if (state.camera === 'drone') {
        if (state.povIndex !== pov.idx) {
          pov.idx = state.povIndex;
          pov.yaw = 0;
          pov.pitch = 0;
        }
        const host = pov.idx >= 0 && pov.idx < DRONE_COUNT ? pov.idx : 0;
        setHidden(host);
        // 編隊の重心を見る（ドラッグで見回した分を足す）
        computeCentroid(centroid);
        tmp.set(posBuf[host * 3]!, posBuf[host * 3 + 1]!, posBuf[host * 3 + 2]!);
        if (camPos.distanceToSquared(tmp) > 1e-4) {
          camPos.lerp(tmp, 0.2);
          needsRender = true;
        }
        dir.subVectors(centroid, camPos);
        const len = dir.length();
        if (len < 1) dir.set(0, 0, -1);
        else dir.divideScalar(len);
        const theta = Math.atan2(dir.x, dir.z) + pov.yaw;
        const phi = Math.max(
          -1.4,
          Math.min(1.4, Math.asin(Math.max(-1, Math.min(1, dir.y))) + pov.pitch)
        );
        tmp
          .set(Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta))
          .multiplyScalar(10)
          .add(camPos);
        if (camLook.distanceToSquared(tmp) > 1e-4) {
          camLook.lerp(tmp, 0.25);
          needsRender = true;
        }
        if (Math.abs(pov.rFov - pov.fov) > 0.05) {
          pov.rFov += (pov.fov - pov.rFov) * 0.15;
          camera.fov = pov.rFov;
          camera.updateProjectionMatrix();
          needsRender = true;
        }
        if (needsRender) {
          camera.position.copy(camPos);
          camera.lookAt(camLook);
        }
      } else {
        if (camera.fov !== FOV_ORBIT) {
          camera.fov = FOV_ORBIT;
          pov.rFov = FOV_DRONE;
          camera.updateProjectionMatrix();
          needsRender = true;
        }
        if (state.camera === 'fly') {
          // 自動で一周しつつ、高さと距離がゆるく揺れる（一時停止中も動く）
          flyT += dt;
          orbit.lon += dt * FLY_DEG_PER_SEC;
          orbit.lat = 12 + Math.sin(flyT * 0.09) * 22;
          orbit.dist = 270 + Math.sin(flyT * 0.06) * 50;
        } else if (state.rotate && state.playing && !orbit.dragging) {
          orbit.lon += dt * 6;
        }
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
        }
      }

      // ---- 小窓 ----
      const requestedPips = state.pips.length;
      const pipAllowed = pipBudget.current(requestedPips).allowed;
      if (state.pips !== lastPipViews || pipAllowed !== lastPipAllowed || dpr !== lastPipDpr) {
        if (syncPips(state.pips, pipAllowed)) {
          needsRender = true;
          labelsDirty = true;
        }
        lastPipViews = state.pips;
        lastPipAllowed = pipAllowed;
        lastPipDpr = dpr;
      }

      // ---- マウスを乗せた機体 ----
      if (hoverDirty || (hoverPt && needsRender)) {
        const prev = hoverIdx;
        hoverIdx = hoverPt ? pickAt(hoverPt.x, hoverPt.y, 'mouse') : -1;
        hoverDirty = false;
        if (prev !== hoverIdx) {
          labelsDirty = true;
          if (pointers.size === 0) el.style.cursor = hoverIdx >= 0 ? 'pointer' : 'grab';
        }
      }

      if (needsRender) {
        render();
        frameCount++;
        renderedSinceHud = true;
        needsRender = false;
        labelsDirty = true;
        if (dtMs > 0 && dtMs < 250) fpsEma += (1000 / dtMs - fpsEma) * 0.1;
        if (state.playing) {
          // 重いときは小窓を先に落とす。小窓がもう減らせないときだけ本体の解像度を調整する
          const pipsCanDrop = pipBudget.canDegrade(requestedPips);
          const next = pipBudget.push(dtMs, now, requestedPips);
          if (next) opts.onPipLevel(pipBudget.level);
          if (!pipsCanDrop) {
            const action = resolution.push(dtMs, now);
            if (action.type === 'dpr') {
              dpr = action.dpr;
              applySize();
            } else if (action.type === 'lite' && !state.lite) {
              opts.onAutoLite();
            }
          }
        }
      } else {
        resolution.observe(dtMs);
      }
      if (labelsDirty) {
        updateLabels();
        labelsDirty = false;
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
        if (pipSlots.length > 0) {
          opts.onPipCoords(
            pipSlots.map(({ index: i }) => ({
              index: i,
              x: posBuf[i * 3]!,
              y: posBuf[i * 3 + 1]!,
              z: posBuf[i * 3 + 2]!,
            }))
          );
        }
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

    handleRef.current = {
      capture: () => {
        try {
          // preserveDrawingBuffer を切っているので、描いた直後の同じタスク内で読み出す
          render(true);
          return renderer.domElement.toDataURL('image/png');
        } catch {
          return null;
        }
      },
    };

    return () => {
      stopped = true;
      handleRef.current = null;
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointermove', onHoverMove);
      el.removeEventListener('pointerleave', onHoverLeave);
      window.removeEventListener('resize', onResize);
      labelLayer.remove();
      for (const slot of pipSlots) slot.target.dispose();
      blitQuad.geometry.dispose();
      blitMat.dispose();
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
  }, [canvasRoot, optsRef]);
}
