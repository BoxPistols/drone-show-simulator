/**
 * Pure shape generators — return Float32Array of length n*3 of target positions.
 * World units: 1 unit ≈ 1 meter. Show sits around y=0..120.
 *
 * Every function is pure given an `n`. galaxy / bear use jitter for organic feel,
 * drawn from a seeded PRNG so the same `n` always gives the same positions.
 *
 * 機体どうしは MIN_SEPARATION_M 以上離す（formations.test.tsで確かめる）。
 */
import { prng } from './prng';

const GOLDEN_ANGLE = 2.399963229728653;
// 機体間の最小距離（m）。小型の演出用機体で一般に取られる間隔の下限の目安
export const MIN_SEPARATION_M = 1.5;

export function fSphere(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const R = 55;
  const phi = Math.PI * (Math.sqrt(5) - 1);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    out[i * 3] = Math.cos(theta) * r * R;
    out[i * 3 + 1] = y * R + 60;
    out[i * 3 + 2] = Math.sin(theta) * r * R;
  }
  return out;
}

export function fHelix(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const turns = 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = t * turns * Math.PI * 2;
    const strand = i % 2 === 0 ? 1 : -1;
    const r = 22;
    out[i * 3] = Math.cos(a) * r * strand;
    out[i * 3 + 1] = 10 + t * 120;
    out[i * 3 + 2] = Math.sin(a) * r * strand;
  }
  return out;
}

export function fTorus(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const R = 55;
  const r = 16;
  const u_count = 44;
  const v_count = Math.ceil(n / u_count);
  for (let i = 0; i < n; i++) {
    const iu = i % u_count;
    const iv = Math.floor(i / u_count);
    const u = (iu / u_count) * Math.PI * 2;
    const v = (iv / v_count) * Math.PI * 2;
    out[i * 3] = (R + r * Math.cos(v)) * Math.cos(u);
    out[i * 3 + 1] = 60 + r * Math.sin(v);
    out[i * 3 + 2] = (R + r * Math.cos(v)) * Math.sin(u);
  }
  return out;
}

export function fWave(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const side = Math.ceil(Math.sqrt(n));
  const spacing = 110 / side;
  for (let i = 0; i < n; i++) {
    const ix = i % side;
    const iz = Math.floor(i / side);
    const x = (ix - side / 2) * spacing;
    const z = (iz - side / 2) * spacing;
    const d = Math.sqrt(x * x + z * z);
    const y = 55 + Math.sin(d * 0.22) * 18 + Math.cos(d * 0.1) * 6;
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

export function fDoubleHelix(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const turns = 5;
  const R = 24;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const strand = i % 2;
    const a = t * turns * Math.PI * 2 + strand * Math.PI;
    out[i * 3] = Math.cos(a) * R;
    out[i * 3 + 1] = 15 + t * 115;
    out[i * 3 + 2] = Math.sin(a) * R;
    if (i % 22 === 0 && strand === 0) {
      const rung = i + 1 < n ? i + 1 : i;
      out[rung * 3] = Math.cos(a + Math.PI) * R * 0.5;
      out[rung * 3 + 1] = out[i * 3 + 1]!;
      out[rung * 3 + 2] = Math.sin(a + Math.PI) * R * 0.5;
    }
  }
  return out;
}

export function fCube(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const S = 50;
  const per = Math.ceil(n / 12);
  const edges: ReadonlyArray<
    readonly [readonly [number, number, number], readonly [number, number, number]]
  > = [
    [
      [-1, -1, -1],
      [1, -1, -1],
    ],
    [
      [1, -1, -1],
      [1, 1, -1],
    ],
    [
      [1, 1, -1],
      [-1, 1, -1],
    ],
    [
      [-1, 1, -1],
      [-1, -1, -1],
    ],
    [
      [-1, -1, 1],
      [1, -1, 1],
    ],
    [
      [1, -1, 1],
      [1, 1, 1],
    ],
    [
      [1, 1, 1],
      [-1, 1, 1],
    ],
    [
      [-1, 1, 1],
      [-1, -1, 1],
    ],
    [
      [-1, -1, -1],
      [-1, -1, 1],
    ],
    [
      [1, -1, -1],
      [1, -1, 1],
    ],
    [
      [1, 1, -1],
      [1, 1, 1],
    ],
    [
      [-1, 1, -1],
      [-1, 1, 1],
    ],
  ];
  let idx = 0;
  for (let e = 0; e < 12 && idx < n; e++) {
    const [a, b] = edges[e]!;
    // 辺の両端（角）は3本の辺が共有するので置かず、辺の内側に等間隔に置く
    for (let k = 0; k < per && idx < n; k++) {
      const t = (k + 1) / (per + 1);
      out[idx * 3] = (a[0] + (b[0] - a[0]) * t) * S;
      out[idx * 3 + 1] = (a[1] + (b[1] - a[1]) * t) * S + 60;
      out[idx * 3 + 2] = (a[2] + (b[2] - a[2]) * t) * S;
      idx++;
    }
  }
  return out;
}

export function fGalaxy(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const arms = 4;
  const rand = prng(0x6a1a);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const arm = i % arms;
    const angle = t * Math.PI * 4 + (arm / arms) * Math.PI * 2;
    const r = 10 + t * 60;
    // ずらした結果が既に置いた機体に近すぎれば、ずらし方を引き直す
    for (let tries = 0; tries < 20; tries++) {
      const jitter = (rand() - 0.5) * 6;
      out[i * 3] = Math.cos(angle) * r + jitter;
      out[i * 3 + 1] = 60 + (rand() - 0.5) * 6;
      out[i * 3 + 2] = Math.sin(angle) * r + jitter;
      if (!tooClose(out, i)) break;
    }
  }
  return out;
}

// i番目の機体が、0..i-1番目のどれかと MIN_SEPARATION_M 未満か
function tooClose(p: Float32Array, i: number): boolean {
  for (let j = 0; j < i; j++) {
    const d = Math.hypot(
      p[i * 3]! - p[j * 3]!,
      p[i * 3 + 1]! - p[j * 3 + 1]!,
      p[i * 3 + 2]! - p[j * 3 + 2]!
    );
    if (d < MIN_SEPARATION_M) return true;
  }
  return false;
}

const heartAt = (t: number): [number, number] => [
  16 * Math.pow(Math.sin(t), 3),
  13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
];

export function fHeart(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  // 1層に n/3 機、内側の縮小（最小0.8倍）をかけても機体間が MIN_SEPARATION_M 以上になる大きさ（幅約144m）
  const scale = 4.5;
  // 媒介変数を等間隔に取ると、上のくぼみと下の先端で点が詰まって重なる。曲線の長さで等間隔になるtを先に求める。
  // くぼみ（t=0）と先端（t=π）は左右の曲線が接したまま合わさるので、左右の間が MIN_SEPARATION_M 開くまでの区間は長さに数えず、置かない
  const STEPS = 4096;
  const len = new Float64Array(STEPS + 1);
  let prev = heartAt(0);
  for (let s = 1; s <= STEPS; s++) {
    const cur = heartAt((s / STEPS) * Math.PI * 2);
    const open = 2 * Math.abs(cur[0]) * scale * 0.8 >= MIN_SEPARATION_M * 1.2; // 境目で左右が斜めに近づく分の余裕
    len[s] = len[s - 1]! + (open ? Math.hypot(cur[0] - prev[0], cur[1] - prev[1]) : 0);
    prev = cur;
  }
  let s = 0;
  for (let i = 0; i < n; i++) {
    const want = ((i + 0.5) / n) * len[STEPS]!;
    while (s < STEPS && len[s + 1]! < want) s++;
    const f = (want - len[s]!) / (len[s + 1]! - len[s]! || 1);
    const [x, y] = heartAt(((s + f) / STEPS) * Math.PI * 2);
    const layer = (i % 3) - 1;
    const inset = (Math.floor(i / 100) % 3) * 0.1;
    const k = scale * (1 - inset);
    out[i * 3] = x * k;
    out[i * 3 + 1] = y * k + 78;
    out[i * 3 + 2] = layer * 6;
  }
  return out;
}

/**
 * Rilakkuma-style kawaii bear face with muzzle.
 * - Head: wide ellipse, eyes as voids (negative space)
 * - Muzzle: horizontal void with nose + mouth as positive drones inside
 * - Ears: 2 rounded discs offset from head
 * Uses Fibonacci unit disc packing + rejection sampling for void areas.
 */
export function fBear(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const head = { cx: 0, cy: 0, rx: 52, ry: 42 };
  const voids = [
    { cx: -24, cy: -8, r: 7 },
    { cx: 24, cy: -8, r: 7 },
  ];
  const muzzle = { cx: 0, cy: -25, rx: 18, ry: 8 };
  const ears = [
    { cx: -38, cy: 28, r: 17 },
    { cx: 38, cy: 28, r: 17 },
  ];
  const nose = [
    { x: -3, y: -19 },
    { x: 3, y: -19 },
    { x: 0, y: -22 },
  ];
  const mouth = [
    { x: -4, y: -28 },
    { x: -1.5, y: -30 },
    { x: 1.5, y: -30 },
    { x: 4, y: -28 },
  ];
  const features = [...nose, ...mouth];

  const headArea = Math.PI * head.rx * head.ry;
  const eyeVoidArea = voids.reduce((s, v) => s + Math.PI * v.r * v.r, 0);
  const muzzleArea = Math.PI * muzzle.rx * muzzle.ry;
  const totalVoid = eyeVoidArea + muzzleArea;
  const earArea = Math.PI * ears[0]!.r * ears[0]!.r;
  const fillableHead = Math.max(0, headArea - totalVoid);
  const totalFill = fillableHead + 2 * earArea;
  const remaining = n - features.length;
  const nHead = Math.round((remaining * fillableHead) / totalFill);
  const nEar1 = Math.round((remaining * earArea) / totalFill);
  const nEar2 = remaining - nHead - nEar1;
  let idx: number; // 頭を置き直すたびに0から数える

  const rand = prng(0xbea2);
  const inHead = (px: number, py: number) =>
    ((px - head.cx) / head.rx) ** 2 + ((py - head.cy) / head.ry) ** 2 < 1;
  // くぼみに当たる点は飛ばすので、頭に nHead 機が収まるまで点の数を増やして置き直す（足りないと残りが原点に重なる、#51）
  for (let samples = Math.ceil(nHead * 1.25); ; samples++) {
    idx = 0;
    let placed = 0;
    for (let k = 0; k < samples && placed < nHead; k++) {
      const t = (k + 0.5) / samples;
      const theta = k * GOLDEN_ANGLE;
      const r = Math.sqrt(t);
      const px = r * Math.cos(theta) * head.rx;
      const py = r * Math.sin(theta) * head.ry;
      let inVoid = false;
      for (const v of voids) {
        if (Math.hypot(px - v.cx, py - v.cy) < v.r) {
          inVoid = true;
          break;
        }
      }
      if (!inVoid) {
        const mx = (px - muzzle.cx) / muzzle.rx;
        const my = (py - muzzle.cy) / muzzle.ry;
        if (mx * mx + my * my < 1) inVoid = true;
      }
      if (inVoid) continue;
      out[idx * 3] = head.cx + px;
      out[idx * 3 + 1] = 60 + head.cy + py;
      out[idx * 3 + 2] = (rand() - 0.5) * 3;
      idx++;
      placed++;
    }
    if (placed >= nHead) break;
  }
  for (let e = 0; e < 2; e++) {
    const ear = ears[e]!;
    const count = e === 0 ? nEar1 : nEar2;
    // 耳の円は頭の楕円と重なる。重なった所に置くと頭の機体とぶつかるので、頭の外に出る部分だけに置く。
    // 頭の外に count 機が収まるまで、円の中の点の数を増やして置き直す
    for (let samples = count; ; samples++) {
      const pts: [number, number][] = [];
      for (let k = 0; k < samples; k++) {
        const t = (k + 0.5) / samples;
        const theta = k * GOLDEN_ANGLE;
        const rr = Math.sqrt(t) * ear.r;
        const px = ear.cx + rr * Math.cos(theta);
        const py = ear.cy + rr * Math.sin(theta);
        if (!inHead(px, py)) pts.push([px, py]);
      }
      if (pts.length < count) continue;
      for (const [px, py] of pts.slice(0, count)) {
        if (idx >= n) break;
        out[idx * 3] = px;
        out[idx * 3 + 1] = 60 + py;
        out[idx * 3 + 2] = (rand() - 0.5) * 3;
        idx++;
      }
      break;
    }
  }
  for (const p of features) {
    if (idx >= n) break;
    out[idx * 3] = p.x;
    out[idx * 3 + 1] = 60 + p.y;
    out[idx * 3 + 2] = (rand() - 0.5) * 2;
    idx++;
  }
  while (idx < n) {
    out[idx * 3] = 0;
    out[idx * 3 + 1] = 60;
    out[idx * 3 + 2] = 0;
    idx++;
  }
  return out;
}
