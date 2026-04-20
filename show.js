// ==========================================================
// Drone Show — 660 drones, Three.js point-cloud sim
// ==========================================================
(function () {
  // Shared formation algorithms + palettes come from formations.js (loaded first).
  // This ensures the choreography preview uses the exact same point data as the
  // main Three.js view and never drifts.
  const { DRONE_COUNT, FORMATIONS, PALETTES, SKIES, TOTAL_TIME } = window.AstraFlock;
  const PALETTE_KEYS = Object.keys(PALETTES);
  const SKY_KEYS = Object.keys(SKIES);
  const CANVAS_ROOT = document.getElementById('canvas-root');


  // ---------- Three.js setup ----------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02030a, 0.0012);

  // Create a circular sprite texture for soft round drone points
  function makeDiscTexture() {
    const size = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  }
  const DISC_TEX = makeDiscTexture();

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(160, 85, 200);
  camera.lookAt(0, 60, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  CANVAS_ROOT.appendChild(renderer.domElement);

  // Background starfield (separate small points)
  (function addStars() {
    const g = new THREE.BufferGeometry();
    const N = 1200;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 700 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.cos(phi);
      pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
      const b = 0.4 + Math.random() * 0.6;
      col[i*3] = b; col[i*3+1] = b; col[i*3+2] = b;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: 1.2, vertexColors: true, transparent: true, opacity: 0.7,
      sizeAttenuation: false, depthWrite: false,
    });
    scene.add(new THREE.Points(g, m));
  })();

  // Horizon glow plane (subtle)
  (function addHorizon() {
    const geom = new THREE.PlaneGeometry(2000, 400);
    const mat = new THREE.ShaderMaterial({
      uniforms: { color1: { value: new THREE.Color(0x1e2a4a) }, color2: { value: new THREE.Color(0x02030a) } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 color1; uniform vec3 color2; varying vec2 vUv;
        void main(){ float g = smoothstep(0.0, 0.6, vUv.y); gl_FragColor = vec4(mix(color1, color2, g), 1.0);}`,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const p = new THREE.Mesh(geom, mat);
    p.rotation.x = 0;
    p.position.y = 100;
    p.position.z = -800;
    scene.add(p);
  })();

  // Drone cloud
  // We use a custom point sprite with circular falloff for a soft "lantern" look.
  const droneGeom = new THREE.BufferGeometry();
  const posBuf   = new Float32Array(DRONE_COUNT * 3);
  const colBuf   = new Float32Array(DRONE_COUNT * 3);
  const sizeBuf  = new Float32Array(DRONE_COUNT);
  droneGeom.setAttribute('position', new THREE.BufferAttribute(posBuf, 3));
  droneGeom.setAttribute('color',    new THREE.BufferAttribute(colBuf, 3));
  droneGeom.setAttribute('aSize',    new THREE.BufferAttribute(sizeBuf, 1));

  const droneMat = new THREE.PointsMaterial({
    size: 3.0,
    map: DISC_TEX,
    alphaMap: DISC_TEX,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const dronePoints = new THREE.Points(droneGeom, droneMat);
  scene.add(dronePoints);

  // Debug handle
  window.__DEBUG = { scene, camera, dronePoints, droneGeom, droneMat, posBuf, colBuf };

  // Trail layer (previous positions, drawn dimmer)
  const trailGeom = new THREE.BufferGeometry();
  const trailPos  = new Float32Array(DRONE_COUNT * 3 * 8); // 8-frame ring
  const trailCol  = new Float32Array(DRONE_COUNT * 3 * 8);
  trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeom.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  const trailMat = new THREE.PointsMaterial({
    size: 1.6, vertexColors: true, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const trailPoints = new THREE.Points(trailGeom, trailMat);
  scene.add(trailPoints);
  let trailIdx = 0;

  // ---------- Simulation state ----------
  // Each drone has: current pos (in droneGeom.position), velocity for smoothing.
  const velBuf = new Float32Array(DRONE_COUNT * 3);
  // Assigned base color per drone (palette-sampled, stable per formation)
  const baseCol = new Float32Array(DRONE_COUNT * 3);
  // Per-drone phase offset for subtle breathing/sparkle
  const phase = new Float32Array(DRONE_COUNT);
  for (let i = 0; i < DRONE_COUNT; i++) phase[i] = Math.random() * Math.PI * 2;

  // Initial scatter (pre-show hover)
  for (let i = 0; i < DRONE_COUNT; i++) {
    const a = (i / DRONE_COUNT) * Math.PI * 2 * 4;
    const r = 40 + (i % 10) * 4;
    posBuf[i*3]   = Math.cos(a) * r;
    posBuf[i*3+1] = 60 + Math.sin(i * 0.17) * 6;
    posBuf[i*3+2] = Math.sin(a) * r;
    sizeBuf[i] = 1.2;
  }

  // Palette assignment: each drone gets a stable palette slot for continuity
  function applyPalette(paletteKey) {
    const pal = PALETTES[paletteKey].colors;
    for (let i = 0; i < DRONE_COUNT; i++) {
      const c = new THREE.Color(pal[i % pal.length]);
      baseCol[i*3] = c.r; baseCol[i*3+1] = c.g; baseCol[i*3+2] = c.b;
      colBuf[i*3] = c.r; colBuf[i*3+1] = c.g; colBuf[i*3+2] = c.b;
    }
    droneGeom.attributes.color.needsUpdate = true;
  }

  function applySky(skyKey) {
    const s = SKIES[skyKey];
    const bg = document.getElementById('stars');
    bg.style.background = `
      radial-gradient(ellipse at 70% 20%, ${s.bg[2]}88, transparent 55%),
      radial-gradient(ellipse at 20% 80%, ${s.bg[1]}aa, transparent 60%),
      radial-gradient(ellipse at 50% 50%, ${s.bg[1]}, ${s.bg[0]} 80%)
    `;
    scene.fog.color = new THREE.Color(s.bg[0]);
  }

  // ---------- Controls ----------
  let state = {
    formationIndex: window.__TWEAKS.formationIndex,
    palette: window.__TWEAKS.palette,
    sky: window.__TWEAKS.sky,
    trails: window.__TWEAKS.trails,
    rotate: window.__TWEAKS.rotate,
    glow: window.__TWEAKS.glow,
    droneSize: window.__TWEAKS.droneSize,
    speed: window.__TWEAKS.speed,
    playing: true,
    showTime: FORMATIONS[window.__TWEAKS.formationIndex] ? FORMATIONS[window.__TWEAKS.formationIndex].start + 0.01 : 0,
  };

  applyPalette(state.palette);
  applySky(state.sky);

  // ---------- Mouse orbit ----------
  let orbit = { lon: 0, lat: 0, rLon: 0, rLat: 0, dist: 260, rDist: 260, dragging: false, px: 0, py: 0 };
  const el = renderer.domElement;
  el.style.cursor = 'grab';
  el.addEventListener('pointerdown', e => { orbit.dragging = true; orbit.px = e.clientX; orbit.py = e.clientY; el.style.cursor='grabbing'; });
  window.addEventListener('pointerup', () => { orbit.dragging = false; el.style.cursor='grab'; });
  window.addEventListener('pointermove', e => {
    if (!orbit.dragging) return;
    orbit.lon += (e.clientX - orbit.px) * 0.25;
    orbit.lat = Math.max(-60, Math.min(70, orbit.lat - (e.clientY - orbit.py) * 0.2));
    orbit.px = e.clientX; orbit.py = e.clientY;
  });
  el.addEventListener('wheel', e => {
    e.preventDefault();
    orbit.dist = Math.max(120, Math.min(480, orbit.dist + e.deltaY * 0.3));
  }, { passive: false });

  // ---------- UI bindings ----------
  const $ = id => document.getElementById(id);

  // Chapters
  const chaptersEl = $('chapters');
  chaptersEl.innerHTML = '';
  FORMATIONS.forEach((f, i) => {
    const c = document.createElement('div');
    c.className = 'chapter';
    c.dataset.i = i;
    c.innerHTML = `
      <div class="chapter-dot"></div>
      <div class="chapter-meta">
        <div class="chapter-num">${String(i+1).padStart(2,'0')}</div>
        <div class="chapter-label">${f.jp}</div>
        <div class="chapter-time">${fmt(f.start)}</div>
      </div>
    `;
    c.addEventListener('click', () => seekToFormation(i));
    chaptersEl.appendChild(c);
  });

  // Tweak formations
  const twFormsEl = $('tw-forms');
  twFormsEl.innerHTML = '';
  FORMATIONS.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'tw-form-btn';
    b.dataset.i = i;
    b.innerHTML = `${f.jp}<span class="en">${f.en.split(' ')[0]}</span>`;
    b.addEventListener('click', () => seekToFormation(i));
    twFormsEl.appendChild(b);
  });

  // Palettes
  const twPalEl = $('tw-palettes');
  twPalEl.innerHTML = '';
  PALETTE_KEYS.forEach(k => {
    const p = PALETTES[k];
    const b = document.createElement('div');
    b.className = 'tw-swatch' + (k === state.palette ? ' active' : '');
    b.dataset.key = k;
    b.title = `${p.jp} / ${p.name}`;
    b.style.background = `linear-gradient(135deg, ${p.colors[0]} 0%, ${p.colors[1]} 50%, ${p.colors[2]} 100%)`;
    b.addEventListener('click', () => {
      state.palette = k;
      applyPalette(k);
      [...twPalEl.children].forEach(x => x.classList.toggle('active', x.dataset.key === k));
      persist({ palette: k });
    });
    twPalEl.appendChild(b);
  });

  // Skies
  const twSkyEl = $('tw-skies');
  SKY_KEYS.forEach(k => {
    const s = SKIES[k];
    const b = document.createElement('div');
    b.className = 'tw-swatch' + (k === state.sky ? ' active' : '');
    b.dataset.key = k;
    b.title = `${s.jp} / ${s.name}`;
    b.style.background = `linear-gradient(180deg, ${s.bg[2]}, ${s.bg[0]})`;
    b.addEventListener('click', () => {
      state.sky = k;
      applySky(k);
      [...twSkyEl.children].forEach(x => x.classList.toggle('active', x.dataset.key === k));
      persist({ sky: k });
    });
    twSkyEl.appendChild(b);
  });

  // Toggles
  function bindToggle(id, key) {
    const t = $(id);
    t.classList.toggle('on', !!state[key]);
    t.addEventListener('click', () => {
      state[key] = !state[key];
      t.classList.toggle('on', state[key]);
      persist({ [key]: state[key] });
    });
  }
  bindToggle('tg-trails', 'trails');
  bindToggle('tg-rotate', 'rotate');
  bindToggle('tg-glow', 'glow');

  // Slider
  $('tw-size').value = state.droneSize;
  $('sz-val').textContent = state.droneSize.toFixed(1) + '×';
  $('tw-size').addEventListener('input', e => {
    state.droneSize = parseFloat(e.target.value);
    $('sz-val').textContent = state.droneSize.toFixed(1) + '×';
    persist({ droneSize: state.droneSize });
  });

  // Transport
  // アイコン規約: 再生中は pause bars (click で止める) / 停止中は play triangle
  const D_PAUSE = 'M4 3 L7 3 L7 13 L4 13 Z M9 3 L12 3 L12 13 L9 13 Z';
  const D_PLAY  = 'M4 3 L13 8 L4 13 Z';
  const playPath = $('play-icon').querySelector('path');
  function syncPlayIcon() {
    playPath.setAttribute('d', state.playing ? D_PAUSE : D_PLAY);
  }
  $('btn-play').addEventListener('click', () => {
    state.playing = !state.playing;
    syncPlayIcon();
  });
  $('btn-prev').addEventListener('click', () => seekToFormation(Math.max(0, state.formationIndex - 1)));
  $('btn-next').addEventListener('click', () => seekToFormation(Math.min(FORMATIONS.length - 1, state.formationIndex + 1)));

  // スローから 10× までの可搬レンジ。クリックで順送り、Shift+クリックで逆送り、ホイールで前後
  const speeds = [0.25, 0.5, 1, 2, 5, 10];
  const fmtSpeed = s => (s < 1 ? String(s) : String(Math.round(s))) + '×';
  let speedI = speeds.indexOf(state.speed);
  if (speedI === -1) { speedI = 2; state.speed = speeds[2]; } // default 1×
  $('btn-speed').textContent = fmtSpeed(state.speed);
  syncPlayIcon();
  function cycleSpeed(dir) {
    speedI = (speedI + dir + speeds.length) % speeds.length;
    state.speed = speeds[speedI];
    $('btn-speed').textContent = fmtSpeed(state.speed);
    persist({ speed: state.speed });
  }
  $('btn-speed').addEventListener('click', e => cycleSpeed(e.shiftKey ? -1 : 1));
  $('btn-speed').addEventListener('wheel', e => {
    e.preventDefault();
    cycleSpeed(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  $('btn-speed').title = 'Click / ホイールで変速 ・ Shift+Click で逆送り';

  // Initial NP display
  updateNowPlaying(state.formationIndex);
  markActiveFormation(state.formationIndex);

  function seekToFormation(i) {
    state.formationIndex = i;
    state.showTime = FORMATIONS[i].start + 0.01;
    markActiveFormation(i);
    updateNowPlaying(i);
    persist({ formationIndex: i });
  }

  function markActiveFormation(i) {
    [...chaptersEl.children].forEach((c, j) => {
      c.classList.toggle('active', j === i);
      c.classList.toggle('past', j < i);
    });
    [...twFormsEl.children].forEach((b, j) => b.classList.toggle('active', j === i));
  }

  function updateNowPlaying(i) {
    const f = FORMATIONS[i];
    $('np-num').innerHTML = `${String(i+1).padStart(2,'0')}<span class="total">/${String(FORMATIONS.length).padStart(2,'0')}</span>`;
    $('np-jp').textContent = f.jp;
    $('np-en').textContent = f.en;
    $('np-desc').textContent = f.desc;
    $('np-dur').textContent = fmt(f.dur);
    $('np-jp').style.opacity = 1;
    $('np-en').style.opacity = 1;
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  $('time-total').textContent = fmt(TOTAL_TIME);

  // ---------- Host edit-mode protocol ----------
  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (d.type === '__activate_edit_mode') {
      document.getElementById('tweaks-panel').classList.add('open');
      document.body.classList.add('tweaks-open');
    } else if (d.type === '__deactivate_edit_mode') {
      document.getElementById('tweaks-panel').classList.remove('open');
      document.body.classList.remove('tweaks-open');
    }
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch(e) {}
  function persist(edits) {
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*'); } catch(e) {}
  }

  // ---------- Animation loop ----------
  let lastT = performance.now();
  let frameCount = 0;

  function animate(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    frameCount++;

    // Advance show time
    if (state.playing) {
      state.showTime += dt * state.speed;
      if (state.showTime >= TOTAL_TIME) state.showTime = 0;

      // Figure out which formation we're in
      let idx = 0;
      for (let i = 0; i < FORMATIONS.length; i++) {
        if (state.showTime >= FORMATIONS[i].start) idx = i;
      }
      if (idx !== state.formationIndex) {
        state.formationIndex = idx;
        markActiveFormation(idx);
        updateNowPlaying(idx);
        persist({ formationIndex: idx });
      }
    }

    // Compute targets: blend between formations during the last 2s of each
    const curF = FORMATIONS[state.formationIndex];
    const nextF = FORMATIONS[(state.formationIndex + 1) % FORMATIONS.length];
    const localT = state.showTime - curF.start;
    const timeInForm = curF.dur;
    const blendWindow = 2.0;
    let blendK = 0;
    if (localT > timeInForm - blendWindow) {
      blendK = Math.min(1, (localT - (timeInForm - blendWindow)) / blendWindow);
      blendK = blendK * blendK * (3 - 2 * blendK); // smoothstep
    }

    // Physics / trails は再生中のみ進める。停止中は posBuf 凍結で「一時停止」を視覚的に意味あるものに
    if (state.playing) {
      const targets = curF.targets;
      const nextTargets = nextF.targets;
      const k = 3.2;    // spring stiffness
      const damping = 0.88;
      // 早送り時は編隊切替頻度が上がるので物理もそれに追従させる。
      // dt を state.speed 倍し、10 サブステップまで刻んで数値安定を保つ
      const physIters = Math.max(1, Math.min(10, Math.ceil(state.speed)));
      const physDt = (dt * state.speed) / physIters;
      for (let step = 0; step < physIters; step++) {
        for (let i = 0; i < DRONE_COUNT; i++) {
          const tx = targets[i*3]   * (1-blendK) + nextTargets[i*3]   * blendK;
          const ty = targets[i*3+1] * (1-blendK) + nextTargets[i*3+1] * blendK;
          const tz = targets[i*3+2] * (1-blendK) + nextTargets[i*3+2] * blendK;

          const ax = (tx - posBuf[i*3])   * k;
          const ay = (ty - posBuf[i*3+1]) * k;
          const az = (tz - posBuf[i*3+2]) * k;

          velBuf[i*3]   = (velBuf[i*3]   + ax * physDt) * damping;
          velBuf[i*3+1] = (velBuf[i*3+1] + ay * physDt) * damping;
          velBuf[i*3+2] = (velBuf[i*3+2] + az * physDt) * damping;

          posBuf[i*3]   += velBuf[i*3]   * physDt;
          posBuf[i*3+1] += velBuf[i*3+1] * physDt;
          posBuf[i*3+2] += velBuf[i*3+2] * physDt;
        }
      }
      // Breathing size は wall-clock で十分 (1 回/フレーム)
      for (let i = 0; i < DRONE_COUNT; i++) {
        const ph = phase[i] + now * 0.002;
        const breath = 0.85 + Math.sin(ph) * 0.25;
        sizeBuf[i] = 7.0 * state.droneSize * breath;
      }

      droneGeom.attributes.position.needsUpdate = true;

      if (state.trails) {
        trailMat.opacity = 0.45;
        for (let i = 0; i < DRONE_COUNT; i++) {
          const slotOff = (trailIdx * DRONE_COUNT + i) * 3;
          trailPos[slotOff]   = posBuf[i*3];
          trailPos[slotOff+1] = posBuf[i*3+1];
          trailPos[slotOff+2] = posBuf[i*3+2];
          trailCol[slotOff]   = baseCol[i*3]   * 0.4;
          trailCol[slotOff+1] = baseCol[i*3+1] * 0.4;
          trailCol[slotOff+2] = baseCol[i*3+2] * 0.4;
        }
        trailIdx = (trailIdx + 1) % 8;
        trailGeom.attributes.position.needsUpdate = true;
        trailGeom.attributes.color.needsUpdate = true;
      } else {
        trailMat.opacity = 0;
      }
    }

    droneMat.size = 3.0 * state.droneSize * (state.glow ? 1.2 : 0.9);

    // Camera orbit: 自動回転は再生中のみ。手動ドラッグ/ホイールは一時停止中でも効く
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

    // HUD updates
    if (frameCount % 6 === 0) {
      $('time-cur').textContent = fmt(state.showTime);
      $('rail-fill').style.width = ((state.showTime / TOTAL_TIME) * 100).toFixed(2) + '%';
      // live stats with gentle noise
      const altBase = 60 + Math.abs(Math.sin(now * 0.0003)) * 70;
      $('stat-alt').innerHTML = altBase.toFixed(0) + '<span class="stat-unit">m</span>';
      const wind = 2 + Math.sin(now * 0.0007) * 0.8;
      $('stat-wind').innerHTML = wind.toFixed(1) + '<span class="stat-unit">m/s</span>';
      $('fc').textContent = `FRAME ${String(frameCount).padStart(6,'0')} ・ 60 FPS ・ REC`;
    }

    requestAnimationFrame(animate);
  }
  // Force first render synchronously in case iframe starts hidden
  animate(performance.now());
  requestAnimationFrame(animate);

  // Watchdog: kick the loop if it stalls (hidden iframe).
  // Also listens to visibility change to immediately render.
  let lastWatchFrame = 0;
  setInterval(() => {
    if (frameCount === lastWatchFrame) {
      try { animate(performance.now()); } catch(e) { console.error(e); }
    }
    lastWatchFrame = frameCount;
  }, 200);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) requestAnimationFrame(animate);
  });

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- Accessibility: prefers-reduced-motion ----------
  // auto-rotate をデフォルトで無効化。モーション感度の高いユーザー配慮
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.rotate = false;
    const tgRot = $('tg-rotate');
    if (tgRot) tgRot.classList.remove('on');
  }

  // ---------- Fullscreen toggle ----------
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }
  const fsBtn = $('btn-fullscreen');
  if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);

  // ---------- Keyboard shortcuts ----------
  // Space: 再生/停止, ←/→: 前/次, F: 全画面, T: tweaks パネル,
  // +/-: 速度, 1-9: 演目ジャンプ
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        $('btn-play').click();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        $('btn-prev').click();
        break;
      case 'ArrowRight':
        e.preventDefault();
        $('btn-next').click();
        break;
      case 'f': case 'F':
        toggleFullscreen();
        break;
      case 't': case 'T':
        $('tweaks-panel').classList.toggle('open');
        document.body.classList.toggle('tweaks-open');
        break;
      case '+': case '=':
        cycleSpeed(1);
        break;
      case '-': case '_':
        cycleSpeed(-1);
        break;
      default: {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= FORMATIONS.length) seekToFormation(n - 1);
      }
    }
  });
})();
