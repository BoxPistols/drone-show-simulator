// ==========================================================
// Astra Flock — shared formation algorithms + metadata
// ==========================================================
// Exposed globally as window.AstraFlock so show.js (main Three.js view) and
// choreography.jsx (mini preview) use the EXACT same point data and avoid drift.
(function () {
  const DRONE_COUNT = 660;

  // Each fn returns Float32Array length n*3 of target positions.
  // World units: 1 unit ≈ 1 meter. Show sits around y=0..120.
  function fSphere(n) {
    const out = new Float32Array(n * 3);
    const R = 55;
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
    const out = new Float32Array(n * 3);
    const S = 50;
    const per = Math.ceil(n / 12);
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
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const scale = 2.2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
      const layer = (i % 3) - 1;
      const inset = (Math.floor(i / 100) % 3) * 0.1;
      const k = scale * (1 - inset);
      out[i*3]   = x * k;
      out[i*3+1] = y * k + 65;
      out[i*3+2] = layer * 6;
    }
    return out;
  }
  function fBear(n) {
    // Rilakkuma-style kawaii bear face with muzzle.
    // - Head: wide ellipse (rx=50, ry=42)
    // - Eyes: 2 circular voids, wider apart + lower = childlike proportions
    // - Muzzle: horizontal ellipse void (negative space = lighter patch)
    // - Inside muzzle: nose (3 dots triangle) + mouth (4 dots curve) as positive drones
    // - Ears: 2 rounded discs, bigger + wider-positioned
    const out = new Float32Array(n * 3);
    const head = { cx: 0, cy: 0, rx: 52, ry: 42 };
    const voids = [
      { cx: -24, cy: -8, r: 7 }, // left eye — 更に外・下・大きく
      { cx:  24, cy: -8, r: 7 }, // right eye
    ];
    // Muzzle: wide flat horizontal oval — 目より下に配置して重なり回避
    const muzzle = { cx: 0, cy: -25, rx: 18, ry: 8 };
    const ears = [
      { cx: -38, cy: 28, r: 17 }, // 横寄り・頭の上側にやや食い込む
      { cx:  38, cy: 28, r: 17 },
    ];
    // Nose: 3-point inverted triangle at top of muzzle
    const nose = [
      { x: -3, y: -19 }, { x:  3, y: -19 }, { x: 0, y: -22 },
    ];
    // Mouth: U-curve at bottom of muzzle
    const mouth = [
      { x: -4, y: -28 }, { x: -1.5, y: -30 },
      { x:  1.5, y: -30 }, { x:  4, y: -28 },
    ];
    const features = [...nose, ...mouth]; // 7 drones

    const headArea = Math.PI * head.rx * head.ry;
    const eyeVoidArea = voids.reduce((s, v) => s + Math.PI * v.r * v.r, 0);
    const muzzleArea  = Math.PI * muzzle.rx * muzzle.ry;
    const totalVoid   = eyeVoidArea + muzzleArea;
    const earArea     = Math.PI * ears[0].r * ears[0].r;
    const fillableHead = Math.max(0, headArea - totalVoid);
    const totalFill   = fillableHead + 2 * earArea;
    const remaining   = n - features.length;
    const nHead  = Math.round(remaining * fillableHead / totalFill);
    const nEar1  = Math.round(remaining * earArea / totalFill);
    const nEar2  = remaining - nHead - nEar1;
    const GOLDEN = 2.399963229728653;
    let idx = 0;

    // Head: Fibonacci unit disc → mapped to ellipse via (rx, ry). Reject voids + muzzle.
    const HEAD_SAMPLES = Math.ceil(nHead * 1.25);
    let placed = 0;
    for (let k = 0; k < HEAD_SAMPLES && placed < nHead; k++) {
      const t = (k + 0.5) / HEAD_SAMPLES;
      const theta = k * GOLDEN;
      const r = Math.sqrt(t);
      const px = r * Math.cos(theta) * head.rx;
      const py = r * Math.sin(theta) * head.ry;
      let inVoid = false;
      for (const v of voids) {
        if (Math.hypot(px - v.cx, py - v.cy) < v.r) { inVoid = true; break; }
      }
      if (!inVoid) {
        const mx = (px - muzzle.cx) / muzzle.rx;
        const my = (py - muzzle.cy) / muzzle.ry;
        if (mx * mx + my * my < 1) inVoid = true;
      }
      if (inVoid) continue;
      out[idx*3]   = head.cx + px;
      out[idx*3+1] = 60 + head.cy + py;
      out[idx*3+2] = (Math.random() - 0.5) * 3;
      idx++; placed++;
    }
    // Ears
    for (let e = 0; e < 2; e++) {
      const ear = ears[e];
      const count = e === 0 ? nEar1 : nEar2;
      for (let k = 0; k < count && idx < n; k++) {
        const t = (k + 0.5) / count;
        const theta = k * GOLDEN;
        const rr = Math.sqrt(t) * ear.r;
        out[idx*3]   = ear.cx + rr * Math.cos(theta);
        out[idx*3+1] = 60 + ear.cy + rr * Math.sin(theta);
        out[idx*3+2] = (Math.random() - 0.5) * 3;
        idx++;
      }
    }
    // Nose + mouth: positive drones INSIDE the muzzle void — shows up as isolated features
    for (const p of features) {
      if (idx >= n) break;
      out[idx*3]   = p.x;
      out[idx*3+1] = 60 + p.y;
      out[idx*3+2] = (Math.random() - 0.5) * 2;
      idx++;
    }
    while (idx < n) {
      out[idx*3] = 0; out[idx*3+1] = 60; out[idx*3+2] = 0;
      idx++;
    }
    return out;
  }

  const FORMATIONS = [
    { id:'sphere',  jp:'球体',     en:'Sphere of Stars',    desc:'660機のドローンが均等に配置され、完全な球体を描く。最もシンプルで、最も幾何学的な形。',      dur:42, fn:fSphere,      color:'#6ed3e6' },
    { id:'helix',   jp:'単螺旋',    en:'Ascending Helix',    desc:'螺旋状に昇り、観客の視線を天へ導く。東京湾の夜空に立ち上がる一本の光の柱。',               dur:38, fn:fHelix,       color:'#d429e0' },
    { id:'torus',   jp:'円環',     en:'Torus Ring',         desc:'ドーナツ状のトーラス面上に配置。観客が真下から見上げると環が空を縁取る。',                 dur:36, fn:fTorus,       color:'#ffb347' },
    { id:'wave',    jp:'波紋',     en:'Ripple Grid',        desc:'均等な格子の上を、サインとコサインで定義された波がゆるやかに伝播する。',                 dur:44, fn:fWave,        color:'#31a9c7' },
    { id:'bear',    jp:'熊',       en:'Bear Silhouette',    desc:'中盤のひと息。クマの顔のクローズアップ。頭 + 丸い耳 + 離れた目 + マズル。観客との視線交換。',  dur:54, fn:fBear,        color:'#d4915c' },
    { id:'dna',     jp:'二重螺旋',  en:'Double Helix',       desc:'二本の螺旋が絡み合う、生命の構造。22機ごとに配されたラングが結合を表現する。',             dur:40, fn:fDoubleHelix, color:'#98ff9e' },
    { id:'cube',    jp:'立方体',    en:'Wireframe Cube',     desc:'12本のエッジ上に55機ずつ配置。辺と頂点だけで、立方体の輪郭を空中に描く。',               dur:34, fn:fCube,        color:'#ff69b4' },
    { id:'heart',   jp:'心臓',     en:'Pulse of Love',      desc:'パラメトリック方程式による心臓形。フィナーレ前の、観客への静かな挨拶。',                   dur:32, fn:fHeart,       color:'#ff6b7a' },
    { id:'galaxy',  jp:'銀河',     en:'Spiral Galaxy',      desc:'最終演目。四本腕の渦巻銀河。660 個の恒星が夜空いっぱいに旋回し、閉幕を飾る。',             dur:48, fn:fGalaxy,      color:'#c5b3ff' },
  ];

  FORMATIONS.forEach(f => { f.targets = f.fn(DRONE_COUNT); });

  let t_cum = 0;
  FORMATIONS.forEach(f => { f.start = t_cum; t_cum += f.dur; });
  const TOTAL_TIME = t_cum;

  const PALETTES = {
    aurora:  { name:'Aurora',  jp:'極光', colors:['#31a9c7','#d429e0','#98ff9e','#ffe58a'] },
    sakura:  { name:'Sakura',  jp:'桜',   colors:['#ffb7c5','#ff69b4','#ffffff','#e8c4ff'] },
    ember:   { name:'Ember',   jp:'炎',   colors:['#ff6b35','#ffb347','#ffe58a','#d429e0'] },
    mono:    { name:'Mono',    jp:'白',   colors:['#ffffff','#f0f8ff','#cfe7ff','#ffe58a'] },
    flock:   { name:'Flock',   jp:'星群', colors:['#31a9c7','#5b21b6','#ff69b4','#ffffff'] },
  };

  const SKIES = {
    night:    { name:'Night',   jp:'夜',   bg:['#02030a','#070a1a','#0e1530'] },
    twilight: { name:'Twilight', jp:'黄昏', bg:['#1a0f2a','#3d1a4f','#1a1438'] },
    dawn:     { name:'Dawn',    jp:'夜明', bg:['#1a1228','#3d2650','#4f3250'] },
  };

  // Fleet snapshot — deterministic distribution mirroring fleet.jsx generateFleet()
  // (seed 42, 600 active / 32 charging / 18 standby / 10 maint = 660 total)
  // Both choreography.jsx and fleet.jsx should read from here instead of local consts.
  const FLEET = Object.freeze({
    total: 660,
    active: 600,
    charging: 32,
    standby: 18,
    maint: 10,
    available: 600,              // = active
    nonFlyable: 10,              // = maint
    reservable: 32 + 18,         // charging + standby (招集可能プール)
  });

  window.AstraFlock = { DRONE_COUNT, FORMATIONS, PALETTES, SKIES, TOTAL_TIME, FLEET };
})();
