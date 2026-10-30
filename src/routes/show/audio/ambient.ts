import { bellSemitone, chordForFormation, semitoneToHz } from './scale';

/**
 * Web Audio で生成するアンビエント音楽。音源ファイルを持たないので 0 バイト、ライセンスの心配もない。
 *
 * 構成（すべて音声スレッドで動き、JS 側は数秒に一度タイマーが動くだけ）
 * - パッド: 和音 5 声 × 2（微妙にずらした 2 本）の三角波 / 正弦波を、ゆっくり開閉するローパスに通す
 * - 風: ノイズをバンドパスに通し、中心周波数を LFO で揺らす
 * - 鈴: 数秒おきに正弦波を一つ鳴らし、指数的に減衰させて左右にずらす
 * - 空間: 左右で長さの違うディレイ + フィードバック（コンボルバより桁違いに軽い）
 *
 * 演目が変わると和音の根音が滑らかに（2.5 秒のグライドで）移る。
 */
export interface Ambient {
  setVolume(v: number): void;
  setPlaying(playing: boolean): void;
  setFormation(index: number): void;
  dispose(): void;
}

const PAD_VOICES = 5;
const DETUNE_CENTS = 6;
const GLIDE_SEC = 2.5;
const FADE_TC = 0.45;

function makeNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let s = 0x9e3779b9;
  for (let i = 0; i < len; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    d[i] = (s / 0xffffffff) * 2 - 1;
  }
  return buf;
}

/** スライダーの位置を聴感に近い音量へ（二乗で下のほうを細かく） */
function gainFor(volume: number): number {
  const v = Math.max(0, Math.min(1, volume));
  return v * v * 0.55;
}

export function createAmbient(ctx: AudioContext, formationIndex = 0): Ambient {
  const now = () => ctx.currentTime;

  // ---- 出口 ----
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const bus = ctx.createGain();
  bus.gain.value = 1;
  bus.connect(master);

  // ---- 空間（ステレオディレイ） ----
  const delayL = ctx.createDelay(1);
  const delayR = ctx.createDelay(1);
  delayL.delayTime.value = 0.37;
  delayR.delayTime.value = 0.53;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 1600;
  const merger = ctx.createChannelMerger(2);
  const wet = ctx.createGain();
  wet.gain.value = 0.4;
  bus.connect(delayL);
  bus.connect(delayR);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);
  merger.connect(damp);
  damp.connect(feedback);
  feedback.connect(delayL);
  feedback.connect(delayR);
  merger.connect(wet);
  wet.connect(master);

  // ---- パッド ----
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 700;
  padFilter.Q.value = 0.6;
  const padGain = ctx.createGain();
  padGain.gain.value = 0.22;
  padFilter.connect(padGain);
  padGain.connect(bus);
  const padLfo = ctx.createOscillator();
  padLfo.frequency.value = 0.05;
  const padLfoDepth = ctx.createGain();
  padLfoDepth.gain.value = 320;
  padLfo.connect(padLfoDepth);
  padLfoDepth.connect(padFilter.frequency);
  padLfo.start();

  const padOscs: OscillatorNode[] = [];
  const chord = chordForFormation(formationIndex);
  for (let v = 0; v < PAD_VOICES; v++) {
    for (const sign of [-1, 1]) {
      const osc = ctx.createOscillator();
      osc.type = v < 2 ? 'triangle' : 'sine';
      osc.frequency.value = semitoneToHz(chord[v]!);
      osc.detune.value = sign * DETUNE_CENTS * (1 + v * 0.3);
      const g = ctx.createGain();
      g.gain.value = (v === 0 ? 0.9 : 0.55) / PAD_VOICES;
      osc.connect(g);
      g.connect(padFilter);
      osc.start();
      padOscs.push(osc);
    }
  }

  // ---- 風 ----
  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, 2);
  noise.loop = true;
  const wind = ctx.createBiquadFilter();
  wind.type = 'bandpass';
  wind.frequency.value = 480;
  wind.Q.value = 0.9;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.05;
  const windLfo = ctx.createOscillator();
  windLfo.frequency.value = 0.11;
  const windLfoDepth = ctx.createGain();
  windLfoDepth.gain.value = 220;
  windLfo.connect(windLfoDepth);
  windLfoDepth.connect(wind.frequency);
  noise.connect(wind);
  wind.connect(windGain);
  windGain.connect(bus);
  noise.start();
  windLfo.start();

  // ---- 鈴 ----
  let bellTimer: number | null = null;
  let currentFormation = formationIndex;
  let playing = false;
  const ringBell = () => {
    const t = now();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = semitoneToHz(bellSemitone(currentFormation, Math.random()));
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.2;
    osc.connect(env);
    env.connect(pan);
    pan.connect(bus);
    osc.start(t);
    osc.stop(t + 3);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
      pan.disconnect();
    };
  };
  const scheduleBell = () => {
    if (bellTimer !== null) window.clearTimeout(bellTimer);
    bellTimer = window.setTimeout(
      () => {
        if (!playing) return;
        ringBell();
        scheduleBell();
      },
      2500 + Math.random() * 4000
    );
  };

  let volume = 0;
  const applyMaster = () => {
    master.gain.cancelScheduledValues(now());
    master.gain.setTargetAtTime(playing ? gainFor(volume) : 0, now(), FADE_TC);
  };

  return {
    setVolume(v) {
      volume = v;
      applyMaster();
    },
    setPlaying(next) {
      if (playing === next) return;
      playing = next;
      applyMaster();
      if (playing) scheduleBell();
      else if (bellTimer !== null) {
        window.clearTimeout(bellTimer);
        bellTimer = null;
      }
    },
    setFormation(index) {
      if (index === currentFormation) return;
      currentFormation = index;
      const next = chordForFormation(index);
      const t = now();
      padOscs.forEach((osc, k) => {
        const hz = semitoneToHz(next[Math.floor(k / 2)]!);
        osc.frequency.cancelScheduledValues(t);
        osc.frequency.setValueAtTime(osc.frequency.value, t);
        osc.frequency.exponentialRampToValueAtTime(hz, t + GLIDE_SEC);
      });
    },
    dispose() {
      if (bellTimer !== null) window.clearTimeout(bellTimer);
      try {
        for (const o of padOscs) o.stop();
        padLfo.stop();
        windLfo.stop();
        noise.stop();
      } catch {
        /* already stopped */
      }
      master.disconnect();
    },
  };
}
