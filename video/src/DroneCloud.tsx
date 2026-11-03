import { useLayoutEffect, useMemo, useRef } from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { DRONE_COUNT, findFormation } from '~/lib/formations';
import { prng } from '~/lib/prng';
import { AURORA } from './theme';

/**
 * 演目の切り替え。frame から始まり、morph フレームかけて前の形から移る。
 * tilt はカメラの見下ろし角（ラジアン、負で上から）。銀河のような平たい形は上から見ないと分からない
 */
export type CloudStep = { id: string; frame: number; morph: number; tilt?: number };

type Props = {
  steps: readonly CloudStep[];
  /** 画面上の中心（px） */
  cx: number;
  cy: number;
  /** 1m あたりの px */
  scale: number;
  opacity?: number;
};

/** アプリの観賞カメラと同じく、編隊の中心（高さ 60m）を見る */
const FOCUS_Y = 60;
const CAMERA_DIST = 320;
const DEFAULT_TILT = -0.18;
/** 熊や心臓は平たいので、回し続けると真横を向く瞬間に線になる。正面を中心に左右へ振るだけにする */
const SWAY = 0.5;
const SWAY_SPEED = 0.02;

/** 離陸前、地上に格子状に並んだ配置 */
function groundGrid(n: number): Float32Array {
  const out = new Float32Array(n * 3);
  const cols = Math.ceil(Math.sqrt(n));
  const pitch = 3;
  for (let i = 0; i < n; i++) {
    out[i * 3] = ((i % cols) - cols / 2) * pitch;
    out[i * 3 + 1] = 0;
    out[i * 3 + 2] = (Math.floor(i / cols) - cols / 2) * pitch;
  }
  return out;
}

function shapeOf(id: string): Float32Array {
  if (id === 'ground') return groundGrid(DRONE_COUNT);
  const f = findFormation(id);
  if (!f) throw new Error(`unknown formation: ${id}`);
  return f.targets;
}

/** 光の玉。色ごとに一度だけ作って drawImage で重ねる */
function makeSprite(color: string, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.18, color);
  grad.addColorStop(0.45, `${color}55`);
  grad.addColorStop(1, `${color}00`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

const ease = Easing.inOut(Easing.cubic);

/**
 * 660 機の点群。アプリの src/lib/formations の座標をそのまま使い、2D canvas に透視投影で描く。
 * 動画の書き出しは GPU の有無に左右されないよう、WebGL は使わない。
 */
export function DroneCloud({ steps, cx, cy, scale, opacity = 1 }: Props) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  const shapes = useMemo(() => steps.map((s) => shapeOf(s.id)), [steps]);
  const sprites = useMemo(() => AURORA.map((c) => makeSprite(c, 48)), []);
  const twinkle = useMemo(() => {
    const rnd = prng(20261103);
    return Array.from({ length: DRONE_COUNT }, () => rnd() * Math.PI * 2);
  }, []);

  // 書き出しはこの描画のあとに撮られるので、レイアウト直後に同期で描く
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d')!;
    g.clearRect(0, 0, width, height);
    g.globalCompositeOperation = 'lighter';

    // いまの演目と、その前の演目
    let k = 0;
    for (let i = 0; i < steps.length; i++) if (frame >= steps[i]!.frame) k = i;
    const cur = shapes[k]!;
    const prev = shapes[Math.max(0, k - 1)]!;
    const step = steps[k]!;
    const t = k === 0 ? 1 : ease(Math.min(1, Math.max(0, (frame - step.frame) / step.morph)));

    const prevTilt = steps[Math.max(0, k - 1)]!.tilt ?? DEFAULT_TILT;
    const tilt = prevTilt + ((step.tilt ?? DEFAULT_TILT) - prevTilt) * t;
    const angle = SWAY * Math.sin(frame * SWAY_SPEED);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);

    for (let i = 0; i < DRONE_COUNT; i++) {
      const o = i * 3;
      const x = prev[o]! + (cur[o]! - prev[o]!) * t;
      const y = prev[o + 1]! + (cur[o + 1]! - prev[o + 1]!) * t - FOCUS_Y;
      const z = prev[o + 2]! + (cur[o + 2]! - prev[o + 2]!) * t;

      const rx = x * ca - z * sa;
      const rz = x * sa + z * ca;
      const ry = y * ct - rz * st;
      const dz = y * st + rz * ct;
      const p = CAMERA_DIST / (CAMERA_DIST + dz);

      const sx = cx + rx * p * scale;
      const sy = cy - ry * p * scale;
      const size = 15 * p;
      const tw = 0.72 + 0.28 * Math.sin(frame * 0.18 + twinkle[i]!);
      g.globalAlpha = Math.max(0, Math.min(1, tw * (0.55 + 0.45 * p)));
      g.drawImage(sprites[i % sprites.length]!, sx - size / 2, sy - size / 2, size, size);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }, [frame, width, height, steps, shapes, sprites, twinkle, cx, cy, scale]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ position: 'absolute', inset: 0, opacity }}
    />
  );
}

/** 出入りのフェード。in と out のフレーム数を指定する */
export function fade(frame: number, total: number, inFrames: number, outFrames: number): number {
  return interpolate(frame, [0, inFrames, total - outFrames, total], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}
