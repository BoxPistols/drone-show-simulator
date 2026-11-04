/**
 * 紹介動画の音楽を合成して public/music.wav に書き出す。
 *
 *   pnpm --dir video music      （render / studio の前に自動で走る）
 *
 * アプリのアンビエント音楽（src/routes/show/audio/ambient.ts）と同じ作りを、時間割に合わせてオフラインで鳴らす。
 * - パッド：和音 5 声 × 2（少しずらした 2 本）を、ゆっくり開閉するローパスに通す。演目が変わると和音が滑らかに移る
 * - 風：ノイズをバンドパスに通し、中心周波数を揺らす
 * - 鈴：演目や画面が切り替わる瞬間に、和音の上で短い分散和音を鳴らす
 * - 画面紹介：テンポ 96 の八分で、和音の音を軽く爪弾いて推進力を足す
 * - 空間：左右で長さの違うディレイ + フィードバック
 *
 * 和音と音階はアプリの scale.ts をそのまま使う（A のヨナ抜き音階なので、どの音を重ねても濁らない）。
 * 乱数は種を固定しているので、何度実行しても同じ音になる。音源ファイルはリポジトリに入れない。
 *
 * Node 22.18 以降なら TypeScript のまま実行できる（型だけを取り除いて動く）。
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APP_FORMATION_IDS,
  FEATURE_COUNT,
  FORMATION_ORDER,
  FPS,
  SCENES,
  TITLE_FRAME,
  TOTAL_FRAMES,
  featureStart,
  formationStart,
} from '../src/timeline.ts';
import { PENTATONIC, chordForFormation, semitoneToHz } from '../../src/routes/show/audio/scale.ts';

const SR = 44100;
const DURATION = TOTAL_FRAMES / FPS;
const N = Math.ceil(DURATION * SR);
const sec = (frame: number) => frame / FPS;

// ---------- 乱数（種固定） ----------
let seed = 0x2f6b1d;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
}

// ---------- 和音の時間割 ----------
type ChordAt = { t: number; index: number };
const appIndex = (id: string) =>
  APP_FORMATION_IDS.indexOf(id as (typeof APP_FORMATION_IDS)[number]);

const CHORDS: ChordAt[] = [
  { t: 0, index: appIndex('sphere') },
  ...FORMATION_ORDER.map((id, i) => ({ t: sec(formationStart(i)), index: appIndex(id) })),
  // 画面紹介では和音を一つずつ巡らせる
  ...Array.from({ length: FEATURE_COUNT }, (_, i) => ({
    t: sec(SCENES.features.from + featureStart(i)),
    index: [0, 2, 3, 1, 4][i]!,
  })),
  { t: sec(SCENES.outro.from), index: appIndex('galaxy') },
];
const GLIDE = 1.6;

/** 時刻 t でのパッドの各声の周波数（前の和音から GLIDE 秒かけて指数的に移る） */
const CHORD_HZ = CHORDS.map(({ index }) => chordForFormation(index).map((s) => semitoneToHz(s)));

function padFreqs(t: number): number[] {
  let k = 0;
  for (let i = 0; i < CHORDS.length; i++) if (t >= CHORDS[i]!.t) k = i;
  const cur = CHORD_HZ[k]!;
  if (k === 0) return cur;
  const prev = CHORD_HZ[k - 1]!;
  const u = Math.min(1, (t - CHORDS[k]!.t) / GLIDE);
  const e = u * u * (3 - 2 * u);
  return cur.map((hz, v) => prev[v]! * Math.pow(hz / prev[v]!, e));
}

function chordIndexAt(t: number): number {
  let k = 0;
  for (let i = 0; i < CHORDS.length; i++) if (t >= CHORDS[i]!.t) k = i;
  return CHORDS[k]!.index;
}

// ---------- 音量の山（全体の流れ） ----------
/** 区間ごとの目標値を線形につなぐ */
function envelope(points: [number, number][], t: number): number {
  if (t <= points[0]![0]) return points[0]![1];
  for (let i = 1; i < points.length; i++) {
    const [t1, v1] = points[i]!;
    const [t0, v0] = points[i - 1]!;
    if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
  }
  return points[points.length - 1]![1];
}
const END = DURATION;
const MASTER: [number, number][] = [
  [0, 0],
  [2.5, 0.85],
  [sec(SCENES.features.from) - 0.6, 0.9],
  [sec(SCENES.features.from), 1],
  [sec(SCENES.outro.from), 1],
  [END - 2.4, 0.9],
  [END, 0],
];
/** パッドの明るさ（ローパスの基準周波数）。離陸で開き、画面紹介でいちばん明るく、締めで閉じていく */
const BRIGHT: [number, number][] = [
  [0, 260],
  [sec(TITLE_FRAME), 900],
  [sec(SCENES.formations.from), 760],
  [sec(SCENES.features.from), 1300],
  [sec(SCENES.outro.from), 1100],
  [END, 420],
];

// ---------- 音の部品 ----------
class Lowpass {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  private b0 = 0;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  set(freq: number, q: number, type: 'lowpass' | 'bandpass' = 'lowpass'): void {
    const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
    const alpha = Math.sin(w) / (2 * q);
    const cos = Math.cos(w);
    const a0 = 1 + alpha;
    if (type === 'lowpass') {
      this.b0 = (1 - cos) / 2 / a0;
      this.b1 = (1 - cos) / a0;
      this.b2 = this.b0;
    } else {
      this.b0 = alpha / a0;
      this.b1 = 0;
      this.b2 = -alpha / a0;
    }
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  run(x: number): number {
    const y =
      this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

const tri = (phase: number) => 1 - 4 * Math.abs((phase % 1) - 0.5);

/** 一つの音（鈴・爪弾き・うねり）を左右のバッファに足す */
type Voice = {
  start: number;
  render: (t: number) => number;
  dur: number;
  pan: number;
  send: number;
};
const voices: Voice[] = [];

function bell(t: number, semitone: number, gain = 0.16, pan = (rand() - 0.5) * 1.2): void {
  const hz = semitoneToHz(semitone);
  voices.push({
    start: t,
    dur: 3.2,
    pan,
    send: 0.55,
    render: (u) => {
      const env = Math.min(1, u / 0.012) * Math.exp(-u * 1.7);
      // 鈴らしさのため、少しずれた倍音を薄く混ぜる
      return (
        gain *
        env *
        (Math.sin(2 * Math.PI * hz * u) +
          0.18 * Math.sin(2 * Math.PI * hz * 2.76 * u) * Math.exp(-u * 3))
      );
    },
  });
}

function pluck(t: number, semitone: number, gain: number, pan: number): void {
  const hz = semitoneToHz(semitone);
  voices.push({
    start: t,
    dur: 0.9,
    pan,
    send: 0.35,
    render: (u) => gain * Math.min(1, u / 0.004) * Math.exp(-u * 6.5) * tri(hz * u),
  });
}

/** 画面が切り替わるときの「すっ」という空気の音。ノイズのバンドパスを上へ掃く */
function whoosh(t: number, gain = 0.09): void {
  const bp = new Lowpass();
  const dur = 0.9;
  voices.push({
    start: t - 0.45,
    dur,
    pan: 0,
    send: 0.4,
    render: (u) => {
      const k = u / dur;
      bp.set(300 * Math.pow(12, k), 1.4, 'bandpass');
      const env = Math.sin(Math.PI * k) ** 2;
      return gain * env * bp.run(rand() * 2 - 1) * 3;
    },
  });
}

/** 和音の根音の上で、上がっていく分散和音 */
function arpeggio(t: number, chordIndex: number, octave: number, gain: number): void {
  const root = chordForFormation(chordIndex)[0]!;
  const degrees = [0, 2, 4];
  degrees.forEach((d, i) =>
    bell(t + i * 0.11, root + PENTATONIC[d]! + octave, gain, -0.5 + i * 0.5)
  );
}

// ---------- 譜面 ----------
// 離陸：低い音が下から上がってくる
voices.push({
  start: 0.3,
  dur: 4.6,
  pan: 0,
  send: 0.3,
  render: (u) => {
    const hz = 55 * Math.pow(2, Math.min(1, u / 3.2));
    const env = Math.sin(Math.min(Math.PI, (u / 4.6) * Math.PI)) * 0.12;
    return env * Math.sin(2 * Math.PI * hz * u * (1 + u / 9));
  },
});
// タイトル
arpeggio(sec(TITLE_FRAME), appIndex('sphere'), 24, 0.17);
bell(sec(TITLE_FRAME) + 0.45, chordForFormation(appIndex('sphere'))[0]! + 36, 0.1, 0.4);

// 演目が切り替わるたびに分散和音
FORMATION_ORDER.forEach((id, i) => {
  const t = sec(formationStart(i));
  arpeggio(t + 0.15, appIndex(id), 24, 0.13);
  // 合間にまばらな鈴
  for (let j = 0; j < 2; j++) {
    const tt = t + 0.9 + j * 0.85 + rand() * 0.3;
    const root = chordForFormation(appIndex(id))[0]!;
    bell(tt, root + PENTATONIC[Math.floor(rand() * 5)]! + (rand() < 0.5 ? 24 : 36), 0.07);
  }
});

// 画面紹介：八分の爪弾き + 切り替えのうねりと鈴
{
  const from = sec(SCENES.features.from);
  const to = sec(SCENES.outro.from);
  const eighth = 60 / 96 / 2;
  const pattern = [0, 2, 4, 2, 1, 3, 4, 3];
  let step = 0;
  for (let t = from; t < to - 0.2; t += eighth, step++) {
    const chord = chordForFormation(chordIndexAt(t));
    const note = chord[0]! + 12 + PENTATONIC[pattern[step % pattern.length]!]!;
    const accent = step % 4 === 0 ? 1 : 0.7;
    // 頭の 2 拍は小さく入れて、だんだん馴染ませる
    const fadeIn = Math.min(1, (t - from) / 1.2);
    pluck(t, note, 0.12 * accent * fadeIn, step % 2 === 0 ? -0.35 : 0.35);
  }
  for (let i = 0; i < FEATURE_COUNT; i++) {
    const t = sec(SCENES.features.from + featureStart(i));
    whoosh(t);
    bell(t + 0.05, chordForFormation(chordIndexAt(t + 1e-6))[0]! + 36, 0.1);
  }
}

// 締め：銀河の和音を大きく鳴らして、ゆっくり消える
{
  const t = sec(SCENES.outro.from);
  whoosh(t, 0.07);
  arpeggio(t + 0.25, appIndex('galaxy'), 24, 0.15);
  arpeggio(t + 1.4, appIndex('galaxy'), 36, 0.09);
  const root = chordForFormation(appIndex('galaxy'))[0]!;
  bell(t + 2.6, root + 24, 0.12, 0);
}

// ---------- 合成 ----------
const dry = [new Float32Array(N), new Float32Array(N)];
const send = [new Float32Array(N), new Float32Array(N)];
const add = (buf: Float32Array, i: number, x: number) => {
  buf[i] = buf[i]! + x;
};

// パッドと風
{
  const padFilter = new Lowpass();
  const windFilter = new Lowpass();
  // 風は帯域を絞り、さらに高域を丸めて「さー」という音だけにする
  const windTone = new Lowpass();
  windTone.set(1200, 0.7);
  const phases = new Float64Array(20);
  const voicesPerSide = 5;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    if (i % 64 === 0) {
      const lfo = Math.sin(2 * Math.PI * 0.07 * t) * 0.35 + 1;
      padFilter.set(envelope(BRIGHT, t) * lfo, 0.6);
      windFilter.set(480 + 220 * Math.sin(2 * Math.PI * 0.11 * t), 0.9, 'bandpass');
    }
    const freqs = padFreqs(t);
    let l = 0;
    let r = 0;
    for (let v = 0; v < voicesPerSide; v++) {
      for (let side = 0; side < 2; side++) {
        const cents = (side === 0 ? -1 : 1) * 6 * (1 + v * 0.3);
        const hz = freqs[v]! * Math.pow(2, cents / 1200);
        const k = v * 2 + side;
        phases[k] = (phases[k]! + hz / SR) % 1;
        const wave = v < 2 ? tri(phases[k]!) : Math.sin(2 * Math.PI * phases[k]!);
        const g = (v === 0 ? 0.9 : 0.55) / voicesPerSide;
        if (side === 0) l += wave * g;
        else r += wave * g;
      }
    }
    const m = envelope(MASTER, t);
    const pad = 0.42 * m;
    // 左右で同じフィルタを通し、広がりは detune の左右差で作る
    const mono = padFilter.run((l + r) * 0.5);
    const wind = windTone.run(windFilter.run(rand() * 2 - 1)) * 0.07 * m;
    dry[0]![i] = mono * pad + (l - r) * 0.04 * m + wind;
    dry[1]![i] = mono * pad - (l - r) * 0.04 * m + wind;
    send[0]![i] = dry[0]![i]! * 0.35;
    send[1]![i] = dry[1]![i]! * 0.35;
  }
}

// 鈴・爪弾き・うねり
for (const v of voices) {
  const s0 = Math.max(0, Math.floor(v.start * SR));
  const s1 = Math.min(N, Math.floor((v.start + v.dur) * SR));
  const gl = Math.cos(((v.pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((v.pan + 1) * Math.PI) / 4);
  for (let i = s0; i < s1; i++) {
    const t = i / SR;
    const x = v.render(t - v.start) * envelope(MASTER, t);
    add(dry[0]!, i, x * gl);
    add(dry[1]!, i, x * gr);
    add(send[0]!, i, x * gl * v.send);
    add(send[1]!, i, x * gr * v.send);
  }
}

// 空間：左右で長さの違うディレイ。返りは少し丸めてフィードバックさせる
{
  const dl = Math.floor(0.37 * SR);
  const dr = Math.floor(0.53 * SR);
  const bufL = new Float32Array(N);
  const bufR = new Float32Array(N);
  const dampL = new Lowpass();
  const dampR = new Lowpass();
  dampL.set(1600, 0.7);
  dampR.set(1600, 0.7);
  for (let i = 0; i < N; i++) {
    const fbL = i >= dr ? bufR[i - dr]! : 0; // 左右を交差させて広げる
    const fbR = i >= dl ? bufL[i - dl]! : 0;
    bufL[i] = send[0]![i]! + dampL.run(fbL) * 0.38;
    bufR[i] = send[1]![i]! + dampR.run(fbR) * 0.38;
    add(dry[0]!, i, (i >= dl ? bufL[i - dl]! : 0) * 0.45);
    add(dry[1]!, i, (i >= dr ? bufR[i - dr]! : 0) * 0.45);
  }
}

// ---------- 書き出し（16bit ステレオ WAV、ピークを -1dBFS に揃える） ----------
let peak = 0;
for (const ch of dry) for (const x of ch) peak = Math.max(peak, Math.abs(x));
const norm = peak > 0 ? Math.pow(10, -1 / 20) / peak : 1;

// ディレイの返りは MASTER の減衰より後に足されるので、最後の 50ms で必ず 0 に戻してクリック音を防ぐ
const TAIL = Math.floor(0.05 * SR);
const tailFade = (i: number) => Math.min(1, (N - 1 - i) / TAIL);

const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  for (let c = 0; c < 2; c++) {
    const s = Math.max(-1, Math.min(1, dry[c]![i]! * norm * tailFade(i)));
    data.writeInt16LE(Math.round(s * 32767), i * 4 + c * 2);
  }
}
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(2, 22); // ステレオ
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../public/music.wav');
await mkdir(path.dirname(out), { recursive: true });
// 書きかけの WAV が読まれないよう、同じ場所の一時ファイルに書いてから置き換える（名前はプロセスごとに変える）
const tmp = `${out}.${process.pid}.tmp`;
await writeFile(tmp, Buffer.concat([header, data]));
await rename(tmp, out);
console.log(`music.wav  ${DURATION.toFixed(1)}s  ${(data.length / 1024 / 1024).toFixed(1)} MB`);
