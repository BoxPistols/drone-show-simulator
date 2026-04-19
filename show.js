// ==========================================================
// Asagiri Drone Show — 660 drones, Three.js point-cloud sim
// ==========================================================
(function () {
  const DRONE_COUNT = 660;
  const CANVAS_ROOT = document.getElementById('canvas-root');

  // ---------- Formations ----------
  // Each fn returns Float32Array length DRONE_COUNT*3 of target positions.
  // World units: 1 unit ≈ 1 meter. Show sits around y=0..120.
  function fSphere(n) {
    const out = new Float32Array(n * 3);
    const R = 55;
    // Fibonacci sphere for even distribution
    const phi = Math.PI * (Math.sqrt(5) - 1);
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      out[i*3]   = Math.cos(theta) * r * R;
      out[i*3+1] = y * R + 60;
      out[i*3+2] = Math.sin(theta) * r * R;
    }
    return out;
  }
  function fHelix(n) {
    const out = new Float32Array(n * 3);
    const turns = 6;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const a = t * turns * Math.PI * 2;
      const strand = i % 2 === 0 ? 1 : -1;
      const r = 22;
      out[i*3]   = Math.cos(a) * r * strand;
      out[i*3+1] = 10 + t * 120;
      out[i*3+2] = Math.sin(a) * r * strand;
    }
    return out;
  }
  function fTorus(n) {
    const out = new Float32Array(n * 3);
    const R = 55, r = 16;
    // 2D grid on torus
    const u_count = 44;
    const v_count = Math.ceil(n / u_count);
    for (let i = 0; i < n; i++) {
      const iu = i % u_count;
      const iv = Math.floor(i / u_count);
      const u = (iu / u_count) * Math.PI * 2;
      const v = (iv / v_count) * Math.PI * 2;
      out[i*3]   = (R + r * Math.cos(v)) * Math.cos(u);
      out[i*3+1] = 60 + r * Math.sin(v);
      out[i*3+2] = (R + r * Math.cos(v)) * Math.sin(u);
    }
    return out;
  }
  function fWave(n) {
    // Ripple on a square grid
    const out = new Float32Array(n * 3);
    const side = Math.ceil(Math.sqrt(n));
    const spacing = 110 / side;
    for (let i = 0; i < n; i++) {
      const ix = i % side, iz = Math.floor(i / side);
      const x = (ix - side/2) * spacing;
      const z = (iz - side/2) * spacing;
      const d = Math.sqrt(x*x + z*z);
      const y = 55 + Math.sin(d * 0.22) * 18 + Math.cos(d * 0.1) * 6;
      out[i*3] = x; out[i*3+1] = y; out[i*3+2] = z;
    }
    return out;
  }
  function fDoubleHelix(n) {
    const out = new Float32Array(n * 3);
    const turns = 5;
    const R = 24;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const strand = i % 2;
      const a = t * turns * Math.PI * 2 + strand * Math.PI;
      out[i*3]   = Math.cos(a) * R;
      out[i*3+1] = 15 + t * 115;
      out[i*3+2] = Math.sin(a) * R;
      // add occasional rungs connecting strands
      if (i % 22 === 0 && strand === 0) {
        const rung = (i+1 < n) ? i+1 : i;
        out[rung*3]   = Math.cos(a + Math.PI) * R * 0.5;
        out[rung*3+1] = out[i*3+1];
        out[rung*3+2] = Math.sin(a + Math.PI) * R * 0.5;
      }
    }
    return out;
  }
  function fCube(n) {
    // Points on edges of a cube-grid (wireframe cube)
    const out = new Float32Array(n * 3);
    const S = 50;
    const per = Math.ceil(n / 12); // 12 edges
    const edges = [
      [[-1,-1,-1],[1,-1,-1]], [[1,-1,-1],[1,1,-1]], [[1,1,-1],[-1,1,-1]], [[-1,1,-1],[-1,-1,-1]],
      [[-1,-1,1],[1,-1,1]],   [[1,-1,1],[1,1,1]],   [[1,1,1],[-1,1,1]],   [[-1,1,1],[-1,-1,1]],
      [[-1,-1,-1],[-1,-1,1]], [[1,-1,-1],[1,-1,1]], [[1,1,-1],[1,1,1]],   [[-1,1,-1],[-1,1,1]],
    ];
    let idx = 0;
    for (let e = 0; e < 12 && idx < n; e++) {
      const [a, b] = edges[e];
      for (let k = 0; k < per && idx < n; k++) {
        const t = k / (per - 1);
        out[idx*3]   = (a[0] + (b[0]-a[0]) * t) * S;
        out[idx*3+1] = (a[1] + (b[1]-a[1]) * t) * S + 60;
        out[idx*3+2] = (a[2] + (b[2]-a[2]) * t) * S;
        idx++;
      }
    }
    return out;
  }
  function fGalaxy(n) {
    const out = new Float32Array(n * 3);
    const arms = 4;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const arm = i % arms;
      const angle = t * Math.PI * 4 + (arm / arms) * Math.PI * 2;
      const r = 10 + t * 60;
      const jitter = (Math.random() - 0.5) * 6;
      out[i*3]   = Math.cos(angle) * r + jitter;
      out[i*3+1] = 60 + (Math.random() - 0.5) * 6;
      out[i*3+2] = Math.sin(angle) * r + jitter;
    }
    return out;
  }
  function fHeart(n) {
    const out = new Float32Array(n * 3);
    // Parametric heart, scaled up; fill interior with jitter
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const scale = 2.2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
      // depth: two layered hearts + some inside fill
      const layer = (i % 3) - 1; // -1, 0, 1
      const inset = (Math.floor(i / 100) % 3) * 0.1;
      const k = scale * (1 - inset);
      out[i*3]   = x * k;
      out[i*3+1] = y * k + 65;
      out[i*3+2] = layer * 6;
    }
    return out;
  }
  function fKanjiKotobuki(n) {
    // Glyph for 寿 (celebration). Drawn as line segments on a 2D canvas,
    // then we sample points along those lines and lift into world space.
    const strokes = [
      // top horizontal
      [[-1.1, 1.0],[1.1, 1.0]],
      // vertical under top
      [[0, 1.0],[0, 0.55]],
      // second horizontal (shorter)
      [[-0.8, 0.55],[0.8, 0.55]],
      // third horizontal
      [[-1.0, 0.15],[1.0, 0.15]],
      // diagonal upper-left into middle
      [[-1.0, 0.85],[0.2, 0.35]],
      // vertical center tall
      [[0.05, 0.15],[0.05, -0.75]],
      // bottom horizontal
      [[-0.9, -0.25],[0.9, -0.25]],
      // flourish bottom
      [[-0.55, -0.25],[-0.85, -0.85]],
      [[ 0.55, -0.25],[ 0.85, -0.85]],
      // final kick
      [[0.05, -0.75],[0.55, -1.05]],
    ];
    // total length
    const lens = strokes.map(([a,b]) => Math.hypot(b[0]-a[0], b[1]-a[1]));
    const total = lens.reduce((s,v) => s+v, 0);
    const out = new Float32Array(n * 3);
    const SCALE = 42;
    let idx = 0;
    for (let s = 0; s < strokes.length; s++) {
      const count = Math.round((lens[s] / total) * n);
      const [a, b] = strokes[s];
      for (let k = 0; k < count && idx < n; k++) {
        const t = k / Math.max(1, count - 1);
        const jx = (Math.random() - 0.5) * 0.8;
        const jy = (Math.random() - 0.5) * 0.8;
        out[idx*3]   = (a[0] + (b[0]-a[0]) * t) * SCALE + jx;
        out[idx*3+1] = (a[1] + (b[1]-a[1]) * t) * SCALE + 60 + jy;
        out[idx*3+2] = (Math.random() - 0.5) * 2;
        idx++;
      }
    }
    // fill remaining
    while (idx < n) {
      out[idx*3] = 0; out[idx*3+1] = 60; out[idx*3+2] = 0;
      idx++;
    }
    return out;
  }

  const FORMATIONS = [
    { id:'sphere',  jp:'球体',         en:'Sphere of Stars',    desc:'660機のドローンが均等に配置され、完全な球体を描く。最もシンプルで、最も幾何学的な形。', dur:42, fn:fSphere,      color:'#6ed3e6' },
    { id:'helix',   jp:'単螺旋',        en:'Ascending Helix',    desc:'螺旋状に昇り、観客の視線を天へ導く。東京湾の夜空に立ち上がる一本の光の柱。',           dur:38, fn:fHelix,       color:'#d429e0' },
    { id:'torus',   jp:'円環',         en:'Torus Ring',          desc:'ドーナツ状のトーラス面上に配置。観客が真下から見上げると環が空を縁取る。',             dur:36, fn:fTorus,       color:'#ffb347' },
    { id:'wave',    jp:'波紋',         en:'Ripple Grid',         desc:'均等な格子の上を、サインとコサインで定義された波がゆるやかに伝播する。',             dur:44, fn:fWave,        color:'#31a9c7' },
    { id:'dna',     jp:'二重螺旋',      en:'Double Helix',        desc:'二本の螺旋が絡み合う、生命の構造。22機ごとに配されたラングが結合を表現する。',         dur:40, fn:fDoubleHelix, color:'#98ff9e' },
    { id:'cube',   jp:'立方体',        en:'Wireframe Cube',      desc:'12本のエッジ上に55機ずつ配置。辺と頂点だけで、立方体の輪郭を空中に描く。',           dur:34, fn:fCube,        color:'#ff69b4' },
    { id:'galaxy',  jp:'銀河',         en:'Spiral Galaxy',       desc:'四本腕の渦巻銀河。中心から外縁へ、660個の恒星がゆるやかに渦を巻く。',                dur:48, fn:fGalaxy,      color:'#c5b3ff' },
    { id:'heart',   jp:'心臓',         en:'Pulse of Love',       desc:'パラメトリック方程式による心臓形。フィナーレに向けた、観客への静かな挨拶。',           dur:32, fn:fHeart,       color:'#ff6b7a' },
    { id:'kanji',   jp:'寿',           en:'Kotobuki — Longevity', desc:'最終演目。一文字の書。東京湾の夜空に、筆で描かれたように浮かび上がる。',              dur:54, fn:fKanjiKotobuki, color:'#ffe58a' },
  ];

  // Pre-compute targets for all formations
  FORMATIONS.forEach(f => { f.targets = f.fn(DRONE_COUNT); });

  // Cumulative timings (seconds) for programme
  let t_cum = 0;
  FORMATIONS.forEach(f => { f.start = t_cum; t_cum += f.dur; });
  const TOTAL_TIME = t_cum;

  // ---------- Palettes ----------
  const PALETTES = {
    aurora:   { name:'Aurora',   jp:'極光',  colors:['#31a9c7','#d429e0','#98ff9e','#ffe58a'] },
    sakura:   { name:'Sakura',   jp:'桜',   colors:['#ffb7c5','#ff69b4','#ffffff','#e8c4ff'] },
    ember:    { name:'Ember',    jp:'炎',   colors:['#ff6b35','#ffb347','#ffe58a','#d429e0'] },
    mono:     { name:'Mono',     jp:'白',   colors:['#ffffff','#f0f8ff','#cfe7ff','#ffe58a'] },
    asagiri:  { name:'Asagiri',  jp:'朝霧',  colors:['#31a9c7','#5b21b6','#ff69b4','#ffffff'] },
  };
  const PALETTE_KEYS = Object.keys(PALETTES);

  // ---------- Sky presets ----------
  const SKIES = {
    night:   { name:'Night',   jp:'夜',   bg:['#02030a','#070a1a','#0e1530'] },
    twilight:{ name:'Twilight', jp:'黄昏', bg:['#1a0f2a','#3d1a4f','#1a1438'] },
    dawn:    { name:'Dawn',    jp:'夜明', bg:['#1a1228','#3d2650','#4f3250'] },
  };
  const SKY_KEYS = Object.keys(SKIES);

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
  $('btn-play').addEventListener('click', () => {
    state.playing = !state.playing;
    $('play-icon').innerHTML = state.playing
      ? '<path d="M4 3 L13 8 L4 13 Z"/>'
      : '<path d="M4 3 L7 3 L7 13 L4 13 Z M9 3 L12 3 L12 13 L9 13 Z"/>';
  });
  $('btn-prev').addEventListener('click', () => seekToFormation(Math.max(0, state.formationIndex - 1)));
  $('btn-next').addEventListener('click', () => seekToFormation(Math.min(FORMATIONS.length - 1, state.formationIndex + 1)));

  const speeds = [0.5, 1, 1.5, 2];
  let speedI = 1;
  $('btn-speed').addEventListener('click', () => {
    speedI = (speedI + 1) % speeds.length;
    state.speed = speeds[speedI];
    $('btn-speed').textContent = state.speed.toFixed(1) + '×';
    persist({ speed: state.speed });
  });

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

    // Physics: spring toward target
    const targets = curF.targets;
    const nextTargets = nextF.targets;
    const k = 3.2;    // spring stiffness
    const damping = 0.88;
    for (let i = 0; i < DRONE_COUNT; i++) {
      const tx = targets[i*3]   * (1-blendK) + nextTargets[i*3]   * blendK;
      const ty = targets[i*3+1] * (1-blendK) + nextTargets[i*3+1] * blendK;
      const tz = targets[i*3+2] * (1-blendK) + nextTargets[i*3+2] * blendK;

      const ax = (tx - posBuf[i*3])   * k;
      const ay = (ty - posBuf[i*3+1]) * k;
      const az = (tz - posBuf[i*3+2]) * k;

      velBuf[i*3]   = (velBuf[i*3]   + ax * dt) * damping;
      velBuf[i*3+1] = (velBuf[i*3+1] + ay * dt) * damping;
      velBuf[i*3+2] = (velBuf[i*3+2] + az * dt) * damping;

      posBuf[i*3]   += velBuf[i*3]   * dt;
      posBuf[i*3+1] += velBuf[i*3+1] * dt;
      posBuf[i*3+2] += velBuf[i*3+2] * dt;

      // subtle breathing size
      const ph = phase[i] + now * 0.002;
      const breath = 0.85 + Math.sin(ph) * 0.25;
      sizeBuf[i] = 7.0 * state.droneSize * breath;
    }

    droneGeom.attributes.position.needsUpdate = true;

    // Trails
    if (state.trails) {
      trailMat.opacity = 0.45;
      // write current positions (dimmed) into trail ring slot
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

    droneMat.size = 3.0 * state.droneSize * (state.glow ? 1.2 : 0.9);

    // Camera orbit (eased)
    if (state.rotate && !orbit.dragging) orbit.rLon += dt * 6;
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
})();
